import THREE, {
  Object3D, Raycaster,
} from 'three';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import XRControllerModelFactory from '../lib/controller/XRControllerModelFactory';
import XRControllerModel from '../lib/controller/XRControllerModel';
import FloorMesh from '../view-objects/vr/floor-mesh';
import TeleportMesh from '../view-objects/vr/teleport-mesh';
import BaseMenu from '../vr-menus/base-menu';
import { displayAsWireframe, displayAsSolidObject } from '../vr-helpers/multi-user-helper';
import VRControllerLabelGroup from '../vr-controller/vr-controller-label-group';
import VRControllerBindingsList from '../vr-controller/vr-controller-bindings-list';
import MenuGroup from '../vr-menus/menu-group';

export type VRControllerCallbackFunctions = {
  connected? (controller: VRController, event: THREE.Event): void,
  disconnected? (controller: VRController): void,

  thumbpadTouch? (controller: VRController, axes: number[]): void,
  thumbpadDown?(controller: VRController, axes: number[]): void,
  thumbpadPress? (controller: VRController, axes: number[]): void,
  thumbpadUp?(controller: VRController, axes: number[]): void,

  triggerDown?(controller: VRController): void,
  triggerPress?(controller: VRController, value: number): void,
  triggerUp?(controller: VRController): void,

  gripDown?(controller: VRController): void,
  gripPress?(controller: VRController): void,
  gripUp?(controller: VRController): void,

  menuUp?(controller: VRController): void,
  menuPress?(controller: VRController): void,
  menuDown? (controller: VRController): void,
}


/**
 * A wrapper around the gamepad object which handles inputs to
 * a VR controller and provides update and callback functionalities.
 */
export default class VRController extends BaseMesh {
  gamepadIndex: number;

  gamepad: Gamepad|null = null;

  color: THREE.Color;

  axes = [0, 0];

  thumbpadIsPressed = false;

  triggerIsPressed = false;

  gripIsPressed = false;

  menuIsPressed = false;

  timestamp = 0;

  eventCallbacks: VRControllerCallbackFunctions;

  gripSpace: THREE.Group;

  raySpace: THREE.Group;

  labelGroup: VRControllerLabelGroup;

  menuGroup: MenuGroup;

  ray: THREE.Line|null = null;

  controllerModel: XRControllerModel;

  intersectedObject: THREE.Intersection|null = null;

  raycaster: THREE.Raycaster;

  scene: THREE.Scene;

  intersectableObjects: THREE.Object3D[] = [];

  grabbedObject: THREE.Object3D|null = null;

  grabbedObjectParent : THREE.Object3D|null = null;

  teleportArea: TeleportMesh|null = null;

  connected = false;


  get gamepadId() {
    return this.gamepad ? this.gamepad.id : 'unknown';
  }

  /**
 * Finds the controller whose buttons the labels in this group point to or
 * returns `null` if the group does not have a parent controller.
 */
  static findController(object: Object3D): VRController | null {
    let current = object.parent;
    while (current) {
      if (current instanceof VRController) return current;
      current = current.parent;
    }
    return null;
  }

  constructor({
    gamepadIndex,
    color,
    gripSpace,
    raySpace,
    menuGroup,
    bindings,
    scene
  } : {
    gamepadIndex: number,
    color: THREE.Color,
    gripSpace: THREE.Group,
    raySpace: THREE.Group,
    menuGroup: MenuGroup,
    bindings: VRControllerBindingsList,
    scene: THREE.Scene
  }) {
    super();
    // Init properties
    this.gamepadIndex = gamepadIndex;
    this.color = color;
    this.gripSpace = gripSpace;
    this.raySpace = raySpace;
    this.labelGroup = new VRControllerLabelGroup(bindings);
    this.menuGroup = menuGroup;
    this.raycaster = new Raycaster();
    this.scene = scene;
    this.eventCallbacks = bindings.makeCallbacks();

    // Init controller model
    const controllerModelFactory = new XRControllerModelFactory();
    this.controllerModel = controllerModelFactory.createControllerModel(this.gripSpace);
    this.gripSpace.add(this.controllerModel);

    // Init children
    this.initChildren();

    this.findGamepad();

    this.initConnectionListeners();
  }

  initConnectionListeners() {
    const callbacks = this.eventCallbacks;

    this.gripSpace.addEventListener('connected', (event) => {
      this.connected = true;
      this.findGamepad();
      this.initTeleportArea();
      if (callbacks.connected) callbacks.connected(this, event);
    });
    this.gripSpace.addEventListener('disconnected', () => {
      this.connected = false;
      this.removeTeleportArea();
      if (callbacks.disconnected) callbacks.disconnected(this);
    });
  }

  setToSpectatingAppearance() {
    displayAsWireframe(this);
      this.removeTeleportArea();
      this.removeRay();
  }

