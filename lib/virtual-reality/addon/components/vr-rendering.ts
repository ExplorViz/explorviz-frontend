import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import THREE from 'three';
import ImageLoader from 'explorviz-frontend/utils/three-image-loader';
import Configuration from 'explorviz-frontend/services/configuration';
import PlaneLayout from 'explorviz-frontend/view-objects/layout-models/plane-layout';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import Interaction from 'explorviz-frontend/utils/interaction';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import LandscapeRendering, { Layout1Return, Layout3Return } from 'explorviz-frontend/components/visualization/rendering/landscape-rendering';
import { enqueueTask, restartableTask, task } from 'ember-concurrency-decorators';
import updateCameraZoom from 'explorviz-frontend/utils/landscape-rendering/zoom-calculator';
import * as LandscapeCommunicationRendering from
  'explorviz-frontend/utils/landscape-rendering/communication-rendering';
import LandscapeObject3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-object-3d';
import FloorMesh from 'virtual-reality/utils/view-objects/vr/floor-mesh';
import WebXRPolyfill from 'webxr-polyfill';
import LandscapeLabeler from 'explorviz-frontend/utils/landscape-rendering/labeler';
import * as ApplicationLabeler from 'explorviz-frontend/utils/application-rendering/labeler';
import ApplicationRendering from 'explorviz-frontend/components/visualization/rendering/application-rendering';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import AppCommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import LocalVrUser from 'explorviz-frontend/services/local-vr-user';
import ApplicationGroup from 'virtual-reality/utils/view-objects/vr/application-group';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import VRController, { controlMode } from 'virtual-reality/utils/vr-rendering/VRController';
import MainMenu from 'virtual-reality/utils/vr-menus/main-menu';
import BaseMenu from 'virtual-reality/utils/vr-menus/base-menu';
import CameraMenu from 'virtual-reality/utils/vr-menus/camera-menu';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import AdvancedMenu from 'virtual-reality/utils/vr-menus/advanced-menu';
import DetailInfoMenu from 'virtual-reality/utils/vr-menus/detail-info-menu';
import composeContent, { DetailedInfo } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import HintMenu from 'explorviz-frontend/utils/vr-menus/hint-menu';
import DeltaTime from 'virtual-reality/services/delta-time';
import ElkConstructor, { ELK, ElkNode } from 'elkjs/lib/elk-api';
import ZoomMenu from 'virtual-reality/utils/vr-menus/zoom-menu';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { perform } from 'ember-concurrency-ts';
import computeApplicationCommunication from 'explorviz-frontend/utils/landscape-rendering/application-communication-computer';
import { Application, Node } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import computeDrawableClassCommunication, { DrawableClassCommunication } from 'explorviz-frontend/utils/landscape-rendering/class-communication-computer';
import { getAllClassesInApplication } from 'explorviz-frontend/utils/application-helpers';

interface Args {
  readonly id: string;
  readonly landscapeData: LandscapeData;
  readonly font: THREE.Font;
}

type LayoutData = {
  height: number,
  width: number,
  depth: number,
  positionX: number,
  positionY: number,
  positionZ: number
};

export default class VrRendering extends Component<Args> {
  // #region CLASS FIELDS AND GETTERS

  @service('configuration')
  configuration!: Configuration;

  @service('local-vr-user')
  localUser!: LocalVrUser;

  @service('delta-time')
  time!: DeltaTime;

  @service()
  worker!: any;

  // Maps models to a computed layout
  modelIdToPlaneLayout: Map<string, PlaneLayout>|null = null;

  debug = debugLogger('VrRendering');

  // Used to register (mouse) events
  interaction!: Interaction;

  canvas!: HTMLCanvasElement;

  scene!: THREE.Scene;

  camera!: THREE.PerspectiveCamera;

  renderer!: THREE.WebGLRenderer;

  raycaster: THREE.Raycaster;

  // Group which contains all currently opened application objects
  applicationGroup: ApplicationGroup;

  controllerMainMenus: THREE.Group;

  controllerInfoMenus: THREE.Group;

  // Depth of boxes for landscape entities
  landscapeDepth: number;

  // Scalar with which the landscape is scaled (evenly in all dimensions)
  landscapeScalar: number;

  // Scalar with which the application is scaled (evenly in all dimensions)
  applicationScalar: number;

  floor!: FloorMesh;

  closeButtonTexture: THREE.Texture;

  mainMenu: BaseMenu|undefined;

  infoMenu: DetailInfoMenu|undefined;

  hintMenu: HintMenu|undefined;

  landscapeOffset = new THREE.Vector3();

  get font() {
    return this.args.font;
  }

