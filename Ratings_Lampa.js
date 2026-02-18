(function () {
    'use strict';

    var COMPONENT_NAME = 'omdb_config_ui';

    var style = $('<style>\
        .full-start__rate.custom-rating { margin-top: 0 !important; margin-right: 5px !important; margin-bottom: 0.2em !important; display: flex !important; align-items: center !important; gap: 0.3em; }\
        .custom-rating .rating-icon-wrap { width: 1.1em; height: 1.1em; display: flex; align-items: center; justify-content: center; }\
        .custom-rating img { max-width: 100%; max-height: 100%; object-fit: contain; }\
        .custom-rating div { font-weight: bold; line-height: 1; font-size: 1em !important; }\
        .rate--kp { display: none !important; }\
        .omdb-api-val { margin-left: auto; font-size: 0.9em; opacity: 0.7; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 10px; }\
        div[data-component="' + COMPONENT_NAME + '"] { display: none !important; }\
    </style>');
    $('body').append(style);

    var icons = {
        imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
        rt: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
        mc: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Metacritic_logo_Roundel.svg',
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg',
        oscar: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Oscar_gold_silhouette.svg',
        award: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Barnstar_film_3.svg'
    };

    function getColor(rating) {
        var val = parseFloat(rating);
        if (!val || val === 0) return '#fff';
        if (val < 3) return '#ff4d4d';
        else if (val < 5) return '#ff9f43';
        else if (val < 7.5) return '#feca57';
        else return '#2ecc71';
    }

    function getRatingSize() {
        return Lampa.Storage.get('omdb_rating_size', '0.8em');
    }

    function createBlock(className, iconUrl, value, color) {
        var size = getRatingSize();
        return $('<div class="full-start__rate custom-rating ' + className + '" style="font-size: ' + size + '"><div class="rating-icon-wrap"><img src="' + iconUrl + '" /></div><div style="color: ' + (color || '#fff') + '">' + value + '</div></div>');
    }

    function addRatingBlock(anchor, className, iconUrl, value) {
        if ($('.' + className).length > 0) return;
        var block = createBlock(className, iconUrl, value, getColor(value));
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
        var size = getRatingSize();

        $('.rate--tmdb', render).each(function() {
            var $this = $(this);
            var val = parseFloat($this.find('div').eq(0).text());
            if (val > 0) {
                if (!$this.hasClass('custom-rating')) {
                    $this.addClass('custom-rating').empty();
                    $this.append('<div class="rating-icon-wrap"><img src="' + icons.tmdb + '" /></div>');
                    $this.append('<div style="color: ' + getColor(val) + '">' + val + '</div>');
                }
                $this.css('font-size', size);
            }
        });

        var anchor = $('.rate--tmdb', render);
        if (anchor.length === 0) anchor = $('.full-start__rates', render).find('div').first();
        if (anchor.length === 0) return;

        var cubVal = getCubRating(e);
        if (cubVal) addRatingBlock(anchor, 'rate--cub-custom', icons.cub, cubVal);

        var imdb_id = movie.imdb_id || (movie.external_ids ? movie.external_ids.imdb_id : '');

        var requestOMDB = function(id) {
            var key = Lampa.Storage.get('omdb_api_key', '');
            if (!key) return;
            $.getJSON('https://www.omdbapi.com/?apikey=' + key + '&i=' + id, function(data) {
                if (data && data.Response !== "False") {
                    if (data.Awards && data.Awards !== "N/A") {
                        var oscarsMatch = data.Awards.match(/Won (\d+) Oscar/i);
                        var winsMatch = data.Awards.match(/(\d+) win/i);
                        
                        if (oscarsMatch && parseInt(oscarsMatch[1]) > 0) {
                            if ($('.rate--omdb-oscar', render).length === 0) {
                                var oscarBlock = createBlock('rate--omdb-oscar', icons.oscar, oscarsMatch[1], '#feca57');
                                anchor.before(oscarBlock);
                            }
                        }
                        
                        if (winsMatch && parseInt(winsMatch[1]) > 0) {
                            if ($('.rate--omdb-awards', render).length === 0) {
                                var awardBlock = createBlock('rate--omdb-awards', icons.award, winsMatch[1], '#fff');
                                anchor.before(awardBlock);
                            }
                        }
                    }

                    if (data.Metascore && data.Metascore !== 'N/A') addRatingBlock(anchor, 'rate--omdb-meta', icons.mc, (parseInt(data.Metascore) / 10).toFixed(1));
                    var rt = (data.Ratings || []).find(function(r) { return r.Source === 'Rotten Tomatoes'; });
                    if (rt) addRatingBlock(anchor, 'rate--omdb-rt', icons.rt, (parseInt(rt.Value) / 10).toFixed(1));
                    if (data.imdbRating && data.imdbRating !== 'N/A') addRatingBlock(anchor, 'rate--omdb-imdb', icons.imdb, data.imdbRating);
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
        window.lampa_omdb_plugin_loaded = true;

        Lampa.SettingsApi.addComponent({
            component: COMPONENT_NAME,
            name: 'OMDB'
        });

        Lampa.SettingsApi.addParam({
            component: "interface",
            param: { name: "omdb_entry_btn", type: "static" },
            field: { name: "OMDB Рейтинг", description: "Налаштування ключа та вигляду" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create(COMPONENT_NAME);
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { name: "omdb_back", type: "static" },
            field: { name: "Назад", description: "До інтерфейсу" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create("interface");
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { name: "omdb_api_key_set", type: "static" },
            field: { name: "API Key", description: "Натисніть для введення" },
            onRender: function (item) {
                var currentKey = Lampa.Storage.get('omdb_api_key', '');
                var valEl = $('<div class="omdb-api-val">' + (currentKey || 'Не встановлено') + '</div>');
                item.find('.settings-param__descr').after(valEl);
                item.on('hover:enter', function() {
                    Lampa.Input.edit({
                        title: 'OMDB API Key',
                        value: Lampa.Storage.get('omdb_api_key', ''),
                        free: true,
                        nosave: true
                    }, function(newValue) {
                        Lampa.Storage.set('omdb_api_key', newValue);
                        valEl.text(newValue || 'Не встановлено');
                    });
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: {
                name: 'omdb_rating_size',
                type: 'select',
                values: { '0.5em': 'XS', '0.8em': 'S', '1.1em': 'M', '1.5em': 'L', '2.0em': 'XL' },
                default: '0.8em'
            },
            field: { name: 'Розмір рейтингу' }
        });

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                setTimeout(function() { updateRatings(e); }, 100);
                setTimeout(function() { updateRatings(e); }, 1000);
            }
        });
    }

    if (!window.lampa_omdb_plugin_loaded) startPlugin();
})();