  /**
   * Sets controller to be opaque, adds the respective ray and
   * initiates a teleport area.
   */
  setToDefaultAppearance() {
    displayAsSolidObject(this);
    this.addRay(this.color);
    this.initTeleportArea();
  }

  initChildren() {
    this.add(this.gripSpace);
    this.add(this.raySpace);
    this.raySpace.add(this.menuGroup);
    this.gripSpace.add(this.labelGroup);
  }

  findGamepad() {
    const gamepads = navigator.getGamepads();
    if (typeof gamepads.forEach !== 'function') return;

    gamepads.forEach((gamepad) => {
      if (gamepad && gamepad.index === this.gamepadIndex) {
        this.gamepad = gamepad;
      }
    });
  }

  /**
   * Adds a line to the controller which is a visual representation of the hit
   * objects for raycasting.
   *
   * @param color Color of the ray
   */
  addRay(color: THREE.Color) {
    if (this.ray) return;

    const geometry = new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)],
    );

    const material = new THREE.LineBasicMaterial({
      color,
    });

    const line = new THREE.Line(geometry, material);
    line.scale.z = 5;

    this.ray = line;
    this.raySpace.add(this.ray);
  }

  /**
   * Adds a teleport area to the controller (if it is the utility controller)
   */
  initTeleportArea() {
    if (!this.teleportArea) {
    // Create teleport area
      this.teleportArea = new TeleportMesh(this.color);

      // Add teleport area to parent (usually the scene object)
      this.scene.add(this.teleportArea);
    }
  }

  removeRay() {
    if (!this.ray) return;

    // Remove and dispose ray
    this.raySpace.remove(this.ray);
    if (this.ray.material instanceof THREE.Material) this.ray.material.dispose();
    this.ray.geometry.dispose();
    this.ray = null;
  }

  removeTeleportArea() {
    const { teleportArea } = this;

    // Remove teleport area
    if (teleportArea) {
      teleportArea.deleteFromParent();
      teleportArea.disposeRecursively();
      this.teleportArea = null;
    }
  }

  grabObject(object: Object3D) {
    if (!this.ray) return;

    const controllerMatrix = new THREE.Matrix4();
    controllerMatrix.identity().extractRotation(this.ray.matrixWorld);
    // Get inverse of controller transformation
    controllerMatrix.getInverse(this.gripSpace.matrixWorld);

    // Set transforamtion relative to controller transformation
    object.matrix.premultiply(controllerMatrix);
    // Split up matrix into position, quaternion and scale
    object.matrix.decompose(object.position, object.quaternion, object.scale);

    this.grabbedObject = object;
    if (object.parent) {
      this.grabbedObjectParent = object.parent;
      this.grabbedObjectParent.remove(object);
    }
    this.gripSpace.add(object);
  }

  releaseObject() {
    const { grabbedObject } = this;
    if (!grabbedObject) return;

    // Transform object back into transformation relative to local space
    grabbedObject.matrix.premultiply(this.gripSpace.matrixWorld);
    // Split up transforamtion into position, quaternion and scale
    grabbedObject.matrix.decompose(grabbedObject.position,
      grabbedObject.quaternion, grabbedObject.scale);

    this.gripSpace.remove(grabbedObject);

    if (this.grabbedObjectParent) {
      this.grabbedObjectParent.add(grabbedObject);
      this.grabbedObjectParent = null;
    }

    this.grabbedObject = null;

  }

  update() {
    this.updateGamepad();
    this.updateIntersectedObject();
    this.labelGroup.updateLabels();
    this.menuGroup.currentMenu?.updateMenu();
  }

  /**
   * Updates the current button states according to the gamepad object.
   * Whenever a button change or press event is registered, the according
   * callback functions (provided via the constructor) are called.
   */
  updateGamepad() {
    const { gamepad } = this;
    const callbacks = this.eventCallbacks;

    const THUMBPAD_BUTTON = 0;
    const TRIGGER_BUTTON = 1;
    const GRIP_BUTTON = 2;
    const MENU_BUTTON = 3;

    if (gamepad) {
      const { timestamp } = gamepad;

      // Ensure that gamepad data is fresh
      if (this.timestamp === timestamp) {
        return;
      }
      this.timestamp = timestamp;

      // Handle change in joystick / thumbpad position
      if (this.axes[0] !== gamepad.axes[0] || this.axes[1] !== gamepad.axes[1]) {
        [this.axes[0], this.axes[1]] = gamepad.axes;
        if (callbacks.thumbpadTouch) {
          callbacks.thumbpadTouch(this, this.axes);
        }
      }

      // Handle clicked / touched / released thumbpad
      if (this.thumbpadIsPressed !== gamepad.buttons[THUMBPAD_BUTTON].pressed) {
        this.thumbpadIsPressed = gamepad.buttons[THUMBPAD_BUTTON].pressed;
        if (this.thumbpadIsPressed && callbacks.thumbpadDown) {
          callbacks.thumbpadDown(this, this.axes);
        } else if (!this.thumbpadIsPressed && callbacks.thumbpadUp) {
          callbacks.thumbpadUp(this, this.axes);
        }
      } else if (callbacks.thumbpadPress && this.thumbpadIsPressed) {
        callbacks.thumbpadPress(this, this.axes);
      }

      // Handle clicked / released trigger
      if (this.triggerIsPressed !== gamepad.buttons[TRIGGER_BUTTON].pressed) {
        this.triggerIsPressed = gamepad.buttons[TRIGGER_BUTTON].pressed;
        if (this.triggerIsPressed && callbacks.triggerDown) {
          callbacks.triggerDown(this);
        } else if (!this.triggerIsPressed && callbacks.triggerUp) {
          callbacks.triggerUp(this);
        }
      } else if (callbacks.triggerPress && this.triggerIsPressed) {
        callbacks.triggerPress(this, gamepad.buttons[TRIGGER_BUTTON].value);
      }

      // Handle clicked released grip button
      if (gamepad.buttons[GRIP_BUTTON]) {
        if (this.gripIsPressed !== gamepad.buttons[GRIP_BUTTON].pressed) {
          this.gripIsPressed = gamepad.buttons[GRIP_BUTTON].pressed;
          if (this.gripIsPressed && callbacks.gripDown) {
            callbacks.gripDown(this);
          } else if (!this.gripIsPressed && callbacks.gripUp) {
            callbacks.gripUp(this);
          }
        } else if (callbacks.gripPress && this.gripIsPressed) {
          callbacks.gripPress(this);
        }
      }

      // Handle clicked / released menu button
      if (gamepad.buttons[MENU_BUTTON]) {
        if (this.menuIsPressed !== gamepad.buttons[MENU_BUTTON].pressed) {
          this.menuIsPressed = gamepad.buttons[MENU_BUTTON].pressed;
          if (this.menuIsPressed && callbacks.menuDown) {
            callbacks.menuDown(this);
          } else if (!this.menuIsPressed && callbacks.menuUp) {
            callbacks.menuUp(this);
          }
        } else if (callbacks.menuPress && this.menuIsPressed) {
          callbacks.menuPress(this);
        }
      }
    }
  }

  computeIntersections() {
    if (this.intersectableObjects.length === 0) return [];

    const { raySpace } = this;
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(raySpace.matrixWorld);

    this.raycaster.ray.origin.setFromMatrixPosition(raySpace.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersections = this.grabbedObject
      ? this.raycaster.intersectObjects([this.grabbedObject], true)
      : this.raycaster.intersectObjects(this.intersectableObjects, true);

    for (let i = 0; i < intersections.length; i++) {
      const { object } = intersections[i];
      if (!(object instanceof LabelMesh) && object.visible) {
        return [intersections[i]];
      }
    }

    return [];
  }

  updateIntersectedObject() {
    if (!this.ray) return;

    const intersections = this.computeIntersections();

    const [nearestIntersection] = intersections;

    if (!nearestIntersection) {
      this.intersectedObject = null;
      if (this.teleportArea) {
        this.teleportArea.visible = false;
      }
      this.resetHoverEffect();
      this.ray.scale.z = 5;
      return;
    }

    const { object, uv } = nearestIntersection;

    if (this.intersectedObject && object !== this.intersectedObject.object) {
      if (this.intersectedObject.object instanceof FloorMesh) {
        if (this.teleportArea) {
          this.teleportArea.visible = false;
        }
      }
      this.resetHoverEffect();
    }

    // Handle hover effect and teleport area

      if (object instanceof BaseMenu && uv) {
        object.hover(uv);
      } else if (object instanceof BaseMesh) {
        object.applyHoverEffect();
      }

      if (object instanceof FloorMesh) {
        if (this.teleportArea) {
          // Show teleport area above intersected point on floor. However, if
          // the controller's ray is invisible, don't show the teleport area
          // either.
          this.teleportArea.showAbovePosition(nearestIntersection.point);
          this.teleportArea.visible = this.ray.visible;
        }
      } else if (object instanceof BaseMesh) {
        object.applyHoverEffect();
      }
    

    // Store intersected object and scale ray accordingly
    this.intersectedObject = nearestIntersection;
    this.ray.scale.z = nearestIntersection.distance;
  }

  filterIntersectableObjects(filterFn: (obj: Object3D) => boolean) {
    this.intersectableObjects = this.intersectableObjects.filter(filterFn);
  }

  /**
   * Resets the hover effect of the object which was previously hovered upon by the controller.
   *
   * @param controller Controller of which the hover effect shall be reseted.
   */
  resetHoverEffect() {
    if (!this.intersectedObject || !this.intersectedObject.object) return;

    const { object } = this.intersectedObject;

    if (object instanceof BaseMesh) {
      object.resetHoverEffect();
    }
  }
}
