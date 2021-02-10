import ArrowbuttonItem from 'explorviz-frontend/utils/vr-menus/items/arrowbutton-item';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/items/arrowbutton-item', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new ArrowbuttonItem('id', {x: 0, y: 0}, 20, 20, '#ffffff', '#000000', 'right');
    assert.ok(result);
  });
});
