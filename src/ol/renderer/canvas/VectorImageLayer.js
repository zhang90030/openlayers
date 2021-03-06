/**
 * @module ol/renderer/canvas/ImageLayer
 */
import ImageCanvas from '../../ImageCanvas.js';
import ViewHint from '../../ViewHint.js';
import {equals} from '../../array.js';
import {getHeight, getWidth, isEmpty} from '../../extent.js';
import {assign} from '../../obj.js';
import CanvasImageLayerRenderer from './ImageLayer.js';
import CanvasVectorLayerRenderer from './VectorLayer.js';

/**
 * @classdesc
 * Canvas renderer for image layers.
 * @api
 */
class CanvasVectorImageLayerRenderer extends CanvasImageLayerRenderer {

  /**
   * @param {import("../../layer/VectorImage.js").default} layer Vector image layer.
   */
  constructor(layer) {
    super(layer);

    /**
     * @type {!Array<string>}
     */
    this.skippedFeatures_ = [];

    /**
     * @private
     * @type {import("./VectorLayer.js").default}
     */
    this.vectorRenderer_ = new CanvasVectorLayerRenderer(layer);

  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    this.vectorRenderer_.dispose();
    super.disposeInternal();
  }

  /**
   * @inheritDoc
   */
  prepareFrame(frameState, layerState) {
    const pixelRatio = frameState.pixelRatio;
    const viewState = frameState.viewState;
    const viewResolution = viewState.resolution;

    const hints = frameState.viewHints;
    const vectorRenderer = this.vectorRenderer_;
    const renderedExtent = frameState.extent;

    if (!hints[ViewHint.ANIMATING] && !hints[ViewHint.INTERACTING] && !isEmpty(renderedExtent)) {
      let skippedFeatures = this.skippedFeatures_;
      const context = vectorRenderer.context;
      const imageFrameState = /** @type {import("../../PluggableMap.js").FrameState} */ (assign({}, frameState, {
        size: [
          getWidth(renderedExtent) / viewResolution,
          getHeight(renderedExtent) / viewResolution
        ],
        viewState: /** @type {import("../../View.js").State} */ (assign({}, frameState.viewState, {
          rotation: 0
        }))
      }));
      const newSkippedFeatures = Object.keys(imageFrameState.skippedFeatureUids).sort();
      const image = new ImageCanvas(renderedExtent, viewResolution, pixelRatio, context.canvas, function(callback) {
        if (vectorRenderer.prepareFrame(imageFrameState, layerState) &&
              (vectorRenderer.replayGroupChanged ||
              !equals(skippedFeatures, newSkippedFeatures))) {
          context.canvas.width = imageFrameState.size[0] * pixelRatio;
          context.canvas.height = imageFrameState.size[1] * pixelRatio;
          vectorRenderer.renderFrame(imageFrameState, layerState);
          skippedFeatures = newSkippedFeatures;
          callback();
        }
      });
      if (this.loadImage(image)) {
        this.image_ = image;
        this.skippedFeatures_ = skippedFeatures;
      }
    }

    if (this.image_) {
      const image = this.image_;
      const imageResolution = image.getResolution();
      const imagePixelRatio = image.getPixelRatio();
      this.renderedResolution = imageResolution * pixelRatio / imagePixelRatio;
    }

    return !!this.image_;
  }

  /**
   * @inheritDoc
   */
  forEachFeatureAtCoordinate(coordinate, frameState, hitTolerance, callback) {
    if (this.vectorRenderer_) {
      return this.vectorRenderer_.forEachFeatureAtCoordinate(coordinate, frameState, hitTolerance, callback);
    } else {
      return super.forEachFeatureAtCoordinate(coordinate, frameState, hitTolerance, callback);
    }
  }
}


export default CanvasVectorImageLayerRenderer;
