import TextItem from './items/text-item';
import BaseMenu from './base-menu';
import TextbuttonItem from './items/textbutton-item';
import ArrowbuttonItem from './items/arrowbutton-item';

export default class CameraMenu extends BaseMenu {
  constructor(openMainMenu: () => void, getCameraDelta: () => THREE.Vector3,
    changeCameraHeight: (deltaY: number) => void) {
    super();

    this.back = openMainMenu;

    const title = new TextItem('Camera', 'title', '#ffffff', { x: 256, y: 20 }, 50, 'center');
    this.items.push(title);

    const deltaItem = new TextItem(getCameraDelta().y.toFixed(2), 'camera_height', '#ffffff', { x: 256, y: 202 }, 28, 'center');
    this.items.push(deltaItem);

    const resetButton = new TextbuttonItem('reset', 'Reset', {
      x: 420,
      y: 13,
    }, 65, 40, 22, '#aaaaaa', '#ffffff', '#dc3b00');

    resetButton.onTriggerDown = () => {
      const delta = getCameraDelta().y;
      changeCameraHeight(-delta);
      deltaItem.text = getCameraDelta().y.toFixed(2);
    };

    this.items.push(resetButton);

    const heightDownButton = new ArrowbuttonItem('height_down', {
      x: 100,
      y: 182,
    }, 50, 60, '#ffc338', '#00e5ff', 'down');

    heightDownButton.onTriggerPressed = (value) => {
      changeCameraHeight(-0.02 * value);
      deltaItem.text = getCameraDelta().y.toFixed(2);
      this.update();
    };

    const heightUpButton = new ArrowbuttonItem('height_up', {
      x: 366,
      y: 182,
    }, 50, 60, '#ffc338', '#00e5ff', 'up');

    heightUpButton.onTriggerPressed = (value) => {
      changeCameraHeight(0.02 * value);
      deltaItem.text = getCameraDelta().y.toFixed(2);
      this.update();
    };

    const backButton = new TextbuttonItem('back', 'Back', {
      x: 100,
      y: 402,
    }, 316, 50, 28, '#555555', '#ffc338', '#929292');

    backButton.onTriggerDown = this.back;

    this.items.push(heightDownButton, heightUpButton, backButton);
    this.update();
  }
}
