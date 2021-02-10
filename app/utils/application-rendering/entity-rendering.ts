import THREE from 'three';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import { ApplicationColors } from 'explorviz-frontend/services/configuration';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import BoxMesh from 'explorviz-frontend/view-objects/3d/application/box-mesh';
import { Class, Package } from '../landscape-schemes/structure-data';

/**
 * Takes an application mesh, computes it position and adds it to the application object.
 *
 * @param mesh Mesh which should be added to the application
 * @param applicationObject3D Object which contains all application meshes
 */
export function addMeshToApplication(mesh: BoxMesh, applicationObject3D: ApplicationObject3D) {
  const layoutPosition = mesh.layout.position;
  const applicationCenter = applicationObject3D.layout.center;

  const centerPoint = new THREE.Vector3(
    layoutPosition.x + mesh.layout.width / 2.0,
    layoutPosition.y + mesh.layout.height / 2.0,
    layoutPosition.z + mesh.layout.depth / 2.0,
  );

  centerPoint.sub(applicationCenter);

  mesh.position.copy(centerPoint);

  applicationObject3D.add(mesh);
}

/**
 * Sets the visibility of a mesh according to the opened state of the parent component.
 *
 * @param mesh Object of which the visibility shall be recalculated
 * @param applicationMesh Object which contains all application objects
 */
export function updateMeshVisiblity(mesh: ComponentMesh | ClazzMesh,
  applicationObject3D: ApplicationObject3D) {
  const { parent } = mesh.dataModel;

  if (parent === undefined) {
    return;
  }

  const parentMesh = applicationObject3D.getBoxMeshbyModelId(parent.id);
  if (parentMesh instanceof ComponentMesh) {
    mesh.visible = parentMesh.opened;
  }
}

/**
 * Creates, positiones and adds component and clazz meshes to a given application object.
 *
 * @param component Data model for the component which shall be added to the scene
 * @param applicationObject3D Object to which the component mesh and its children are added
 * @param applicationColors Contains color objects for components and clazzes
 * @param componentLevel
 */
export function addComponentAndChildrenToScene(component: Package, applicationObject3D:
ApplicationObject3D, applicationColors: ApplicationColors, componentLevel = 1) {
  const application = applicationObject3D.dataModel;
  const componentLayout = applicationObject3D.getBoxLayout(component.id);
  const applicationLayout = applicationObject3D.getBoxLayout(application.pid);

  if (componentLayout === undefined || applicationLayout === undefined) { return; }

  const {
    componentOdd: componentOddColor, componentEven: componentEvenColor,
    clazz: clazzColor, highlightedEntity: highlightedEntityColor,
  } = applicationColors;

  // Set color alternating (e.g. light and dark green) according to component level
  const color = componentLevel % 2 === 0 ? componentEvenColor : componentOddColor;
  const mesh = new ComponentMesh(componentLayout, component, color, highlightedEntityColor);

  addMeshToApplication(mesh, applicationObject3D);
  updateMeshVisiblity(mesh, applicationObject3D);

  const clazzes = component.classes;
  const children = component.subPackages;

  // Add clazzes of given component
  clazzes.forEach((clazz: Class) => {
    const clazzLayout = applicationObject3D.getBoxLayout(clazz.id);

    if (clazzLayout === undefined) { return; }

    const clazzMesh = new ClazzMesh(clazzLayout, clazz, clazzColor, highlightedEntityColor);
    addMeshToApplication(clazzMesh, applicationObject3D);
    updateMeshVisiblity(clazzMesh, applicationObject3D);
  });

  // Add components with alternating colors (e.g. dark and light green)
  children.forEach((child: Package) => {
    addComponentAndChildrenToScene(child,
      applicationObject3D, applicationColors, componentLevel + 1);
  });
}

/**
 * Creates a FoundationMesh and adds it to the given application object.
 * Additionally, all children of the foundation (components and clazzes)
 * are added to the application.
 *
 * @param applicationObject3D Object which shall contain all application meshes
 * @param applicationColors Object which defines the colors for different application entities
 */
export function addFoundationAndChildrenToApplication(applicationObject3D: ApplicationObject3D,
  applicationColors: ApplicationColors) {
  const application = applicationObject3D.dataModel;
  const applicationLayout = applicationObject3D.layout;
  // Height of foundation is always the same
  applicationLayout.height = 1.5;

  if (!applicationLayout) { return; }

  const {
    foundation: foundationColor,
    highlightedEntity: highlightedEntityColor,
  } = applicationColors;

  const mesh = new FoundationMesh(applicationLayout,
    application, foundationColor, highlightedEntityColor);

  addMeshToApplication(mesh, applicationObject3D);

  const children = application.packages;

  children.forEach((child: Package) => {
    addComponentAndChildrenToScene(child, applicationObject3D, applicationColors);
  });
}
