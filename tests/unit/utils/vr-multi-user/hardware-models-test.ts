import HardwareModels from 'explorviz-frontend/utils/vr-multi-user/hardware-models';
import { module, test } from 'qunit';

module('Unit | Utility | vr-multi-user/hardware-models', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new HardwareModels();
    assert.ok(result);
  });
});
