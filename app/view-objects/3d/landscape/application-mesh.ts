import THREE from 'three';
import Application from 'explorviz-frontend/models/application';
import PlaneMesh from './plane-mesh';
import PlaneLayout from '../../layout-models/plane-layout';

export default class ApplicationMesh extends PlaneMesh {
  dataModel: Application;

  material: THREE.MeshBasicMaterial;

  constructor(layout: PlaneLayout, applicationModel: Application,
    defaultColor: THREE.Color, highlightingColor = new THREE.Color('red')) {
    super(defaultColor, highlightingColor, layout);

    this.dataModel = applicationModel;
    this.material = new THREE.MeshBasicMaterial({ color: defaultColor });
    this.geometry = new THREE.PlaneGeometry(layout.width, layout.height);
  }

  setToDefaultPosition(centerPoint: THREE.Vector3) {
    const centerX = this.layout.positionX + this.layout.width / 2 - centerPoint.x;
    const centerY = this.layout.positionY - this.layout.height / 2 - centerPoint.y;

    this.position.set(centerX, centerY, 0.03);
  }
}