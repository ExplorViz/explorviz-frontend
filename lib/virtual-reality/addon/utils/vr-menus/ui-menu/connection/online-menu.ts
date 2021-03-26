import VRControllerButtonBinding from "virtual-reality/utils/vr-controller/vr-controller-button-binding";
import TextItem from "../../items/text-item";
import TextbuttonItem from "../../items/textbutton-item";
import ConnectionBaseMenu, { ConnectionBaseMenuArgs } from "./base";
import RemoteVrUserService from "../../../../services/remote-vr-users";

type OnlineMenuArgs = ConnectionBaseMenuArgs & {
  remoteUsers: RemoteVrUserService
};

export default class OnlineMenu extends ConnectionBaseMenu {
  private remoteUsers: RemoteVrUserService;
  private remoteUserButtons: Map<string, TextbuttonItem>;

  constructor({ remoteUsers, ...args }: OnlineMenuArgs) {
    super(args);

    this.remoteUsers = remoteUsers;
    this.remoteUserButtons = new Map<string, TextbuttonItem>();

    this.initMenu();
  }

  /**
   * It is possible to interact with this menu while spectating another user
   * such that spectator mode can be disabled.
   */
  get enableTriggerInSpectorMode() {
    return true;
  }

  private initMenu() {
    const users = Array.from(this.remoteUsers.getAllRemoteUsers());
    const title = new TextItem(`Room ${this.localUser.currentRoomId}`, 'title', '#ffffff', { x: 256, y: 20 }, 50, 'center');
    this.items.push(title);

    const disconnectButton = new TextbuttonItem('disconnect', 'Disconnect', { x: 370, y: 13, }, 115, 40, 22, '#aaaaaa', '#ffffff', '#dc3b00');
    this.items.push(disconnectButton);
    disconnectButton.onTriggerDown = () => this.localUser.disconnect();

    const yOffset = 60;
    let yPos = 50 + yOffset;

    const localUserButton = new TextbuttonItem('local-user', this.localUser.userName + ' (you)', { x: 100, y: yPos }, 316, 50, 28, '#555555', '#ffc338', '#929292');
    this.items.push(localUserButton);
    this.thumbpadTargets.push(localUserButton);
    yPos += yOffset;

    users.forEach((user) => {
      if (user.state === 'online' && user.userName) {
        const remoteUserButton = new TextbuttonItem(user.userId, user.userName, { x: 100, y: yPos }, 316, 50, 28, '#555555', '#ffc338', '#929292');
        this.remoteUserButtons.set(user.userId, remoteUserButton)
        this.items.push(remoteUserButton);
        this.thumbpadTargets.push(remoteUserButton);
        remoteUserButton.onTriggerDown = () => this.menuGroup?.openMenu(this.menuFactory.buildSpectateMenu(user));
        yPos += yOffset;
      }
    });
    this.items.push(title);

    this.redrawMenu();
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    if (!this.arrayEquals(Array.from(this.remoteUsers.getAllRemoteUserIds()), Array.from(this.remoteUserButtons.keys()))) {
      this.items.clear();
      this.thumbpadTargets.clear();
      this.initMenu();
    }

  }

  private arrayEquals(a: string[], b: string[]) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  makeGripButtonBinding() {
    return new VRControllerButtonBinding('Disconnect', {
      onButtonDown: () => {
        this.localUser.disconnect();
        this.menuGroup?.replaceMenu(this.menuFactory.buildConnectionMenu());
      }
    });
  }

  onCloseMenu() {
    super.onCloseMenu();
    this.localUser.spectateUserService.deactivate();
  }
}
