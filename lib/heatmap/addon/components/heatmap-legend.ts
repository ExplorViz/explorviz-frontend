import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import HeatmapRepository from 'heatmap/services/repos/heatmap-repository';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

interface Args {
  descriptions?: {
    aggregatedHeatmap: string,
    windowedHeatmap: string
  },
  mode: 'aggregatedHeatmap'|'windowedHeatmap'
}

export default class HeatmapLegend extends Component<Args> {
  debug = debugLogger();

  @service('repos/heatmap-repository')
  heatmapRepo!: HeatmapRepository;

  canvas!: HTMLCanvasElement;

  labelCanvas!: HTMLCanvasElement;

  get descriptions() {
    return this.args.descriptions ?? {
      aggregatedHeatmap: 'Aggregates subsequent heatmaps by adding a part of the previous metric score to the new value.',
      windowedHeatmap: 'Compares the latest metric score by difference to a previous one. The heatmap to be compared to is defined by the windowsize in the backend.',
    };
  }

  get header() {
    const { mode } = this.args;
    if (mode === 'aggregatedHeatmap') {
      return 'Aggregated Heatmap';
    }
    if (mode === 'windowedHeatmap') {
      return 'Windowed Heatmap';
    }
    return 'Header';
  }

  get subHeader() {
    const { mode } = this.args;
    if (mode === 'aggregatedHeatmap') {
      return 'Aggregated score:';
    }
    if (mode === 'windowedHeatmap') {
      return 'Value difference:';
    }
    return 'Subheader';
  }

  @action
  didInsertCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  @action
  didInsertLegend(div: HTMLDivElement) {
    this.canvas.width = div.clientWidth;
    this.canvas.height = div.clientHeight;

    const ctx = this.canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, this.canvas.height, 0, 0);

    if (this.heatmapRepo.useSimpleHeat) {
      const heatmapGradient = this.heatmapRepo.getSimpleHeatGradient();
      Object.keys(heatmapGradient).forEach((key) => {
        grad.addColorStop(Number(key), heatmapGradient[key]);
      });
    } else {
      const heatmapGradient = this.heatmapRepo.getArrayHeatGradient();
      Object.keys(heatmapGradient).forEach((key) => {
        grad.addColorStop(Number(key) + 0.50, heatmapGradient[key]);
      });
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  @action
  didInsertCanvaslabel(canvas: HTMLCanvasElement) {
    this.labelCanvas = canvas;
  }

  @action
  didInsertLegendlabel(div: HTMLDivElement) {
    this.labelCanvas.width = div.clientWidth;
    this.labelCanvas.height = div.clientHeight;

    this.updateLabel();
  }

  @action
  updateLabel() {
    const canvas = this.labelCanvas;
    const ctx = canvas.getContext('2d')!;

    let minLabel = 'min';
    let midLabel = 'mid';
    let maxLabel = 'max';

    if (this.heatmapRepo.showLegendValues) {
      const largestValue = Math.round(this.heatmapRepo.largestValue) + 2;
      if (this.heatmapRepo.selectedMode === 'aggregatedHeatmap') {
        minLabel = '0';
        midLabel = `${largestValue / 4}`;
        maxLabel = `${largestValue / 2}`;
      } else {
        minLabel = `${-largestValue / 2}`;
        midLabel = '0';
        maxLabel = `${largestValue / 2}`;
      }
    } else if (this.heatmapRepo.selectedMode === 'aggregatedHeatmap') {
      minLabel = '0';
    } else {
      midLabel = '0';
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '1rem Arial';
    ctx.textAlign = 'center';
    ctx.fillText(maxLabel, canvas.width / 2, canvas.height * 0.05);
    ctx.fillText(midLabel, canvas.width / 2, canvas.height * 0.525);
    ctx.fillText(minLabel, canvas.width / 2, canvas.height * 0.99);
  }
}