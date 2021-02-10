import Item from './item';

export default class RectangleItem extends Item {
  width: number;

  height: number;

  color: string;

  constructor(id: string, position: { x: number, y: number }, width: number, height: number, color = '#ffffff') {
    super(id, position);

    this.width = width;
    this.height = height;
    this.color = color;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
  }

  getBoundingBox(): { minX: number; maxX: number; minY: number; maxY: number; } {
    return {
      minX: this.position.x,
      maxX: this.position.x + this.width,
      minY: this.position.y,
      maxY: this.position.y + this.height,
    };
  }
}
