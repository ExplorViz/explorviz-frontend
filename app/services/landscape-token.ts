/* eslint-disable class-methods-use-this */
import Service from '@ember/service';

export type LandscapeToken = {
  ownerId: string,
  value: string,
};

export default class LandscapeTokenService extends Service {
  token: LandscapeToken|null = null;

  init() {
    super.init();

    this.restoreToken();
  }

  restoreToken() {
    const currentLandscapeTokenJSON = localStorage.getItem('currentLandscapeToken');

    if (currentLandscapeTokenJSON === null) {
      this.set('token', null);
      return;
    }

    const parsedToken = JSON.parse(currentLandscapeTokenJSON);

    if (this.isValidToken(parsedToken)) {
      this.set('token', parsedToken);
    } else {
      this.removeToken();
    }
  }

  setToken(token: LandscapeToken) {
    localStorage.setItem('currentLandscapeToken', JSON.stringify(token));
    this.set('token', token);
  }

  removeToken() {
    localStorage.removeItem('currentLandscapeToken');
    this.set('token', null);
  }

  private isValidToken(token: unknown): token is LandscapeToken {
    return (this.isObject(token)
      && Object.keys(token).length === 2
      && {}.hasOwnProperty.call(token, 'ownerId')
      && {}.hasOwnProperty.call(token, 'value')
      && typeof (<LandscapeToken>token).ownerId === 'string'
      && typeof (<LandscapeToken>token).value === 'string');
  }

  private isObject(variable: unknown): variable is object {
    return Object.prototype.toString.call(variable) === '[object Object]';
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'landscape-token': LandscapeTokenService;
  }
}
