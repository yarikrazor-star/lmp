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
		var sum = 0, cnt = 0;
		if (e.data) {
			if (e.data.reactions && e.data.reactions.result) {
				var reactions = e.data.reactions.result;
				for (var i = 0; i < reactions.length; i++) {
					var coef = reactionCoef[reactions[i].type];
					if (reactions[i].counter) {
						sum += reactions[i].counter * coef;
						cnt += reactions[i].counter * 1;
					}
				}
			}
		}
		
		var div = rateCub.find('> div');

		if (cnt >= minCnt) {
			var avg_rating = isTv ? 7.436 : 6.584; 
			var m = isTv ? 69 : 274; 
			var cub_rating = ((avg_rating * m + sum)/(m + cnt));
			var cub_rating_text = cub_rating.toFixed(1).replace('10.0', '10');
			
			// Визначаємо колір
			var ratingColor = getColorForRating(cub_rating);

			rateCub.removeClass('hide');
			
			// Застосовуємо колір лише до числа (перший div)
			div.eq(0).text(cub_rating_text).css('color', ratingColor);
			// Очищуємо місце, де був смайл (другий div)
			div.eq(1).empty();
			// Текст "CUB" залишаємо стандартним
			rateCub.css('color', '#fff');
			
		} else {
			rateCub.addClass('hide');
		}
	}

	function startPlugin() {
		window.cub_rating_plugin = true;
		Lampa.Listener.follow('full', function (e) {
			if (e.type === 'complite' || e.type === 'complete') {
				var render = e.object.activity.render();
				var rateCub = $('.rate--cub', render);
				if (rateCub.length === 0) {
					// Створюємо структуру: [Число] [Місце під іконку] [Назва]
					$('.rate--kp, .rate--imdb, .rate--tmdb', render).last().after('<div class="full-start__rate rate--cub hide"><div></div><div></div><div style="padding-left: 0.4em;">CUB</div></div>');
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