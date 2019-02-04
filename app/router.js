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
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('login');
  this.route('visualization');
  this.route('discovery');
  this.route('configuration', function() {
    this.route('usermanagement', function() {
      this.route('users');
      this.route('edit', { path: '/edit/:user_id' });
      this.route('new');
    });
    this.route('settings');
  });
  this.route('base-route');
  this.route('badroute', { path: "/*path" });
  this.route('usermanagement', function() {});
});

export default Router;
