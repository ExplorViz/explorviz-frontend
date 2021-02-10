import CloseIcon from 'explorviz-frontend/utils/view-objects/vr/close-icon';
import { module, test } from 'qunit';
import { Texture } from 'three';

module('Unit | Utility | view-objects/vr/close-icon', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new CloseIcon(new Texture());
    assert.ok(result);
  });
});
