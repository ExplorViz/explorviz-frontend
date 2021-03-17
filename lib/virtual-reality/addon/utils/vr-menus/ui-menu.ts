import THREE from "three";
import VRControllerButtonBinding from "../vr-controller/vr-controller-button-binding";
import VRControllerThumbpadBinding, { thumbpadDirectionToVector2 } from "../vr-controller/vr-controller-thumbpad-binding";
import AnimatedMenu from "./animated-menu";
import InteractiveItem from "./items/interactive-item";
import Item from "./items/item";

/**
 * Base class for all menus that have a canvas with UI elements. The user can
 * interact with the UI elements using the thumbpad and trigger of the
 * controller that holds the menu or using the ray and trigger or the
 * other controller.
 */
export default abstract class UiMenu extends AnimatedMenu {
    canvas!: HTMLCanvasElement;
  
    canvasMesh!: THREE.Mesh<THREE.Geometry | THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  
    resolution: { width: number, height: number };
  
    items: Item[];
  
    lastHoveredItem: InteractiveItem|undefined;
  
    thumbpadTargets: InteractiveItem[];
  
    activeTarget: InteractiveItem|undefined;
  
    thumbpadAxis: number;

    constructor(resolution: { width: number, height: number } = { width: 512, height: 512 }, color = '#444444') {
      super();
  
      this.resolution = resolution;
      this.items = [];
      this.thumbpadTargets = [];
      this.activeTarget = undefined;
      this.thumbpadAxis = 1;
  
      this.initBackground(new THREE.Color(color));
      this.initCanvas();
    }

    /**
     * Creates the mesh that is used as the background of the menu.
     */
    initBackground(color: THREE.Color) {
      const background = new THREE.Mesh();
      background.geometry = this.makeBackgroundGeometry();
      background.material = this.makeBackgroundMaterial(color);
      this.add(background);
    }
  
    /**
     * Creates the geometry of the background mesh.
     */
    makeBackgroundGeometry(): THREE.Geometry {
      return new THREE.PlaneGeometry(
        (this.resolution.width / 512) * 0.3,
        (this.resolution.height / 512) * 0.3,
      );
    }
  
