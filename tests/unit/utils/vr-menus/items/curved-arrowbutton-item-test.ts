import CurvedArrowbuttonItem from 'explorviz-frontend/utils/vr-menus/items/curved-arrowbutton-item';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/items/curved-arrowbutton-item', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new CurvedArrowbuttonItem('id', {x: 0, y: 0}, 20, '#ffffff', '#000000', 'right');
    assert.ok(result);
  });
});
