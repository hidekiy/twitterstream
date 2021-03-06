'use strict';
var express = require('express'),
	morgan = require('morgan'),
	bodyParser = require('body-parser'),
	errorHandler = require('errorhandler'),
	twitterStreamService = require('./twitter-stream-service');

// for testing:
// twit.options.stream_base = 'https://broken.stream.twitter.com/1/';

module.exports = (function main() {
	var app = express();

	app.twitterStreamService = twitterStreamService({
		consumer_key: 'rbMJ6UnFXjTqJZR5ido1w',
		consumer_secret: process.env.CONSUMER_SECRET,
		access_token_key: '20168213-17D1AQQzZFkpTfVSaNSk0xpWunN5744ssRzRB03H0',
		access_token_secret: process.env.ACCESS_TOKEN_SECRET,
	});

	app.use(morgan('dev'));
	app.use(express.static(__dirname + '/public'));
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
				tweetCountJa = 0;

			var statsTimer = setInterval(function () {
				res.write([
					'event: stats\n',
					'data: ' + JSON.stringify({
						tweetCount,
						tweetCountJa,
					}),
					'\n\n',
					'event: message\n'
				].join(''));

				tweetCount = 0;
				tweetCountJa = 0;
			}, 10000);

			function onData(data) {
				tweetCount++;

				if (data.user.lang === 'ja') {
					tweetCountJa++;
					res.write(['data: ', JSON.stringify(data), '\n\n'].join(''));
				}
			}

			function onError(error, statusCode) {
				if (error === 'http') {
					return next(new Error('API Error: ' + statusCode));
				}

				next(error);
			}

			function onDestroy() {
				clearInterval(statsTimer);
				res.end();
			}

			stream.once('data', function () {
				res.write([':', new Array(2049).join(' '), '\n'].join(''));
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

			app.twitterStreamService.updateIdleTimer();
		});
	});

	app.get(['/favicon.ico', '/robots.txt'], function (req, res) {
		res.send();
	});

	app.get('/source', function (req, res) {
		res.type('txt');
		res.sendFile(__filename);
	});

	app.use(errorHandler({dumpExceptions: true, showStack: true}));

	return app;
}());
