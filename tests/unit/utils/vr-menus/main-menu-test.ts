import MainMenu from 'explorviz-frontend/utils/vr-menus/main-menu';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/main-menu', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new MainMenu({
      closeMenu: () => {},
      openCameraMenu: () => {},
      openAdvancedMenu: () => {},
    });
    assert.ok(result);
  });
});
