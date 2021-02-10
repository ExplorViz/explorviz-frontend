/**
 * Adapted from: https://github.com/mrdoob/three.js/blob/master/examples/jsm/webxr/XRControllerModelFactory.js
 */

import {
  Object3D,
  Quaternion,
  Material,
  Mesh,
} from 'three';

import {
  Constants as MotionControllerConstants,
  MotionController,
} from './motion-controllers.module';

export default class XRControllerModel extends Object3D {
  motionController: MotionController|null;

  envMap: any;

  constructor() {
    super();
    this.motionController = null;
    this.envMap = null;
  }

  setEnvironmentMap(envMap: any) {
    if (this.envMap === envMap) {
      return this;
    }

    this.envMap = envMap;
    this.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof Material) {
        // @ts-ignore
        child.material.envMap = this.envMap;
        child.material.needsUpdate = true;
      }
    });

    return this;
  }

  /**
  * Polls data from the XRInputSource and updates the model's components to match
  * the real world data
  */
  updateMatrixWorld(force: Boolean|undefined) {
    super.updateMatrixWorld.call(this, force);

    if (!this.motionController) return;

    // Cause the MotionController to poll the Gamepad for data
    this.motionController.updateFromGamepad();

    // Update the 3D model to reflect the button, thumbstick, and touchpad state
    Object.values(this.motionController.components).forEach((component) => {
      // Update node data based on the visual responses' current states
      // @ts-ignore
      Object.values(component.visualResponses).forEach((visualResponse) => {
        const {
          // @ts-ignore
          valueNode, minNode, maxNode, value, valueNodeProperty,
        } = visualResponse;

        // Skip if the visual response node is not found. No error is needed,
        // because it will have been reported at load time.
        if (!valueNode) return;

        // Calculate the new properties based on the weight supplied
        if (valueNodeProperty === MotionControllerConstants.VisualResponseProperty.VISIBILITY) {
          valueNode.visible = value;
        } else if
        (valueNodeProperty === MotionControllerConstants.VisualResponseProperty.TRANSFORM) {
          Quaternion.slerp(
            minNode.quaternion,
            maxNode.quaternion,
            valueNode.quaternion,
            value,
          );

          valueNode.position.lerpVectors(
            minNode.position,
            maxNode.position,
            value,
          );
        }
      });
    });
  }
}
