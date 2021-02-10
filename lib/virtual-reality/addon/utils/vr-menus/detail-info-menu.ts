import { DetailedInfo } from '../vr-helpers/detail-info-composer';
import BaseMenu from './base-menu';
import RectangleItem from './items/rectangle-item';
import TextItem from './items/text-item';

export default class DetailInfoMenu extends BaseMenu {
  constructor(closeMenu: () => void, content: DetailedInfo) {
    super({ width: 768, height: 512 });

    this.back = closeMenu;

    const titleBackground = new RectangleItem('title_background', { x: 0, y: 0 }, 768, 66, '#777777');
    this.items.push(titleBackground);

    const title = new TextItem(content.title, 'detailTitle', '#ffffff', { x: 768 / 2, y: 20 }, 30, 'center');
    this.items.push(title);

    let offset = 100;

    content.entries.forEach(({ key, value }) => {
      const keyTextItem = new TextItem(key, key, '#ffffff', { x: 20, y: offset }, 26, 'left');
      this.items.push(keyTextItem);

      const valueTextItem = new TextItem(value, `${key}_${value}`, '#ffffff', { x: 768 - 20, y: offset }, 26, 'right');
      this.items.push(valueTextItem);

      offset += 70;
    });

    this.update();
  }
}
