import THREE from 'three';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';

export default class CloseIcon extends BaseMesh {
  radius: number;

  constructor(texture: THREE.Texture, radius = 6, segments = 32) {
    super(new THREE.Color());

    this.radius = radius;

    this.geometry = new THREE.SphereGeometry(radius, segments, segments);

    this.material = new THREE.MeshPhongMaterial({
      map: texture,
    });
  }

  /**
   * Calculates the position at the top right corner of the given application object
   * and adds the close icon to the application at that position.
   *
   * @param applicationObject3D Object to which the icon shall be added
   */
  addToApplication(applicationObject3D: ApplicationObject3D) {
    this.position.copy(applicationObject3D.position);

    const bboxApp3D = new THREE.Box3().setFromObject(applicationObject3D);
    this.position.x = bboxApp3D.max.x + this.radius;
    this.position.z = bboxApp3D.max.z + this.radius;

    this.geometry.rotateX(90 * THREE.MathUtils.DEG2RAD);
    this.geometry.rotateY(90 * THREE.MathUtils.DEG2RAD);
    applicationObject3D.add(this);
  }
}
