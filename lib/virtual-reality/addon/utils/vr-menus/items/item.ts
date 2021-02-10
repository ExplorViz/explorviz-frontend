export default abstract class Item {
  id: string;

  position: { x: number, y: number };

  constructor(id: string, position: { x: number, y: number }) {
    this.id = id;
    this.position = position;
  }

  abstract drawToCanvas(ctx: CanvasRenderingContext2D): void;

  abstract getBoundingBox(): {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
  };
}
