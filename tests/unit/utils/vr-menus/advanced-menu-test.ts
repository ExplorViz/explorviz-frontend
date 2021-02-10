import AdvancedMenu from 'explorviz-frontend/utils/vr-menus/advanced-menu';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/advanced-menu', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new AdvancedMenu(() => {}, () => { return {}; }, false, () => {},);
    assert.ok(result);
  });
});
