import ArrowbuttonItem from './arrowbutton-item';
import InteractiveItem from './interactive-item';

export type CurvedArrowDirection = 'left'|'right';

export default class CurvedArrowbuttonItem extends InteractiveItem {
  size: number;

  color: string;

  hoverColor: string;

  direction: CurvedArrowDirection;

  constructor(id: string, position: { x: number, y: number }, size: number,
    color: string, hoverColor: string, direction: CurvedArrowDirection) {
    super(id, position);

    this.size = size;
    this.color = color;
    this.hoverColor = hoverColor;
    this.direction = direction;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.isHovered ? this.hoverColor : this.color;
    ctx.strokeStyle = this.isHovered ? this.hoverColor : this.color;
    CurvedArrowbuttonItem.drawCurvedArrow(ctx, this.position, this.size, this.direction);
  }

  getBoundingBox(): { minX: number; maxX: number; minY: number; maxY: number; } {
    return {
      minX: this.position.x,
      maxX: this.position.x + this.size,
      minY: this.position.y,
      maxY: this.position.y + this.size,
    };
  }

  /**
   * Draw a curved right/left arrow to a canvas.
   * @example
   * let canvas = document.createElement('canvas');
   * let ctx = canvas.getContext('2d');
   *
   * drawCurvedArrow(ctx, {x: 30, y: 50}, 20, 'left');
   *
   * @param ctx - The context of a canvas.
   * @param from - The upper left position of the arrow.
   * @param size - The size of the arrow in both x and y direction.
   * @param style - The style of the arrow.
   */
  static drawCurvedArrow(ctx: CanvasRenderingContext2D, from: { x: number, y: number },
    size: number, direction: CurvedArrowDirection) {
    const x = (size / 2) + from.x;
    const y = (size / 2) + from.y;
    const radius = (size / 2) - (size / 8);
    let startAngle;
    let endAngle;
    if (direction === 'left') {
      startAngle = 0.0 * Math.PI;
      endAngle = 1.3 * Math.PI;
    } else {
      startAngle = 0.7 * Math.PI;
      endAngle = 2.0 * Math.PI;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, startAngle, endAngle, false);
    ctx.lineWidth = radius / 2;

    // line color
    ctx.stroke();

    if (direction === 'left') {
      const arrowSize = size / 2.5;
      const upperPos = {
        x: from.x + size - (radius / 3) - (arrowSize / 2),
        y: from.y + (size / 2) - (arrowSize / 1.2),
      };
      ArrowbuttonItem.drawArrowhead(ctx, upperPos, arrowSize, arrowSize, 'up');
    } else {
      const arrowSize = size / 2.5;
      const upperPos = {
        x: from.x + size - (radius / 3) - (arrowSize / 2),
        y: from.y + (size / 2) - (arrowSize * 0.2),
      };
      ArrowbuttonItem.drawArrowhead(ctx, upperPos, arrowSize, arrowSize, 'down');
    }
  }
}
