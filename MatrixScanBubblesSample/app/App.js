import React, { Component } from 'react';
import { AppState, BackHandler, Dimensions, SafeAreaView } from 'react-native';
import {
  BarcodeBatch,
  BarcodeBatchAdvancedOverlay,
  BarcodeBatchBasicOverlay,
  BarcodeBatchBasicOverlayStyle,
  BarcodeBatchScenario,
  BarcodeBatchSettings,
  Symbology,
} from 'scandit-react-native-datacapture-barcode';
import {
  Anchor,
  Camera,
  DataCaptureContext,
  DataCaptureView,
  FrameSourceState,
  MeasureUnit,
  NumberWithUnit,
  PointWithUnit,
  Quadrilateral,
  VideoResolution,
} from 'scandit-react-native-datacapture-core';

import { ARView } from './ARView';
import { requestCameraPermissionsIfNeeded } from './camera-permission-handler';
import Freeze from './Freeze.svg';
import { styles } from './styles';
import Unfreeze from './Unfreeze.svg';

// Calculate the width of a quadrilateral (barcode location) based on it's corners.
Quadrilateral.prototype.width = function () {
  return Math.max(
    Math.abs(this.topRight.x - this.topLeft.x),
    Math.abs(this.bottomRight.x - this.bottomLeft.x),
  );
};

export class App extends Component {
  constructor() {
    super();

    // Enter your Scandit License key here.
    // Your Scandit License key is available via your Scandit SDK web account.
    this.dataCaptureContext = DataCaptureContext.forLicenseKey('ArUlZRHoNMOiM+J7xNflSAYiJm9gMkBShx6HUpcWx8rObKvn00SfAmdOx5OSWFefPEzp5OtrVtAjQ0medzVajnht1cgmVmklykdOECAs3khwBNB9AxQDRYwif/amZRd/60CQzyxXS2w0ReNRoXa6Z8p0OjL1MSAzwU/+Osti056xT8uPKkrOS2oN7CGTcaWgyGYiqC9F6D4MdOq+4VEzPQt1PmsKfZGTO2AFYl9ZLbUEYwRoAig6raol7ofJVYsvW3xoiBxKpuwcCOwR1UDFgZ1XIcpfCugtfRKdKlR46WINYHd1IH89vhM49wcPUQguB1KvSFpzqsa8XflZSx/bpchjJe4kbNG6yEsygHsCwKw3NZEu5Hy1lq5XbiYoIfPf2z2urUtZqzaJGs+jYXlZ4qpDaPYvVam4MQK4QxkQIL3hRmIcdUUhaxxGKoJMaitxhSys6dpSSYjGXgufylTbyFBsVOCWbeZDhUeiGzlCrrrePlgvGRUcNqt6JfSML/9gdWkLzsh33gY7dbXyhXF+LahSRClYc8Z5kncwu+RIpPCWOOUJUwFFpENjPvCgS0xuCQUERzFnvKsHQR7MzxJPYYUNYaUIX+HPr0bpNvFr3GZ8N8rstlm3Gt5GL43xdnYsTH4xG5JWDfq3JxWw/HB1Xg9kqnbDbxoQUXg5341CvDgDNdKfHE0CNdp0izmxadSOe1I7vod6HRhXQNVe11Pi+xxLVlE4ZLEpPSDo8XpUq1nuX6wbYkfoN+pZW2aIR+t3aV8DoN1DjnFfEIOK7S5DErQeoR8wdG4U/jY+juF81g/jDCvv/mb2cltoWYygMxKdqXCrXuhzFANxfVAWmV5QTEpT4lRUNJiZ22lYzOhu8puWc4fRIwge364c3dv7dGqRO0815fh1XCS2WXN2NEER8U423eypf/yl8EDVWy4cYgMqZHbn8TndCsJhWCRVUc9GHS0qO0xP+XvBHQyId3G6r5owM+/7N2E20LRIZbh6qvVW3iinLmWQzCn0Y9Zpa28WvB8WG5JcEOMIMfsRaZd6BuFJPGyZ6PHANx3LdsHAFyZlh6LRg5owDzKHy8oY8ymMVQnXEzte5DpZFgHWD2RX/14N1iYxaXKnhT46tElZZdLTeOoRmb68sHwebhG2mgyF77m3hlurzl4d7fTOtsK6413oIMmY5vI1fbSm/E8O1E+DOkRTPI7WmGLGpd0M++DcOwtz9pSB1Aln8l17waUb6P3y62aY5lGK01vZKAH9E7Z9XeF8Gj2mIrMPIoQOEzLIBeozcUJ7teh6k9QS/1RuCapvxhP5EyAhnd0XA8YMnInLA/gPuNiuGFN2SbYbN3/+miybEKnmrCHPx6mTouOmlOepSr67/i5Zz6aAuXsD8WF1uSv9FqpD1H1uKsDQ5qJYMGJbzE+m8zJNUjcaJiV8hN/n5nyDALXygkjrmHbIZI7PU4rzNn+nU+AOuGEWr5RI7pTvfUBpK0Ge84dWBp7kU+ZTwSZ+pzXrQS020AbFTXSr+6WOKd2Kp21bTMOegd15uOBDREKdvhTZde7CqkidCogNaHOLOr8lGSuIfH/5vIokKGm6ZLtJT2dz6MFhsAYgQ04tHNW98SjQMRb4uovCZpuRceiMD0mgCQpLnQJdlZTy5EDTPM8Kv6svHVki7Re4vqu463Xl');

    this.viewRef = React.createRef();

    this.trackedBarcodes = {};
    this.state = { scanning: true };
  }

