import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

interface VrButtonArgs {
  renderer: THREE.WebGLRenderer;
  onSessionStartedCallback?(session: XRSession): void;
  onSessionEndedCallback?(): void;
}

export default class VrButton extends Component<VrButtonArgs> {
  currentSession: XRSession | null = null;

  @tracked
  vrSupported = false;

  @tracked
  buttonText: string = 'Checking ...';

  /**
   * Checks the current status of WebXR in the browser and if compatible
   * devices are connected. Sets the tracked properties
   * 'buttonText' and 'vrSupported' accordingly.
   */
  @action
  updateVrStatus() {
    if ('xr' in navigator) {
      // @ts-ignore
      navigator.xr.isSessionSupported('immersive-vr').then((supported: boolean) => {
        if (supported) {
          this.buttonText = 'Enter VR';
          this.vrSupported = true;
        } else if (window.isSecureContext === false) {
          this.buttonText = 'WEBXR NEEDS HTTPS';
          this.vrSupported = false;
        } else {
          this.buttonText = 'WEBXR NOT AVAILABLE';
          this.vrSupported = false;
        }
      });
    } else {
      this.buttonText = 'WEBXR NOT SUPPORTED';
      this.vrSupported = false;
    }
  }

  /**
   * Called whenever a WebXR session is started.
   * Adds the session to the renderer, sets button text and
   * registers listenders + callback functions.
   *
   * @param session
   */
  onSessionStarted(session: any) {
    this.args.renderer.xr.setSession(session);
    this.buttonText = 'EXIT VR';

    this.currentSession = session;

    if (this.args.onSessionStartedCallback) {
      this.args.onSessionStartedCallback(session);
    }
  }

  /**
   * Called whenever a WebXR session ends.
   * Removes listeners, updates button text and triggers
   * registered callback function.
   */
  onSessionEnded() {
    if (!this.currentSession) return;

    this.currentSession = null;

    this.buttonText = 'ENTER VR';

    if (this.args.onSessionEndedCallback) {
      this.args.onSessionEndedCallback();
    }
  }

  @action
  async onClick() {
    this.updateVrStatus();
    if (!this.vrSupported) return;

    if (!this.currentSession) {
      const sessionInit = { optionalFeatures: ['local-floor'] };
      // @ts-ignore
      navigator.xr.requestSession('immersive-vr', sessionInit).then(this.onSessionStarted.bind(this));
    } else {
      await this.currentSession.end();
      this.onSessionEnded();
    }
  }
}
