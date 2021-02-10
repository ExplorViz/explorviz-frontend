import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { Span } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';

type TimeUnit = 'ns' | 'ms' | 's';

interface Args {
  readonly operationName: string;
  readonly sourceClass?: Class;
  readonly targetClass: Class;
  readonly sourceApplicationName?: string;
  readonly targetApplicationName: string;
  readonly spanStartTime: { seconds: number, nanoAdjust: number };
  readonly spanEndTime: { seconds: number, nanoAdjust: number };
  moveCameraTo(emberModel: Class|Span): void;
}

export default class TraceStepDetails extends Component<Args> {
  @tracked
  timeUnit: TimeUnit = 'ns';

  get spanDuration() {
    const startTimeInNs = this.args.spanStartTime.seconds * 1000000000.0
      + this.args.spanStartTime.nanoAdjust;
    const endTimeInNs = this.args.spanEndTime.seconds * 1000000000.0
      + this.args.spanEndTime.nanoAdjust;

    return endTimeInNs - startTimeInNs;
  }

  @action
  toggleSpanDurationTimeUnit() {
    if (this.timeUnit === 'ns') {
      this.timeUnit = 'ms';
    } else if (this.timeUnit === 'ms') {
      this.timeUnit = 's';
    } else if (this.timeUnit === 's') {
      this.timeUnit = 'ns';
    }
  }
}
