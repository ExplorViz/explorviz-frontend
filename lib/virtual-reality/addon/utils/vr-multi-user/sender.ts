import WebSocket from 'virtual-reality/services/web-socket';
import {
  Vector3 as V3, Quaternion as Q, Vector3, Quaternion,
} from 'three';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import VRController from '../vr-rendering/VRController';

type Pose = {position: THREE.Vector3, quaternion: THREE.Quaternion};
export default class Sender {
  webSocket: WebSocket;

  constructor(webSocket: WebSocket) {
    this.webSocket = webSocket;
  }

  sendPoseUpdate(camera: Pose, controller1: Pose, controller2: Pose) {
    const positionObj = {
      event: 'user_positions',
      controller1: {
        position: controller1.position.toArray(),
        quaternion: controller1.quaternion.toArray(),
      },
      controller2: {
        position: controller2.position.toArray(),
        quaternion: controller2.quaternion.toArray(),
      },
      camera: {
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
      },
      time: Date.now(),
    };

    this.webSocket.enqueueIfOpen(positionObj);
  }

  /**
 * Send update of position + quaternion of the
 * landscape (vrEnvironment)
 */
  sendLandscapeUpdate(deltaPosition: V3, quaternion: Q, environmentOffset: V3) {
    const landscapeObj = {
      event: 'landscape_position',
      deltaPosition: deltaPosition.toArray(),
      offset: environmentOffset.toArray(),
      quaternion: quaternion.toArray(),
    };
    this.webSocket.enqueueIfOpen(landscapeObj);
  }

  /**
 * Send update of direction and length which encode the translation of the application object.
 */
  sendAppTranslationUpdate(appId: string, direction: V3, length: number) {
    const applicationObj = {
      event: 'app_translated',
      appId,
      direction: direction.toArray(),
      length,
    };
    this.webSocket.enqueueIfOpen(applicationObj);
  }

  /**
 * Send the backend the information that a system was
 * closed or opened by this user
 * @param {string} id ID of system which was opened/closed
 * @param {boolean} isOpen State of the system
 */
  sendSystemUpdate(id: string, isOpen: boolean) {
    const systemObj = {
      event: 'system_update',
      id,
      isOpen,
    };
    this.webSocket.enqueueIfOpen(systemObj);
  }

  /**
 * Send the backend the information that a nodegroup was
 * closed or opened by this user
 * @param {string} id ID of nodegroup which was opened/closed
 * @param {boolean} isOpen State of the nodegroup
 */
  sendNodegroupUpdate(id: string, isOpen: boolean) {
    const nodeGroupObj = {
      event: 'nodegroup_update',
      id,
      isOpen,
    };
    this.webSocket.enqueueIfOpen(nodeGroupObj);
  }

  /**
 * Inform the backend that an application was closed
 * by this user
 * @param {string} appID ID of the closed application
 */
  sendAppClosed(appID: string) {
    const appObj = {
      event: 'app_closed',
      id: appID,
    };
    this.webSocket.enqueueIfOpen(appObj);
  }

  /**
 * Informs the backend that this user holds/moves an application
 * @param {ApplicationObject3D} application Application which is bound
 * @param {VRController} controller Controller which binds application
 */
  sendAppGrabbed(application: ApplicationObject3D, controller: VRController) {
    const worldPos = new Vector3();
    const worldQuat = new Quaternion();
    const appObj = {
      event: 'app_grabbed',
      appID: application.dataModel.pid,
      appPosition: application.getWorldPosition(worldPos).toArray(),
      appQuaternion: application.getWorldQuaternion(worldQuat).toArray(),
      isGrabbedByController1: controller.gamepadIndex === 0,
      controllerPosition: controller.position.toArray(),
      controllerQuaternion: controller.quaternion.toArray(),
    };

    this.webSocket.enqueueIfOpen(appObj);
  }

  /**
 * Informs the backend that an application is no stringer bound but released
 * @param {ApplicationObject3D} application Application which is released
 */
  sendAppReleased(application: ApplicationObject3D) {
    const worldPos = new Vector3();
    const worldQuat = new Quaternion();

    const appObj = {
      event: 'app_released',
      id: application.dataModel.pid,
      position: application.getWorldPosition(worldPos).toArray(),
      quaternion: application.getWorldQuaternion(worldQuat).toArray(),
    };
    this.webSocket.enqueueIfOpen(appObj);
  }

  /**
 * Informs the backend that a component was opened or closed by this user
 * @param {string} appID ID of the app which is a parent to the component
 * @param {string} componentID ID of the component which was opened or closed
 * @param {boolean} isOpened Tells whether the component is now open or closed (current state)
 */
  sendComponentUpdate(appID: string, componentID: string, isOpened: boolean,
    isFoundation: boolean) {
    const appObj = {
      event: 'component_update',
      appID,
      componentID,
      isOpened,
      isFoundation,
    };
    this.webSocket.enqueueIfOpen(appObj);
  }

  /**
 * Informs the backend that an entity (clazz or component) was highlighted
 * or unhighlighted
 * @param {string} appID ID of the parent application of the entity
 * @param {string} entityType Tells whether a clazz/component or communication was updated
 * @param {string} entityID ID of the highlighted/unhighlighted component/clazz
 * @param {boolean} isHighlighted Tells whether the entity has been highlighted or not
 */
  sendHighlightingUpdate(appID: string, entityType: string,
    entityID: string, isHighlighted: boolean) {
    const hightlightObj = {
      event: 'hightlighting_update',
      appID,
      entityType,
      entityID,
      isHighlighted,
    };
    this.webSocket.enqueueIfOpen(hightlightObj);
  }

  /**
 * Informs backend that this user entered or left spectating mode
 * and additionally adds who is spectating who
 */
  sendSpectatingUpdate(userID: string, isSpectating: boolean, spectatedUser: string|null) {
    const spectateObj = {
      event: 'spectating_update',
      userID,
      isSpectating,
      spectatedUser,
    };
    this.webSocket.enqueueIfOpen(spectateObj);
  }

  /**
 * Informs the backend if a controller was connected/disconnected
 */
  sendControllerUpdate(connect: any, disconnect: any) {
    const controllerObj = {
      event: 'user_controllers',
      connect,
      disconnect,
    };

    this.webSocket.enqueueIfOpen(controllerObj);
  }

  /**
 * Inform the backend that an app was opened by this
 * user
 * @param ApplicationObject3D Opened application
 */
  sendAppOpened(application: ApplicationObject3D) {
    const position = new V3();
    application.getWorldPosition(position);

    const quaternion = new Q();
    application.getWorldQuaternion(quaternion);

    const appObj = {
      event: 'app_opened',
      id: application.dataModel.pid,
      position: position.toArray(),
      quaternion: quaternion.toArray(),
    };

    this.webSocket.enqueueIfOpen(appObj);
  }
}
