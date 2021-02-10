import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import applyCommunicationLayout from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import { DrawableClassCommunication } from '../landscape-rendering/class-communication-computer';

export default class CommunicationRendering {
  // Service to access color preferences
  configuration: Configuration;

  constructor(configuration: Configuration) {
    this.configuration = configuration;
  }

  /**
   * Computes communication and communication arrows and adds them to the
   * applicationObject3D
   *
   * @param applicationObject3D Contains all application meshes.
   *                            Computed communication is added to to object.
   */
  addCommunication(applicationObject3D: ApplicationObject3D,
    drawableClassCommunications: DrawableClassCommunication[]) {
    const application = applicationObject3D.dataModel;
    const applicationLayout = applicationObject3D.boxLayoutMap.get(application.pid);

    if (!applicationLayout) { return; }

    const viewCenterPoint = applicationLayout.center;

    // Remove old communication
    applicationObject3D.removeAllCommunication();

    // Compute communication Layout
    const commLayoutMap = applyCommunicationLayout(applicationObject3D,
      applicationObject3D.boxLayoutMap, drawableClassCommunications);

    // Retrieve color preferences
    const {
      communication: communicationColor,
      highlightedEntity: highlightedEntityColor,
      communicationArrow: arrowColor,
    } = this.configuration.applicationColors;

    // Retrieve curve preferences
    const maybeCurveHeight = 20;
    // this.currentUser.getPreferenceOrDefaultValue('rangesetting', 'appVizCurvyCommHeight');
    const curveHeight = typeof maybeCurveHeight === 'number' ? maybeCurveHeight : 0.0;
    const isCurved = curveHeight !== 0.0;

    // Render all drawable communications
    drawableClassCommunications.forEach((drawableClazzComm) => {
      const commLayout = commLayoutMap.get(drawableClazzComm.id);

      // No layouting information available due to hidden communication
      if (!commLayout) {
        return;
      }

      // Add communication to application
      const pipe = new ClazzCommunicationMesh(commLayout, drawableClazzComm,
        communicationColor, highlightedEntityColor);

      pipe.render(viewCenterPoint, curveHeight);

      applicationObject3D.add(pipe);

      // Add arrow indicators for communication
      const ARROW_OFFSET = 0.8;
      const arrowHeight = isCurved ? curveHeight / 2 + ARROW_OFFSET : ARROW_OFFSET;
      const arrowThickness = 0.5;
      // this.currentUser.getPreferenceOrDefaultValue('rangesetting', 'appVizCommArrowSize');
      const arrowColorHex = arrowColor.getHex();

      if (typeof arrowThickness === 'number' && arrowThickness > 0.0) {
        pipe.addArrows(viewCenterPoint, arrowThickness, arrowHeight, arrowColorHex);
      }
    });
  }
}
