import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import config from 'explorviz-frontend/config/environment';

/**
* TODO
*
* @class Login-Route
* @extends Ember.Route
*/
export default class LoginRoute extends Route {
  @service
  auth!: Auth;

  async beforeModel() {
    await this.auth.checkLogin()
      .then(() => this.transitionTo(config.auth0.routeAfterLogin))
      .catch(() => this.auth.login());
  }
}
