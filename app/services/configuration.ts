import Service from '@ember/service';
import THREE from 'three';
import { tracked } from '@glimmer/tracking';

export type LandscapeColors = {
  system: THREE.Color,
  nodegroup: THREE.Color,
  node: THREE.Color,
  application: THREE.Color,
  communication: THREE.Color,
  systemText: THREE.Color,
  nodeText: THREE.Color,
  applicationText: THREE.Color,
  collapseSymbol: THREE.Color,
  background: THREE.Color
};

export type ApplicationColors = {
  foundation: THREE.Color,
  componentOdd: THREE.Color,
  componentEven: THREE.Color,
  clazz: THREE.Color,
  highlightedEntity: THREE.Color,
  componentText: THREE.Color,
  clazzText: THREE.Color,
  foundationText: THREE.Color,
  communication: THREE.Color,
  communicationArrow: THREE.Color,
  background: THREE.Color
};

export type ExtensionDescription = {
  id: string,
  title: string,
  link: string,
  nestedRoute: string,
  paneName: string
};

/**
 * The Configuration Service handles color settings for the
 * visualization and configuration extensions
 * @class Configuration-Service
 * @extends Ember.Service
 */
export default class Configuration extends Service {
  /**
  * Array for component-based settings dialogs. Any extension may push an object
  * with the name of it's settings-component and it's title in this array. See
  * the extension "colorpicker"" for exemplary usage.
  *
  * @property configurationExtensions
  * @type Array
  */
  configurationExtensions: ExtensionDescription[] = [];

  /**
  * Colors for landscape visualization
  *
  * @property landscapeColors
  * @type LandscapeColors
  */
  @tracked
  landscapeColors: LandscapeColors;

  /**
  * Colors for application visualization
  *
  * @property applicationColors
  * @type ApplicationColors
  */
  @tracked
  applicationColors: ApplicationColors;

  /**
   * Sets default colors
   */
  constructor() {
    super(...arguments);

    this.landscapeColors = {
      system: new THREE.Color('#c7c7c7'), // grey
      nodegroup: new THREE.Color('#169e2b'), // dark green
      node: new THREE.Color('#00bb41'), // green
      application: new THREE.Color('#3e14a0'), // purple-blue
      communication: new THREE.Color('#f49100'), // orange
      systemText: new THREE.Color('#000000'), // black
      nodeText: new THREE.Color('#ffffff'), // white
      applicationText: new THREE.Color('#ffffff'), // white
      collapseSymbol: new THREE.Color('#000000'), // black
      background: new THREE.Color('#ffffff'), // white
    };

    this.applicationColors = {
      foundation: new THREE.Color('#c7c7c7'), // grey
      componentOdd: new THREE.Color('#169e2b'), // dark green
      componentEven: new THREE.Color('#00bb41'), // light green
      clazz: new THREE.Color('#3e14a0'), // purple-blue
      highlightedEntity: new THREE.Color('#ff0000'), // red
      componentText: new THREE.Color('#ffffff'), // white
      clazzText: new THREE.Color('#ffffff'), // white
      foundationText: new THREE.Color('#000000'), // black
      communication: new THREE.Color('#f49100'), // orange
      communicationArrow: new THREE.Color('#000000'), // black
      background: new THREE.Color('#ffffff'), // white
    };
  }
}

declare module '@ember/service' {
  interface Registry {
    'configuration': Configuration;
  }
}
