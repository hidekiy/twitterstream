/*jslint node: true*/
'use strict';
var app = require('./app');

(function main() {
	app.listen(process.env.PORT || 3000, function () {
		console.log('Listening on %j', this.address());
	});
}());
