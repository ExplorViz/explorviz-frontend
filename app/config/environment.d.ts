/**
 * Type declarations for
 *    import config from './config/environment'
 *
 * For now these need to be managed by the developer
 * since different ember addons can materialize new entries.
 */
declare const config: {
  environment: any;
  modulePrefix: string;
  podModulePrefix: string;
  locationType: string;
  rootURL: string;
  auth0: {
    clientId: string,
    domain: string,
    logoUrl: string,
    callbackUrl: string,
    logoutReturnUrl: string,
    routeAfterLogin: string
  },
  backendAddresses: {
    landscapeService: string,
    traceService: string,
    userService: string,
  },
  APP: any;
};

export default config;
