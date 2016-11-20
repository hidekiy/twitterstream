'use strict';

if (process.env.NEW_RELIC_LICENSE_KEY) {
	require('newrelic');
}

var app = require('./app');

(function main() {
	app.listen(process.env.PORT || 3000, function () {
		console.log('Listening on %j', this.address());
	});
}());
