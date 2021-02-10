import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import THREE from 'three';

export default class TeleportMesh extends BaseMesh {
  constructor(color = new THREE.Color(0x0000dc)) {
    super(color);

    this.geometry = new THREE.RingGeometry(0.14, 0.2, 32);
    this.geometry.rotateX(-90 * THREE.MathUtils.DEG2RAD);

    this.material = new THREE.MeshLambertMaterial({ color });
    this.material.transparent = true;
    this.material.opacity = 0.4;

    this.visible = false;
  }

  showAbovePosition(position: THREE.Vector3, yOffset = 0.005) {
    this.visible = true;

    // Set teleport mesh (just) above the given position
    this.position.copy(position);
    this.position.y += yOffset;
  }
}
