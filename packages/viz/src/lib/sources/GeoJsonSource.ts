import { GeoJSON, GeoJsonGeometryTypes, Feature } from 'geojson'
import uuidv4 from 'uuid/v4'; // TODO: get it from core utils

import {
  Source,
  SourceProps,
  SourceMetadata,
  NumericFieldStats,
  CategoryFieldStats,
  GeometryType,
  StatFields
} from './Source';

import { sourceErrorTypes, SourceError } from '../errors/source-error';

interface GeoJsonSourceProps extends SourceProps {
  data: GeoJSON;
}

export const DEFAULT_GEOM = 'Point'
const MAX_SAMPLE_SIZE = 1000;

export class GeoJsonSource extends Source {
  private _geojson: GeoJSON;
  private _metadata?: SourceMetadata;
  private _props?: GeoJsonSourceProps;
  private _numericFieldValues: Record<string, number[]>;
  private _categoryFieldValues: Record<string, string[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _sample: Array<any>;

  constructor(geojson: GeoJSON) {
    const id = `geojson-${uuidv4()}`;
    super(id);

    this._geojson = geojson;
    this._numericFieldValues = {};
    this._categoryFieldValues = {};
    this._sample = [];
  }

  public getProps(): GeoJsonSourceProps {
    if (!this.isInitialized || !this._props) {
      throw new SourceError(
        'getProps requires init call',
        sourceErrorTypes.INIT_SKIPPED
      );
    }

    return this._props;
  }

  public getMetadata(): SourceMetadata {
    if (!this.isInitialized || !this._metadata) {
      throw new SourceError(
        'GetMetadata requires init call',
        sourceErrorTypes.INIT_SKIPPED
      );
    }

    return this._metadata;
  }

  public async init(fields: StatFields): Promise<boolean> {
    this._props = { type: 'GeoJsonLayer', data: this._geojson };

    const columns = new Set([...fields.sample, ...fields.aggregation]);
    this._metadata = this._buildMetadata([...columns]);

    this.isInitialized = true;
    return Promise.resolve(true);
  }

  private _buildMetadata(fields: string[]) {
    const geometryType = getGeomType(this._geojson);
    const stats = this._getStats(fields);

    return { geometryType, stats };
  }

  private _getStats(fields: string[]): (NumericFieldStats | CategoryFieldStats)[] {
    const stats: (NumericFieldStats | CategoryFieldStats)[] = [];

    if (!fields.length) {
      return stats;
    }

    const features = getFeatures(this._geojson);

    if (features.length) {
      this._extractFeaturesValues(features, fields);
      // this._calculateStats();
    }

    return stats;
  }

  private _extractFeaturesValues(features: Feature[], fields: string[]) {
    features.forEach(feature => {
      const { properties } = feature;

      // values
      if (properties) {
        fields.forEach(propName => {
          this._saveFeatureValue(propName, properties[propName]);
        });
      }

      // sample
      if (features.length < MAX_SAMPLE_SIZE || Math.random() < MAX_SAMPLE_SIZE / features.length) {
        this._sample.push(properties);
      }
    });
  }

  private _saveFeatureValue(propName: string, propValue: string | number | unknown) {
    if (propValue) {
      if (typeof propValue === 'number') {
        if (this._categoryFieldValues[propName]) {
          throw new SourceError(
            `Unsupported GeoJSON: the property '${propName}' has different types in different features.`,
          );
        }

        if (!this._numericFieldValues[propName]) {
          this._numericFieldValues[propName] = []
        }

        this._numericFieldValues[propName].push(propValue)
      }

      if (typeof propValue === 'string') {
        if (this._numericFieldValues[propName]) {
          throw new SourceError(
            `Unsupported GeoJSON: the property '${propName}' has different types in different features.`,
          );
        }

        if (!this._categoryFieldValues[propName]) {
          this._categoryFieldValues[propName] = []
        }

        this._categoryFieldValues[propName].push(propValue)
      }

      throw new SourceError(
        `Unsupported GeoJSON: the property '${propName}' has unsupported value '${propValue}'.`,
      );
    }
  }

}

export function getGeomType(geojson: GeoJSON): GeometryType {
  if (geojson.type === 'FeatureCollection') {
    return geojson.features.length ? getGeomType(geojson.features[0]) : DEFAULT_GEOM;
  }

  if (geojson.type === 'Feature') {
    return parseGeometryType(geojson.geometry.type);
  }

  if (geojson.type === 'GeometryCollection') {
    return geojson.geometries.length ? parseGeometryType(geojson.geometries[0].type) : DEFAULT_GEOM
  }

  return parseGeometryType(geojson.type);
}

function parseGeometryType(geoJsonGeometryType: GeoJsonGeometryTypes): GeometryType {
  if (['Point', 'MultiPoint'].includes(geoJsonGeometryType)) {
    return 'Point'
  }

  if (['LineString', 'MultiLineString'].includes(geoJsonGeometryType)) {
    return 'Line'
  }

  return 'Polygon'
}

export function getFeatures(geojson: GeoJSON): Feature[] {
  if (geojson.type === 'FeatureCollection') {
    return geojson.features;
  }

  if (geojson.type === 'Feature') {
    return [geojson];
  }

  return [];
}
