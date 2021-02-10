import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import PlaneLayout from 'explorviz-frontend/view-objects/layout-models/plane-layout';
import THREE from 'three';
import { Application, Node } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

module('Unit | View Object | 3d/landscape/application-mesh', function(hooks) {

  setupTest(hooks);

  test('Default highlighting color is assigned', function(assert) {
    const planeLayout = new PlaneLayout();
    const defaultColor = new THREE.Color('green');

    const applicationMesh = new ApplicationMesh(planeLayout, application, defaultColor);

    const highlightingColor = applicationMesh.highlightingColor.getHexString().toLowerCase();

    const redColor = 'ff0000';
    assert.equal(highlightingColor, redColor);
  });

  test('Datamodel is assigned to mesh', function(assert) {
    const planeLayout = new PlaneLayout();
    const defaultColor = new THREE.Color('green');

    const applicationMesh = new ApplicationMesh(planeLayout, application, defaultColor);

    assert.equal(application, applicationMesh.dataModel);
  });

  test('Passed default color is correctly applied to material', function(assert) {
    const planeLayout = new PlaneLayout();
    const defaultColor = new THREE.Color('#ff00ff');

    const applicationMesh = new ApplicationMesh(planeLayout, application, defaultColor);

    const applicationMaterialColor = applicationMesh.material.color.getHexString();

    assert.equal(applicationMaterialColor, defaultColor.getHexString());
  });
});

const node: Node = {
  ipAddress: '100.100.100.100',
  hostName: 'foo',
  applications: [],
}

const application: Application = {
  name: 'SampleApplication',
  language: 'java',
  pid: '1000',
  parent: node,
  packages: [],
}

node.applications.push(application);