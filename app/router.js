import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('visualization');
  this.route('tutorial');
  this.route('administration');
  this.route('login');
  this.route('badroute', { path: "/*path" });
});

export default Router;
