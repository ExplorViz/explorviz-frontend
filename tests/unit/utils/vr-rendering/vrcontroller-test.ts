import { module, test } from 'qunit';
import VRController from 'virtual-reality/utils/vr-rendering/VRController';
import THREE from 'three';

module('Unit | Utility | vr-rendering/VRController', function() {

  test('it exists', function( assert ) {
    let result = new VRController(0, 'interaction' ,new THREE.Group(), new THREE.Group(), {}, new THREE.Scene());
    assert.ok(result);
  });
});
