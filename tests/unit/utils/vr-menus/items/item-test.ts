import Item from 'explorviz-frontend/utils/vr-menus/items/item';
import { module, test } from 'qunit';

module('Unit | Utility | vr-menus/items/item', function(/* hooks */) {

  class TestItem extends Item{

    constructor(id: string, pos: {x: number, y: number}){
      super(id, pos);
    }

    drawToCanvas(){

    }

    getBoundingBox(){
      return {minX: 0, maxX: 1, minY: 0, maxY: 0}
    }
  }

  test('it exists', function(assert) {
    let result = new TestItem('id', {x: 0, y: 0});
    assert.ok(result);
  });
});
