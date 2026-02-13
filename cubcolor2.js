(function () {
	'use strict';

	function getColorForRating(rating) {
		if (!rating || rating === 0) return '#fff';
		var r, g, b = 0;
		if (rating < 5) {
			r = 255;
			g = Math.round(255 * (rating / 5));
		} else {
			r = Math.round(255 * (1 - (rating - 5) / 5));
			g = 255;
		}
		return 'rgb(' + r + ',' + g + ',' + b + ')';
	}

	function cubRating(rateCub, e) {
		if (!e.object || !e.object.source || !(e.object.source === 'cub' || e.object.source === 'tmdb')) return;
		
		var isTv = !!e.object && !!e.object.method && e.object.method === 'tv';
		var minCnt = 20; 
		var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
		
		var sum = 0, cnt = 0;
		if (e.data && e.data.reactions && e.data.reactions.result) {
			var reactions = e.data.reactions.result;
			for (var i = 0; i < reactions.length; i++) {
				var coef = reactionCoef[reactions[i].type];
				if (reactions[i].counter) {
					sum += (reactions[i].counter * coef);
					cnt += (reactions[i].counter * 1);
				}
			}
		}
		
		if (cnt >= minCnt) {
			var avg_rating = isTv ? 7.436 : 6.584; 
			var m = isTv ? 69 : 274; 
			var cub_rating = ((avg_rating * m + sum) / (m + cnt));
			var cub_rating_text = cub_rating.toFixed(1).replace('.0', '');
			var ratingColor = getColorForRating(cub_rating);

			// Очищуємо і записуємо заново, щоб уникнути конфліктів рендеру
			rateCub.empty();
			rateCub.append('<div style="color: ' + ratingColor + '">' + cub_rating_text + '</div>');
			rateCub.append('<div style="margin-left: 0.4em; color: #fff">CUB</div>');
			
			rateCub.removeClass('hide');
		} else {
			rateCub.addClass('hide');
		}
	}

	function startPlugin() {
		window.cub_rating_plugin = true;
		Lampa.Listener.follow('full', function (e) {
			if (e.type === 'complite' || e.type === 'complete') {
				var render = e.object.activity.render();
				
				// Чекаємо мить, щоб Lampa встигла відрендерити свої елементи
				setTimeout(function() {
					var rateCub = $('.rate--cub', render);
					
					if (rateCub.length === 0) {
						var html = '<div class="full-start__rate rate--cub hide"></div>';
						var target = $('.rate--kp, .rate--imdb, .rate--tmdb', render).last();
						
						if (target.length > 0) target.after(html);
						else $('.full-start__rate', render).last().after(html);
						
						rateCub = $('.rate--cub', render);
					}
					
					cubRating(rateCub, e);
				}, 10);
			}
		});
	}

	if (!window.cub_rating_plugin) startPlugin();
})();
