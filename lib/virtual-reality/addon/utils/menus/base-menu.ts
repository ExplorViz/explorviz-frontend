import THREE from 'three';
import Item from './items/item';
import InteractiveItem from './items/interactive-item';

export default abstract class BaseMenu extends THREE.Mesh {
  canvas: HTMLCanvasElement;

  resolution: { width: number, height: number };

  items: Item[];

  color: string;

  lastHoveredItem: InteractiveItem|undefined;

  get opacity() {
    const material = this.material as THREE.Material;
    return material.opacity;
  }

  set opacity(value: number) {
    const material = this.material as THREE.Material;
    material.opacity = value;
  }

  constructor(resolution: { width: number, height: number } = { width: 512, height: 512 }, color = '#444444') {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
    });
    super(new THREE.PlaneGeometry(0.3, 0.3), material);

    this.resolution = resolution;
    this.color = color;
    this.items = [];

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.resolution.width;
    this.canvas.height = this.resolution.height;
  }

  update() {
    const { canvas } = this;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      item.drawToCanvas(ctx);
    }

    // create texture out of canvas
    const texture = new THREE.CanvasTexture(canvas);
    // Map texture
    const material = new THREE.MeshBasicMaterial({ map: texture, depthTest: true });
    material.transparent = true;
    material.opacity = this.opacity;

    // Update texture
    texture.needsUpdate = true;
    // Update mesh material
    this.material = material;
  }

  hover(uv: THREE.Vector2) {
    const item = this.getItem(uv) as InteractiveItem|undefined;

    if (this.lastHoveredItem && !item) {
      this.lastHoveredItem.removeHoverEffect();
      this.lastHoveredItem = undefined;
    } else if (this.lastHoveredItem && item && this.lastHoveredItem !== item) {
      this.lastHoveredItem.removeHoverEffect();
      item.enableHoverEffect();
      this.lastHoveredItem = item;
    } else if (!this.lastHoveredItem && item) {
      item.enableHoverEffect();
      this.lastHoveredItem = item;
    }

    this.update();
  }

  removeHoverEffect() {
    if (this.lastHoveredItem) {
      this.lastHoveredItem.removeHoverEffect();
      this.lastHoveredItem = undefined;
    }

    this.update();
  }

  triggerDown(uv: THREE.Vector2) {
    const item = this.getItem(uv) as InteractiveItem|undefined;

    if (item && item.onTriggerDown) {
      item.onTriggerDown();
    }
  }

  triggerPress(uv: THREE.Vector2, value: number) {
    const item = this.getItem(uv) as InteractiveItem|undefined;

    if (item && item.onTriggerPressed) {
      item.onTriggerPressed(value);
    }
  }

  /**
   * Finds the menu item at given uv position.
   *
   * @param position - The uv position.
   *
   * @returns Item at given position if there is one, else undefined.
   */
  getItem(position: THREE.Vector2, onlyInteractiveItems = true) {
    const items = onlyInteractiveItems
      ? this.items.filter((item) => item instanceof InteractiveItem)
      : this.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // calculate pixel position
      const x = this.resolution.width * position.x;
      const y = this.resolution.height - (this.resolution.height * position.y);

      const {
        minX,
        minY,
        maxX,
        maxY,
      } = item.getBoundingBox();

      if (x >= minX && y >= minY && x <= maxX && y <= maxY) {
        return item;
      }
    }
    return undefined;
  }
}
