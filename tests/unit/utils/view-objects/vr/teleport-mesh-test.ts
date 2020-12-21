import TeleportMesh from 'explorviz-frontend/utils/view-objects/vr/teleport-mesh';
import { module, test } from 'qunit';
import THREE from 'three';

module('Unit | Utility | view-objects/vr/teleport-mesh', function(/*hooks*/) {

  // Replace this with your real tests.
  test('it works', function(assert) {
    let result = new TeleportMesh(new THREE.Color);
    assert.ok(result);
  });
});
