import THREE from 'three';
import MinMaxRectangle from 'explorviz-frontend/view-objects/layout-models/min-max-rectangle';
import PlaneLayout from 'explorviz-frontend/view-objects/layout-models/plane-layout';
import { Node, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import NodeMesh from './node-mesh';
import ApplicationMesh from './application-mesh';

/**
 * This extended Object3D adds additional functionality to
 * add and retrieve landscape regarded meshes efficiently and
 * some functionality to easily remove child meshes and dispose
 * all their THREE.Geometry's and THREE.Material's.
 */
export default class LandscapeObject3D extends THREE.Object3D {
  dataModel: StructureLandscapeData;

  modelIdToMesh: Map<string, THREE.Mesh> = new Map();

  constructor(landscape: StructureLandscapeData) {
    super();

    this.dataModel = landscape;
  }

  /**
   * Adds object as child of this object.
   * Furthermore, application related meshes are stored inside
   * the class's {@link modelIdToMesh} map for easier future access.
   *
   * @param object Object to add as child
   */
  add(object: THREE.Object3D) {
    super.add(object);

    // Ensure fast access to landscape meshes by additionally storing them in maps
    if (object instanceof NodeMesh) {
      this.modelIdToMesh.set(object.dataModel.ipAddress, object);
    } else if (object instanceof ApplicationMesh) {
      this.modelIdToMesh.set(object.dataModel.pid, object);
    }

    return this;
  }

  /**
   * Returns Sytem, NodeGroup, Node or Application mesh matching given id
   *
   * @param id The ipAddress of a Node or the pid of an Application
   */
  getMeshbyModelId(id: string) {
    return this.modelIdToMesh.get(id);
  }

  /**
   * Resets all maps and sets governing meshes
   */
  resetMeshReferences() {
    this.modelIdToMesh.clear();
  }

  /**
   * Removes all child meshes and disposes their geometries and materials
   */
  removeAllChildren() {
    function removeChildren(entity: THREE.Object3D | THREE.Mesh) {
      for (let i = entity.children.length - 1; i >= 0; i--) {
        const child = entity.children[i];

        removeChildren(child);

        if (!(child instanceof THREE.Light)) {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            } else {
              for (let j = 0; j < child.material.length; j++) {
                const material = child.material[j];
                material.dispose();
              }
            }
          }
          entity.remove(child);
        }
      }
    }

    removeChildren(this);
  }

  isEmpty() {
    return this.modelIdToMesh.size === 0;
  }

  /**
   * Computes a minimum bounding rectangle for the layouted landscape
   */
  getMinMaxRect(modelIdToLayout: Map<string, PlaneLayout>) {
    // Rectangle which can be used to find smallest and greatest x/y coordinates
    const rect = new MinMaxRectangle();

    const { nodes } = this.dataModel;

    // Set default values
    if (nodes.get('length') === 0) {
      rect.setMinValues(0, 0);
      rect.setMaxValues(1, 1);
    } else {
      // Check nodes for new min/max position
      nodes.forEach((node: Node) => {
        const nodeLayout = modelIdToLayout.get(node.ipAddress);
        if (nodeLayout) {
          rect.setMinMaxFromLayout(nodeLayout);
        }
      });
    }
    return rect;
  }
}
