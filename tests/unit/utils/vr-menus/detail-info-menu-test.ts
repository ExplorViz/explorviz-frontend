import DetailInfoMenu from 'explorviz-frontend/utils/vr-menus/detail-info-menu';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/detail-info-menu', function(/* hooks */) {

  test('it exists', function(assert) {
    let result = new DetailInfoMenu( () => {}, {title: 'test', entries: [] });
    assert.ok(result);
  });
});
