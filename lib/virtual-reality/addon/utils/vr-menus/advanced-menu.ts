import TextItem from './items/text-item';
import BaseMenu from './base-menu';
import TextbuttonItem from './items/textbutton-item';
import CheckboxItem from './items/checkbox-item';

export default class AdvancedMenu extends BaseMenu {
  isLefty: boolean;

  constructor(openMainMenu: () => void, toggleLeftyMode: () => void, userIsLefty: boolean, resetAll: () => void) {
    super();

    this.isLefty = userIsLefty;

    this.back = openMainMenu;

    const textItem = new TextItem('Advanced Options', 'title', '#ffffff', { x: 256, y: 20 }, 50, 'center');
    this.items.push(textItem);

    const leftyText = new TextItem('Lefty Mode', 'isLeftyText', '#ffffff', { x: 100, y: 148 }, 28, 'left');
    this.items.push(leftyText);

    const leftyCB = new CheckboxItem('isLefty', {
      x: 366,
      y: 126,
    }, 50, 50, '#ffc338', '#ffffff', '#00e5ff', 5, this.isLefty, true);
    this.items.push(leftyCB);

    leftyCB.onTriggerDown = () => {
      toggleLeftyMode();
      this.isLefty = !this.isLefty;
      leftyCB.isChecked = this.isLefty;
      this.update();
    };

    const resetAllButton = new TextbuttonItem('resetAll', 'Reset all', {
      x: 100,
      y: 266,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');

    resetAllButton.onTriggerDown = () => {
      resetAll();
    };

    const backButton = new TextbuttonItem('back', 'Back', {
      x: 100,
      y: 402,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');

    backButton.onTriggerDown = this.back;

    this.items.push(resetAllButton, backButton);
    this.update();
  }
}
