/*jslint node: true*/
/*global describe, it*/
'use strict';
var chai = require('chai'),
	app = require('../app'),
	request = require('supertest'),
	EventEmitter = require('events').EventEmitter,
	should = chai.should();

describe('app', function () {
	it('should have listen method', function () {
		should.exist(app.listen);
	});

	it('should respond /', function (done) {
		request(app)
			.get('/')
			.expect(200, done);
	});

	it('should respond /ok', function (done) {
		request(app)
			.get('/ok')
			.expect('Access-Control-Allow-Origin', '*')
			.expect(200, done);
	});

	it('should respond /source', function (done) {
		request(app)
			.get('/source')
			.expect('Content-Type', 'text/plain; charset=utf-8')
			.expect('Access-Control-Allow-Origin', '*')
			.expect(200, done);
	});

	it('should respond /sse', function (done) {
		function TwitterStreamService() {}
		var twitterStreamService = new TwitterStreamService();
		var stream = new EventEmitter();

		twitterStreamService.getSampleStream = function (cb) {
			cb(stream);
			process.nextTick(function () {
				stream.emit('data', {user: {lang: 'ja'}, tweet: 123});
				stream.emit('destroy');
			});
		};
		twitterStreamService.updateIdleTimer = function () {};

		app.twitterStreamService = twitterStreamService;

		var expectedBody = ':' + new Array(2049).join(' ') +
			'\ndata: {"user":{"lang":"ja"},"tweet":123}\n\n';

		request(app)
			.get('/sse')
			.expect('Content-Type', 'text/event-stream; charset=utf-8')
			.expect('Cache-Control', 'private, no-cache')
			.expect('Access-Control-Allow-Origin', '*')
			.expect(200, expectedBody, done);
	});
});
