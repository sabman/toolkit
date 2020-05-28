import { Deck, RGBAColor } from '@deck.gl/core';
import { Popup, PopupElement } from '../popups/Popup';
import { Style, StyleProperties } from '../style/Style';
import { StyledLayer } from '../style/layer-style';

export class LayerInteractivity {
  private _deckInstance?: Deck;

  private _clickPopup?: Popup;
  private _hoverPopup?: Popup;

  private _hoverFeature?: Record<string, any>;
  private _clickFeature?: Record<string, any>;

  private _hoverStyle?: Style | string;
  private _clickStyle?: Style | string;

  private _layerGetStyleFn: () => Style;
  private _layerSetStyleFn: (style: Style) => Promise<void>;

  private _layerOnFn: EventHandler;
  private _layerOffFn: EventHandler;

  private _layer: StyledLayer;

  private _layerEmitFn: (type: string, event?: unknown) => void;

  private _clickPopupHandler?: InteractionHandler;
  private _hoverPopupHandler?: InteractionHandler;

  constructor(
    layer: StyledLayer,
    layerGetStyleFn: () => Style,
    layerSetStyleFn: (style: Style) => Promise<void>,
    layerEmitFn: (type: string, event?: unknown) => void,
    layerOnFn: EventHandler,
    layerOffFn: EventHandler,
    hoverStyle?: Style | string,
    clickStyle?: Style | string
  ) {
    this._layer = layer;

    this._hoverStyle = hoverStyle;
    this._clickStyle = clickStyle;

    this._layerGetStyleFn = layerGetStyleFn;
    this._layerSetStyleFn = layerSetStyleFn;

    this._layerOnFn = layerOnFn;
    this._layerOffFn = layerOffFn;

    if (this._clickStyle) {
      layerOnFn(EventType.CLICK, () => {
        const interactiveStyle = this._wrapInteractiveStyle();
        this._layerSetStyleFn(interactiveStyle);
      });
    }

    if (this._hoverStyle) {
      layerOnFn(EventType.HOVER, () => {
        const interactiveStyle = this._wrapInteractiveStyle();
        this._layerSetStyleFn(interactiveStyle);
      });
    }

    this._layerEmitFn = layerEmitFn;
  }

  public onClick(info: any, event: HammerInput) {
    this.fireOnEvent(EventType.CLICK, info, event);
  }

  public onHover(info: any, event: HammerInput) {
    this.fireOnEvent(EventType.HOVER, info, event);
  }

  public fireOnEvent(eventType: EventType, info: any, event: HammerInput) {
    const features = [];
    const { coordinate, object } = info;

    if (object) {
      features.push(object);
    }

    if (eventType === EventType.CLICK) {
      this._clickFeature = object;
    } else if (eventType === EventType.HOVER) {
      this._hoverFeature = object;
      this._setStyleCursor(info);
    }

    if (this._clickStyle || this._hoverStyle) {
      const interactiveStyle = this._wrapInteractiveStyle();
      this._layerSetStyleFn(interactiveStyle);
    }

    this._layerEmitFn(eventType.toString(), [features, coordinate, event]);
  }

  public setDeckInstance(deckInstance: Deck) {
    this._deckInstance = deckInstance;

    if (this._clickPopup) {
      this._clickPopup.addTo(this._deckInstance);
    }

    if (this._hoverPopup) {
      this._hoverPopup.addTo(this._deckInstance);
    }
  }

  /**
   * @public
   * This method creates popups every time the
   * user clicks on one or more features of the layer.
   */
  public setPopupClick(elements: PopupElement[] | string[] | null = []) {
    // if the popup was not created yet then we create it and add it to the map
    if (!this._clickPopup) {
      this._clickPopup = new Popup();

      if (this._deckInstance) {
        this._clickPopup.addTo(this._deckInstance);
      }
    }

    this._popupHandler(EventType.CLICK, this._clickPopup, elements);
  }

  public setPopupHover(elements: PopupElement[] | string[] | null = []) {
    // if the popup was not created yet then we create it and add it to the map
    if (!this._hoverPopup) {
      this._hoverPopup = new Popup({ closeButton: false });

      if (this._deckInstance) {
        this._hoverPopup.addTo(this._deckInstance);
      }
    }

    this._popupHandler(EventType.HOVER, this._hoverPopup, elements);
  }