  readonly elk: ELK;

  readonly imageLoader: ImageLoader = new ImageLoader();

  readonly appCommRendering: AppCommunicationRendering;

  // Provides functions to label landscape meshes
  readonly landscapeLabeler = new LandscapeLabeler();

  // Extended Object3D which manages landscape meshes
  readonly landscapeObject3D!: LandscapeObject3D;

  drawableClassCommunications: Map<string, DrawableClassCommunication[]> = new Map();

  // #endregion CLASS FIELDS AND GETTERS

  // #region COMPONENT AND SCENE INITIALIZATION

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.debug('Constructor called');

    this.elk = new ElkConstructor({
      workerUrl: './assets/web-workers/elk-worker.min.js',
    });

    this.landscapeDepth = 0.7;

    this.landscapeScalar = 0.1;
    this.applicationScalar = 0.01;

    this.raycaster = new THREE.Raycaster();
    this.applicationGroup = new ApplicationGroup();

    this.controllerMainMenus = new THREE.Group();
    this.controllerMainMenus.position.y += 0.15;
    this.controllerMainMenus.position.z -= 0.15;
    this.controllerMainMenus.rotateX(340 * THREE.MathUtils.DEG2RAD);
    this.localUser.controllerMainMenus = this.controllerMainMenus;

    this.controllerInfoMenus = new THREE.Group();
    this.controllerInfoMenus.position.y += 0.15;
    this.controllerInfoMenus.position.z -= 0.15;
    this.controllerInfoMenus.rotateX(340 * THREE.MathUtils.DEG2RAD);
    this.localUser.controllerInfoMenus = this.controllerInfoMenus;

    this.appCommRendering = new AppCommunicationRendering(this.configuration);

    // Load image for delete button
    this.closeButtonTexture = new THREE.TextureLoader().load('images/x_white_transp.png');

    // Load and scale landscape
    this.landscapeObject3D = new LandscapeObject3D(this.args.landscapeData.structureLandscapeData);
    const scale = this.landscapeScalar;
    this.landscapeObject3D.scale.set(scale, scale, scale);

