/* jshint node: true */

/* eslint no-console: 0 */

var colors = require('colors'); // eslint-disable-line
const AUTH_CONFIG = require('./auth0-variables');
const BACKEND_CONFIG = require('./backend-addresses');

module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'explorviz-frontend',
    environment,
    rootURL: '/',
    locationType: 'auto',
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false,
      },
    },
    auth0: {
      clientId: AUTH_CONFIG.clientId,
      domain: AUTH_CONFIG.domain,
      logoUrl: AUTH_CONFIG.logoUrl,
      callbackUrl: AUTH_CONFIG.callbackUrl,
      logoutReturnUrl: AUTH_CONFIG.logoutReturnUrl,
      routeAfterLogin: AUTH_CONFIG.routeAfterLogin,
    },
    backendAddresses: {
      landscapeService: BACKEND_CONFIG.landscapeService,
      traceService: BACKEND_CONFIG.traceService,
      userService: BACKEND_CONFIG.userService,
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    },
  };

  let API_ROOT;

  if (environment === 'development') {
    API_ROOT = 'http://localhost:8080';

    if (process.env.API_ROOT) {
      API_ROOT = process.env.API_ROOT;
    }

    ENV.APP.API_ROOT = API_ROOT;

    console.log('');
    console.log(`EXPL-INFO: Development mode: Using ${API_ROOT} as API_ROOT`.blue);
  }

  if (environment === 'production') {
    console.log('');

    // var rootURL = 'change-rootURL';
    API_ROOT = 'change-API_ROOT';

    if (process.env.API_ROOT) {
      console.log('EXPL-INFO: Using environment variable as API_ROOT'.blue);
      API_ROOT = process.env.API_ROOT;
    }

    ENV.APP.API_ROOT = API_ROOT;

    console.log('');
    console.log(`EXPL-INFO: Production mode: Using ${API_ROOT} as API_ROOT`.blue);

    if (API_ROOT === 'change-API_ROOT') {
      console.log(`EXPL-WARNING: This is prodution mode. You must override the 'API_ROOT' variable with its current value: ${API_ROOT}`.yellow);
      console.log('EXPL-WARNING: Set the environment variable API_ROOT=XXX'.yellow);
    }
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    ENV.APP.autoboot = false;

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
  }

  return ENV;
};
