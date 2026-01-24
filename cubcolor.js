(function () {
	'use strict';

	// Функція розрахунку кольору (від 0 до 10)
	function getColorForRating(rating) {
		if (!rating || rating === 0) return '#fff';
		var r, g, b = 0;
		if (rating < 5) {
			// Перехід від червоного до жовтого
			r = 255;
			g = Math.round(255 * (rating / 5));
		} else {
			// Перехід від жовтого до зеленого
			r = Math.round(255 * (1 - (rating - 5) / 5));
			g = 255;
		}
		return 'rgb(' + r + ',' + g + ',' + b + ')';
	}

	function cubRating(rateCub, render, e) {
		if (!e.object || !e.object.source || !(e.object.source === 'cub' || e.object.source === 'tmdb')) return;
		var isTv = !!e.object && !!e.object.method && e.object.method === 'tv';
		var minCnt = 20; 
		var reactionCoef = {
			fire: 10,
			nice: 7.5,
			think: 5,
			bore: 2.5,
			shit: 0
		};
		var reactionCnt = {};
		var coef = 0, sum = 0, cnt = 0, title = 'undefined', tmdbId = 0;
		if (e.data) {
			if (e.data.movie) {
				var movie = e.data.movie;
				tmdbId = movie.id || 0;
				title = movie.title || movie.name || movie.original_title || movie.original_name || '';
			}
			if (e.data.reactions && e.data.reactions.result) {
				var reactions = e.data.reactions.result;
				for (var i = 0; i < reactions.length; i++) {
					coef = reactionCoef[reactions[i].type];
					if (reactions[i].counter) {
						sum += reactions[i].counter * coef;
						cnt += reactions[i].counter * 1;
						reactionCnt[reactions[i].type] = reactions[i].counter * 1; 
					}
				}
			}
		}
		if (cnt >= minCnt) {
			var avg_rating = isTv ? 7.436 : 6.584; 
			var m = isTv ? 69 : 274; 
			var cub_rating = ((avg_rating * m + sum)/(m + cnt));
			var cub_rating_text = cub_rating.toFixed(1).replace('10.0', '10');
			
			// Визначаємо колір на основі рейтингу
			var ratingColor = getColorForRating(cub_rating);

			var medianReaction = '', medianIndex = Math.floor(cnt / 2);
			var reaction = Object.entries(reactionCoef)
				.sort(function(a,b){return a[1]-b[1]})
				.map(function(r){return r[0]})
			;
			var cumulativeCount = 0;
			while (reaction.length && cumulativeCount < medianIndex) {
				medianReaction = reaction.pop();
				cumulativeCount += (reactionCnt[medianReaction] || 0);
			}
			var reactionSrc = Lampa.Utils.protocol() + Lampa.Manifest.cub_domain + '/img/reactions/' + medianReaction + '.svg';
			
			var div = rateCub.removeClass('hide').find('> div');
			
			// Застосовуємо колір до всього блоку CUB
			rateCub.css('color', ratingColor);
			
			div.eq(0).text(cub_rating_text);
			div.eq(1).html('<img style="width:1em;height:1em;margin:0 0.2em;" src="' + reactionSrc + '">');
			
		} else {
			// Якщо рейтингу немає, повертаємо стандартний колір
			rateCub.css('color', '#fff');
		}
	}

	function startPlugin() {
		window.cub_rating_plugin = true;
		Lampa.Listener.follow('full', function (e) {
			if (e.type === 'complite' || e.type === 'complete') {
				var render = e.object.activity.render();
				var rateCub = $('.rate--cub', render);
				if (rateCub.length === 0) {
					// Створюємо блок, якщо його немає
					$('.rate--kp, .rate--imdb, .rate--tmdb', render).last().after('<div class="full-start__rate rate--cub hide"><div></div><div></div><div style="padding-left: 0;">CUB</div></div>');
					rateCub = $('.rate--cub', render);
				}
				if (rateCub.hasClass('hide')) {
					cubRating(rateCub, render, e);
				}
			}
		});
	}
	if (!window.cub_rating_plugin) startPlugin();
})();