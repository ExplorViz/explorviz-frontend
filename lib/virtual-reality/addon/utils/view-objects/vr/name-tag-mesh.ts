import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import THREE from 'three';
import * as Helper from '../../vr-helpers/multi-user-helper';

export default class NameTagMesh extends BaseMesh {
  canvas: HTMLCanvasElement;

  constructor(username: string, color: THREE.Color) {
    super();

    const textSize = Helper.getTextSize(username, '30px arial');

    // Width according to textsize, will be automatically resized to a power of two
    const width = textSize.width + 20;
    const height = textSize.height + 20;

    // Use canvas to display text
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');

    if (!ctx) return;

    ctx.fillStyle = 'rgba(200, 200, 216, 0.5)'; // Light grey
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.font = '30px arial';
    ctx.fillStyle = `#${color.getHexString()}`; // Username is colored in corresponding color
    ctx.textAlign = 'center';
    ctx.fillText(username, this.canvas.width / 2, 35);

    const texture = new THREE.Texture(this.canvas);

    texture.needsUpdate = true;

    this.geometry = new THREE.PlaneGeometry(width / 500, height / 500, 32);
    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      side: THREE.DoubleSide,
    });

    this.material.transparent = true;
    this.material.opacity = 0.8;
  }
}
