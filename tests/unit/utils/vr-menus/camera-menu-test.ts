import CameraMenu from 'explorviz-frontend/utils/vr-menus/camera-menu';
import { module, test } from 'qunit';
import {Vector3} from 'three';

module('Unit | Utility | vr-menus/camera-menu', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new CameraMenu( () => {}, () => {return new Vector3();}, () => {});
    assert.ok(result);
  });
});
