import TextbuttonItem from 'explorviz-frontend/utils/vr-menus/items/textbutton-item';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/items/textbutton-item', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new TextbuttonItem('id', 'text', {x: 0, y: 0}, 10, 10, 5, '#ffffff', '#000000', '#333333');
    assert.ok(result);
  });
});
