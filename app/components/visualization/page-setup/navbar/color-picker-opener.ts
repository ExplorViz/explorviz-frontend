import { action } from '@ember/object';
import Component from '@glimmer/component';

interface ColorPickerArgs {
  addComponent(componentPath: string): void
}

export default class ColorPickerOpener extends Component<ColorPickerArgs> {
  @action
  showColorPicker() {
    this.args.addComponent('color-picker');
  }
}
