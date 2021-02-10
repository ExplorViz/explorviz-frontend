import Item from './item';

export default abstract class InteractiveItem extends Item {
  isHovered = false;

  onHover: (() => void)|undefined = undefined;

  onTriggerDown: (() => void)|undefined = undefined;

  onTriggerPressed: ((value: number) => void)|undefined = undefined;

  enableHoverEffect() {
    this.isHovered = true;
  }

  resetHoverEffect() {
    this.isHovered = false;
  }
}
