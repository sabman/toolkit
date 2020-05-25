import { CartoError } from '@carto/toolkit-core';
import { Layer } from '@carto/toolkit-viz';
import { DataView } from './data-view';
import { AggregationTypes } from '../aggregations/aggregations';

describe('DataView', () => {
  describe('Instance Creation', () => {
    it('should create new DataView instance', () => {
      expect(
        () => new DataView(new Layer('fake_source'), 'fake_column')
      ).not.toThrow();
    });

    it('should throw an exception when source is not provided', () => {
      expect(() => new DataView(undefined as never, 'fake_column')).toThrow(
        new CartoError({
          type: '[DataView]',
          message: 'Source was not provided while creating dataview'
        })
      );
    });

    it('should throw an exception when column is not provided', () => {
      expect(
        () => new DataView(new Layer('fake_source'), undefined as never)
      ).toThrow(
        new CartoError({
          type: '[DataView]',
          message: 'Column name was not provided while creating dataview'
        })
      );
    });
  });

  describe('Events', () => {
    it('dataUpdate', () => {
      const layer = new Layer('fake_source');
      const dataView = new DataView(layer, 'popEst');

      const dataUpdateSpy = jest.fn();
      dataView.on('dataUpdate', dataUpdateSpy);

      layer.emit('viewportLoad');

      expect(dataUpdateSpy).toHaveBeenCalled();
    });
  });

  describe('aggregate', () => {
    it('should return an empty object if operations are not provided', () => {
      const dataView = new DataView(new Layer('fake_source'), 'fake_column');
      expect(dataView.aggregate()).toMatchObject({});
    });

    it('should return an object with data aggregations', async () => {
      const layer = new Layer('fake_source');
      spyOn(layer, 'getViewportFeatures').and.returnValue(
        Promise.resolve(sourceData)
      );

      const dataView = new DataView(layer, 'popEst');

      const aggregations = [
        AggregationTypes.AVG,
        AggregationTypes.COUNT,
        AggregationTypes.MAX,
        AggregationTypes.MIN,
        `percentile_90` as AggregationTypes,
        AggregationTypes.SUM
      ];

      const aggregationsResult = {
        avg: 30,
        count: 5,
        max: 50,
        min: 10,
        sum: 150,
        percentile_90: 50 // eslint-disable-line
      };

      expect(await dataView.aggregate(...aggregations)).toMatchObject(
        aggregationsResult
      );
    });

    it('should throw an error when there are no numeric values', async () => {
      const layer = new Layer('fake_source');
      spyOn(layer, 'getViewportFeatures').and.returnValue(
        Promise.resolve([{ notNumericColumn: 'notprovided' }])
      );

      const dataView = new DataView(layer, 'popEst');

      await expect(() =>
        dataView.aggregate(AggregationTypes.AVG)
      ).rejects.toThrow(
        new CartoError({
          type: '[DataView]',
          message: "Provided column doesn't exist or has no numeric values"
        })
      );
    });
  });

  describe('groupBy', () => {
    it('should return average of grouped values by column', async () => {
      const layer = new Layer('fake_source');
      spyOn(layer, 'getViewportFeatures').and.returnValue(
        Promise.resolve(sourceDataToGroup)
      );

      const dataView = new DataView(layer, 'popEst');

      expect(await dataView.groupBy('country')).toEqual([
        { name: 'Country 2', value: 15 },
        { name: 'Country 4', value: 35 },
        { name: 'Country 5', value: 50 }
      ]);
    });

    it('should custom operation for grouped values by column', async () => {
      const layer = new Layer('fake_source');
      spyOn(layer, 'getViewportFeatures').and.returnValue(
        Promise.resolve(sourceDataToGroup)
      );

      const dataView = new DataView(layer, 'popEst');

      expect(
        await dataView.groupBy('country', { operation: AggregationTypes.MAX })
      ).toEqual([
        { name: 'Country 2', value: 20 },
        { name: 'Country 4', value: 40 },
        { name: 'Country 5', value: 50 }
      ]);
    });

    it("should throw an error if a group doesn't have numeric values", async () => {
      const layer = new Layer('fake_source');
      spyOn(layer, 'getViewportFeatures').and.returnValue(
        Promise.resolve([
          { country: 'Country 2', popEst: 'fakePopEst' },
          { country: 'Country 2', popEst: 'fakePopEst2' }
        ])
      );

      const dataView = new DataView(layer, 'popEst');

      await expect(() => dataView.groupBy('country')).rejects.toThrow(
        new CartoError({
          type: '[DataView]',
          message: '"Country 2" group has no numeric values'
        })
      );
    });
  });
});

const sourceData = [
  { country: 'Country 1', popEst: 10 },
  { country: 'Country 2', popEst: 20 },
  { country: 'Country 3', popEst: 30 },
  { country: 'Country 4', popEst: 40 },
  { country: 'Country 5', popEst: 50 }
];

const sourceDataToGroup = [
  { country: 'Country 2', popEst: 10 },
  { country: 'Country 2', popEst: 20 },
  { country: 'Country 4', popEst: 30 },
  { country: 'Country 4', popEst: 40 },
  { country: 'Country 5', popEst: 50 }
];
