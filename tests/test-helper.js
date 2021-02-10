import Application from '../app';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import resolver from './helpers/resolver';
import { setResolver } from '@ember/test-helpers';

setResolver(resolver);
setApplication(Application.create(config.APP));

start();


