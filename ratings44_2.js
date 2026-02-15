(function () {
    'use strict';

    var omdb_api_key = '71351fb8';

    var style = $('<style>\
        .full-start__rate.custom-rating { \
            margin-top: 0 !important; \
            margin-right: 5px !important; \
            display: flex !important; \
            align-items: center !important; \
            gap: 3px; \
        }\
        .custom-rating .rating-icon-wrap { \
            width: 0.9em; \
            height: 0.9em; \
            display: flex; \
            align-items: center; \
            justify-content: center; \
        }\
        .custom-rating img { \
            max-width: 100%; \
            max-height: 100%; \
            object-fit: contain; \
        }\
        .custom-rating div { \
            font-weight: bold; \
            line-height: 1; \
            font-size: 0.7em !important; \
        }\
        .rate--kp { display: none !important; }\
    </style>');
    $('body').append(style);

    var icons = {
        imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
        rt: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
        mc: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Metacritic_logo_Roundel.svg',
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Rotten_Tomatoes_positive_audience.svg'
    };

    function getColor(rating) {
        var val = parseFloat(rating);
        if (!val || val === 0) return '#fff';
        
        if (val < 3) {
            return '#ff4d4d'; // Червоний
        } else if (val < 5) {
            return '#ff9f43'; // Помаранчевий
        } else if (val < 7.5) {
            return '#feca57'; // Жовтий
        } else {
            return '#2ecc71'; // Зелений
        }
    }

    function addRatingBlock(anchor, className, iconUrl, value) {
        if ($('.' + className).length > 0) return;
        var color = getColor(value);
        var block = $('<div class="full-start__rate custom-rating ' + className + '">\
            <div class="rating-icon-wrap"><img src="' + iconUrl + '" /></div>\
            <div style="color: ' + color + '">' + value + '</div>\
        </div>');
        anchor.after(block);
    }

    function getCubRating(e) {
        if (!e.object || !e.object.source || !(e.object.source === 'cub' || e.object.source === 'tmdb')) return null;
        var isTv = e.object.method === 'tv';
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
        if (cnt >= 20) {
            var avg = isTv ? 7.436 : 6.584;
            var m = isTv ? 69 : 274;
            return ((avg * m + sum) / (m + cnt)).toFixed(1);
        }
        return null;
    }

    function updateRatings(e) {
        var render = e.object.activity.render();
        var movie = e.data.movie;

        $('.rate--tmdb', render).each(function() {
            var $this = $(this);
            var val = parseFloat($this.find('div').eq(0).text());
            if (val > 0 && !$this.hasClass('custom-rating')) {
                $this.addClass('custom-rating').empty();
                $this.append('<div class="rating-icon-wrap"><img src="' + icons.tmdb + '" /></div>');
                $this.append('<div style="color: ' + getColor(val) + '">' + val + '</div>');
            }
        });

        var anchor = $('.rate--tmdb', render);
        if (anchor.length === 0) anchor = $('.full-start__rates', render).find('div').first();
        if (anchor.length === 0) return;

        var cubVal = getCubRating(e);
        if (cubVal) addRatingBlock(anchor, 'rate--cub-custom', icons.cub, cubVal);

        var imdb_id = movie.imdb_id || (movie.external_ids ? movie.external_ids.imdb_id : '');
        
        var requestOMDB = function(id) {
            $.getJSON('https://www.omdbapi.com/?apikey=' + omdb_api_key + '&i=' + id, function(data) {
                if (data && data.Response !== "False") {
                    if (data.Metascore && data.Metascore !== 'N/A') {
                        addRatingBlock(anchor, 'rate--omdb-meta', icons.mc, (parseInt(data.Metascore) / 10).toFixed(1));
                    }
                    var rt = (data.Ratings || []).find(function(r) { return r.Source === 'Rotten Tomatoes'; });
                    if (rt) {
                        addRatingBlock(anchor, 'rate--omdb-rt', icons.rt, (parseInt(rt.Value) / 10).toFixed(1));
                    }
                    if (data.imdbRating && data.imdbRating !== 'N/A') {
                        addRatingBlock(anchor, 'rate--omdb-imdb', icons.imdb, data.imdbRating);
                    }
                }
            });
        };

        if (imdb_id) {
            requestOMDB(imdb_id);
        } else if (movie.id) {
            var type = (e.object.method === 'tv' || movie.number_of_seasons) ? 'tv' : 'movie';
            if (window.Lampa && Lampa.Network && Lampa.TMDB) {
                Lampa.Network.silent(Lampa.TMDB.api(type + '/' + movie.id + '/external_ids?api_key=' + Lampa.TMDB.key()), function (res) {
                    if (res && res.imdb_id) requestOMDB(res.imdb_id);
                });
            }
        }
    }

    function startPlugin() {
        window.lampa_combined_v3 = true;
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var delays = [100, 500, 1000];
                delays.forEach(function(delay) {
                    setTimeout(function() {
                        updateRatings(e);
                    }, delay);
                });
            }
        });
    }

    if (!window.lampa_combined_v3) {
        startPlugin();
    }
})();
