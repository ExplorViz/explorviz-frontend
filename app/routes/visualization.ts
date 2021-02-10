import VisualizationController from 'explorviz-frontend/controllers/visualization';
import THREE from 'three';
import debugLogger from 'ember-debug-logger';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import { inject as service } from '@ember/service';
import BaseRoute from './base-route';

/**
* TODO
*
* @class Visualization-Route
* @extends Ember.Route
*/
export default class VisualizationRoute extends BaseRoute {
  @service('landscape-token')
  landscapeToken!: LandscapeTokenService;

  debug = debugLogger();

  async beforeModel() {
    if (this.landscapeToken.token === null) {
      this.transitionTo('landscapes');
    }
    await super.beforeModel();
  }

  model() {
    return new Promise((resolve, reject) => {
      new THREE.FontLoader().load(
        // resource URL
        '/three.js/fonts/roboto_mono_bold_typeface.json',

        // onLoad callback
        (font) => {
          resolve(font);
          this.debug('(THREE.js) font sucessfully loaded.');
        },
        undefined,
        (e) => {
          reject(e);
          this.debug('(THREE.js) font failed to load.');
        },
      );
    });
  }

  // @Override
  setupController(controller: VisualizationController, model: any, transition: any) {
    // Call _super for default behavior
    super.setupController(controller, model, transition);

    controller.initRendering();
  }

  // @Override Ember-Hook
  /* eslint-disable-next-line class-methods-use-this */
  resetController(controller: VisualizationController, isExiting: boolean, transition: any) {
    if (isExiting && transition.targetName !== 'error') {
      controller.send('resetLandscapeListenerPolling');
    }
  }
}
