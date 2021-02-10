import InteractiveItem from './interactive-item';

export default class CheckboxItem extends InteractiveItem {
  width: number;

  height: number;

  color: string;

  contentColor: string;

  hoverColor: string;

  lineWidth: number;

  isClickable: boolean;

  isChecked: boolean;

  constructor(id: string, position: { x: number, y: number }, width: number, height: number,
    color: string, contentColor: string, hoverColor: string, lineWidth = 5, isChecked = false,
    isClickable = true) {
    super(id, position);

    this.width = width;
    this.height = height;
    this.color = color;
    this.contentColor = contentColor;
    this.hoverColor = hoverColor;
    this.lineWidth = lineWidth;
    this.isClickable = isClickable;
    this.isChecked = isChecked;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = this.lineWidth;

    if (this.isHovered && this.isClickable) {
      ctx.strokeStyle = this.hoverColor;
    } else {
      ctx.strokeStyle = this.color;
    }
    CheckboxItem.drawCheckbox(ctx, this.position, this.width, this.height, this.contentColor,
      this.isChecked);
  }

  getBoundingBox(): { minX: number; maxX: number; minY: number; maxY: number; } {
    return {
      minX: this.position.x,
      maxX: this.position.x + this.width,
      minY: this.position.y,
      maxY: this.position.y + this.height,
    };
  }

  /**
   * Draw an checkbox to a canvas.
   * @example
   * let canvas = document.createElement('canvas');
   * let ctx = canvas.getContext('2d');
   *
   * drawArrowHead(ctx, {x: 30, y: 50}, 40, 65, 'up');
   *
   * @param ctx - The context of a canvas, can contain color information for strokes.
   * @param pos - The upper left position of the checkbox.
   * @param width - The width  of the checkbox.
   * @param height - The height  of the checkbox.
   * @param contentColor - Color of the symbol inside the checkbox.
   * @param isChecked - States whether the checkbox shall be filled.
   */
  static drawCheckbox(ctx: CanvasRenderingContext2D, pos: { x: number, y: number },
    width: number, height: number, contentColor: string, isChecked: boolean) {
    ctx.strokeRect(pos.x, pos.y, width, height);

    if (isChecked) {
      ctx.strokeStyle = contentColor;
      ctx.beginPath();
      ctx.moveTo(pos.x + 10, pos.y + (height / 2));
      ctx.lineTo(pos.x + (width / 2), pos.y + height - 10);
      ctx.lineTo(pos.x + width - 10, pos.y + 10);
      ctx.stroke();
    }
  }
}
