import Ember from 'ember';

const {Component, inject} = Ember;

/**
* This component renders all routes (!), that are registered in 
* {{#crossLink "Page-Setup-Service"}}{{/crossLink}}, as nav-links.
* 
* 
* @class Navbar-Routes
* @extends Ember.Component
*
* @module explorviz
* @submodule page
*/
export default Component.extend({
  tagName: "ul",

  classNames:["nav", "navbar-nav"],

  pageSetupService: inject.service('page-setup'),

  actions: {
    resetRoute() {
      this.sendAction("resetRoute");
    }
  }
});
