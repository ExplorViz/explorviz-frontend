import { calculateColorBrightness } from
  'explorviz-frontend/utils/helpers/threejs-helpers';
import THREE from "three";
import BoxMesh from '../view-objects/3d/application/box-mesh';

export default class HoverEffectHandler {

  hoveredEntityObj:null|BoxMesh = null;

  resetHoverEffect() : void {
    let hoveredEntityObj = this.hoveredEntityObj;
    if (hoveredEntityObj) {
      // Restore old color and reset cached object
      const material = hoveredEntityObj.material as THREE.MeshBasicMaterial|THREE.MeshLambertMaterial;
      const { highlighted, defaultColor, highlightingColor } = hoveredEntityObj;

      material.color = highlighted ? highlightingColor : defaultColor;
      this.hoveredEntityObj = null;
    }
  }

  handleHoverEffect(mesh: BoxMesh|undefined): void {
    // No raycastTarget, do nothing and return
    if (mesh === undefined) {
      this.resetHoverEffect();
      return;
    }

    // Same object, do nothing and return
    let hoveredEntityColorObj = this.hoveredEntityObj;
    if (hoveredEntityColorObj && hoveredEntityColorObj === mesh) {
      return;
    }

    this.resetHoverEffect();

    const material = mesh.material as THREE.MeshBasicMaterial|THREE.MeshLambertMaterial;
    const oldColor = material.color;

    this.hoveredEntityObj = mesh;

    material.color = calculateColorBrightness(oldColor, 1.1);
  }

}