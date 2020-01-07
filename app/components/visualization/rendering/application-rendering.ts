import GlimmerComponent from "@glimmer/component";
import Application from "explorviz-frontend/models/application";
import { action } from "@ember/object";
import debugLogger from "ember-debug-logger";
import THREE from 'three';
import { inject as service } from '@ember/service';
import RenderingService, { RenderingContext } from "explorviz-frontend/services/rendering-service";
import LandscapeRepository from "explorviz-frontend/services/repos/landscape-repository";
import FoundationBuilder from 'explorviz-frontend/utils/application-rendering/foundation-builder';
import applyCityLayout from 'explorviz-frontend/utils/application-rendering/city-layouter';
import CalcCenterAndZoom from 'explorviz-frontend/utils/application-rendering/center-and-zoom-calculator';
import Interaction from 'explorviz-frontend/utils/application-rendering/interaction';
import DS from "ember-data";
import Configuration from "explorviz-frontend/services/configuration";
import Clazz from "explorviz-frontend/models/clazz";
import CurrentUser from "explorviz-frontend/services/current-user";
import Component from "explorviz-frontend/models/component";
import { getOwner } from "@ember/application";
import Highlighter from "explorviz-frontend/services/visualization/application/highlighter";
import FoundationMesh from "explorviz-frontend/utils/3d/application/foundation-mesh";
import ClazzMesh from "explorviz-frontend/utils/3d/application/clazz-mesh";
import ComponentMesh from "explorviz-frontend/utils/3d/application/component-mesh";
import EntityMesh from "explorviz-frontend/utils/3d/entity-mesh";

interface Args {
  id: string,
  application: Application
}

export default class ApplicationRendering extends GlimmerComponent<Args> {

  @service('store')
  store!: DS.Store;

  @service('configuration')
  configuration!: Configuration;

  @service('current-user')
  currentUser!: CurrentUser;

  @service('rendering-service')
  renderingService!: RenderingService;

  @service('repos/landscape-repository')
  landscapeRepo!: LandscapeRepository;

  @service('visualization/application/highlighter')
  highlighter!: Highlighter;

  debug = debugLogger('ApplicationRendering');

  canvas!: HTMLCanvasElement;

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  font !: THREE.Font;

  foundationBuilder = new FoundationBuilder();

  applicationObject3D = new THREE.Object3D();

  animationFrameId = 0;

  interaction !: any;

  meshIdToModel: Map<number, Clazz | Component> = new Map();

  modelIdToMesh: Map<string, THREE.Mesh> = new Map();

  map: any;

