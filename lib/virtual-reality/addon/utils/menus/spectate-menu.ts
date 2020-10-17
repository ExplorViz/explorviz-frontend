import BaseMenu from './base-menu';
import TextbuttonItem from './items/textbutton-item';
import TextItem from './items/text-item';

export default class SpectateMenu extends BaseMenu {
  constructor(openMainMenu: () => void) {
    super();

    this.back = openMainMenu;

    const title = new TextItem('Spectate', 'title', '#ffffff', { x: 256, y: 20 }, 50, 'center');
    this.items.push(title);

    const backButton = new TextbuttonItem('back', 'Back', {
      x: 100,
      y: 402,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');

    backButton.onTriggerDown = this.back;

    this.items.push(backButton);
    this.update();
  }
}