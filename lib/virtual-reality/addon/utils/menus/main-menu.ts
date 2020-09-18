import TextItem from './items/text-item';
import BaseMenu from './base-menu';
import TextbuttonItem from './items/textbutton-item';

export default class MainMenu extends BaseMenu {
  constructor(closeMenu: () => void, openCameraMenu: () => void, openLandscapeMenu: () => void,
    openAdvancedMenu: () => void) {
    super();

    this.opacity = 0.8;

    const title = new TextItem('Options', 'title', '#ffffff', { x: 256, y: 20 }, 50, 'center');
    this.items.push(title);

    const cameraButton = new TextbuttonItem('change_height', 'Change Camera', {
      x: 100,
      y: 80,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');

    cameraButton.onTriggerPressed = openCameraMenu;

    const landscapeButton = new TextbuttonItem('change_landscape_position', 'Move Landscape', {
      x: 100,
      y: 140,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');

    landscapeButton.onTriggerPressed = openLandscapeMenu;

    const spectateButton = new TextbuttonItem('spectate', 'Spectate', {
      x: 100,
      y: 200,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');
    const connectionButton = new TextbuttonItem('connection', 'Connection', {
      x: 100,
      y: 260,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');
    const advancedButton = new TextbuttonItem('advanced', 'Advanced Options', {
      x: 100,
      y: 320,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');

    advancedButton.onTriggerPressed = openAdvancedMenu;

    const exitButton = new TextbuttonItem('exit', 'Exit', {
      x: 100,
      y: 402,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');

    exitButton.onTriggerPressed = closeMenu;

    this.items.push(cameraButton, landscapeButton, spectateButton,
      connectionButton, advancedButton, exitButton);
    this.update();
  }
}
