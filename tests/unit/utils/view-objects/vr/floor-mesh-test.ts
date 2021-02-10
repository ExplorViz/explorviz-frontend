import FloorMesh from 'explorviz-frontend/utils/view-objects/vr/floor-mesh';
import { module, test } from 'qunit';

module('Unit | Utility | view-objects/vr/floor-mesh', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new FloorMesh(20, 30);
    assert.ok(result);
  });
});
