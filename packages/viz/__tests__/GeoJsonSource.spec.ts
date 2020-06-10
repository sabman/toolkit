import { getGeomType, getFeatures, DEFAULT_GEOM } from '../src/lib/sources/GeoJsonSource'
import { Feature, FeatureCollection, Geometry, GeometryCollection } from 'geojson'

const GEOJSON_GEOM_TYPE = 'LineString';
const GEOM_TYPE = 'Line';

const geometry: Geometry = {
  type: GEOJSON_GEOM_TYPE,
  coordinates: [[1, 1], [2, 2]]
};

const feature: Feature = {
  type: 'Feature',
  id: 1,
  geometry,
  properties: {
    cartodb_id: 1,
    number: 10,
    string: 'cat1'
  }
};

const geometryCollection: GeometryCollection  = {
  type: 'GeometryCollection',
  geometries: [geometry]
};

const featureCollection: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    feature,
    feature,
    feature
  ]
};

describe('getGeomType', () => {
  it('should get geom type from FeatureCollection', () => {
    const geomType = getGeomType(featureCollection);
    expect(geomType).toBe(GEOM_TYPE);
  });

  it('should get geom type from GeometryCollection', () => {
    const geomType = getGeomType(geometryCollection);
    expect(geomType).toBe(GEOM_TYPE);
  });

  it('should get geom type from Feature', () => {
    const geomType = getGeomType(feature);
    expect(geomType).toBe(GEOM_TYPE);
  });

  it('should get geom type from Geometry', () => {
    const geomType = getGeomType(geometry);
    expect(geomType).toBe(GEOM_TYPE);
  });

  it('should return default geom type from empty FeatureCollection', () => {
    const emptyFeatureCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: []
    };

    const geomType = getGeomType(emptyFeatureCollection);
    expect(geomType).toBe(DEFAULT_GEOM);
  });

  it('should return default geom type from empty GeometryCollection', () => {
    const emptyGeometryCollection: GeometryCollection = {
      type: "GeometryCollection",
      geometries: []
    };

    const geomType = getGeomType(emptyGeometryCollection);
    expect(geomType).toBe(DEFAULT_GEOM);
  });
})

describe('getFeatures', () => {
  it('should get features count from FeatureCollection', () => {
    const features = getFeatures(featureCollection);
    expect(features.length).toBe(3);
  });

  it('should get features count from GeometryCollection', () => {
    const features = getFeatures(geometryCollection);
    expect(features.length).toBe(0);
  });

  it('should get features count from Feature', () => {
    const features = getFeatures(feature);
    expect(features.length).toBe(1);
  });

  it('should get features count from Geometry', () => {
    const features = getFeatures(geometry);
    expect(features.length).toBe(0);
  });

  it('should return features count from empty FeatureCollection', () => {
    const emptyFeatureCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: []
    };

    const features = getFeatures(emptyFeatureCollection);
    expect(features.length).toBe(0);
  });

})
