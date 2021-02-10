import NameTagMesh from 'explorviz-frontend/utils/view-objects/vr/name-tag-mesh';
import { module, test } from 'qunit';
import THREE from 'three';

module('Unit | Utility | name-tag-mesh', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new NameTagMesh('test', new THREE.Color());
    assert.ok(result);
  });
});
