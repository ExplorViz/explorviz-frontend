import Service, { inject as service } from '@ember/service';
import config from 'explorviz-frontend/config/environment';
import { Auth0Error, Auth0UserProfile } from 'auth0-js';
import Auth0Lock from 'auth0-lock';
import debugLogger from 'ember-debug-logger';

export default class Auth extends Service {
  private debug = debugLogger();

  @service('router')
  router!: any;

  // is initialized in the init()
  private lock!: Auth0LockStatic;

  user: Auth0UserProfile|undefined = undefined;

  accessToken: string|undefined = undefined;

  init() {
    super.init();

    this.lock = new Auth0Lock(
      config.auth0.clientId,
      config.auth0.domain,
      {
        auth: {
          redirectUrl: config.auth0.callbackUrl,
          audience: `https://${config.auth0.domain}/api/v2/`,
          responseType: 'token',
          params: {
            scope: 'openid profile',
          },
          autoParseHash: true,
        },
        theme: {
          logo: config.auth0.logoUrl,
        },
        closable: false,
        languageDictionary: {
          title: 'ExplorViz',
        },
      },
    );

    this.lock.on('authenticated', (authResult) => {
      this.router.transitionTo(config.auth0.routeAfterLogin).then(async () => {
        await this.setUser(authResult.accessToken);
        this.set('accessToken', authResult.accessToken);
      });
    });
  }

  /**
   * Send a user over to the hosted auth0 login page
   */
  login() {
    this.lock.show();
  }

  /**
   * Use the token to set our user
   */
  setUser(token: string) {
    // once we have a token, we are able to go get the users information
    return new Promise<Auth0UserProfile>((resolve, reject) => {
      this.lock.getUserInfo(token, (_err: Auth0Error, profile: Auth0UserProfile) => {
        if (_err) {
          reject(_err);
        } else {
          this.debug('User set', profile);
          this.set('user', profile);
          resolve(profile);
        }
      });
    });
  }

  /**
   * Check if we are authenticated using the auth0 library's checkSession
   */
  checkLogin() {
    // check to see if a user is authenticated, we'll get a token back
    return new Promise((resolve, reject) => {
      this.lock.checkSession({}, async (err, authResult) => {
        if (err || authResult === undefined) {
          this.set('user', undefined);
          this.set('accessToken', undefined);
          reject(err);
        } else {
          this.set('accessToken', authResult.accessToken);
          await this.setUser(authResult.accessToken);
          resolve(authResult);
        }
      });
    });
  }

  /**
   * Get rid of everything in sessionStorage that identifies this user
   */
  logout() {
    this.set('user', undefined);
    this.set('accessToken', undefined);
    this.lock.logout({
      clientID: config.auth0.clientId,
      returnTo: config.auth0.logoutReturnUrl,
    });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'auth': Auth;
  }
}
