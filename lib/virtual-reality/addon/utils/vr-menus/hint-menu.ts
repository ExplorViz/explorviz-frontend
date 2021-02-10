import THREE from 'three';
import BaseMenu from './base-menu';
import TextItem from './items/text-item';

export default class HintMenu extends BaseMenu {
  // Properties for animation
  blinks: number;

  dir: number;

  moved: number;

  counter: number;

  constructor(parent: THREE.Object3D, title: string,
    text: string|null = null, blinks = 2) {
    super({ width: 512, height: 128 }, '#002e4f');

    this.blinks = blinks;
    this.dir = 1;
    this.moved = 0.0;
    this.counter = 0;

    this.opacity = 0.7;

    const titleItem = new TextItem(title, 'text', '#ffffff', { x: 256, y: 50 }, 28, 'center');
    this.items.push(titleItem);

    if (text) {
      titleItem.position.y = 25;
      const contentItem = new TextItem(text, 'text2', '#ffff00', { x: 256, y: 75 }, 28, 'center');
      this.items.push(contentItem);
    }

    this.position.x = 0.035;
    this.position.y = -0.1;
    this.position.z = -0.3;
    this.rotateX(-0.18);
    this.scale.x = 0;

    parent.add(this);
    this.update();
  }

  // Animates menu closing animation, the reverse of the open animation
  // Closes menu afterward
  endAnimation() {
    this.moved += 0.05;
    if (this.moved >= 0 && this.moved < 1) {
      this.scale.x -= 0.05;
    } else if (this.moved >= 1) {
      // if close animation done, actually close menu.
      this.moved = 0;

      // Remove menu
      this.back();
      return;
    }
    requestAnimationFrame(this.endAnimation.bind(this));
  }

  // Animates hint menu's pulsation effect
  animatePulsation() {
    this.moved += 0.00075;
    if (this.counter < 2 * this.blinks) {
      if (this.moved >= 0 && this.moved < 0.015) {
        this.position.z += this.dir * 0.00075;
      } else if (this.moved >= 0.015) {
        this.position.z += this.dir * 0.00075;
        this.dir *= -1;
        this.moved = 0;
        this.counter++;
      }
      requestAnimationFrame(this.animatePulsation.bind(this));
    } else {
      // If pulsation done, close menu
      this.counter = 0;
      this.endAnimation();
    }
  }

  // Menu's stretch-open animation
  startAnimation() {
    this.moved += 0.05;
    if (this.moved >= 0 && this.moved < 1) {
      this.scale.x += 0.05;
    } else if (this.moved >= 1) {
      // If opened, make menu pulsate
      this.moved = 0;
      this.animatePulsation();
      return;
    }
    requestAnimationFrame(this.startAnimation.bind(this));
  }
}
