import GlimmerComponent from '@glimmer/component';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/landscape-rendering/class-communication-computer';

interface Args {
  communication: DrawableClassCommunication
}

export default class CommunicationPopup extends GlimmerComponent<Args> {
  get isBidirectional() {
    return this.args.communication.bidirectional;
  }

  get sourceClazz() {
    return this.args.communication.sourceClass.name;
  }

  get targetClazz() {
    return this.args.communication.targetClass.name;
  }

  get requests() {
    return this.args.communication.totalRequests;
  }
}