  foundationData: any;

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.debug("Constructor called");
  }

  @action
  canvasInserted(canvas: HTMLCanvasElement) {
    this.debug("Canvas inserted");

    this.canvas = canvas;

    canvas.oncontextmenu = function (e) {
      e.preventDefault();
    };
  }

  @action
  outerDivInserted(outerDiv: HTMLElement) {
    this.debug("Outer Div inserted");
    this.canvas.height = outerDiv.clientHeight;
    this.canvas.width = outerDiv.clientWidth;
    this.canvas.style.width = "";
    this.canvas.style.height = "";

    this.initThreeJs();
    this.initInteraction();
    this.render();

    this.interaction = Interaction.create(getOwner(this).ownerInjection());
    this.interaction.setupInteraction(this.canvas, this.camera, this.renderer, this.applicationObject3D);
    this.interaction.on('singleClick', this.handleSingleClick);
    this.interaction.on('doubleClick', this.handleDoubleClick);

    const renderingContext: RenderingContext = {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer
    };
    this.renderingService.addRendering(this.args.id, renderingContext, [this.step1, this.step2, this.step3]);
    this.renderingService.render(this.args.id, this.args.application);
  }

  resetScene() {
    this.scene.remove(this.applicationObject3D);
    this.renderingService.render(this.args.id, this.args.application);
  }

  @action
  handleSingleClick(mesh: THREE.Mesh | undefined) {
    if (mesh instanceof ComponentMesh || mesh instanceof ClazzMesh) {
      this.highlight(mesh);
    }
  }

  @action
  handleDoubleClick(mesh: THREE.Mesh | undefined) {
    if (mesh instanceof ComponentMesh) {
      if (mesh.opened) {
        this.closeComponentMesh(mesh);
      } else {
        this.openComponentMesh(mesh);
      }
    }
  }

  openComponentMesh(mesh: ComponentMesh) {
    const HEIGHT_OPENED_COMPONENT = 1.5;
    mesh.height = HEIGHT_OPENED_COMPONENT;

    // Reset y coordinate
    mesh.position.y -= mesh.layoutHeight / 2;
    // Set y coordinate according to open component height
    mesh.position.y += HEIGHT_OPENED_COMPONENT / 2;

    mesh.opened = true;
    mesh.visible = true;

    let childComponents = mesh.dataModel.get('children');
    childComponents.forEach((childComponent) => {
      let mesh = this.modelIdToMesh.get(childComponent.get('id'));
      if (mesh) {
        mesh.visible = true;
      }
    });

    let clazzes = mesh.dataModel.get('clazzes');
    clazzes.forEach((clazz) => {
      let mesh = this.modelIdToMesh.get(clazz.get('id'));
      if (mesh) {
        mesh.visible = true;
      }
    });
  }

  closeComponentMesh(mesh: ComponentMesh) {
    const HEIGHT_OPENED_COMPONENT = 1.5;
    mesh.height = mesh.layoutHeight;

    // Reset y coordinate
    mesh.position.y -= HEIGHT_OPENED_COMPONENT / 2;
    // Set y coordinate according to closed component height
    mesh.position.y += mesh.layoutHeight / 2;

    mesh.opened = false;

    let childComponents = mesh.dataModel.get('children');
    childComponents.forEach((childComponent) => {
      let mesh = this.modelIdToMesh.get(childComponent.get('id'));
      if (mesh instanceof ComponentMesh) {
        mesh.visible = false;
        if (mesh.opened){
          this.closeComponentMesh(mesh);
        }
        // Reset highlighting if highlighted entity is no longer visible
        if (mesh.highlighted){
          this.unhighlightAll();
        }
      }
    });

    let clazzes = mesh.dataModel.get('clazzes');
    clazzes.forEach((clazz) => {
      let mesh = this.modelIdToMesh.get(clazz.get('id'));
      if (mesh instanceof ClazzMesh) {
        mesh.visible = false;
        // Reset highlighting if highlighted entity is no longer visible
        if (mesh.highlighted){
          this.unhighlightAll();
        }
      }
    });
  }

  highlight(mesh: ComponentMesh | ClazzMesh): void {
    // Reset highlighting if highlighted mesh is clicked
    if (mesh.highlighted) {
      this.unhighlightAll();
      return;
    }

    // Reset highlighting
    this.unhighlightAll();
    let model = mesh.dataModel;

    // Get all clazzes
    let foundation = this.foundationBuilder.foundationObj;
    if (foundation === null)
      return;

    // All clazzes in application
    let allClazzes = new Set<Clazz>();
    foundation.getContainedClazzes(allClazzes);

    // Highlight the entity itself
    mesh.highlight();

    // Get all clazzes in current component
    let containedClazzes = new Set<Clazz>();

    if (model instanceof Component)
      model.getContainedClazzes(containedClazzes);
    else
      containedClazzes.add(model);

    let allInvolvedClazzes = new Set<Clazz>(containedClazzes);

    containedClazzes.forEach((clazz: Clazz) => {
      clazz.clazzCommunications.forEach(clazzCommunication => {
        allInvolvedClazzes.add(clazzCommunication.belongsTo('sourceClazz').value() as Clazz);
        allInvolvedClazzes.add(clazzCommunication.belongsTo('targetClazz').value() as Clazz);
      })
    });

    let nonInvolvedClazzes = new Set([...allClazzes].filter(x => !allInvolvedClazzes.has(x)));

    let componentSet = new Set<Component>();
    allInvolvedClazzes.forEach(clazz => {
      this.getAllAncestorComponents(clazz.getParent(), componentSet);
    });

    nonInvolvedClazzes.forEach(clazz => {
      let clazzMesh = this.modelIdToMesh.get(clazz.get('id'));
      let componentMesh = this.modelIdToMesh.get(clazz.parent.get('id'));
      if (clazzMesh instanceof ClazzMesh && componentMesh instanceof ComponentMesh && componentMesh.opened) {
        clazzMesh.material.opacity = 0.3;
        clazzMesh.material.transparent = true;
      }
      this.turnComponentAndAncestorsTransparent(clazz.getParent(), componentSet);
    });
  }

  unhighlightAll() {
    let meshes = this.modelIdToMesh.values();
    for (let mesh of meshes) {
      if (mesh instanceof EntityMesh) {
        mesh.unhighlight();
      }
    }
  }

  turnComponentAndAncestorsTransparent(component: Component, ignorableComponents: Set<Component>) {
    if (ignorableComponents.has(component) || component.get('foundation'))
      return;

    ignorableComponents.add(component);
    const parent = component.getParentComponent();
    let parentMesh = this.modelIdToMesh.get(component.get('id'));
    if (parentMesh instanceof ComponentMesh && parentMesh.opened) {
      parentMesh.material.opacity = 0.3;
      parentMesh.material.transparent = true;
    }
    this.turnComponentAndAncestorsTransparent(parent, ignorableComponents);
  }

  getAllAncestorComponents(component: Component, set: Set<Component>) {
    if (component.get('foundation') || set.has(component))
      return;

    set.add(component);

    const parent = component.getParentComponent();
    this.getAllAncestorComponents(parent, set);
  }

  @action
  step1() {
    this.foundationBuilder.createFoundation(this.args.application, this.store);
  }

  @action
  step2() {
    // this.args.application.applyDefaultOpenLayout(false);
    let map = applyCityLayout(this.args.application);
    this.map = map;
  }

  @action
  step3() {
    const foundationColor = this.configuration.applicationColors.foundation;
    // Foundation is created in step1(), so we can safely assume the foundationObj to be not null
    this.addComponentToScene(this.foundationBuilder.foundationObj as Component, foundationColor);

    this.scene.add(this.applicationObject3D);
    this.resetRotation();
  }

  addComponentToScene(component: Component, color: string) {

    const OPENED_COMPONENT_HEIGHT = 1.5;

    const { foundation: foundationColor, componentOdd: componentOddColor, componentEven: componentEvenColor,
      clazz: clazzColor, highlightedEntity: highlightedEntityColor } = this.configuration.applicationColors;

    let mesh;
    let componentData = this.map.get(component.id);
    let layoutPos = new THREE.Vector3(componentData.positionX, componentData.positionY, componentData.positionZ);

    if (component.get('foundation')) {
      this.foundationData = componentData;

      mesh = new FoundationMesh(layoutPos, OPENED_COMPONENT_HEIGHT, componentData.width, componentData.depth,
        component, new THREE.Color(foundationColor), new THREE.Color(highlightedEntityColor));
      let centerPoint = new THREE.Vector3(
        componentData.positionX + componentData.width / 2.0,
        componentData.positionY + OPENED_COMPONENT_HEIGHT / 2.0,
        componentData.positionZ + componentData.depth / 2.0);

      let applicationCenter = CalcCenterAndZoom(this.foundationData);
      centerPoint.sub(applicationCenter);
      centerPoint.x *= 0.5;
      centerPoint.z *= 0.5;

      mesh.position.copy(centerPoint);

      this.applicationObject3D.add(mesh);
      this.meshIdToModel.set(mesh.id, component);
      this.modelIdToMesh.set(component.id, mesh);
      // Regular component
    } else {
      mesh = new ComponentMesh(layoutPos, componentData.height, componentData.width, componentData.depth,
        component, new THREE.Color(color), new THREE.Color(highlightedEntityColor));
      let centerPoint = new THREE.Vector3(
        componentData.positionX + componentData.width / 2.0,
        componentData.positionY + componentData.height / 2.0,
        componentData.positionZ + componentData.depth / 2.0);

      let applicationCenter = CalcCenterAndZoom(this.foundationData);
      centerPoint.sub(applicationCenter);
      centerPoint.x *= 0.5;
      centerPoint.z *= 0.5;

      mesh.position.copy(centerPoint);

      this.applicationObject3D.add(mesh);
      this.meshIdToModel.set(mesh.id, component);

      let parent = mesh.dataModel.parentComponent;
      let parentMesh = this.modelIdToMesh.get(parent.get('id'));
      if (parentMesh instanceof ComponentMesh) {
        mesh.visible = parentMesh.opened;
      }
      this.modelIdToMesh.set(component.id, mesh);
    }

    const clazzes = component.get('clazzes');
    const children = component.get('children');

    clazzes.forEach((clazz: Clazz) => {
      let clazzData = this.map.get(clazz.get('id'));
      layoutPos = new THREE.Vector3(clazzData.positionX, clazzData.positionY, clazzData.positionZ)

      if (clazz.highlighted) {
        // TODO
      } else {
        mesh = new ClazzMesh(layoutPos, clazzData.height, clazzData.width, clazzData.depth,
          clazz, new THREE.Color(clazzColor), new THREE.Color(highlightedEntityColor));
        let centerPoint = new THREE.Vector3(
          clazzData.positionX + clazzData.width / 2.0,
          clazzData.positionY + clazzData.height / 2.0,
          clazzData.positionZ + clazzData.depth / 2.0);

        let applicationCenter = CalcCenterAndZoom(this.foundationData);
        centerPoint.sub(applicationCenter);
        centerPoint.x *= 0.5;
        centerPoint.z *= 0.5;

        mesh.position.copy(centerPoint);

        this.applicationObject3D.add(mesh);

        let parent = mesh.dataModel.get('parent');
        let parentMesh = this.modelIdToMesh.get(parent.get('id'));
        if (parentMesh instanceof ComponentMesh) {
          mesh.visible = parentMesh.opened;
        }

        this.meshIdToModel.set(mesh.id, clazz);
        this.modelIdToMesh.set(clazz.id, mesh);
      }
    });

    children.forEach((child: Component) => {
      if (component.get('foundation')) {
        this.addComponentToScene(child, componentOddColor);
      } else if (color === componentEvenColor) {
        this.addComponentToScene(child, componentOddColor);
      } else {
        this.addComponentToScene(child, componentEvenColor);
      }
    });
  } // END addComponentToScene

  static calculateCenter(componentData: any) {
    let centerPoint = new THREE.Vector3(
      componentData.positionX + componentData.width / 2.0,
      componentData.positionY + componentData.height / 2.0,
      componentData.positionZ + componentData.depth / 2.0);

    centerPoint.sub(CalcCenterAndZoom(componentData));
    centerPoint.multiplyScalar(0.5);
    return centerPoint;
  }


  /**
   * Adds a Box to an application, therefore also computes color, size etc.
   * @method createBox
   * @param {emberModel} boxEntity Component or clazz
   * @param {string}     color     Color for box
   */
  createBox(boxEntity: any, color: string, height: number) {
    let data = this.map.get(boxEntity.id);

    let centerPoint = new THREE.Vector3(
      data.positionX + data.width / 2.0,
      data.positionY + height / 2.0,
      data.positionZ + data.depth / 2.0);

    let transparent = false;
    let opacityValue = 1.0;

    if (boxEntity.get('state') === "TRANSPARENT") {
      transparent = this.currentUser.getPreferenceOrDefaultValue('flagsetting', 'appVizTransparency') as boolean | undefined || transparent;
      opacityValue = this.currentUser.getPreferenceOrDefaultValue('rangesetting', 'appVizTransparencyIntensity') as number | undefined || opacityValue;
    }

    const material = new THREE.MeshLambertMaterial({
      opacity: opacityValue,
      transparent: transparent
    });

    material.color = new THREE.Color(color);

    centerPoint.sub(CalcCenterAndZoom(this.foundationData));
    centerPoint.x *= 0.5;
    centerPoint.z *= 0.5;

    const extension = new THREE.Vector3(data.width / 2.0,
      height, data.depth / 2.0);

    const cube = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(cube, material);
    mesh.scale.x = extension.x;
    mesh.scale.y = extension.y;
    mesh.scale.z = extension.z;

    mesh.position.set(centerPoint.x, centerPoint.y, centerPoint.z);
    mesh.updateMatrix();

    this.applicationObject3D.add(mesh);
    this.meshIdToModel.set(mesh.id, boxEntity);
    return mesh;
  } // END createBox


  resetRotation() {
    const rotationX = 0.65;
    const rotationY = 0.80;

    this.applicationObject3D.rotation.x = rotationX;
    this.applicationObject3D.rotation.y = rotationY;
  }

  initThreeJs() {
    this.loadFont();

    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#DDD');
    this.debug('Scene created');
  }

  initCamera() {
    const { width, height } = this.canvas;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 100);
    this.debug('Camera added');
  }

  initRenderer() {
    const { width, height } = this.canvas;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.debug('Renderer set up');
  }

  initLights() {
    const spotLight = new THREE.SpotLight(0xffffff, 0.5, 1000, 1.56, 0, 0);
    spotLight.position.set(100, 100, 100);
    spotLight.castShadow = false;
    this.scene.add(spotLight);

    const light = new THREE.AmbientLight(new THREE.Color(0.65, 0.65, 0.65));
    this.scene.add(light);
    this.debug('Lights added');
  }

  initInteraction() {

  }

  // Rendering loop //
  @action
  render() {
    if (this.isDestroyed)
      return;

    const animationId = requestAnimationFrame(this.render);
    this.animationFrameId = animationId;

    this.renderer.render(this.scene, this.camera);
  }

  @action
  cleanAndUpdateScene() {
    this.debug("cleanAndUpdateScene");
  }

  loadFont() {
    new THREE.FontLoader().load(
      // resource URL
      '/three.js/fonts/roboto_mono_bold_typeface.json',

      // onLoad callback
      font => {
        if (this.isDestroyed)
          return;

        this.font = font;
        this.debug("(THREE.js) font sucessfully loaded.");
      }
    );
  }

  willDestroy() {
    this.renderingService.removeRendering(this.args.id);
    this.foundationBuilder.removeFoundation(this.store);
  }
}