  componentDidMount() {
    this.handleAppStateChangeSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    this.setupScanning();
    this.startCapture();
  }

  componentWillUnmount() {
    this.handleAppStateChangeSubscription.remove();
    this.dataCaptureContext.dispose();
  }

  handleAppStateChange = async (nextAppState) => {
    if (nextAppState.match(/inactive|background/)) {
      this.stopCapture();
    } else if (this.state.scanning) {
      this.startCapture();
    }
  }

  startCapture() {
    this.startCamera();
    this.barcodeBatch.isEnabled = true;
  }

  stopCapture() {
    this.barcodeBatch.isEnabled = false;
    this.stopCamera();
  }

  stopCamera() {
    if (this.camera) {
      this.camera.switchToDesiredState(FrameSourceState.Off);
    }
  }

  startCamera() {
    if (!this.camera) {
      // Use the world-facing (back) camera and set it as the frame source of the context. The camera is off by
      // default and must be turned on to start streaming frames to the data capture context for recognition.
      const cameraSettings = BarcodeBatch.recommendedCameraSettings;
      cameraSettings.preferredResolution = VideoResolution.UHD4K;

      this.camera = Camera.withSettings(cameraSettings);
      this.dataCaptureContext.setFrameSource(this.camera);
    }

    // Switch camera on to start streaming frames and enable the barcode batch mode.
    // The camera is started asynchronously and will take some time to completely turn on.
    requestCameraPermissionsIfNeeded()
      .then(() => this.camera.switchToDesiredState(FrameSourceState.On))
      .catch(() => BackHandler.exitApp());
  }

