import { action } from '@ember/object';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import Configuration, { LandscapeColors, ApplicationColors } from 'explorviz-frontend/services/configuration';

interface Args {
  isLandscapeView: Boolean
  removeComponent(componentPath: string): void
  updateView(): void
}

export default class ColorPicker extends Component<Args> {
  @service('configuration')
  configuration!: Configuration;

  @action
  applyColorScheme(scheme: string) {
    if (scheme === 'default') {
      this.applyDefaultColors();
    } else if (scheme === 'impaired') {
      this.applyVisuallyImpairedColors();
    }
  }

  @action
  close() {
    this.args.removeComponent('color-picker');
  }

  @action
  setupLandscapeColorpicker(colorName: keyof LandscapeColors, element: HTMLElement) {
    const configColor = this.configuration.landscapeColors[colorName];
    this.setupColorpicker(element, configColor);
  }

  @action
  setupApplicationColorPicker(colorName: keyof ApplicationColors, element: HTMLElement) {
    const configColor = this.configuration.applicationColors[colorName];
    this.setupColorpicker(element, configColor);
  }

  /**
   * Initilizes a given colorpicker element with a passed color.
   * Additionally, the color update event is handled.
   *
   * @param element The HTML colorpicker element
   * @param configColor Reference to the respective color in the configuration service
   */
  setupColorpicker(element: HTMLElement, configColor: THREE.Color) {
    // eslint-disable-next-line
    $(`#${element.id}`)
    // @ts-ignore
      .colorpicker(
        {
          color: configColor.getHexString(),
          format: 'hex',
          useAlpha: false,
        },
      ).on('colorpickerChange', (e: any) => {
        const inputColor = e.color.toHexString();
        configColor.set(inputColor);

        this.args.updateView();
      });
  }

  /**
   * Marks the colors in configuration as updated and triggers a view update.
   */
  updateView() {
    if (this.args.isLandscapeView) {
      this.configuration.notifyPropertyChange('landscapeColors');
    } else {
      this.configuration.notifyPropertyChange('applicationColors');
    }

    this.args.updateView();
  }

  /**
   * Sets color values to default.
   * Triggers update of color configuration and colors of current view.
   */
  applyDefaultColors() {
    if (this.args.isLandscapeView) {
      const { landscapeColors } = this.configuration;

      landscapeColors.system.set('#c7c7c7'); // grey
      landscapeColors.nodegroup.set('#169e2b'); // dark green
      landscapeColors.node.set('#00bb41'); // green
      landscapeColors.application.set('#3e14a0'); // purple-blue
      landscapeColors.communication.set('#f49100'); // orange
      landscapeColors.systemText.set('#000000'); // black
      landscapeColors.nodeText.set('#ffffff'); // white
      landscapeColors.applicationText.set('#ffffff'); // white
      landscapeColors.collapseSymbol.set('#000000'); // black
      landscapeColors.background.set('#ffffff'); // white
    } else {
      const { applicationColors } = this.configuration;
      applicationColors.foundation.set('#c7c7c7'); // grey
      applicationColors.componentOdd.set('#169e2b'); // dark green
      applicationColors.componentEven.set('#00bb41'); // light green
      applicationColors.clazz.set('#3e14a0'); // purple-blue
      applicationColors.highlightedEntity.set('#ff0000'); // red
      applicationColors.componentText.set('#ffffff'); // white
      applicationColors.clazzText.set('#ffffff'); // white
      applicationColors.foundationText.set('#000000'); // black
      applicationColors.communication.set('#f49100'); // orange
      applicationColors.communicationArrow.set('#000000'); // black
      applicationColors.background.set('#ffffff'); // white
    }

    this.updateView();
  }

  /**
   * Updates color values such that they better suit visually impaired users.
   * Triggers update of color configuration and colors of current view.
   */
  applyVisuallyImpairedColors() {
    if (this.args.isLandscapeView) {
      const { landscapeColors } = this.configuration;

      landscapeColors.system.set('#c7c7c7'); // grey
      landscapeColors.nodegroup.set('#015a6e'); // dark green
      landscapeColors.node.set('#0096be'); // green
      landscapeColors.application.set('#5f5f5f'); // purple-blue
      landscapeColors.communication.set('#f49100'); // orange
      landscapeColors.systemText.set('#000000'); // black
      landscapeColors.nodeText.set('#ffffff'); // white
      landscapeColors.applicationText.set('#ffffff'); // white
      landscapeColors.collapseSymbol.set('#000000'); // black
      landscapeColors.background.set('#ffffff'); // white
    } else {
      const { applicationColors } = this.configuration;

      applicationColors.foundation.set('#c7c7c7'); // grey
      applicationColors.componentOdd.set('#015a6e'); // blue
      applicationColors.componentEven.set('#0096be'); // light blue
      applicationColors.clazz.set('#5f5f5f'); // dark grey
      applicationColors.highlightedEntity.set('#ff0000'); // red
      applicationColors.componentText.set('#ffffff'); // white
      applicationColors.clazzText.set('#ffffff'); // white
      applicationColors.foundationText.set('#000000'); // black
      applicationColors.communication.set('#f49100'); // orange
      applicationColors.communicationArrow.set('#000000'); // black
      applicationColors.background.set('#ffffff'); // white
    }

    this.updateView();
  }
}
