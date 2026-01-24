(function () {
    'use strict';

    var omdb_api_key = '71351fb8';

    // Функція градації кольору (0-10)
    function getColor(rating) {
        rating = parseFloat(rating);
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

    function addRatingBlock(anchor, className, label, value) {
        if ($('.' + className).length > 0) return;
        
        // Копіюємо структуру стандартного елемента Lampa
        var block = $('<div class="full-start__rate ' + className + '"><div></div><div style="margin-left: 4px; opacity: 0.6; font-weight: normal; text-transform: uppercase;">' + label + '</div></div>');
        var color = getColor(value);
        
        block.find('div').eq(0).text(value).css('color', color);
        block.css('margin-right', '10px'); // Трохи щільніше
        
        anchor.after(block);
    }

    function updateStandardRates(render) {
        // Додаємо колір до стандартного TMDB та інших
        $('.rate--tmdb, .rate--imdb, .rate--kp', render).each(function() {
            var val = parseFloat($(this).find('div').eq(0).text());
            if (val > 0) $(this).find('div').eq(0).css('color', getColor(val));
        });
    }

    function getOMDB(e) {
        var movie = e.data.movie;
        var render = e.object.activity.render();
        var anchor = $('.rate--tmdb', render);
        
        if (anchor.length === 0) anchor = $('.rate--kp, .rate--imdb', render).last();
        if (anchor.length === 0) return;

        updateStandardRates(render);

        var imdb_id = movie.imdb_id || (movie.external_ids ? movie.external_ids.imdb_id : '');

        if (imdb_id) {
            requestOMDB(imdb_id, anchor);
        } else if (movie.id) {
            var type = (e.object.method === 'tv' || movie.number_of_seasons) ? 'tv' : 'movie';
            var tmdb_url = Lampa.TMDB.api(type + '/' + movie.id + '/external_ids?api_key=' + Lampa.TMDB.key());
            Lampa.Network.silent(tmdb_url, function (res) {
                if (res && res.imdb_id) requestOMDB(res.imdb_id, anchor);
            });
        }
    }

    function requestOMDB(imdb_id, anchor) {
        $.getJSON('https://www.omdbapi.com/?apikey=' + omdb_api_key + '&i=' + imdb_id, function(data) {
            if (data && data.Response !== "False") {
                // Рендеримо Metacritic
                if (data.Metascore && data.Metascore !== 'N/A') {
                    var mc = (parseInt(data.Metascore) / 10).toFixed(1);
                    addRatingBlock(anchor, 'rate--omdb-meta', 'MC', mc);
                }
                // Рендеримо Rotten Tomatoes
                var rt = (data.Ratings || []).find(function(r) { return r.Source === 'Rotten Tomatoes'; });
                if (rt) {
                    var rtv = (parseInt(rt.Value) / 10).toFixed(1);
                    addRatingBlock(anchor, 'rate--omdb-rt', 'RT', rtv);
                }
                // Рендеримо OMDb IMDb (якщо стандартний порожній)
                if (data.imdbRating && data.imdbRating !== 'N/A') {
                    addRatingBlock(anchor, 'rate--omdb-imdb', 'IMDb', data.imdbRating);
                }
            }
        });
    }

    function startPlugin() {
        window.omdb_rating_plugin_v5 = true;
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                setTimeout(function() {
                    getOMDB(e);
                }, 100);
            }
        });
    }

    if (!window.omdb_rating_plugin_v5) startPlugin();
})();