  private _popupHandler(
    eventType: EventType,
    popup: Popup,
    elements: PopupElement[] | string[] | null = []
  ) {
    let handlerFn;

    if (eventType === EventType.CLICK) {
      if (!this._clickPopupHandler) {
        this._clickPopupHandler = popup.createHandler(elements);
      }

      handlerFn = this._clickPopupHandler;
    } else {
      if (!this._hoverPopupHandler) {
        this._hoverPopupHandler = popup.createHandler(elements);
      }

      handlerFn = this._hoverPopupHandler;
    }

    if (elements && elements.length > 0) {
      this._layerOnFn(eventType, handlerFn);
    } else if (!elements || elements.length === 0) {
      if (popup) {
        popup.close();
      }

      this._layerOffFn(eventType, handlerFn);
    }
  }

  /**
   * Wraps the style defined by the user with new functions
   * to check if the feature received by paramter has been clicked
   * or hovered by the user in order to apply the interaction style
   */
  private _wrapInteractiveStyle() {
    const wrapInteractiveStyle = { updateTriggers: {} };

    const currentStyle = this._layerGetStyleFn();
    const styleProps = currentStyle.getLayerProps(this._layer);

    let clickStyleProps = {};

    if (this._clickStyle === 'default') {
      const defaultHighlightStyle = this._getDefaultHighlightStyle();
      clickStyleProps = defaultHighlightStyle.getLayerProps(this._layer);
    } else if (this._clickStyle instanceof Style) {
      clickStyleProps = this._clickStyle.getLayerProps(this._layer);
    }

    let hoverStyleProps = {};

    if (this._hoverStyle === 'default') {
      const defaultHighlightStyle = this._getDefaultHighlightStyle();
      hoverStyleProps = defaultHighlightStyle.getLayerProps(this._layer);
    } else if (this._hoverStyle instanceof Style) {
      hoverStyleProps = this._hoverStyle.getLayerProps(this._layer);
    }

    Object.keys({
      ...clickStyleProps,
      ...hoverStyleProps
    }).forEach(styleProp => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      const defaultStyleValue = styleProps[styleProp];
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      const hoverStyleValue = hoverStyleProps[styleProp];
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      const clickStyleValue = clickStyleProps[styleProp];

      /**
       * Funtion which wraps the style property. Check if the
       * received feature was clicked or hovered by the user in order
       * to apply the style.
       *
       * @param feature which the style will be applied to.
       */
      const interactionStyleFn = (feature: Record<string, any>) => {
        let styleValue;

        if (
          this._clickFeature &&
          feature.properties.cartodb_id ===
            this._clickFeature.properties.cartodb_id
        ) {
          styleValue = clickStyleValue;
        } else if (
          this._hoverFeature &&
          feature.properties.cartodb_id ===
            this._hoverFeature.properties.cartodb_id
        ) {
          styleValue = hoverStyleValue;
        }

        if (!styleValue) {
          styleValue = defaultStyleValue;
        }

        return typeof styleValue === 'function'
          ? styleValue(feature)
          : styleValue;
      };

      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      wrapInteractiveStyle[styleProp] = interactionStyleFn;
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      wrapInteractiveStyle.updateTriggers[styleProp] = interactionStyleFn;
    });

    return new Style({
      ...styleProps,
      ...wrapInteractiveStyle
    });
  }

  /**
   * Handler for set the style cursor if is
   * hover a feature.
   *
   * @param info - picked info from the layer
   */
  private _setStyleCursor(info: any) {
    if (this._deckInstance) {
      this._deckInstance.setProps({
        getCursor: () => (info.object ? 'pointer' : 'grab')
      });
    }
  }

  private _getDefaultHighlightStyle() {
    const defaultHighlightProps: StyleProperties = {};
    const styleProps = this._layerGetStyleFn().getLayerProps(this._layer);

    // for points & polygons we set:
    // - fill color
    // - stroke color
    // - stroke width
    if (styleProps.getFillColor) {
      defaultHighlightProps.getFillColor = defaultHighlightStyle.getFillColor;
      defaultHighlightProps.getLineWidth = defaultHighlightStyle.getLineWidth;

      defaultHighlightProps.getLineColor = defaultHighlightStyle.getLineColor;
    } else {
      // for lines we just set the line color as fill color in points and polygons
      defaultHighlightProps.getLineColor = defaultHighlightStyle.getFillColor;
    }

    return new Style(defaultHighlightProps);
  }
}

export enum EventType {
  HOVER = 'hover',
  CLICK = 'click'
}

export type InteractionHandler = (eventResult: EventResult) => void;

type EventHandler = (type: EventType, handler: InteractionHandler) => void;

type EventResult = [Record<string, any>[], number[], HammerInput];

const defaultHighlightStyle = {
  getFillColor: [255, 255, 0, 255] as RGBAColor,
  getLineWidth: 5,
  getLineColor: [220, 220, 0, 255] as RGBAColor
};
