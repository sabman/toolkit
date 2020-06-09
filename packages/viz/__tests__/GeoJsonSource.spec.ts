import { getStats, getGeomType } from '../src/lib/sources/GeoJsonSource'

const GEOM_TYPE = 'LineString';

const geometry = {
  type: GEOM_TYPE,
  coordinates: [[1, 1], [2, 2]]
};

const feature = {
  type: "Feature",
  geometry,
  properties: {
    cartodb_id: 1,
    number: 10,
    string: "cat1"
  }
};

const geometryCollection = {
  type: "GeometryCollection",
  geometries: [geometry]
};

const featureCollection = {
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
})
