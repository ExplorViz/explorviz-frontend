const sass = require('sass');
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = (defaults) => {
  const app = new EmberApp(defaults, {
    octicons: {
      // load selected icons for popup-handler since it does not (yet) use components / templates
      icons: ['arrow-right', 'arrow-both', 'code', 'list-ordered', 'clock', 'tools'],
    },

    // Default implementation for ember-cli-sass
    sassOptions: {
      implementation: sass,
      includePaths: ['lib/virtual-reality/addon/styles'],
    },

    svgJar: {
      sourceDirs: [
        'public', // default SVGJar lookup directory
        'node_modules/octicons/build/svg',
      ],
    },

    'ember-cli-babel': {
      includePolyfill: true,
    },

    fingerprint: {
      exclude: ['images'],
    },

    'ember-bootstrap': {
      bootstrapVersion: 4,
      importBootstrapFont: false,
      importBootstrapCSS: false,
    },

    autoImport: {
      webpack: {
        node: {
          global: true,
        },
      }
    },
  });

  // export for threex.dynamictexture
  app.import('node_modules/three/build/three.min.js', {
    prepend: true,
  });

  app.import('vendor/threex/threex.rendererstats.min.js');
  app.import('vendor/threex/threex.dynamictexture.min.js');

  app.import('vendor/alertifyjs/alertify.min.js');
  app.import('vendor/alertifyjs/css/alertify.min.css');
  app.import('vendor/alertifyjs/css/themes/default.min.css');

  app.import('vendor/cytoscape/cytoscape.min.js');

  app.import('vendor/eventsource-polyfill/eventsource.min.js');

  app.import('node_modules/bootstrap/dist/js/bootstrap.min.js');

  app.import('node_modules/auth0-js/build/auth0.js');
  app.import('node_modules/bootstrap-colorpicker/dist/css/bootstrap-colorpicker.min.css');
  app.import('node_modules/bootstrap-colorpicker/dist/js/bootstrap-colorpicker.min.js');

  app.import('node_modules/webxr-polyfill/build/webxr-polyfill.min.js');
  app.import('node_modules/elkjs/lib/elk-api.js');

  return app.toTree();
};
