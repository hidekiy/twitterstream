/*jslint node: true*/
'use strict';
var chai = require('chai'),
	app = require('../app');

chai.should();

describe('app', function () {
	it('should be defined', function () {
		app.should.ok;
	})
});
