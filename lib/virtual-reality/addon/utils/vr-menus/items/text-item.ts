import Item from './item';

type Alignment = 'left'|'center'|'right';

export default class TextItem extends Item {
  text: string;

  color: string;

  fontSize: number;

  alignment: Alignment;

  constructor(text: string, id: string, color: string, position: { x: number, y: number },
    fontSize: number, alignment: Alignment = 'left') {
    super(id, position);
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.alignment = alignment;
  }

  getBoundingBox() {
    return {
      minX: this.getMinX(),
      maxX: this.getMaxX(),
      minY: this.getMinY(),
      maxY: this.getMaxY(),
    };
  }

  private getMinX() {
    const size = TextItem.getTextSize(this.text, `${this.fontSize}px arial`);

    let itemX = this.position.x;

    if (this.alignment === 'center') {
      itemX -= size.width / 2;
    } else if (this.alignment === 'right') {
      itemX -= size.width;
    }

    return itemX;
  }

  private getMaxX() {
    const size = TextItem.getTextSize(this.text, `${this.fontSize}px arial`);

    return this.getMinX() + size.width;
  }

  private getMinY() {
    return this.position.y;
  }

  private getMaxY() {
    const size = TextItem.getTextSize(this.text, `${this.fontSize}px arial`);

    return this.position.y + size.height;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D): void {
    // Draw Text
    ctx.font = `${this.fontSize}px arial`;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.alignment;
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    const textSize = TextItem.getTextSize(this.text, ctx.font);
    ctx.fillText(this.text, this.position.x, this.position.y + textSize.sublineHeight);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Returns measurements in pixels for a given text
   *
   * @param text The text to measure the width, height and subline height of.
   * @param font The font to measure the size in.
   * @return {{width: Number, height: Number, sublineHeight: Number}} The sizes of the text.
   */
  private static getTextSize(text: string, font: string):
  { width: number, height: number, sublineHeight: number } {
    // re-use canvas object for better performance
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = font;
    const { width } = context.measureText(text);
    const height = context.measureText('W').width;
    const sublineHeight = context.measureText('H').width;
    return { width, height, sublineHeight };
  }
}
