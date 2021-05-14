import Component from '@glimmer/component';
import { action } from '@ember/object';
import { Application, Class, Package } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

interface PopupWrapperArgs {
  popupData: {
    mouseX: number,
    mouseY: number,
    entity: Node | Application | Package | Class
  };
  keepPopupOpen(): void
  closePopup(): void
}

export default class PopupWrapper extends Component<PopupWrapperArgs> {
  isPinned = false;

  divElement: HTMLElement | undefined;

  @action
  setupDragElement(element: HTMLElement) {
    this.divElement = element;
    this.dragElement(element);

    this.setupPosition(element);
  }

  @action
  keepPopupOpen() {
    this.args.keepPopupOpen();
    this.isPinned = true;
  }

  @action
  closePopup() {
    this.isPinned = false;
    if (this.divElement) {
      this.divElement.style.top = '0px';
      this.divElement.style.left = '0px';
    }
    this.args.closePopup();
  }

  setupPosition(popoverDiv: HTMLElement) {
    const { popupData } = this.args;

    // Sorrounding div for position calculations
    const containerDiv = popoverDiv.parentElement as HTMLElement;

    const popoverHeight = popoverDiv.clientHeight;
    const popoverWidth = popoverDiv.clientWidth;

    const containerWidth = containerDiv.clientWidth;

    if (popoverHeight === undefined || popoverWidth === undefined || containerWidth === undefined) {
      return;
    }

    const popupTopOffset = popoverHeight + 10;
    const popupLeftOffset = popoverWidth / 2;

    let popupTopPosition = containerDiv.clientHeight / 2 - popupTopOffset;
    let popupLeftPosition = containerDiv.clientWidth / 2 - popupLeftOffset;

    // Prevent popup positioning on top of rendering canvas =>
    // position under mouse cursor
    if (popupTopPosition < 0) {
      const approximateMouseHeight = 35;
      popupTopPosition = popupData.mouseY + approximateMouseHeight;
    }

    // Prevent popup positioning right(outside) of rendering canvas =>
    // position at right edge of canvas
    if (popupLeftPosition + popoverWidth > containerWidth) {
      const extraPopupMarginFromAtBottom = 5;
      popupLeftPosition = containerWidth - popoverWidth - extraPopupMarginFromAtBottom;
    }

    // Prevent popup positioning left(outside) of rendering canvas =>
    // position at left edge of canvas
    if (popupLeftPosition < 0) {
      popupLeftPosition = 0;
    }

    // Set popup position
    /* eslint-disable no-param-reassign */
    popoverDiv.style.top = `${popupTopPosition}px`;
    popoverDiv.style.left = `${popupLeftPosition}px`;
  }

  dragElement(elmnt: HTMLElement) {
    let xOffset = 0; let yOffset = 0; let inputX = 0; let inputY = 0;

    function moveElement(clientX: number, clientY: number) {
      // Calculate cursor position
      xOffset = inputX - clientX;
      yOffset = inputY - clientY;
      inputX = clientX;
      inputY = clientY;

      // Calculate popup position
      const minX = elmnt.offsetLeft - xOffset;
      const maxX = minX + elmnt.clientWidth;
      const minY = elmnt.offsetTop - yOffset;
      const maxY = minY + elmnt.clientHeight;

      // Set the element's new position:
      if (minX >= 0 && maxX <= window.innerWidth) {
        elmnt.style.left = `${minX}px`;
      }

      if (minY >= 0 && maxY <= window.innerHeight) {
        elmnt.style.top = `${minY}px`;
      }
    }

    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
      document.ontouchcancel = null;
      document.ontouchend = null;
      document.ontouchmove = null;
    }

    function elementMouseDrag(e: MouseEvent) {
      const event = e || window.event;
      event.preventDefault();

      // Calculate cursor position
      xOffset = inputX - e.clientX;
      yOffset = inputY - e.clientY;
      inputX = e.clientX;
      inputY = e.clientY;

      // Calculate popup position
      const minX = elmnt.offsetLeft - xOffset;
      const maxX = minX + elmnt.clientWidth;
      const minY = elmnt.offsetTop - yOffset;
      const maxY = minY + elmnt.clientHeight;

      // set the element's new position:
      if (minX >= 0 && maxX <= window.innerWidth) {
        elmnt.style.left = `${minX}px`;
      }

      if (minY >= 0 && maxY <= window.innerHeight) {
        elmnt.style.top = `${minY}px`;
      }
    }

    function elementTouchDrag(e: TouchEvent) {
      const event = e || window.event;
      event.preventDefault();

      if (event.targetTouches.length < 1) {
        closeDragElement();
      } else {
        const { clientX } = event.targetTouches[0];
        const { clientY } = event.targetTouches[0];

        moveElement(clientX, clientY);
      }
    }

    function dragMouseDown(e: MouseEvent) {
      const event = e || window.event;
      event.preventDefault();
      // Get the mouse cursor position at startup:
      inputX = e.clientX;
      inputY = e.clientY;
      document.onmouseup = closeDragElement;
      // Call a function whenever the cursor moves:
      document.onmousemove = elementMouseDrag;
    }

    function dragTouchDown(e: TouchEvent) {
      const event = e || window.event;
      event.preventDefault();

      if (event.targetTouches.length > 0) {
        inputX = event.targetTouches[0].clientX;
        inputY = event.targetTouches[0].clientY;

        document.ontouchcancel = closeDragElement;
        document.ontouchend = closeDragElement;

        document.ontouchmove = elementTouchDrag;
      }
    }

    elmnt.onmousedown = dragMouseDown;
    elmnt.ontouchstart = dragTouchDown;
  }
}