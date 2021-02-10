import config from './config/environment';
import EmberRouter from '@ember/routing/router';

/**
* Ember router for mapping "route" and respective "template".
*
* @class Router
* @extends Ember.Router
*
* @module ember
*/
const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL,
  configurationRouteExtensions: null,
});

Router.map(function () {
  this.route('badroute', { path: "/*path" });
  this.route('login');
  this.route('callback');
  this.route('visualization');
  this.route('landscapes');
});

export default Router;