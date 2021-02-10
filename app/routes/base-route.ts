import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';

export default class BaseRoute extends Route {
  @service
  auth!: Auth;

  async beforeModel() {
    // this is where we check if a user is authenticated
    // if not authenticated, kick them to the home page
    await this.auth.checkLogin().catch(() => this.transitionTo('/'));
  }
}
