import RemoteVrUser from 'explorviz-frontend/utils/vr-multi-user/remote-vr-user';
import { module, test } from 'qunit';

module('Unit | Utility | remote-vr-user', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new RemoteVrUser();
    assert.ok(result);
  });
});
