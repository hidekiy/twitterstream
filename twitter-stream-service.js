/*jslint node: true*/
'use strict';
var NTwitter = require('ntwitter');

function TwitterStreamService(config) {
	this.twit = new NTwitter(config);
	this.sampleStream = null;
	this.sampleStreamIdleTimer = null;
	this.idleTimeout = 1000 * 60 * 10;

	setInterval((function () {
		if (this.sampleStream && this.sampleStream.listeners('data').length === 0) {
			console.log('everyone left, destroy()');
			this.sampleStream.destroy();
			this.sampleStream = null;
		}
	}).bind(this), 1000);
}

TwitterStreamService.prototype.getSampleStream = function getSampleStream(callback) {
	if (this.sampleStream) {
		callback(this.sampleStream);
		return;
	}

	console.log('connect to streaming server.');
	this.twit.stream('statuses/sample', (function (stream) {
		this.sampleStream = stream;

		stream.on('missedHeartbeat', (function () {
			console.log('missedHeartbeat, destroy()');
			stream.destroy();
			this.sampleStream = null;
		}).bind(this));

		callback(stream);
	}).bind(this));
};

TwitterStreamService.prototype.updateIdleTimer = function updateIdleTimer() {
	clearTimeout(this.sampleStreamIdleTimer);
	this.sampleStreamIdleTimer = setTimeout((function () {
		if (!sampleStream) { return; }

		console.log('sampleStreamIdleTimer timeout, destroy()');
		this.sampleStream.destroy();
		this.sampleStream = null;
	}).bind(this), this.idleTimeout);
};

module.exports = function create(config) {
	return new TwitterStreamService(config);
};
