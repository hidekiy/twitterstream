/*jslint node: true*/
'use strict';
var express = require('express'),
	morgan = require('morgan'),
	bodyParser = require('body-parser'),
	errorHandler = require('errorhandler'),
	twitterStreamService = require('./twitter-stream-service');

// for testing:
// twit.options.stream_base = 'https://broken.stream.twitter.com/1/';

module.exports = (function main() {
	var that = this,
		app = express();

	app.twitterStreamService = twitterStreamService({
		consumer_key: 'rbMJ6UnFXjTqJZR5ido1w',
		consumer_secret: process.env.CONSUMER_SECRET,
		access_token_key: '20168213-17D1AQQzZFkpTfVSaNSk0xpWunN5744ssRzRB03H0',
		access_token_secret: process.env.ACCESS_TOKEN_SECRET
	});

	app.use(morgan('dev'));
	app.use(bodyParser.urlencoded({extended: false}));
	app.use(function (req, res, next) {
		res.charset = 'utf-8';
		res.header('Access-Control-Allow-Origin', '*');
		next();
	});

	app.all('/sse', function (req, res, next) {
		res.header('Cache-Control', 'private, no-cache');
		res.header('Connection', 'close');
		res.header('X-Accel-Buffering', 'no');
		res.type('text/event-stream');

		console.log('Processing /sse');

		app.twitterStreamService.getSampleStream(function (stream) {
			var tweetCount = 0,
				tweetCountTokyo = 0;

			setInterval(function () {
				res.write([
					'event: stats\n',
					'data: ' + JSON.stringify({
						tweetCount: tweetCount,
						tweetCountTokyo: tweetCountTokyo
					}),
					'\n\n',
					'event: message\n'
				].join(''));

				tweetCount = 0;
				tweetCountTokyo = 0;
			}, 10000);

			function onData(data) {
				tweetCount++;

				if (data.user.time_zone === 'Tokyo') {
					tweetCountTokyo++;
					res.write('data: ' + JSON.stringify(data) + '\n\n');
				}
			}

			function onError(error, statusCode) {
				if (error === 'http') {
					return next(new Error('API Error: ' + statusCode));
				}

				next(error);
			}

			function onDestroy() {
				res.end();
			}

			stream.once('data', function () {
				res.write(':' + new Array(2049).join(' ') + '\n');
			});

			stream.on('data', onData);
			stream.on('error', onError);
			stream.on('destroy', onDestroy);

			req.on('close', function () {
				console.log('req close: %j', this.socket.address());
				stream.removeListener('data', onData);
				stream.removeListener('error', onError);
				stream.removeListener('destroy', onDestroy);
			});


			// res.on('close', function () {
			// 	console.log('res close: %j', this.socket.address());
			// });

			// res.socket.setTimeout(5000, function () {
			// 	console.log('res socket timeout: %j', this.address());
			// 	this.destroy();
			// });

			app.twitterStreamService.updateIdleTimer();
		});
	});

	app.get('/ok', function (req, res) {
		res.send({ok: true});
	});

	app.get('/source', function (req, res, next) {
		res.type('txt');
		res.sendFile(__filename);
	});

	app.use(errorHandler({dumpExceptions: true, showStack: true}));

	return app;
}());
