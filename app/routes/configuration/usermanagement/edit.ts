import BaseRoute from 'explorviz-frontend/routes/base-route';
// @ts-ignore
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';
import AlertifyHandler from 'explorviz-frontend/mixins/alertify-handler';

import { inject as service } from "@ember/service";
import DS from 'ember-data';

export default class UserManagementEditRoute extends BaseRoute.extend(AuthenticatedRouteMixin, AlertifyHandler) {

  @service('store')
  store!: DS.Store;

  model(this:UserManagementEditRoute, { user_id }:{ user_id:string }) {
    return this.get('store').findRecord('user', user_id, {reload: true});
  }

  actions = {
    // @Override BaseRoute
    resetRoute(this: UserManagementEditRoute) {
      this.transitionTo('configuration.usermanagement');
    },

    goBack(this: UserManagementEditRoute) {
      this.transitionTo('configuration.usermanagement');
    },

    error(this: UserManagementEditRoute, error:any) {
      let notFound = error === 'not-found' ||
        (error &&
          error.errors &&
          error.errors[0] &&
          error.errors[0].status == 404);

      // routes that can't find models
      if (notFound) {
        this.showAlertifyMessage('Error: User was not found.');
        this.transitionTo('configuration.usermanagement');
        return;
      } else {
        return true;
      }
    }
  }
}