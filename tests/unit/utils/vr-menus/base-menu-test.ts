import BaseMenu from 'explorviz-frontend/utils/vr-menus/base-menu';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/base-menu', function(/* hooks */) {

  class TestMenu extends BaseMenu {}

  test('it exists', function(assert) {
    let result = new TestMenu();
    assert.ok(result);
  });
});
