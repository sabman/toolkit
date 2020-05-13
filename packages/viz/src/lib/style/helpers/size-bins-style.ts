import { findIndexForBinBuckets, calculateSizeBins } from './utils';
import { Classifier, ClassificationMethod } from '../../utils/Classifier';
import {
  CartoStylingError,
  stylingErrorTypes
} from '../../errors/styling-error';
import { StyledLayer, pixel2meters } from '../layer-style';
import { NumericFieldStats, GeometryType } from '../../sources/Source';
import { Style, BasicOptionsStyle, getStyles, getStyleValue } from '..';

export interface SizeBinsOptionsStyle extends Partial<BasicOptionsStyle> {
  // Number of size classes (bins) for map. Default is 5.
  bins: number;
  // Classification method of data: "quantiles", "equal", "stdev". Default is "quantiles".
  method: ClassificationMethod;
  // Assign manual class break values.
  breaks: number[];
  // Min/max size array as a string. Default is [2, 14] for point geometries and [1, 10] for lines.
  sizeRange: number[];
  // Size applied to features which the attribute value is null. Default 0
  nullSize: number;
}

function defaultOptions(
  geometryType: GeometryType,
  options: Partial<SizeBinsOptionsStyle>
): SizeBinsOptionsStyle {
  return {
    bins: 5,
    method: 'quantiles',
    breaks: [],
    sizeRange: getStyleValue('sizeRange', geometryType, options),
    nullSize: 0,
    ...options
  };
}

export function sizeBinsStyle(
  featureProperty: string,
  options: Partial<SizeBinsOptionsStyle> = {}
) {
  const evalFN = (layer: StyledLayer) => {
    const meta = layer.source.getMetadata();
    const opts = defaultOptions(meta.geometryType, options);
    validateParameters(opts);

    if (meta.geometryType === 'Polygon') {
      throw new CartoStylingError(
        "Polygon layer doesn't support sizeBinsStyle",
        stylingErrorTypes.GEOMETRY_TYPE_UNSUPPORTED
      );
    }

    if (!opts.breaks.length) {
      const stats = meta.stats.find(
        f => f.name === featureProperty
      ) as NumericFieldStats;
      const classifier = new Classifier(stats);
      const breaks = classifier.breaks(opts.bins, opts.method);
      return calculateWithBreaks(
        featureProperty,
        layer,
        breaks,
        meta.geometryType,
        opts
      );
    }

    return calculateWithBreaks(
      featureProperty,
      layer,
      opts.breaks,
      meta.geometryType,
      opts
    );
  };

  return new Style(evalFN, featureProperty);
}

function calculateWithBreaks(
  featureProperty: string,
  layerStyle: StyledLayer,
  breaks: number[],
  geometryType: GeometryType,
  options: SizeBinsOptionsStyle
) {
  const styles = getStyles(geometryType, options);

  // For 3 breaks, we create 4 ranges. For example: [30,80,120]
  // - From -inf to 29
  // - From 30 to 79
  // - From 80 to 119
  // - From 120 to +inf
  // Values lower than 0 will be in the first bucket and values higher than 120 will be in the last one.
  const ranges = [...breaks, Number.MAX_SAFE_INTEGER];

  // calculate sizes based on breaks and sizeRanges.
  const sizes = calculateSizeBins(breaks.length, options.sizeRange);

  /**
   * @private
   * Gets the size for the feature provided by parameter
   * according to the breaks and sizes options.
   *
   * @param feature - feature used to calculate the size.
   * @returns size.
   */
  const getSizeValue = (feature: Record<string, any>) => {
    const featureValue: number = feature.properties[featureProperty];

    if (featureValue === null || featureValue === undefined) {
      return options.nullSize;
    }

    const featureValueIndex = findIndexForBinBuckets(ranges, featureValue);
    return sizes[featureValueIndex];
  };

  /**
   * @public
   * Calculates the radius size for the feature provided
   * by parameter according to the breaks and sizes.
   *
   * @param feature - feature used to calculate the radius size.
   * @returns radio size.
   */
  const getRadius = (feature: Record<string, any>) => {
    return pixel2meters(getSizeValue(feature), layerStyle);
  };

  /**
   * @public
   * Calculates the line width for the feature provided
   * by parameter according to the breaks and sizes.
   *
   * @param feature - feature used to calculate the line widt h.
   * @returns radio size.
   */
  const getLineWidth = (feature: Record<string, any>) => {
    return getSizeValue(feature);
  };

  // gets the min and max size
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  let obj;

  if (geometryType === 'Point') {
    obj = {
      getRadius,
      pointRadiusMinPixels: minSize,
      pointRadiusMaxPixels: maxSize,
      radiusUnits: 'pixels'
    };
  } else {
    obj = {
      getLineWidth,
      lineWidthMinPixels: minSize,
      lineWidthMaxPixels: maxSize,
      lineWidthUnits: 'pixels'
    };
  }

  return {
    ...styles,
    ...obj,
    updateTriggers: { getRadius, getLineWidth }
  };
}

function validateParameters(options: SizeBinsOptionsStyle) {
  if (options.bins < 1) {
    throw new CartoStylingError(
      'Manual bins must be greater than zero',
      stylingErrorTypes.PROPERTY_MISMATCH
    );
  }

  if (options.breaks.length > 0 && options.breaks.length !== options.bins - 1) {
    throw new CartoStylingError(
      'Manual breaks are provided and bins!=breaks.length + 1',
      stylingErrorTypes.PROPERTY_MISMATCH
    );
  }
}
