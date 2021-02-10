import Object from '@ember/object';
import Evented from '@ember/object/evented';
import Hammer from 'hammerjs';
import Interaction from './interaction';

/* eslint-disable no-bitwise */
export default class HammerInteraction extends Object.extend(Evented) {
  hammerManager = null;

  /**
   * Setups events which are triggered by hammer interaction
   *
   * @param {*} canvas Events are registered on the canvas
   */
  setupHammer(canvas) {
    const self = this;

    let mouseDeltaX = 0;
    let mouseDeltaY = 0;

    // Fire Panning-Event with right click as well
    function registerRightClickWithPan() {
      const POINTER_INPUT_MAP = {
        pointerdown: Hammer.INPUT_START,
        pointermove: Hammer.INPUT_MOVE,
        pointerup: Hammer.INPUT_END,
        pointercancel: Hammer.INPUT_CANCEL,
        pointerout: Hammer.INPUT_CANCEL,
      };

      Hammer.inherit(Hammer.PointerEventInput, Hammer.Input, {

        handler: function PEhandler(ev) {
          const { store } = this;
          let removePointer = false;

          const eventTypeNormalized = ev.type.toLowerCase();
          const eventType = POINTER_INPUT_MAP[eventTypeNormalized];
          const { pointerType } = ev;

          // Modified to handle all buttons
          // left=0, middle=1, right=2
          if (eventType & Hammer.INPUT_START) {
            // firefox sends button 0 for mousemove, so store it here
            this.button = ev.button;
          }

          // var isTouch = (pointerType === Hammer.INPUT_TYPE_TOUCH);

          function isCorrectPointerId(element) {
            return element.pointerId === ev.pointerId;
          }

          // Get index of the event in the store
          let storeIndex = store.findIndex(isCorrectPointerId);

          // Start and mouse must be down
          if (eventType & Hammer.INPUT_START
            && (ev.button === 0 || ev.button === 1 || ev.button === 2)) {
            if (storeIndex < 0) {
              store.push(ev);
              storeIndex = store.length - 1;
            }
          } else if (eventType & (Hammer.INPUT_END | Hammer.INPUT_CANCEL)) {
            removePointer = true;
          }

          // Not found, so the pointer hasn't been down (so it's probably a hover)
          if (storeIndex < 0) {
            return;
          }

          // Update the event in the store
          store[storeIndex] = ev;

          this.callback(this.manager, eventType, {
            button: this.button + 1,
            pointers: store,
            changedPointers: [ev],
            pointerType,
            srcEvent: ev,
          });

          if (removePointer) {
            // Remove from the store
            store.splice(storeIndex, 1);
          }
        },
      });
    }

    registerRightClickWithPan();

    const hammer = new Hammer.Manager(canvas, {});
    this.set('hammerManager', hammer);

    const singleTap = new Hammer.Tap({
      event: 'singletap',
      interval: 150,
    });

    const doubleTap = new Hammer.Tap({
      event: 'doubletap',
      taps: 2,
      interval: 250,
    });

    const pan = new Hammer.Pan({
      event: 'pan',
    });

    hammer.add([doubleTap, singleTap, pan]);

    doubleTap.recognizeWith(singleTap);
    singleTap.requireFailure(doubleTap);
    doubleTap.dropRequireFailure(singleTap);

    hammer.on('panstart', (evt) => {
      if (evt.button !== 1 && evt.button !== 3) {
        return;
      }

      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = Interaction.getMousePos(canvas, evt.srcEvent);

      mouseDeltaX = mousePosition.x;
      mouseDeltaY = mousePosition.y;
    });

    /**
     * Triggers a panning event
     */
    hammer.on('panmove', (evt) => {
      if (evt.button !== 1 && evt.button !== 3) {
        return;
      }

      const delta = {};

      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = Interaction.getMousePos(canvas, evt.srcEvent);

      delta.x = mousePosition.x - mouseDeltaX;
      delta.y = mousePosition.y - mouseDeltaY;

      mouseDeltaX = mousePosition.x;
      mouseDeltaY = mousePosition.y;

      self.trigger('panning', delta, evt);
    });

    // END of mouse movement

    /**
     * Triggers a panningEnd event if mouse is moved without clicking a button
     */
    hammer.on('mousemove', (evt) => {
      if (evt.button !== 1 && evt.button !== 3) {
        return;
      }

      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = Interaction.getMousePos(canvas, evt.srcEvent);

      self.trigger('panningEnd', mousePosition);
    });

    /**
     * Triggers a doubletap event for the right mouse button
     */
    hammer.on('doubletap', (evt) => {
      if (evt.button !== 1) {
        return;
      }

      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = Interaction.getMousePos(canvas, evt.srcEvent);

      self.trigger('doubletap', mousePosition);
    });

    /**
     * Triggers a single tap event for the left and right mouse button
     */
    hammer.on('singletap', (evt) => {
      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = Interaction.getMousePos(canvas, evt.srcEvent);

      if (evt.button === 1) {
        self.trigger('lefttap', mousePosition, canvas);
      } else if (evt.button === 3) {
        self.trigger('righttap', mousePosition, evt.srcEvent);
      }
    });
  }
}
