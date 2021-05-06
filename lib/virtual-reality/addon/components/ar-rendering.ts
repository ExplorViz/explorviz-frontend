import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import THREE from 'three';
import { tracked } from '@glimmer/tracking';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import ImageLoader from 'explorviz-frontend/utils/three-image-loader';
import Configuration from 'explorviz-frontend/services/configuration';
import PlaneLayout from 'explorviz-frontend/view-objects/layout-models/plane-layout';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import Interaction from 'explorviz-frontend/utils/interaction';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import LandscapeRendering, { Layout1Return, Layout3Return } from 'explorviz-frontend/components/visualization/rendering/landscape-rendering';
import { restartableTask, task } from 'ember-concurrency-decorators';
import * as LandscapeCommunicationRendering from
  'explorviz-frontend/utils/landscape-rendering/communication-rendering';
import {
  Class, Package, Application, Node,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import LandscapeObject3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-object-3d';
import LandscapeLabeler from 'explorviz-frontend/utils/landscape-rendering/labeler';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import AppCommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import LocalVrUser from 'explorviz-frontend/services/local-vr-user';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import DeltaTime from 'virtual-reality/services/delta-time';
import ElkConstructor, { ELK, ElkNode } from 'elkjs/lib/elk-api';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { perform } from 'ember-concurrency-ts';
import computeApplicationCommunication from 'explorviz-frontend/utils/landscape-rendering/application-communication-computer';

import { DrawableClassCommunication } from 'explorviz-frontend/utils/landscape-rendering/class-communication-computer';
import HammerInteraction from 'explorviz-frontend/utils/hammer-interaction';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import ArSettings from 'virtual-reality/services/ar-settings';
import VrApplicationRenderer from 'virtual-reality/services/vr-application-renderer';
// import VrMessageReceiver from 'virtual-reality/services/vr-message-receiver';
import VrAssetRepository from 'virtual-reality/services/vr-asset-repo';
import TimestampRepository, { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import VrTimestampService from 'virtual-reality/services/vr-timestamp';
import VrHighlightingService from 'virtual-reality/services/vr-highlighting';
import ArZoomHandler from 'virtual-reality/utils/ar-helpers/ar-zoom-handler';

interface Args {
  readonly landscapeData: LandscapeData;
  readonly font: THREE.Font;
  readonly components: string[];
  readonly showDataSelection: boolean;
  readonly selectedTimestampRecords: Timestamp[];
  addComponent(componentPath: string): void; // is passed down to the viz navbar
  removeComponent(component: string): void;
  openDataSelection(): void;
  closeDataSelection(): void;
}

type DataModel = Node | Application |Package | Class | DrawableClassCommunication;

type PopupData = {
  mouseX: number,
  mouseY: number,
  entity: DataModel
};

declare const THREEx: any;

export default class ArRendering extends Component<Args> {
  // #region CLASS FIELDS AND GETTERS

  @service('configuration')
  configuration!: Configuration;

  @service('local-vr-user')
  localUser!: LocalVrUser;

  @service('delta-time')
  time!: DeltaTime;

  @service('vr-highlighting')
  private highlightingService!: VrHighlightingService;

  @service('ar-settings')
  arSettings!: ArSettings;

  @service('repos/timestamp-repository')
  private timestampRepo!: TimestampRepository;

  @service('vr-timestamp')
  private timestampService!: VrTimestampService;

  // @service('vr-message-receiver')
  // private receiver!: VrMessageReceiver;

  @service('vr-application-renderer')
  private vrApplicationRenderer!: VrApplicationRenderer;

  @service('vr-asset-repo')
  private assetRepo!: VrAssetRepository;

  @service()
  worker!: any;

  // Maps models to a computed layout
  modelIdToPlaneLayout: Map<string, PlaneLayout>|null = null;

  debug = debugLogger('ArRendering');

  // Used to register (mouse) events
  interaction!: Interaction;

  outerDiv!: HTMLElement;

  canvas!: HTMLCanvasElement;

  scene!: THREE.Scene;

  @tracked
  camera!: THREE.PerspectiveCamera;

  renderer!: THREE.WebGLRenderer;

  raycaster: THREE.Raycaster;

  // Depth of boxes for landscape entities
  landscapeDepth: number;

  closeButtonTexture: THREE.Texture;

  landscapeOffset = new THREE.Vector3();

  get font() {
    return this.args.font;
  }

  readonly elk: ELK;

  readonly imageLoader: ImageLoader = new ImageLoader();

  arZoomHandler: ArZoomHandler | undefined;

  readonly appCommRendering: AppCommunicationRendering;

  // Provides functions to label landscape meshes
  readonly landscapeLabeler = new LandscapeLabeler();

  // Extended Object3D which manages landscape meshes
  @tracked
  readonly landscapeObject3D!: LandscapeObject3D;

  drawableClassCommunications: Map<string, DrawableClassCommunication[]> = new Map();

  onRenderFcts: (() => void)[] = [];

  lastTimeMsec: null|number = null;

  arToolkitSource: any;

  arToolkitContext: any;

  landscapeMarkers: THREE.Group[] = [];

  applicationMarkers: THREE.Group[] = [];

  private willDestroyController: AbortController = new AbortController();

  @tracked
  popupData: PopupData | null = null;

  @tracked
  hammerInteraction: HammerInteraction;

  @tracked
  showSettings = false;

  // #endregion CLASS FIELDS AND GETTERS

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.debug('Constructor called');

    this.elk = new ElkConstructor({
      workerUrl: './assets/web-workers/elk-worker.min.js',
    });

    this.landscapeDepth = 0.7;

    this.raycaster = new THREE.Raycaster();

    this.appCommRendering = new AppCommunicationRendering(this.configuration);

    // Load image for delete button
    this.closeButtonTexture = new THREE.TextureLoader().load('images/x_white_transp.png');

    // Load and scale landscape
    this.landscapeObject3D = new LandscapeObject3D(this.args.landscapeData.structureLandscapeData);
    this.arSettings.landscapeObject = this.landscapeObject3D;

    // Rotate landscape such that it lays flat on the floor
    this.landscapeObject3D.rotateX(-90 * THREE.MathUtils.DEG2RAD);

    this.hammerInteraction = HammerInteraction.create();

    AlertifyHandler.setAlertifyPosition('bottom-center');
  }

  // #region COMPONENT AND SCENE INITIALIZATION

  /**
     * Calls all three related init functions and adds the three
     * performance panel if it is activated in user settings
     */
  initRendering() {
    this.initServices();
    this.initScene();
    this.initCamera();
    this.initCameraCrosshair();
    this.initRenderer();
    this.initLights();
    this.initArJs();
    this.initInteraction();
  }

  /**
     * Creates a scene, its background and adds a landscapeObject3D to it
     */
  initScene() {
    this.scene = new THREE.Scene();

    this.scene.add(this.landscapeObject3D);
  }

  /**
     * Creates a PerspectiveCamera according to canvas size and sets its initial position
     */
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(42, 640 / 480, 0.01, 2000);
    this.scene.add(this.camera);

    this.arZoomHandler = new ArZoomHandler(this.camera, this.outerDiv);

    this.debug('Camera added');
  }

  initCameraCrosshair() {
    const geometry = new THREE.RingGeometry(0.0001, 0.0003, 30);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const crosshairMesh = new THREE.Mesh(geometry, material);

    this.camera.add(crosshairMesh);
    // Position just in front of camera
    crosshairMesh.position.z = -0.1;
  }

  /**
     * Initiates a WebGLRenderer
     */
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: this.canvas,
    });

    this.debug('Renderer set up');
  }

  private initServices() {
    this.debug('Initializing services...');

    // Use given font for landscape and application rendering.
    this.assetRepo.font = this.args.font;

    // Initialize timestamp and landscape data. If no timestamp is selected,
    // the latest timestamp is used. When there is no timestamp, we fall back
    // to the current time.
    const { landscapeToken } = this.args.landscapeData.structureLandscapeData;
    const timestamp = this.args.selectedTimestampRecords[0]?.timestamp
      || this.timestampRepo.getLatestTimestamp(landscapeToken)?.timestamp
      || new Date().getTime();
    this.timestampService.setTimestampLocally(
      timestamp,
      this.args.landscapeData.structureLandscapeData,
      this.args.landscapeData.dynamicLandscapeData,
    );
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
    this.interaction = new Interaction(this.canvas, this.camera, this.renderer,
      this.getIntersectableObjects(), {}, ArRendering.raycastFilter);

    // Add key listener for room positioning
    window.onkeydown = (event: any) => {
      this.handleKeyboard(event);
    };
  }

  getIntersectableObjects() {
    const intersectableObjects: THREE.Object3D[] = [this.landscapeObject3D];

    this.applicationMarkers.forEach((appMarker) => {
      intersectableObjects.push(appMarker);
    });

    return intersectableObjects;
  }

  static raycastFilter(intersection: THREE.Intersection) {
    return !(intersection.object instanceof LabelMesh || intersection.object instanceof LogoMesh);
  }

  initArJs() {
    this.arToolkitSource = new THREEx.ArToolkitSource({
      sourceType: 'webcam',
    });

    this.arToolkitSource.init(() => {
      setTimeout(() => {
        this.resize(this.outerDiv);
      }, 1000);
    });

    const arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: 'ar_data/camera_para.dat',
      detectionMode: 'mono',
    });

    this.arToolkitContext = arToolkitContext;

    arToolkitContext.init();

    // Update artoolkit on every frame
    this.onRenderFcts.push(() => {
      if (this.arToolkitSource.ready === false) return;

      arToolkitContext.update(this.arToolkitSource.domElement);
    });

    const landscapeMarker0 = new THREE.Group();
    landscapeMarker0.add(this.landscapeObject3D);
    this.scene.add(landscapeMarker0);

    // Init controls for camera
    // eslint-disable-next-line
    new THREEx.ArMarkerControls(arToolkitContext, landscapeMarker0, {
      type: 'pattern',
      patternUrl: 'ar_data/patt.hiro',
    });

    const applicationMarkerNames = ['pattern-letterA', 'pattern-letterB'];

    applicationMarkerNames.forEach((markerName) => {
      const applicationMarker = new THREE.Group();
      this.scene.add(applicationMarker);
      this.applicationMarkers.push(applicationMarker);

      // Init controls for camera
      // eslint-disable-next-line
      new THREEx.ArMarkerControls(arToolkitContext, applicationMarker, {
        type: 'pattern',
        patternUrl: `ar_data/${markerName}.patt`,
      });
    });

    // Render the scene
    this.onRenderFcts.push(() => {
      this.renderer.render(this.scene, this.camera);
    });
  }
  // #endregion COMPONENT AND SCENE INITIALIZATION

  // #region ACTIONS

  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.debug('Outer Div inserted');

    this.outerDiv = outerDiv;

    this.initRendering();

    this.renderer.setAnimationLoop(this.render.bind(this));

    this.resize(outerDiv);

    await perform(this.loadNewLandscape);
  }

  @action
  canvasInserted(canvas: HTMLCanvasElement) {
    this.debug('Canvas inserted');

    this.canvas = canvas;
    this.hammerInteraction.setupHammer(canvas);

    canvas.oncontextmenu = (e) => {
      e.preventDefault();
    };
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
    this.camera.updateProjectionMatrix();

    this.arToolkitSource.onResizeElement();

    this.arToolkitSource.copyElementSizeTo(this.renderer.domElement);
    if (this.arToolkitContext.arController !== null) {
      this.arToolkitSource.copyElementSizeTo(this.arToolkitContext.arController.canvas);
    }

    const video = document.getElementById('arjs-video');

    if (video instanceof HTMLVideoElement) {
      // Set video to cover screen
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.marginLeft = '0';
      video.style.marginTop = '0';

      // Center canvas
      this.canvas.style.marginLeft = `${(width - parseInt(this.canvas.style.width, 10)) / 2}px`;
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

  @action
  handlePrimaryCrosshairInteraction() {
    const intersection = this.interaction.raycastCanvasCenter();

    if (intersection) {
      this.handlePrimaryInputOn(intersection);
    }
  }

  @action
  handleSecondaryCrosshairInteraction() {
    const intersection = this.interaction.raycastCanvasCenter();

    if (intersection) {
      this.handleSecondaryInputOn(intersection);
    }
  }

  @action
  handleZoomActivation() {
    this.arZoomHandler?.enableZoom();
  }

  @action
  handleZoomDeactivation() {
    this.arZoomHandler?.disableZoom();
  }

  @action
  handlePlusInteraction() {
    const intersection = this.interaction.raycastCanvasCenter();

    if (intersection && intersection.object) {
      const { parent } = intersection.object;
      if (parent instanceof LandscapeObject3D || parent instanceof ApplicationObject3D) {
        parent.scale.set(parent.scale.x * 1.1, parent.scale.y * 1.1, parent.scale.z * 1.1);
      }
    }
  }

  @action
  handleMinusInteraction() {
    const intersection = this.interaction.raycastCanvasCenter();

    if (intersection && intersection.object) {
      const { parent } = intersection.object;
      if (parent instanceof LandscapeObject3D || parent instanceof ApplicationObject3D) {
        parent.scale.set(parent.scale.x * 0.9, parent.scale.y * 0.9, parent.scale.z * 0.9);
      }
    }
  }

  @action
  handleInfoInteraction() {
    const intersection = this.interaction.raycastCanvasCenter();

    if (!intersection) {
      this.popupData = null;
      return;
    }

    const mesh = intersection.object;

    // Show information as popup is mouse stopped on top of a mesh
    if ((mesh instanceof NodeMesh || mesh instanceof ApplicationMesh
      || mesh instanceof ClazzMesh || mesh instanceof ComponentMesh
      || mesh instanceof ClazzCommunicationMesh)
      && mesh.dataModel !== this.popupData?.entity) {
      this.popupData = {
        mouseX: this.canvas.width / 2,
        mouseY: this.canvas.height / 2,
        entity: mesh.dataModel,
      };
    } else {
      this.popupData = null;
    }
  }

  @action
  toggleSettingsPane() {
    this.args.openDataSelection();
  }

  @action
  updateColors() {
    this.scene.traverse((object3D) => {
      if (object3D instanceof BaseMesh) {
        object3D.updateColor();
        // Special case because communication arrow is no base mesh
      } else if (object3D instanceof CommunicationArrowMesh) {
        object3D.updateColor(this.configuration.applicationColors.communicationArrow);
      }
    });
  }

  // #endregion ACTIONS

  // #region RENDERING AND SCENE POPULATION

  /**
   * Main rendering function
   */
  render() {
    if (this.isDestroyed) { return; }

    this.time.update();

    this.renderer.setViewport(0, 0, this.outerDiv.clientWidth, this.outerDiv.clientHeight);

    this.renderer.render(this.scene, this.camera);

    // Call each update function
    this.onRenderFcts.forEach((onRenderFct) => {
      onRenderFct();
    });

    this.arZoomHandler?.renderZoomCamera(this.renderer, this.scene);
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
      const layoutedLandscape: Layout3Return = yield this.worker.postMessage('layout3', {
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

      // Render all landscape entities
      const { nodes } = structureLandscapeData;

      // Draw boxes for nodes
      nodes.forEach((node: Node) => {
        this.renderNode(node, modelIdToPlaneLayout.get(node.ipAddress), centerPoint);

        const { applications } = node;

        // Draw boxes for applications
        applications.forEach((application: Application) => {
          this.renderApplication(application, modelIdToPlaneLayout.get(application.instanceId),
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

      this.landscapeObject3D.setOpacity(this.arSettings.landscapeOpacity);

      this.landscapeObject3D.setLargestSide(2);

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
    this.landscapeLabeler.addApplicationLogo(applicationMesh, this.imageLoader);

    // Add to scene
    this.landscapeObject3D.add(applicationMesh);
  }

  // #endregion LANDSCAPE RENDERING

  // #region APLICATION RENDERING
  async addApplication(applicationModel: Application) {
    if (applicationModel.packages.length === 0) {
      const message = `Sorry, there is no information for application <b>
        ${applicationModel.name}</b> available.`;

      AlertifyHandler.showAlertifyMessage(message);
    } else {
      // data available => open application-rendering
      AlertifyHandler.closeAlertifyMessages();

      for (let i = 0; i < this.applicationMarkers.length; i++) {
        if (this.applicationMarkers[i].children.length === 0) {
          break;
        } else if (i === (this.applicationMarkers.length - 1)) {
          AlertifyHandler.showAlertifyWarning('All markers are occupied.');
          return;
        }
      }

      const applicationObject3D = await this.vrApplicationRenderer
        .addApplication(applicationModel, {});

      if (!applicationObject3D) {
        AlertifyHandler.showAlertifyError('Could not open application.');
        return;
      }

      // Scale application such that it approximately fits to the printed marker
      applicationObject3D.setLargestSide(1.5);

      applicationObject3D.rotateY(90 * THREE.MathUtils.DEG2RAD);

      applicationObject3D.setBoxMeshOpacity(this.arSettings.applicationOpacity);

      for (let i = 0; i < this.applicationMarkers.length; i++) {
        if (this.applicationMarkers[i].children.length === 0) {
          this.applicationMarkers[i].add(applicationObject3D);

          const message = `Application '${applicationModel.name}' successfully opened <br>
            on marker #${i}.`;

          AlertifyHandler.showAlertifySuccess(message);

          break;
        }
      }
    }
  }

  // #endregion APPLICATION RENDERING

  // #region MOUSE & KEYBOARD EVENT HANDLER

  @action
  handleDoubleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;

    this.handlePrimaryInputOn(intersection);
  }

  @action
  handleSingleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;

    this.handleSecondaryInputOn(intersection);
  }

  handleKeyboard(event: any) {
    // Handle keys
    switch (event.key) {
      case 'c':
        // this.localUser.connect();
        break;
      case 'l':
        perform(this.loadNewLandscape);
        break;
      default:
        break;
    }
  }

  // #endregion MOUSE & KEYBOARD EVENT HANDLER

  // #region UTILS

  handlePrimaryInputOn(intersection: THREE.Intersection) {
    const self = this;
    const { object } = intersection;

    function handleApplicationObject(appObject: THREE.Object3D) {
      if (!(appObject.parent instanceof ApplicationObject3D)) return;

      if (appObject instanceof ComponentMesh) {
        self.vrApplicationRenderer.toggleComponent(
          appObject,
          appObject.parent,
        );
      } else if (appObject instanceof CloseIcon) {
        appObject.close().then((closedSuccessfully: boolean) => {
          if (!closedSuccessfully) AlertifyHandler.showAlertifyError('Application could not be closed');
        });
      } else if (appObject instanceof FoundationMesh) {
        self.vrApplicationRenderer.closeAllComponents(appObject.parent);
      }
    }

    if (object instanceof ApplicationMesh) {
      this.addApplication(object.dataModel);
    // Handle application hits
    } else if (object.parent instanceof ApplicationObject3D) {
      handleApplicationObject(object);
    }
  }

  handleSecondaryInputOn(intersection: THREE.Intersection) {
    const { object } = intersection;
    if (object.parent instanceof ApplicationObject3D) {
      this.highlightingService.highlightComponent(
        object.parent,
        object,
      );
    }
  }

  cleanUpLandscape() {
    this.landscapeObject3D.removeAllChildren();
    this.landscapeObject3D.resetMeshReferences();
  }

  static cleanUpAr() {
    // Remove video and stop corresponding stream
    const video = document.getElementById('arjs-video');

    if (video instanceof HTMLVideoElement) {
      document.body.removeChild(video);

      const stream = video.srcObject;

      if (stream instanceof MediaStream) {
        const tracks = stream.getTracks();

        tracks.forEach((track) => {
          track.stop();
        });
      }
    }
  }

  willDestroy() {
  // Reset rendering.
    this.vrApplicationRenderer.removeAllApplicationsLocally();
    // this.vrLandscapeRenderer.cleanUpLandscape();

    // Reset services.
    this.localUser.reset();

    // Remove event listers.
    // this.receiver.removeMessageListener(this);
    this.willDestroyController.abort();

    this.cleanUpLandscape();
    ArRendering.cleanUpAr();
    AlertifyHandler.setAlertifyPosition('bottom-right');
  }

  // #endregion UTILS
}