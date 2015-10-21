/*jslint browser: true, devel: true*/
/*global EventSource, jQuery*/

(function () {
	'use strict';

	var $ = jQuery;

	function parseCTime(str) {
		return new Date(str.replace(/\+0000/, 'UTC'));
	}

	function embedEntities(text, entities) {
		var list = text.split('');

		function clearRange(a, b) {
			var l = list,
				i;

			for (i = a; i <= b; i += 1) {
				l[i] = '';
			}
		}

		$.each(['urls', 'media', 'user_mentions', 'hashtags'], function (i, type) {
			if (!entities[type]) {
				return;
			}

			$.each(entities[type], function (i, u) {
				var b = u.indices[0],
					e = u.indices[1];

				clearRange(b, e);

				if (['urls', 'media'].indexOf(type) !== -1) {
					list[b] = $('<span/>').append($('<a/>', {
						href: u.url,
						title: u.expanded_url + ' (opens new tab)',
						target: '_blank',
						text: u.display_url
					})).html() + ' ';
				} else if (type === 'user_mentions') {
					list[b] = $('<span/>').append($('<a/>', {
						href: 'https://twitter.com/' + u.screen_name,
						title: [u.name, ' @', u.screen_name, ' (opens new tab)'].join(''),
						target: '_blank',
						text: '@' + u.screen_name
					})).html() + ' ';
				} else if (type === 'hashtags') {
					list[b] = $('<span/>').append($('<a/>', {
						href: 'https://twitter.com/search/realtime/' + window.encodeURIComponent('#' + u.text),
						title: ['#', u.text, ' (opens new tab)'].join(''),
						target: '_blank',
						text: '#' + u.text
					})).html() + ' ';
				}
			});
		});

		return list.join('');
	}

	function parseTwitterMsg(tweet) {
		var $msg = $('<div/>', {'class': 'update'}),
			$main = $('<div/>', {'class': 'msg-main'}).appendTo($msg),
			$footer;

		$('<a/>', {
			href: 'https://twitter.com/' + tweet.user.screen_name,
			target: '_blank'
		}).append(
			$('<img/>', {
				src: tweet.user.profile_image_url.replace(/^http:/, ''),
				css: {width: 48, height: 48, borderRadius: '4px'}
			})
		).appendTo($main);

		var $name = $('<p/>')
			.append($('<a/>', {
				href: 'https://twitter.com/' + tweet.user.screen_name,
				target: '_blank'
			}).append(
				$('<span/>', {css: {fontWeight: 'bold'}, text: tweet.user.name}),
				' ',
				$('<span/>', {text: '@' + tweet.user.screen_name})
			));

		if (tweet.user.location) {
			$name
				.append(' in ')
				.append($('<span/>', {text: tweet.user.location, css: {color: '#47f'}}));
		}

		$main.append($name);

		$('<p/>', {
			'class': 'msg-body',
			html: embedEntities(tweet.text, tweet.entities)
		}).appendTo($main);


		var $desc = $('<p/>');
		if (tweet.user.description) {
			$desc.append($('<span/>', {text: tweet.user.description}));
		}

		$main.append($desc);

		$footer = $('<p/>', {'class': 'msg-footer'});
		$footer.append(String(parseCTime(tweet.created_at)));

		if (tweet.in_reply_to_status_id_str) {
			$footer.append(' ');
			$footer.append($('<a/>', {
				href: 'https://twitter.com/' + tweet.in_reply_to_screen_name +
					'/status/' + tweet.in_reply_to_status_id_str,
				target: '_blank',
				text: 'in reply to @' + tweet.in_reply_to_screen_name
			}));
		}

		$footer
			.append(' via ')
			.append($($.parseHTML(tweet.source)).attr('target', '_blank'))
			.append(' · ')
			.append($('<a/>', {
				href: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str,
				target: '_blank',
				text: 'Details'
			}))
			.appendTo($main);

		$('<p/>', {css: {clear: 'both'}}).appendTo($msg);

		// $msg.prependTo('#msg_container');
		// $('#msg_container').prepend($('<div>', {'class': 'msg-frame'}).append($msg));
		if ($('#msg_container_a').height() < $('#msg_container_b').height()) {
			$('#msg_container_a').prepend($msg);
		} else {
			$('#msg_container_b').prepend($msg);
		}
	}

	$('#button_clear').click(function () {
		$('#msg_container').empty();
	});

	setInterval(function () {
		$('#msg_container > div:gt(1000)').remove();
	}, 5000);

	google.load("visualization", "1", {packages: ["corechart"]});
	google.setOnLoadCallback(function () {
		$('#status').text('Connecting...');
		$('#msg_container').prepend(
			$('<p/>', {id: 'loading'})
				.append($('<img/>', {
					src: '/static/ajax-loader.gif',
					width: 32,
					height: 32
				}))
				.append($('<span/>', {text: ' Loading...'}))
		);

		var source = new EventSource('/sse');

		$(source).on('open', function () {
			$('#status').text('Connected');
		});

		function parseEventData(event) {
			return JSON.parse(event.originalEvent.data);
		}

		$(source).on('message', function (event) {
			$('#loading').slideUp();
			parseTwitterMsg(parseEventData(event));
		});

		(function () {
			var statsArray = [
				['Seconds', 'Global', 'Tokyo']
			];

			function reNumber(array) {
				var lastSeconds = (array.length - 1) * 10;

				for (var i = 1; i < array.length; i++) {
					array[i][0] = i * 10 - lastSeconds;
				}
			}

			function reDraw(array) {
				(new google.visualization.LineChart($('#chart')[0])).draw(
					google.visualization.arrayToDataTable(array), {}
				);
			}

			$(source).on('stats', function (event) {
				console.log('stats', event);
				var stats = parseEventData(event);
				statsArray.splice(1, 1);
				statsArray.push([
					null,
					stats.tweetCount,
					stats.tweetCountTokyo
				]);
				reNumber(statsArray);
				reDraw(statsArray);
			});


			for (var i = 0; i < 30; i++) {
				statsArray.push([null, 0, 0]);
			}
			reNumber(statsArray);
			reDraw(statsArray);
		}());

		$('#button_stop').click(function () {
			$('#status').text('Closed');
			source.close();
		});
	});
}());