  setupScanning() {
    // The barcode batch process is configured through barcode batch settings
    // which are then applied to the barcode batch instance that manages barcode batch.
    const settings = BarcodeBatchSettings.forScenario(BarcodeBatchScenario.A);

    // The settings instance initially has all types of barcodes (symbologies) disabled. For the purpose of this
    // sample we enable a very generous set of symbologies. In your own app ensure that you only enable the
    // symbologies that your app requires as every additional enabled symbology has an impact on processing times.
    settings.enableSymbologies([
      Symbology.EAN13UPCA,
      Symbology.EAN8,
      Symbology.UPCE,
      Symbology.Code39,
      Symbology.Code128,
    ]);

    // Create new barcode batch mode with the settings from above.
    this.barcodeBatch = BarcodeBatch.forContext(this.dataCaptureContext, settings);

    // Register a listener to get informed whenever a new barcode is tracked.
    this.barcodeBatchListener = {
      // This function is called whenever objects are updated and it's the right place to react to the batch results.
      didUpdateSession: async (barcodeBatch, session) => {
        // Remove information about tracked barcodes that are no longer tracked.
        session.removedTrackedBarcodes.forEach((identifier) => {
          this.trackedBarcodes[identifier] = null;
        });

        // Update AR views
        Object.values(session.trackedBarcodes).forEach((trackedBarcode) => {
          this.viewRef.current.viewQuadrilateralForFrameQuadrilateral(trackedBarcode.location)
            .then((location) => this.updateView(trackedBarcode, location));
        });
      },
    };

    this.barcodeBatch.addListener(this.barcodeBatchListener);

    // Add a barcode batch overlay to the data capture view to render the tracked barcodes on top of the video
    // preview. This is optional, but recommended for better visual feedback. The overlay is automatically added
    // to the view.
    BarcodeBatchBasicOverlay.withBarcodeBatchForViewWithStyle(
        this.barcodeBatch,
        this.viewRef.current,
        BarcodeBatchBasicOverlayStyle.Dot
    );

    // Add an advanced barcode batch overlay to the data capture view to render AR visualization on top of
    // the camera preview.
    this.advancedOverlay = BarcodeBatchAdvancedOverlay.withBarcodeBatchForView(
      this.barcodeBatch,
      this.viewRef.current,
    );

    this.advancedOverlay.listener = {
      // The offset of our overlay will be calculated from the center anchoring point.
      anchorForTrackedBarcode: () => Anchor.TopCenter,
      // We set the offset's height to be equal of the 100 percent of our overlay.
      // The minus sign means that the overlay will be above the barcode.
      offsetForTrackedBarcode: () => new PointWithUnit(
        new NumberWithUnit(0, MeasureUnit.Fraction),
        new NumberWithUnit(-1, MeasureUnit.Fraction),
      ),
    };
  }

  updateView(trackedBarcode, viewLocation) {
    // If the barcode is wider than the desired percent of the data capture view's width, show it to the user.
    const shouldBeShown = viewLocation.width() > Dimensions.get('window').width * 0.1;

    if (!shouldBeShown) {
      this.trackedBarcodes[trackedBarcode.identifier] = null;
      return;
    }

    const barcodeData = trackedBarcode.barcode.data;

    // The AR view associated with the tracked barcode should only be set again if it was changed,
    // to avoid unnecessarily recreating it.
    const didViewChange = JSON.stringify(this.trackedBarcodes[trackedBarcode.identifier]) !== JSON.stringify(barcodeData);

    if (didViewChange) {
      this.trackedBarcodes[trackedBarcode.identifier] = barcodeData;

      const props = {
        barcodeData,
        // Get the information you want to show from your back end system/database.
        stock: { shelf: 4, backRoom: 8 }
      };

      this.advancedOverlay
        .setViewForTrackedBarcode(new ARView(props), trackedBarcode)
        .catch(console.warn);
    }
  }

  toggleScan = () => {
    const isScanning = this.barcodeBatch.isEnabled;

    // Toggle barcode batch to stop or start processing frames.
    this.barcodeBatch.isEnabled = !isScanning;
    // Switch the camera on or off to toggle streaming frames. The camera is stopped asynchronously.
    this.camera.switchToDesiredState(isScanning ? FrameSourceState.Off : FrameSourceState.On);
    this.setState({ scanning: this.barcodeBatch.isEnabled });
  };

  render() {
    return (
      <>
        <DataCaptureView style={styles.dataCaptureView} context={this.dataCaptureContext} ref={this.viewRef} />
        <SafeAreaView style={styles.toggleContainer}>
          {this.state.scanning ? <Freeze onPress={this.toggleScan} /> : <Unfreeze onPress={this.toggleScan} />}
        </SafeAreaView>
      </>
    );
  }
}
