import Controller from '@ember/controller';
import { action } from '@ember/object';
import LandscapeTokenService, { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import ENV from 'explorviz-frontend/config/environment';

const { userService } = ENV.backendAddresses;

export default class Landscapes extends Controller {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('auth')
  auth!: Auth;

  @action
  selectToken(token: LandscapeToken) {
    this.tokenService.setToken(token);
    this.transitionToRoute('visualization');
  }

  @action
  async createToken() {
    try {
      const token = await this.sendTokenCreateRequest();
      AlertifyHandler.showAlertifySuccess(`Token created: ${token.value}`);
      this.send('refreshRoute');
    } catch (e) {
      AlertifyHandler.showAlertifySuccess(e.message);
    }
  }

  @action
  async deleteToken(tokenId: string) {
    try {
      await this.sendTokenDeleteRequest(tokenId);
      AlertifyHandler.showAlertifySuccess('Token successfully deleted');
    } catch (e) {
      AlertifyHandler.showAlertifySuccess(e.message);
    }
    if (this.tokenService.token?.value === tokenId) {
      this.tokenService.removeToken();
    }
    this.send('refreshRoute');
  }

  sendTokenCreateRequest() {
    let uId = this.auth.user?.sub;

    if (!uId) {
      return Promise.reject(new Error('User profile not set'));
    }

    uId = encodeURI(uId);

    return new Promise<any>((resolve, reject) => {
      fetch(`${userService}/user/${uId}/token`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
        method: 'POST',
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const token = await response.json();
            resolve(token);
          } else {
            reject(new Error('Something went wrong'));
          }
        })
        .catch((e) => reject(e));
    });
  }

  sendTokenDeleteRequest(tokenId: string) {
    return new Promise<undefined>((resolve, reject) => {
      fetch(`${userService}/token/${tokenId}`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
        method: 'DELETE',
      })
        .then(async (response: Response) => {
          if (response.ok) {
            resolve(undefined);
          } else if (response.status === 404) {
            reject(new Error('Token not found'));
          } else {
            reject(new Error('Something went wrong'));
          }
        })
        .catch((e) => reject(e));
    });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'landscapes': Landscapes;
  }
}
