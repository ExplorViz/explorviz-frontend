import THREE from 'three';
import VrMessageReceiver from 'virtual-reality/utils/vr-message/receiver';
import VRControllerButtonBinding from 'virtual-reality/utils/vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding from 'virtual-reality/utils/vr-controller/vr-controller-thumbpad-binding';
import VrMessageSender from 'virtual-reality/utils/vr-message/sender';
import VRController from 'virtual-reality/utils/vr-rendering/VRController';
import PseudoMenu from '../pseudo-menu';
import { isObjectGrabbedResponse, ObjectGrabbedResponse } from 'virtual-reality/utils/vr-message/receivable/response/object-grabbed';
import DeltaTime from 'virtual-reality/services/delta-time';

export interface GrabbableObject extends THREE.Object3D {
    getGrabId(): string | null;
}

export function isGrabbableObject(object: any): object is GrabbableObject {
    return object !== null
        && typeof object === 'object'
        && typeof object.getGrabId === 'function';
}

export function findGrabbableObject(object: THREE.Object3D, objectId: string): GrabbableObject | null {
    if (isGrabbableObject(object) && object.getGrabId() === objectId) return object;
    for (let child of object.children) {
        let result = findGrabbableObject(child, objectId);
        if (result) return result;
    }
    return null;
}

export default class GrabMenu extends PseudoMenu {
    private sender: VrMessageSender;
    private receiver: VrMessageReceiver;
    private grabbedObject: GrabbableObject;
    private grabbedObjectParent: THREE.Object3D | null;
    private grabbedSuccessfully: boolean;
    private time: DeltaTime;

    constructor(grabbedObject: GrabbableObject, sender: VrMessageSender, receiver: VrMessageReceiver, time: DeltaTime) {
        super();
        this.sender = sender;
        this.receiver = receiver;
        this.grabbedObject = grabbedObject;
        this.grabbedObjectParent = null;
        this.grabbedSuccessfully = false;
        this.time = time;
    }

    /**
     * Moves the grabbed object into the controller's grip space. 
     */
    private addToGripSpace() {
        this.grabbedSuccessfully = true;

        // Store original and parent of grabbed object.
        this.grabbedObjectParent = this.grabbedObject.parent;

        const controller = VRController.findController(this);
        if (controller) {
            // Get inverse of controller transformation.
            const matrix = new THREE.Matrix4();
            matrix.getInverse(controller.gripSpace.matrixWorld);

            // Set transforamtion relative to controller transformation.
            this.grabbedObject.matrix.premultiply(matrix);
            this.grabbedObject.matrix.decompose(
                this.grabbedObject.position,
                this.grabbedObject.quaternion,
                this.grabbedObject.scale
            );
            controller.gripSpace.add(this.grabbedObject);
        }
    }

    /**
     * Removes the grabbed object from the controller's grip space and adds it
     * back to its original parent.
     */
    private removeFromGripSpace() {
        const controller = VRController.findController(this);
        if (controller) {
            // Undo transformation of controller.
            this.grabbedObject.matrix.premultiply(controller.gripSpace.matrixWorld);
            this.grabbedObject.matrix.decompose(
                this.grabbedObject.position,
                this.grabbedObject.quaternion,
                this.grabbedObject.scale
            );
        }

        // Restore original parent.
        this.grabbedObjectParent?.add(this.grabbedObject);
    }

    onOpenMenu() {
        super.onOpenMenu();

        // The backend does not have to be notified when objects without an ID
        // are grabbed.
        const objectId = this.grabbedObject.getGrabId();
        if (!objectId) {
            this.addToGripSpace();
            return;
        }

        // Send object grab message.
        const nonce = this.sender.sendObjectGrabbed(objectId);

        // Wait for response.
        this.receiver.awaitResponse({
            nonce,
            responseType: isObjectGrabbedResponse,
            onResponse: (response: ObjectGrabbedResponse) => {
                // If we receive the answer too late, we ignore it.
                if (!this.isMenuOpen) return;

                // If we are allowed to grab the object, move it into the
                // controller's grip space.
                if (response.isSuccess) {
                    this.addToGripSpace();
                } else {
                    this.closeMenu();
                }
            },
            onOffline: () => this.addToGripSpace()
        });
    }

    onUpdateMenu(delta: number) {
        super.onUpdateMenu(delta);

        // Send new position every frame if we are allowed to grab the object
        // and the object has a grab identifier.
        const objectId = this.grabbedObject.getGrabId();
        if (this.grabbedSuccessfully && objectId) {
            const position = new THREE.Vector3();
            this.grabbedObject.getWorldPosition(position);

            const quaternion = new THREE.Quaternion();
            this.grabbedObject.getWorldQuaternion(quaternion);

            const scale = this.grabbedObject.scale;

            this.sender.sendObjectMoved(objectId, position, quaternion, scale);
        }
    }

    onCloseMenu() {
        super.onCloseMenu();

        // Always send object released message (except when the object does not
        // have an ID) to ensure that the backend knows that we don't want to
        // grab the object anymore even if we did not yet receive the response.
        const objectId = this.grabbedObject.getGrabId();
        if (objectId) this.sender.sendObjectReleased(objectId);

        // If we received the response and were allowed to grab the object,
        // we have to detach the object from the controller.
        if (this.grabbedSuccessfully) {
            this.removeFromGripSpace();
        }
    }

    makeThumbpadBinding() {
        return new VRControllerThumbpadBinding({
            labelUp: 'Move Away',
            labelDown: 'Move Closer'
        }, {
            onThumbpadTouch: (controller: VRController, axes: number[]) => {
                const grabbedObject = this.grabbedObject;

                controller.updateIntersectedObject();

                const { intersectedObject } = controller;

                if (!intersectedObject) return;

                // Position where ray hits the application
                const intersectionPosWorld = intersectedObject.point;
                const intersectionPosLocal = intersectionPosWorld.clone();
                grabbedObject.worldToLocal(intersectionPosLocal);

                const controllerPosition = new THREE.Vector3();
                controller.raySpace.getWorldPosition(controllerPosition);
                const controllerPositionLocal = controllerPosition.clone();
                grabbedObject.worldToLocal(controllerPositionLocal);

                const direction = new THREE.Vector3();
                direction.subVectors(intersectionPosLocal, controllerPositionLocal);

                const worldDirection = new THREE.Vector3().subVectors(controllerPosition, intersectionPosWorld);

                const yAxis = axes[1];

                // Stop application from moving too close to controller
                if ((worldDirection.length() > 0.5 && Math.abs(yAxis) > 0.1)
                    || (worldDirection.length() <= 0.5 && yAxis > 0.1)) {
                    // Adapt distance for moving according to trigger value
                    direction.normalize();
                    const length = yAxis * this.time.getDeltaTime();

                    grabbedObject.translateOnAxis(direction, length);
                    grabbedObject.updateMatrix();
                }
            }
        });
    }
    

    makeGripButtonBinding() {
        return new VRControllerButtonBinding('Release Object', {
            onButtonUp: this.closeMenu.bind(this)
        });
    }

    makeMenuButtonBinding() {
        // The menu button cannot be used to close the menu.
        return undefined;
    }
}