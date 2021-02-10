import VRController from 'explorviz-frontend/utils/vr-rendering/VRController';
import {
  Camera, Object3D, Mesh, MeshStandardMaterial, Quaternion, Vector3,
} from 'three';
import RemoteVrUser from '../vr-multi-user/remote-vr-user';

export function getCameraPose(camera: Camera) {
  const position = new Vector3();
  camera.getWorldPosition(position);

  return { position, quaternion: camera.quaternion };
}

export function getObjectPose(object: Object3D) {
  const position = new Vector3();
  object.getWorldPosition(position);

  // Use world quaternions because controller can also be rotated via controllerGroup
  const quaternion = new Quaternion();
  object.getWorldQuaternion(quaternion);

  return { position, quaternion };
}

export function getPoses(camera: Camera, controller1: VRController|undefined,
  controller2: VRController|undefined) {
  const cameraPose = getCameraPose(camera);

  let controller1Pose = { position: new Vector3(), quaternion: new Quaternion() };
  if (controller1) {
    controller1Pose = getObjectPose(controller1.raySpace);
  }

  let controller2Pose = { position: new Vector3(), quaternion: new Quaternion() };
  if (controller2) {
    controller2Pose = getObjectPose(controller2.raySpace);
  }

  return { camera: cameraPose, controller1: controller1Pose, controller2: controller2Pose };
}

/**
 * Returns measurements in pixels for a given text
 *
 * @param {string} text The text to measure the width, height and subline height of.
 * @param {string} font The font to measure the size in.
 * @return {{width: Number, height: Number, sublineHeight: Number}} The sizes of the text.
 */
export function getTextSize(text: string, font: string) {
  // re-use canvas object for better performance
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return { width: 200, height: 50, sublineHeight: 10 };

  context.font = font;
  const { width } = context.measureText(text);
  const height = context.measureText('W').width;
  const sublineHeight = context.measureText('H').width;
  return { width, height, sublineHeight };
}

export function addDummyNamePlane(user: RemoteVrUser) {
  if (user.camera && user.camera.model) {
    // Use dummy object to let username always face camera with lookAt() function
    const dummy = new Object3D();
    dummy.name = 'dummyNameTag';

    dummy.position.copy(user.camera.model.position);
    dummy.position.y += 0.3; // Display username above hmd

    user.camera.model.add(dummy);
  }
}

/**
 * Sets MeshStandardMaterial of given object to have the given opacity.
 * Displays object using wireframes (instead of polygons):
 */
export function displayAsWireframe(object: Object3D, frameLineWidth = 0.5, opacity = 0.1) {
  if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
    object.material.wireframe = true;
    object.material.wireframeLinewidth = frameLineWidth;

    if (opacity < 1) {
      object.material.transparent = true;
      object.material.opacity = opacity;
    }
  }

  object.children.forEach((child) => {
    displayAsWireframe(child);
  });
}

/**
 * Sets MeshStandardMaterial of given object to have the given opacity.
 * Displays object using polygons (instead of wireframe):
 */
export function displayAsSolidObject(object: Object3D, opacity = 1) {
  if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
    object.material.wireframe = false;

    object.material.transparent = opacity !== 1;
    object.material.opacity = opacity;
  }

  object.children.forEach((child) => {
    displayAsSolidObject(child);
  });
}
