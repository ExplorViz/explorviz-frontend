import CheckboxItem from 'explorviz-frontend/utils/vr-menus/items/checkbox-item';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/items/checkbox-item', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new CheckboxItem('id', {x: 0, y: 0}, 20, 20, '#ffffff', '#000000', '#fafafa');
    assert.ok(result);
  });
});
