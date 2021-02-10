import THREE from 'three';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import { tracked } from '@glimmer/tracking';
import FoundationMesh from './foundation-mesh';
import ClazzMesh from './clazz-mesh';
import ComponentMesh from './component-mesh';
import ClazzCommunicationMesh from './clazz-communication-mesh';
import BaseMesh from '../base-mesh';

/**
 * This extended Object3D adds additional functionality to
 * add and retrieve application regarded meshes efficiently and
 * some functionality to easily remove child meshes and dispose
 * all their THREE.Geometry's and THREE.Material's.
 */
export default class ApplicationObject3D extends THREE.Object3D {
  /**
   * The data model that this application object should visualize
   */
  dataModel: Application;

  boxLayoutMap: Map<string, BoxLayout>;

  traces: Trace[];

  /**
   * Map to store all box shaped meshes (i.e., Clazz, Component, Foundation)
   */
  modelIdToMesh: Map<string, BaseMesh> = new Map();

  /**
   * Map to store all ClazzCommunicationMeshes
   */
  commIdToMesh: Map<string, ClazzCommunicationMesh> = new Map();

  /**
   * Set to store all ComponentMeshes
   */
  componentMeshes: Set<ComponentMesh> = new Set();

  @tracked
  highlightedEntity: BaseMesh | Trace | null = null;

  constructor(application: Application, boxLayoutMap: Map<string, BoxLayout>, traces: Trace[]) {
    super();

    this.dataModel = application;
    this.boxLayoutMap = boxLayoutMap;
    this.traces = traces;
  }

  get layout() {
    const layout = this.getBoxLayout(this.dataModel.pid);
    if (layout) {
      return layout;
    }

    return new BoxLayout();
  }

  /**
   * Resets this object's rotation to default
   * (x = 0.65, y = 0.80)
   */
  resetRotation() {
    const ROTATION_X = 0.65;
    const ROTATION_Y = 0.80;

    this.rotation.x = ROTATION_X;
    this.rotation.y = ROTATION_Y;
  }

  /**
   * Adds object as child of this object.
   * Furthermore, application related meshes are stored inside
   * one of the class's maps or set for easier future access.
   *
   * @param object Object to add as child
   */
  add(object: THREE.Object3D) {
    super.add(object);

    // Ensure fast access to application meshes by additionally storing them in maps
    if (object instanceof FoundationMesh) {
      this.modelIdToMesh.set(object.dataModel.pid, object);
    // Store communication separately to allow efficient iteration over meshes
    } else if (object instanceof ComponentMesh || object instanceof ClazzMesh) {
      this.modelIdToMesh.set(object.dataModel.id, object);
    } else if (object instanceof ClazzCommunicationMesh) {
      this.commIdToMesh.set(object.dataModel.id, object);
    }

    // Keep track of all components (e.g. to find opened components)
    if (object instanceof ComponentMesh) {
      this.componentMeshes.add(object);
    }

    return this;
  }

  getBoxLayout(id: string) {
    return this.boxLayoutMap.get(id);
  }

  /**
   * Returns mesh with given id, if existend. Else undefined.
   *
   * @param id The mesh's id to lookup
   */
  getBoxMeshbyModelId(id: string) {
    return this.modelIdToMesh.get(id);
  }

  /**
   * Returns a set containing all application regarded box meshes inside this application
   */
  getBoxMeshes() {
    return new Set([...this.modelIdToMesh.values()]);
  }

  /**
   * Returns the clazz communication mesh that matches the id
   *
   * @param id The clazzcommunication's id, whose mesh to look up
   */
  getCommMeshByModelId(id: string) {
    return this.commIdToMesh.get(id);
  }

  /**
   * Returns a set containing all communication meshes inside this application
   */
  getCommMeshes() {
    return new Set([...this.commIdToMesh.values()]);
  }

  /**
   * Returns a set containing all communication and box meshes inside this application
   */
  getAllMeshes(): Set<BaseMesh> {
    return new Set([...this.getBoxMeshes(), ...this.getCommMeshes()]);
  }

  /**
   * Iterates over all component meshes which are currently added to the
   * application and returns a set with ids of the opened components.
   */
  get openComponentIds() {
    const openComponentIds: Set<string> = new Set();

    this.componentMeshes.forEach((componentMesh) => {
      if (componentMesh.opened) {
        openComponentIds.add(componentMesh.dataModel.id);
      }
    });

    return openComponentIds;
  }

  setHighlightingColor(color: THREE.Color) {
    this.getAllMeshes().forEach((mesh) => {
      mesh.highlightingColor = color;
      mesh.updateColor();
    });
  }

  /**
   * Clears all class maps and sets, i.e.
   *
   * @see modelIdToMesh
   * @see commIdToMesh
   * @see componentMeshes
   */
  resetMeshReferences() {
    this.modelIdToMesh.clear();
    this.commIdToMesh.clear();
    this.componentMeshes.clear();
  }

  /**
   * Disposes all communication related THREE.Material's
   * and THREE.Geometry's, and cleans the communication mesh set.
   *
   * @see commIdToMesh
   */
  removeAllCommunication() {
    this.getCommMeshes().forEach((mesh) => {
      mesh.disposeRecursively();
      mesh.deleteFromParent();
    });
    this.commIdToMesh.clear();
  }

  /**
   * Disposes all meshes inside this object and clears all maps and sets
   */
  removeAllEntities() {
    this.getAllMeshes().forEach((mesh) => {
      mesh.disposeRecursively();
      mesh.deleteFromParent();
    });
    this.resetMeshReferences();
  }
}
