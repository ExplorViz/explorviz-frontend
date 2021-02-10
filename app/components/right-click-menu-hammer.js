import RightClickMenu from 'ember-right-click-menu/components/right-click-menu';
import { action } from '@ember/object';

export default class RightClickMenuHammer extends RightClickMenu {
  @action
  addContextMenuListeners() {
    window.addEventListener('click', this.closeContextMenu);
    window.addEventListener('contextmenu', this.closeContextMenu);
    this.args.hammer.on('righttap', this.contextMenu);

    this.getTargetElement(this.popperId);
  }

  willDestroy() {
    window.removeEventListener('click', this.closeContextMenu);
    window.removeEventListener('contextmenu', this.closeContextMenu);

    if (this.targetElement) {
      this.args.hammer.off('righttap', this.contextMenu);
    }

    super.willDestroy(...arguments);
  }

  @action
  contextMenu(_, e) {
    super.contextMenu(e);
  }

  @action
  closeContextMenu(e) {
    // path property expected by addon's implementation
    if (e) {
      e.path = e.path || (e.composedPath && e.composedPath());
    }
    super.closeContextMenu(e);
  }
}
