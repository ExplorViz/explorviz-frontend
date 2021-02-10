import calculateColorBrightness from 'explorviz-frontend/utils/helpers/threejs-helpers';
import { module, test } from 'qunit';
import THREE from "three";

module('Unit | Utility | helpers/threejs helpers');

// Replace this with your real tests.
test('it works', function(assert) {
  let result = calculateColorBrightness(new THREE.Color(1,0,0), 1.1);
  assert.ok(result);
});
