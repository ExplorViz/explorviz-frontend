import { Object3D } from 'three';
import BaseMenu from './base-menu';
import TextItem from './items/text-item';

type Message = {title: string, text?: string, color: string};

export default class MessageBoxMenu extends BaseMenu {
  messageQueue: {message: Message, time: number}[];

  timeBetweenMessages: number;

  parent: THREE.Object3D;

  constructor(parent: Object3D) {
    super({ width: 256, height: 64 }, '#000000');

    this.opacity = 0.7;
    this.messageQueue = [];
    this.timeBetweenMessages = 800;
    this.parent = parent;
    this.visible = false;
  }

  positionMessageBox() {
    this.position.x = 0.035;
    this.position.y = 0.3;
    this.position.z = -0.3;
    this.rotation.x = 0.45;

    this.parent.add(this);
  }

  /**
     * Add text to messageQueue which should be displayed on top edge of hmd.
     *
     * @param {Message} message Title and text which should be displayed.
     * @param {Number} time The number of milliseconds the message is displayed.
     */
  enqueueMessage(message: Message, time: number = 3000) {
    this.messageQueue.push({ message, time });
    if (this.messageQueue.length === 1) {
      this.showMessage();
    }
  }

  /**
       * Displays text messages on the top edge of the hmd for 3 seconds
       */
  showMessage() {
    if (this.messageQueue.length <= 0) { return; }

    const { message, time } = this.messageQueue[0];

    this.setText(message.title, message.text, message.color);
    this.visible = true;

    this.positionMessageBox();
    let yOffset = 0;
    const self = this;

    function downwardAnimation() {
      yOffset -= 0.015;
      if (yOffset > -0.195) {
        self.position.y -= 0.015;
      } else {
        return;
      }
      requestAnimationFrame(downwardAnimation);
    }

    function upwardAnimation() {
      yOffset += 0.015;
      if (yOffset < 0.195) {
        self.position.y += 0.015;
      } else {
        return;
      }
      requestAnimationFrame(upwardAnimation);
    }

    // Animate
    downwardAnimation();
    yOffset = 0;
    setTimeout(upwardAnimation, 0.8 * time);
    setTimeout(this.closeAfterTime.bind(this), time);
  }

  setText(title: string, text: string|undefined, color: string) {
    const textColor = color || 'lightgreen';

    this.items.clear();

    const titleItem = new TextItem(title, 'title', textColor, { x: 128, y: 10 }, 18, 'center');
    this.items.push(titleItem);

    if (text) {
      const textItem = new TextItem(text, 'text', textColor, { x: 128, y: 40 }, 14, 'center');
      this.items.push(textItem);
    } else {
      titleItem.position.y = 21;
      titleItem.fontSize = 22;
    }

    this.update();
  }

  closeAfterTime() {
    this.visible = false;

    setTimeout(() => {
      if (this.messageQueue.length > 0) {
        this.messageQueue.shift();
        this.showMessage();
      }
    }, this.timeBetweenMessages);
  }
}