    // Rotate landscape such that it lays flat on the floor
    this.landscapeObject3D.rotateX(-90 * THREE.MathUtils.DEG2RAD);
  }

  /**
     * Calls all three related init functions and adds the three
     * performance panel if it is activated in user settings
     */
  initRendering() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initInteraction();
    this.initControllers();
  }

  /**
     * Creates a scene, its background and adds a landscapeObject3D to it
     */
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = this.configuration.landscapeColors.background;
    this.scene.add(this.landscapeObject3D);

    const floorSize = 10;
    const floorMesh = new FloorMesh(floorSize, floorSize);
    this.floor = floorMesh;

    this.scene.add(floorMesh);
    this.scene.add(this.applicationGroup);
    this.scene.add(this.localUser.userGroup);

    this.debug('Scene created');
  }

  /**
     * Creates a PerspectiveCamera according to canvas size and sets its initial position
     */
  initCamera() {
    const { width, height } = this.canvas;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 1, 2);
    this.localUser.addCamera(this.camera);
    this.debug('Camera added');
  }

  /**
     * Initiates a WebGLRenderer
     */
  initRenderer() {
    const { width, height } = this.canvas;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
    });
    this.localUser.renderer = this.renderer;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.xr.enabled = true;

    const polyfill = new WebXRPolyfill();
    if (polyfill) {
      this.debug('Polyfill enabled');
    }
    this.debug('Renderer set up');
  }

  /**
     * Creates a SpotLight and an AmbientLight and adds it to the scene
     */
  initLights() {
    const spotLight = new THREE.SpotLight(0xffffff, 0.5, 1000, 1.56, 0, 0);
    spotLight.position.set(100, 100, 100);
    spotLight.castShadow = false;
    this.scene.add(spotLight);

    const light = new THREE.AmbientLight(new THREE.Color(0.65, 0.65, 0.65));
    this.scene.add(light);
    this.debug('Lights added');
  }

  /**
   * Binds this context to all event handling functions and
   * passes them to a newly created Interaction object
   */
  initInteraction() {
    this.handleSingleClick = this.handleSingleClick.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.handleMouseWheel = this.handleMouseWheel.bind(this);
    this.handlePanning = this.handlePanning.bind(this);

    this.interaction = new Interaction(this.canvas, this.camera, this.renderer,
      [this.landscapeObject3D, this.applicationGroup, this.floor,
        this.controllerMainMenus, this.controllerInfoMenus], {
        singleClick: this.handleSingleClick,
        doubleClick: this.handleDoubleClick,
        mouseWheel: this.handleMouseWheel,
        panning: this.handlePanning,
      }, VrRendering.raycastFilter);

    // Add key listener for room positioning
    window.onkeydown = (event: any) => {
      this.handleKeyboard(event);
    };
  }

  static raycastFilter(intersection: THREE.Intersection) {
    return !(intersection.object instanceof LabelMesh || intersection.object instanceof LogoMesh);
  }

  initControllers() {
    const intersectableObjects = [this.landscapeObject3D, this.applicationGroup, this.floor,
      this.controllerMainMenus, this.controllerInfoMenus];

    // Init secondary/utility controller
    const raySpace1 = this.renderer.xr.getController(0);
    const gripSpace1 = this.renderer.xr.getControllerGrip(0);

    const callbacks1 = {
      thumbpadTouch: this.onThumbpadTouch.bind(this),
      triggerDown: this.onInteractionTriggerDown.bind(this),
      triggerPress: VrRendering.onInteractionTriggerPress.bind(this),
      menuDown: this.onInteractionMenuDown.bind(this),
      gripDown: this.onInteractionGripDown.bind(this),
      gripUp: this.onInteractionGripUp.bind(this),
    };
    const controller1 = new VRController(0, controlMode.INTERACTION, gripSpace1,
      raySpace1, callbacks1, this.scene);
    controller1.setToDefaultAppearance();
    controller1.raySpace.add(this.controllerInfoMenus);
    controller1.intersectableObjects = intersectableObjects;

    this.localUser.controller1 = controller1;
    this.localUser.userGroup.add(controller1);

    // Init secondary controller
    const raySpace2 = this.renderer.xr.getController(1);
    const gripSpace2 = this.renderer.xr.getControllerGrip(1);

    const callbacks2 = {
      triggerDown: this.onUtilityTrigger.bind(this),
      menuDown: this.onUtilityMenuDown.bind(this),
      gripDown: this.onUtilityGripDown.bind(this),
      gripUp: this.onUtilityGripUp.bind(this),
    };

    const controller2 = new VRController(1, controlMode.UTILITY, gripSpace2,
      raySpace2, callbacks2, this.scene);
    controller2.setToDefaultAppearance();
    controller2.raySpace.add(this.controllerMainMenus);
    controller2.intersectableObjects = intersectableObjects;

    this.localUser.controller2 = controller2;
    this.localUser.userGroup.add(controller2);
  }

  // eslint-disable-next-line
  onInteractionGripDown(controller: VRController) {
    if (!controller.intersectedObject) return;

    const { object } = controller.intersectedObject;

    if ((object.parent instanceof ApplicationObject3D || object.parent instanceof LandscapeObject3D) && controller.ray) {
      controller.grabObject(object.parent);
    }
    // @ts-ignore
    console.log(controller.grabbedObject);
  }

  onInteractionMenuDown(controller: VRController) {
    if (!controller.intersectedObject) {
      this.closeInfoMenu();
      return;
    }

    const { object } = controller.intersectedObject;

    const content = composeContent(object);
    if (content) {
      this.openInfoMenu(content);
    } else {
      this.closeInfoMenu();
    }
  }

  onInteractionGripUp(controller: VRController) {
    const object = controller.grabbedObject;
    controller.releaseObject();

    if (object instanceof ApplicationObject3D) {
      this.applicationGroup.add(object);
    }
  }

  // eslint-disable-next-line
  onUtilityGripDown(/* controller: VRController */) {
    this.openZoomMenu();
  }

  // eslint-disable-next-line
  onUtilityGripUp(/* controller: VRController */) {
    if (this.mainMenu instanceof ZoomMenu) {
      this.closeControllerMenu();
    }
  }

  // #endregion COMPONENT AND SCENE INITIALIZATION

  // #region ACTIONS

  @action
  canvasInserted(canvas: HTMLCanvasElement) {
    this.debug('Canvas inserted');

    this.canvas = canvas;

    canvas.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }

  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.debug('Outer Div inserted');

    this.initRendering();

    this.renderer.setAnimationLoop(this.render.bind(this));

    this.resize(outerDiv);

    await perform(this.loadNewLandscape);
  }

  /**
     * Call this whenever the canvas is resized. Updated properties of camera
     * and renderer.
     *
     * @param outerDiv HTML element containing the canvas
     */
  @action
  resize(outerDiv: HTMLElement) {
    const width = Number(outerDiv.clientWidth);
    const height = Number(outerDiv.clientHeight);

    // Update renderer and camera according to new canvas size
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  @action
  onVrSessionStarted(/* session: XRSession */) {
    this.debug('WebXRSession started');
  }

  @action
  onVrSessionEnded() {
    this.debug('WebXRSession ended');
    const outerDiv = this.canvas?.parentElement;
    if (outerDiv) {
      this.resize(outerDiv);
    }
  }

  /**
   * Inherit this function to update the scene with a new renderingModel. It
   * automatically removes every mesh from the scene and finally calls
   * the (overridden) "populateLandscape" function. Add your custom code
   * as shown in landscape-rendering.
   *
   * @method cleanAndUpdateScene
   */
  @action
  async cleanAndUpdateScene() {
    await perform(this.populateLandscape);

    this.debug('clean and populate landscape-rendering');
  }

  // #endregion ACTIONS

  // #region RENDERING AND SCENE POPULATION

  /**
   * Main rendering function
   */
  render() {
    if (this.isDestroyed) { return; }

    this.time.update();

    this.localUser.updateControllers();

    this.renderer.render(this.scene, this.camera);

    if (this.mainMenu instanceof ZoomMenu) {
      this.mainMenu.renderLens();
    }
  }

  @task*
  loadNewLandscape() {
    yield perform(this.populateLandscape);
  }

  /**
 * Computes new meshes for the landscape and adds them to the scene
 *
 * @method populateLandscape
 */
  // @ts-ignore
  @restartableTask*
  // eslint-disable-next-line
  populateLandscape() {
    this.debug('populate landscape-rendering');

    const { structureLandscapeData, dynamicLandscapeData } = this.args.landscapeData;

    this.landscapeObject3D.dataModel = structureLandscapeData;

    // Run Klay layouting in 3 steps within workers
    try {
      const applicationCommunications = computeApplicationCommunication(structureLandscapeData,
        dynamicLandscapeData);

      // Do layout pre-processing (1st step)
      const { graph, modelIdToPoints }: Layout1Return = yield this.worker.postMessage('layout1', {
        structureLandscapeData,
        applicationCommunications,
      });

      // Run actual klay function (2nd step)
      const newGraph: ElkNode = yield this.elk.layout(graph);

      // Post-process layout graph (3rd step)
      const layoutedLandscape: any = yield this.worker.postMessage('layout3', {
        graph: newGraph,
        modelIdToPoints,
        structureLandscapeData,
        applicationCommunications,
      });

      // Clean old landscape
      this.cleanUpLandscape();

      const {
        modelIdToLayout,
        modelIdToPoints: modelIdToPointsComplete,
      }: Layout3Return = layoutedLandscape;

      const modelIdToPlaneLayout = new Map<string, PlaneLayout>();

      this.modelIdToPlaneLayout = modelIdToPlaneLayout;

      // Convert the simple to a PlaneLayout map
      LandscapeRendering.convertToPlaneLayoutMap(modelIdToLayout, modelIdToPlaneLayout);

      // Compute center of landscape
      const landscapeRect = this.landscapeObject3D.getMinMaxRect(modelIdToPlaneLayout);
      const centerPoint = landscapeRect.center;

      // Update camera zoom accordingly
      updateCameraZoom(landscapeRect, this.camera, this.renderer);

      // Render all landscape entities
      const { nodes } = structureLandscapeData;

      // Draw boxes for nodes
      nodes.forEach((node: Node) => {
        this.renderNode(node, modelIdToPlaneLayout.get(node.ipAddress), centerPoint);

        const { applications } = node;

        // Draw boxes for applications
        applications.forEach((application: Application) => {
          this.renderApplication(application, modelIdToPlaneLayout.get(application.pid),
            centerPoint);
        });
      });

      // Render application communication
      const color = this.configuration.landscapeColors.communication;
      const tiles = LandscapeCommunicationRendering
        .computeCommunicationTiles(applicationCommunications, modelIdToPointsComplete,
          color, this.landscapeDepth / 2 + 0.25);

      LandscapeCommunicationRendering.addCommunicationLineDrawing(tiles, this.landscapeObject3D,
        centerPoint, 0.004, 0.028);

      this.centerLandscape();

      this.debug('Landscape loaded');
    } catch (e) {
      this.debug(e);
    }
  }

  // #endregion RENDERING AND SCENE POPULATION

  // #region LANDSCAPE RENDERING

  /**
 * Creates & positions a node mesh with corresponding labels.
 * Then adds it to the landscapeObject3D.
 *
 * @param node Data model for the node mesh
 * @param layout Layout data to position the mesh correctly
 * @param centerPoint Offset of landscape object
 */
  renderNode(node: Node, layout: PlaneLayout | undefined,
    centerPoint: THREE.Vector2) {
    if (!layout) { return; }

    // Create node mesh
    const nodeMesh = new NodeMesh(
      layout,
      node,
      this.configuration.landscapeColors.node,
      this.configuration.applicationColors.highlightedEntity,
      this.landscapeDepth,
      0.2,
    );

    // Create and add label + icon
    nodeMesh.setToDefaultPosition(centerPoint);

    // Label with own ip-address by default
    const labelText = nodeMesh.getDisplayName();

    this.landscapeLabeler.addNodeTextLabel(nodeMesh, labelText, this.font,
      this.configuration.landscapeColors.nodeText);

    // Add to scene
    this.landscapeObject3D.add(nodeMesh);
  }

  /**
 * Creates & positions an application mesh with corresponding labels.
 * Then adds it to the landscapeObject3D.
 *
 * @param application Data model for the application mesh
 * @param layout Layout data to position the mesh correctly
 * @param centerPoint Offset of landscape object
 */
  renderApplication(application: Application, layout: PlaneLayout | undefined,
    centerPoint: THREE.Vector2) {
    if (!layout) { return; }

    // Create application mesh
    const applicationMesh = new ApplicationMesh(
      layout,
      application,
      this.configuration.landscapeColors.application,
      this.configuration.applicationColors.highlightedEntity,
      this.landscapeDepth,
      0.3,
    );
    applicationMesh.setToDefaultPosition(centerPoint);

    // Create and add label + icon
    this.landscapeLabeler.addApplicationTextLabel(applicationMesh, application.name, this.font,
      this.configuration.landscapeColors.applicationText);
    LandscapeLabeler.addApplicationLogo(applicationMesh, this.imageLoader);

    // Add to scene
    this.landscapeObject3D.add(applicationMesh);
  }

  // #endregion LANDSCAPE RENDERING

  // #region APLICATION RENDERING

  // @ts-ignore
  @enqueueTask*
  // eslint-disable-next-line
  addApplicationTask(applicationModel: Application, origin: THREE.Vector3, 
    callback?: (applicationObject3D: ApplicationObject3D) => void) {
    try {
      if (this.applicationGroup.hasApplication(applicationModel.pid)) {
        return;
      }

      const { dynamicLandscapeData } = this.args.landscapeData;

      const layoutedApplication: Map<string, LayoutData> = yield this.worker.postMessage('city-layouter', applicationModel);

      // Converting plain JSON layout data due to worker limitations
      const boxLayoutMap = ApplicationRendering.convertToBoxLayoutMap(layoutedApplication);

      const applicationObject3D = new ApplicationObject3D(applicationModel, boxLayoutMap,
        dynamicLandscapeData);

      // Add new meshes to application
      EntityRendering.addFoundationAndChildrenToApplication(applicationObject3D,
        this.configuration.applicationColors);

      this.updateDrawableClassCommunications(applicationObject3D);

      const drawableComm = this.drawableClassCommunications.get(applicationObject3D.dataModel.pid)!;

      this.appCommRendering.addCommunication(applicationObject3D, drawableComm);

      // Add labels and close icon to application
      this.addLabels(applicationObject3D);
      const closeIcon = new CloseIcon(this.closeButtonTexture);
      closeIcon.addToApplication(applicationObject3D);

      // Scale application to a reasonable size to work with it
      const scalar = this.applicationScalar;
      applicationObject3D.scale.set(scalar, scalar, scalar);

      this.positionApplication(applicationObject3D, origin);

      this.applicationGroup.addApplication(applicationObject3D);
      this.localUser.controller1?.intersectableObjects.push(applicationObject3D);
      this.localUser.controller2?.intersectableObjects.push(applicationObject3D);

      if (callback) callback(applicationObject3D);
    } catch (e: any) {
      this.debug(e);
    }
  }

  updateDrawableClassCommunications(applicationObject3D: ApplicationObject3D) {
    if (this.drawableClassCommunications.has(applicationObject3D.dataModel.pid)) {
      return;
    }

    const { structureLandscapeData } = this.args.landscapeData;
    const drawableClassCommunications = computeDrawableClassCommunication(
      structureLandscapeData,
      applicationObject3D.traces,
    );

    const allClasses = new Set(getAllClassesInApplication(applicationObject3D.dataModel));

    const communicationInApplication = drawableClassCommunications.filter(
      (comm) => allClasses.has(comm.sourceClass) || allClasses.has(comm.targetClass),
    );

    this.drawableClassCommunications.set(applicationObject3D.dataModel.pid,
      communicationInApplication);
  }

  addApplication(applicationModel: Application, origin: THREE.Vector3) {
    if (applicationModel.packages.length === 0) {
      this.showHint('No data available');
    } else if (!this.applicationGroup.hasApplication(applicationModel.pid)) {
      perform(this.addApplicationTask, applicationModel, origin);
    }
  }

  /**
   * Sets a (newly opened) application to its default position.
   *
   * @param applicationObject3D Application which shall be positioned
   * @param origin Point of reference (position of application in landscape object)
   */
  positionApplication(applicationObject3D: ApplicationObject3D, origin: THREE.Vector3) {
    // Rotate app so that it is aligned with landscape
    applicationObject3D.setRotationFromQuaternion(this.landscapeObject3D.quaternion);
    applicationObject3D.rotateX(90 * THREE.MathUtils.DEG2RAD);
    applicationObject3D.rotateY(90 * THREE.MathUtils.DEG2RAD);

    applicationObject3D.position.copy(origin);
  }

  /**
   * Adds labels to all box meshes of a given application
   */
  addLabels(applicationObject3D: ApplicationObject3D) {
    if (!this.font) { return; }

    const clazzTextColor = this.configuration.applicationColors.clazzText;
    const componentTextColor = this.configuration.applicationColors.componentText;
    const foundationTextColor = this.configuration.applicationColors.foundationText;

    applicationObject3D.getBoxMeshes().forEach((mesh) => {
    /* Labeling is time-consuming. Thus, label only visible meshes incrementally
       as opposed to labeling all meshes up front (as done in application-rendering) */
      if (!mesh.visible) return;

      if (mesh instanceof ClazzMesh) {
        ApplicationLabeler
          .addClazzTextLabel(mesh, this.font, clazzTextColor);
      } else if (mesh instanceof ComponentMesh) {
        ApplicationLabeler
          .addBoxTextLabel(mesh, this.font, componentTextColor);
      } else if (mesh instanceof FoundationMesh) {
        ApplicationLabeler
          .addBoxTextLabel(mesh, this.font, foundationTextColor);
      }
    });
  }

  // #endregion APPLICATION RENDERING

  // #region CONTROLLER HANDLERS

  onInteractionTriggerDown(controller: VRController) {
    if (!controller.intersectedObject) return;

    this.handlePrimaryInputOn(controller.intersectedObject);
  }

  static onInteractionTriggerPress(controller: VRController, value: number) {
    if (!controller.intersectedObject) return;

    const { object, uv } = controller.intersectedObject;

    if (object instanceof BaseMenu && uv) {
      object.triggerPress(uv, value);
    }
  }

  onUtilityTrigger(controller: VRController) {
    if (!controller.intersectedObject) return;

    this.handleSecondaryInputOn(controller.intersectedObject);
  }

  /**
   * This method handles inputs of the touchpad or analog stick respectively.
   * This input is used to move a grabbed application towards or away from the controller.
   */
  onThumbpadTouch(controller: VRController, axes: number[]) {
    const grabbedObject = controller.grabbedObject;

    if (!grabbedObject) return;

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

      this.translateApplication(grabbedObject, direction, length);
    }

    if (controller.ray) { controller.ray.scale.z = intersectedObject.distance; }
  }

  onUtilityMenuDown() {
    if (this.mainMenu) {
      this.mainMenu.back();
    } else {
      this.openMainMenu();
    }
  }

  // #endregion CONTROLLER HANDLERS

  // #region MOUSE & KEYBOARD EVENT HANDLER

  handleDoubleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;

    this.handlePrimaryInputOn(intersection);
  }

  handleSingleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;

    this.handleSecondaryInputOn(intersection);
  }

  handlePanning(delta: { x: number, y: number }, button: 1 | 2 | 3) {
    const LEFT_MOUSE_BUTTON = 1;

    if (button === LEFT_MOUSE_BUTTON) {
      // Move landscape further if camera is far away
      const ZOOM_CORRECTION = (Math.abs(this.camera.position.z) / 4.0);

      // Adapt panning speed
      const xOffset = (delta.x / 100) * -ZOOM_CORRECTION;
      const yOffset = (delta.y / 100) * ZOOM_CORRECTION;

      // Adapt camera position (apply panning)
      this.camera.position.x += xOffset;
      this.camera.position.y += yOffset;
    }
  }

  handleMouseWheel(delta: number) {
    this.camera.position.z += delta * 0.2;
  }

  handleKeyboard(event: any) {
    const mvDst = 0.05;
    // Handle keys
    switch (event.key) {
      case 'q':
        this.rotateLandscape(-mvDst);
        break;
      case 'e':
        this.rotateLandscape(mvDst);
        break;
      case 'w':
        this.moveLandscape(0, mvDst, 0);
        break;
      case 's':
        this.moveLandscape(0, -mvDst, 0);
        break;
      case 'a':
        this.moveLandscape(-mvDst, 0, 0);
        break;
      case 'd':
        this.moveLandscape(mvDst, 0, 0);
        break;
      case '1':
        this.moveLandscape(0, 0, -mvDst);
        break;
      case '2':
        this.moveLandscape(0, 0, mvDst);
        break;
      case 'c':
        this.localUser.connect();
        break;
      case 'r':
        this.resetLandscapePosition();
        break;
      case 'l':
        perform(this.loadNewLandscape);
        break;
      default:
        break;
    }
  }
  // #endregion MOUSE & KEYBOARD EVENT HANDLER

  // #region MENUS

  showHint(title: string, text: string|null = null) {
    if (this.hintMenu) {
      this.hintMenu.back();
      this.hintMenu = undefined;
    }
    const hintMenu = new HintMenu(this.camera, title, text);
    this.hintMenu = hintMenu;
    hintMenu.startAnimation();
  }

  openMainMenu() {
    this.closeControllerMenu();

    if (!this.localUser.controller1) return;

    this.mainMenu = new MainMenu({
      closeMenu: this.closeControllerMenu.bind(this),
      openCameraMenu: this.openCameraMenu.bind(this),
      openAdvancedMenu: this.openAdvancedMenu.bind(this),
    });

    this.controllerMainMenus.add(this.mainMenu);
  }

  openZoomMenu() {
    this.closeControllerMenu();

    this.mainMenu = new ZoomMenu(this.closeControllerMenu.bind(this), this.renderer, this.scene, this.camera);
    this.controllerMainMenus.add(this.mainMenu);
  }

  openCameraMenu() {
    this.closeControllerMenu();

    const user = this.localUser;

    this.mainMenu = new CameraMenu(this.openMainMenu.bind(this), user.getCameraDelta.bind(user),
      user.changeCameraHeight.bind(user));
    this.controllerMainMenus.add(this.mainMenu);
  }

  openAdvancedMenu() {
    this.closeControllerMenu();

    const user = this.localUser;

    this.mainMenu = new AdvancedMenu(this.openMainMenu.bind(this),
      user.toggleLeftyMode.bind(user), user.isLefty, this.resetAll.bind(this));
    this.controllerMainMenus.add(this.mainMenu);
  }

  closeControllerMenu() {
    if (this.mainMenu) {
      this.controllerMainMenus.remove(this.mainMenu);
      this.mainMenu.disposeRecursively();
    }
    this.mainMenu = undefined;
  }

  openInfoMenu(content: DetailedInfo) {
    this.closeInfoMenu();

    this.infoMenu = new DetailInfoMenu(this.closeInfoMenu.bind(this), content);

    this.controllerInfoMenus.add(this.infoMenu);
  }

  closeInfoMenu() {
    if (this.infoMenu) {
      this.controllerInfoMenus.remove(this.infoMenu);
    }
    this.infoMenu = undefined;
  }

  // #endregion MENUS

  // #region UTILS

  handlePrimaryInputOn(intersection: THREE.Intersection) {
    const self = this;
    const { object, uv } = intersection;

    function handleApplicationObject(appObject: THREE.Object3D) {
      if (!(appObject.parent instanceof ApplicationObject3D)) return;

      if (appObject instanceof ComponentMesh) {
        self.toggleComponentAndUpdate(appObject, appObject.parent);
      } else if (appObject instanceof CloseIcon) {
        self.removeApplication(appObject.parent);
      } else if (appObject instanceof FoundationMesh) {
        self.closeAllComponentsAndUpdate(appObject.parent);
      }
    }

    if (object instanceof ApplicationMesh) {
      this.addApplication(object.dataModel, intersection.point);
    // Handle application hits
    } else if (object.parent instanceof ApplicationObject3D) {
      handleApplicationObject(object);
    } else if (object instanceof BaseMenu && uv) {
      object.triggerDown(uv);
    }
  }

  toggleComponentAndUpdate(componentMesh: ComponentMesh, applicationObject3D: ApplicationObject3D) {
    EntityManipulation.toggleComponentMeshState(componentMesh, applicationObject3D);
    this.addLabels(applicationObject3D);

    const drawableComm = this.drawableClassCommunications.get(applicationObject3D.dataModel.pid);

    if (drawableComm) {
      this.appCommRendering.addCommunication(applicationObject3D, drawableComm);
      Highlighting.updateHighlighting(applicationObject3D, drawableComm);
    }
  }

  closeAllComponentsAndUpdate(applicationObject3D: ApplicationObject3D) {
    EntityManipulation.closeAllComponents(applicationObject3D);

    const drawableComm = this.drawableClassCommunications.get(applicationObject3D.dataModel.pid);

    if (drawableComm) {
      this.appCommRendering.addCommunication(applicationObject3D, drawableComm);
      Highlighting.updateHighlighting(applicationObject3D, drawableComm);
    }
  }

  handleSecondaryInputOn(intersection: THREE.Intersection) {
    const { object, point } = intersection;
    if (object instanceof FloorMesh) {
      this.localUser.teleportToPosition(point);
    } else if (object.parent instanceof ApplicationObject3D) {
      this.highlightAppEntity(object, object.parent);
    }
  }

  // eslint-disable-next-line
  highlightAppEntity(object: THREE.Object3D, application: ApplicationObject3D) {
    if (object instanceof ComponentMesh || object instanceof ClazzMesh
      || object instanceof ClazzCommunicationMesh) {
      const drawableComm = this.drawableClassCommunications.get(application.dataModel.pid);

      if (drawableComm) {
        Highlighting.highlight(object, application, drawableComm);
      }
    }
  }

  setAppPose(id: string, position: THREE.Vector3, quaternion: THREE.Quaternion, world = false) {
    const application = this.applicationGroup.getApplication(id);

    if (!application) {
      return;
    }

    if (world) {
      application.worldToLocal(position);
    }

    application.position.copy(position);
    application.quaternion.copy(quaternion);
  }

  // eslint-disable-next-line
  translateApplication(application: THREE.Object3D, direction: THREE.Vector3, length: number){
    application.translateOnAxis(direction, length);
    application.updateMatrix();
  }

  moveLandscape(deltaX: number, deltaY: number, deltaZ: number) {
    const delta = new THREE.Vector3(deltaX, deltaY, deltaZ);
    this.landscapeOffset.add(delta);
    this.landscapeObject3D.position.add(delta);
  }

  centerLandscape() {
    const { floor } = this;
    const landscape = this.landscapeObject3D;
    const offset = this.landscapeOffset;

    // Compute bounding box of the floor
    const bboxFloor = new THREE.Box3().setFromObject(floor);

    // Calculate center of the floor
    const centerFloor = new THREE.Vector3();
    bboxFloor.getCenter(centerFloor);

    const bboxLandscape = new THREE.Box3().setFromObject(landscape);

    // Calculate center of the landscape
    const centerLandscape = new THREE.Vector3();
    bboxLandscape.getCenter(centerLandscape);

    // Set new position of landscape
    landscape.position.x += centerFloor.x - centerLandscape.x + offset.x;
    landscape.position.z += centerFloor.z - centerLandscape.z + offset.z;

    // Check distance between floor and landscape
    if (bboxLandscape.min.y > bboxFloor.max.y) {
      landscape.position.y += bboxFloor.max.y - bboxLandscape.min.y + 0.001;
    }

    // Check if landscape is underneath the floor
    if (bboxLandscape.min.y < bboxFloor.min.y) {
      landscape.position.y += bboxFloor.max.y - bboxLandscape.min.y + 0.001;
    }

    landscape.position.y += offset.y;
  }

  rotateLandscape(deltaX: number) {
    this.landscapeObject3D.rotation.x -= deltaX;
    this.updateLandscapeRotation(this.landscapeObject3D.quaternion.clone());
  }

  updateLandscapeRotation(quaternion: THREE.Quaternion) {
    this.landscapeObject3D.quaternion.copy(quaternion);
    this.centerLandscape();
  }

  resetLandscapePosition() {
    this.landscapeObject3D.rotation.x = (-90 * THREE.MathUtils.DEG2RAD);
    this.landscapeObject3D.rotation.y = (0);
    this.landscapeObject3D.rotation.z = (0);
    this.landscapeOffset.set(0, 0, 0);
    this.centerLandscape();
  }

  removeApplication(application: ApplicationObject3D) {
    this.applicationGroup.removeApplicationById(application.dataModel.pid);

    const { controller1, controller2 } = this.localUser;
    if (controller1) {
      controller1.intersectableObjects = controller1.intersectableObjects
        .filter((object) => object !== application);
    }
    if (controller2) {
      controller2.intersectableObjects = controller2.intersectableObjects
        .filter((object) => object !== application);
    }
  }

  cleanUpLandscape() {
    this.landscapeObject3D.removeAllChildren();
    this.landscapeObject3D.resetMeshReferences();
  }

  resetAll() {
    this.applicationGroup.clear();
    this.resetLandscapePosition();
    this.localUser.resetPosition();
  }

  willDestroy() {
    this.cleanUpLandscape();
    this.applicationGroup.clear();
    this.localUser.reset();
  }

  // #endregion UTILS
}
