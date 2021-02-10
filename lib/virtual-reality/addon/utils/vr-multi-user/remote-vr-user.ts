import THREE from 'three';
import NameTagMesh from '../view-objects/vr/name-tag-mesh';

type Controller = {
  id: string,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  model: THREE.Object3D,
  ray: THREE.Object3D,
} |undefined;

type Camera = {
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  model: THREE.Object3D,
} | undefined;

export default class RemoteVrUser extends THREE.Object3D {
  userName!: string;

  ID: string = 'unknown';

  state!: string;

  controller1: Controller;

  controller2: Controller;

  camera: Camera;

  color!: THREE.Color; // [r,g,b], r,g,b = 0,...,255

  nameTag: NameTagMesh|undefined;

  initCamera(obj: THREE.Object3D) {
    this.camera = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      model: obj,
    };

    this.add(this.camera.model);
  }

  initController1(name: string, controllerModel: THREE.Object3D|undefined) {
    if (!controllerModel) return;

    this.removeController1();

    const ray = RemoteVrUser.addRayToControllerModel(controllerModel, this.color);

    this.controller1 = {
      id: name,
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      model: controllerModel,
      ray,
    };

    this.add(this.controller1.model);
  }

  initController2(name: string, controllerModel: THREE.Object3D | undefined) {
    if (!controllerModel) return;

    this.removeController2();

    const ray = RemoteVrUser.addRayToControllerModel(controllerModel, this.color);

    this.controller2 = {
      id: name,
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      model: controllerModel,
      ray,
    };

    this.add(this.controller2.model);
  }

  static addRayToControllerModel(controller: THREE.Object3D, color: THREE.Color) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)],
    );

    const material = new THREE.LineBasicMaterial({
      color,
    });

    const line = new THREE.Line(geometry, material);
    line.scale.z = 5;

    line.position.y -= 0.005;
    line.position.z -= 0.02;
    controller.add(line);

    return line;
  }

  removeController1() {
    if (this.controller1 && this.controller1.model) {
      this.remove(this.controller1.model);
      this.controller1 = undefined;
    }
  }

  removeController2() {
    if (this.controller2 && this.controller2.model) {
      this.remove(this.controller2.model);
      this.controller2 = undefined;
    }
  }

  removeCamera() {
    if (this.camera && this.camera.model) {
      this.remove(this.camera.model);
      this.camera = undefined;
    }
  }

  removeNameTag() {
    if (this.nameTag) {
      this.remove(this.nameTag);
      this.nameTag.disposeRecursively();
      this.nameTag = undefined;
    }
  }

  removeAllObjects3D() {
    this.removeController1();
    this.removeController2();
    this.removeCamera();
    this.removeNameTag();
  }

  /**
   * Updates the camera model's position and rotation.
   *
   * @param Object containing the new camera position and quaterion.
   */
  updateCamera(camera: {position: number[], quaternion: number[]}) {
    if (this.camera) {
      camera.position[1] -= 0.01;

      this.camera.position.fromArray(camera.position);
      this.camera.quaternion.fromArray(camera.quaternion);
      this.camera.model.position.copy(this.camera.position);
      this.camera.model.quaternion.copy(this.camera.quaternion);
    }
  }

  /**
   * Updates the controller1 model's position and rotation.
   *
   * @param Object containing the new controller1 position and quaterion.
   */
  updateController1(controller: {position: number[], quaternion: number[]}) {
    if (this.controller1) {
      this.controller1.position.fromArray(controller.position);
      this.controller1.quaternion.fromArray(controller.quaternion);
      this.controller1.model.position.copy(this.controller1.position);
      this.controller1.model.quaternion.copy(this.controller1.quaternion);
    }
  }

  /**
   * Updates the controller2 model's position and rotation.
   *
   * @param Object containing the new controller2 position and quaterion.
   */
  updateController2(controller: {position: number[], quaternion: number[]}) {
    if (this.controller2) {
      this.controller2.position.fromArray(controller.position);
      this.controller2.quaternion.fromArray(controller.quaternion);
      this.controller2.model.position.copy(this.controller2.position);
      this.controller2.model.quaternion.copy(this.controller2.quaternion);
    }
  }

  /**
   * Hides user or unhides them.
   *
   * @param {boolean} visible - If false, hides user's controllers, camera and name tag.
   *                         Shows them if true.
   */
  setVisible(visible: boolean) {
    if (this.controller1) {
      this.controller1.model.visible = visible;
    }
    if (this.controller2) {
      this.controller2.model.visible = visible;
    }
    this.setHmdVisible(visible);
  }

  /**
   * Hide or display user's HMD and name tag
   *
   * @param visible Determines visibility of HMD and name tag
   */
  setHmdVisible(visible: boolean) {
    if (this.camera) {
      this.camera.model.visible = visible;
    }
    if (this.nameTag) {
      this.nameTag.visible = visible;
    }
  }
}
