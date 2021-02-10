import InteractiveItem from './interactive-item';

export default class TextbuttonItem extends InteractiveItem {
  text: string;

  width: number;

  height: number;

  textSize: number;

  buttonColor: string;

  textColor: string;

  hoverColor: string;

  constructor(id: string, text: string, position: { x: number, y: number },
    width: number, height: number, textSize: number,
    buttonColor: string, textColor: string, hoverColor: string) {
    super(id, position);

    this.text = text;
    this.width = width;
    this.height = height;
    this.textSize = textSize;
    this.buttonColor = buttonColor;
    this.textColor = textColor;
    this.hoverColor = hoverColor;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D): void {
    // draw button background
    if (this.isHovered) {
      ctx.fillStyle = this.hoverColor;
    } else {
      ctx.fillStyle = this.buttonColor;
    }

    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

    // draw button text
    ctx.fillStyle = this.textColor;
    ctx.font = `${this.textSize}px arial`;
    ctx.textAlign = 'center';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    const textSize = TextbuttonItem.getTextSize(this.text, ctx.font);
    ctx.fillText(this.text, this.position.x + (this.width / 2),
      this.position.y + ((this.height + textSize.sublineHeight) / 2));
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
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