    /**
     * Creates the material of the background mesh.
     * 
     * @param color The color the background should have.
     */
    makeBackgroundMaterial(color: THREE.Color): THREE.Material {
      const material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide
      });
      material.transparent = true;
      material.opacity = 0.8;
      return material;
    }
  
    /**
     * Creates ta canvas element to draw to and a mesh that displays the canvas.
     */
    initCanvas() {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.resolution.width;
      this.canvas.height = this.resolution.height;
  
      // Create a mesh that displays the canvas as a texture. This is needed
      // such that the back face of the background can be visible while the
      // user interface's background is not.
      const geometry = this.makeBackgroundGeometry();
      const material = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(this.canvas),
        depthTest: false
      });
      material.transparent = true;
      this.canvasMesh = new THREE.Mesh(geometry, material);
  
      this.add(this.canvasMesh);
    }

    /**
     * Redraws the `items` onto the canwas.
     */
    redrawMenu() {
      const { canvas } = this;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        item.drawToCanvas(ctx);
      }
  
      if (this.canvasMesh.material.map) {
        this.canvasMesh.material.map.needsUpdate = true;
      }
    }
    

  /**
   * Finds the menu item at given uv position.
   *
   * @param position - The uv position.
   *
   * @returns Item at given position if there is one, else undefined.
   */
  getItem(position: THREE.Vector2, onlyInteractiveItems = true) {
    const items = onlyInteractiveItems
      ? this.items.filter((item) => item instanceof InteractiveItem)
      : this.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // calculate pixel position
      const x = this.resolution.width * position.x;
      const y = this.resolution.height - (this.resolution.height * position.y);

      const {
        minX,
        minY,
        maxX,
        maxY,
      } = item.getBoundingBox();

      if (x >= minX && y >= minY && x <= maxX && y <= maxY) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Gets the menu iitem with the given id.
   * 
   * @param id The id of the item to find.
   * @returns The item or `undefined`if there is no such item.
   */
  getItemById(id: string): Item|undefined {
    return this.items.find((item) => item.id === id);
  }

  /**
   * Tests whether a menu item is hovered when the menu is hovered by the ray
   * of the other controller.
   *
   * @param uv The coordinates of the point that is hovered 
   */
  hover(uv: THREE.Vector2) {
    super.hover(uv);
    const item = this.getItem(uv);
    if (!item || item instanceof InteractiveItem) this.hoverItem(item);
  }

  /**
   * Resets the hover effect of the last hovered item when the menu is not
   * hovered anymore by the other controller's ray
   */
  resetHoverEffect() {
    super.resetHoverEffect();
    if (this.lastHoveredItem) {
      this.lastHoveredItem.resetHoverEffect();
      this.lastHoveredItem = undefined;
      this.redrawMenu();
    }
  }

  /**
   * Updates the hover effect when the given item is hovered.
   *
   * @param item The hovered item or `undefined` when no item is hovered anymore.
   */
  hoverItem(item: InteractiveItem|undefined) {
    // If an item is hovered, reset the item selected with the touchpad.
    // If no item is hovered, but an item has been selected, don't reset the
    // selection.
    if (item) {
      this.activeTarget = undefined;
    } else {
      item = this.activeTarget;
    }

    // Update hover effect if hovered item changed.
    if (item !== this.lastHoveredItem) {
      this.lastHoveredItem?.resetHoverEffect();
      item?.enableHoverEffect();
      this.lastHoveredItem = item;
      this.redrawMenu();
    }
  }

  /**
   * Called when an item is selected with the thumbpad.
   */
  activateItem(item: InteractiveItem) {
    this.hoverItem(item);
    this.activeTarget = item;
  }

  /**
   * The thumbpad can be used to select menu items.
   */
  makeThumbpadBinding() {
    if (this.thumbpadTargets.length == 0) return undefined;
    return new VRControllerThumbpadBinding(
      this.thumbpadAxis === 0 
        ? {labelLeft: 'Previous', labelRight: 'Next'} 
        : {labelUp: 'Previous', labelDown: 'Next'}, 
      {
        onThumbpadDown: (_controller, axes) => {
          // No item can be selected with the touchpad, if an item is selected
          // with the other controller's ray.
          if (this.lastHoveredItem && !this.activeTarget) return;

          const direction = VRControllerThumbpadBinding.getDirection(axes);
          const vector = thumbpadDirectionToVector2(direction);
          const offset = vector.toArray()[this.thumbpadAxis];
          if (offset !== 0) {
            // Get index of currently selected item or if no item is selected,
            // get `0` if the user wants to select the previous (i.e., if 
            // `offset = -1`) or `-1` if the user want to select the next item 
            // (i.e., if `offset = 1`).
            let index = this.activeTarget
              ? this.thumbpadTargets.indexOf(this.activeTarget) 
              : -(offset + 1) / 2;

            // Wrap index at start and end of list.
            const len = this.thumbpadTargets.length;
            index = ((index + offset) % len + len) % len;
            this.activateItem(this.thumbpadTargets[index]);
          }
        }
      }
    );
  }
  
  /**
   * The trigger can be used as a select button when this menu has items
   * that can be selected by the thumbpad.
   */
  makeTriggerButtonBinding() {
    if (this.thumbpadTargets.length == 0) return undefined;
    return new VRControllerButtonBinding('Select', {
        onButtonDown: () => {
          if (this.activeTarget) this.activeTarget.onTriggerDown?.call(this.activeTarget);
        }
    });
  }

  /**
   * Called once when the other controller's trigger is pressed down while
   * hovering this menu. This method is not called again before the trigger
   * is released.
   * 
   * @param uv The coordinate of the menu that is hovered.
   */
  triggerDown(uv: THREE.Vector2) {
    const item = this.getItem(uv) as InteractiveItem|undefined;

    if (item && item.onTriggerDown) {
      item.onTriggerDown();
    }
  }

  /**
   * Called when the other controller's trigger is pressed while hovering this
   * menu.
   * 
   * @param uv The coordinate of the menu that is hovered.
   * @param value The intensity of the trigger press.
   */
  triggerPress(uv: THREE.Vector2, value: number) {
    super.triggerPress(uv, value);
    const item = this.getItem(uv) as InteractiveItem|undefined;

    if (item && item.onTriggerPressed) {
      item.onTriggerPressed(value);
    }
  }
}