(function () {
    'use strict';

    // 1. CSS Стилі
    // Додано фільтр для CUB (чорна заливка 80%)
    var style = $('<style>\
        .full-start__rate.custom-rating { \
            margin-top: 0 !important; \
            margin-right: 5px !important; \
            margin-bottom: 0.2em !important; \
            display: flex !important; \
            align-items: center !important; \
            gap: 0.3em; \
        }\
        .custom-rating .rating-icon-wrap { \
            width: 1.1em; \
            height: 1.1em; \
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
            font-size: 1em !important; \
        }\
        .rate--kp { display: none !important; }\
        .settings-param__value { \
            margin-left: auto; \
            font-size: 0.9em; \
            opacity: 0.7; \
            max-width: 200px; \
            overflow: hidden; \
            text-overflow: ellipsis; \
            white-space: nowrap; \
        }\
    </style>');
    $('body').append(style);

    var icons = {
        imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
        rt: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
        mc: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Metacritic_logo_Roundel.svg',
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        // Оновлене лого CUB
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    // 2. Допоміжні функції
    function getColor(rating) {
        var val = parseFloat(rating);
        if (!val || val === 0) return '#fff';
        if (val < 3) return '#ff4d4d';
        else if (val < 5) return '#ff9f43';
        else if (val < 7.5) return '#feca57';
        else return '#2ecc71';
    }

    // Отримання розміру зі сховища
    function getRatingSize() {
        return Lampa.Storage.get('omdb_rating_size', '0.8em');
    }

    function addRatingBlock(anchor, className, iconUrl, value) {
        if ($('.' + className).length > 0) return;
        var color = getColor(value);
        var size = getRatingSize();
        
        var block = $('<div class="full-start__rate custom-rating ' + className + '" style="font-size: ' + size + '">\
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

    // 3. Основна логіка оновлення рейтингів
    function updateRatings(e) {
        var render = e.object.activity.render();
        var movie = e.data.movie;
        var size = getRatingSize();

        // TMDB
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

        // CUB
        var cubVal = getCubRating(e);
        if (cubVal) addRatingBlock(anchor, 'rate--cub-custom', icons.cub, cubVal);

        var imdb_id = movie.imdb_id || (movie.external_ids ? movie.external_ids.imdb_id : '');
        
        // OMDB
        var requestOMDB = function(id) {
            var key = Lampa.Storage.get('omdb_api_key', '');
            if (!key) return;

            $.getJSON('https://www.omdbapi.com/?apikey=' + key + '&i=' + id, function(data) {
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

    // 4. Ініціалізація та Налаштування
    function startPlugin() {
        window.lampa_combined_v3 = true;
        var SETTINGS_COMPONENT = "omdb_settings_component";

        Lampa.Settings.listener.follow("open", function (e) {
            if (e.name == "main") {
                var render = Lampa.Settings.main().render();
                if (render.find('[data-component="' + SETTINGS_COMPONENT + '"]').length == 0) {
                    Lampa.SettingsApi.addComponent({
                        component: SETTINGS_COMPONENT,
                        name: "OMDB"
                    });
                }
                render.find('[data-component="' + SETTINGS_COMPONENT + '"]').addClass("hide");
            }
        });

        // Пункт в "Інтерфейс"
        Lampa.SettingsApi.addParam({
            component: "interface",
            param: { name: "omdb_setup_btn", type: "static" },
            field: { name: "OMDB Рейтинг", description: "Налаштування ключа та вигляду" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create(SETTINGS_COMPONENT);
                    Lampa.Controller.enabled().controller.back = function () {
                        Lampa.Settings.create("interface");
                    };
                });
            }
        });

        // Кнопка "Назад"
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: { name: "omdb_back_btn", type: "static" },
            field: { name: "Назад", description: "Повернутися до налаштувань інтерфейсу" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create("interface");
                });
            }
        });

        // 1. Поле для введення ключа
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: { name: "omdb_key_trigger", type: "static" },
            field: { name: "API Key", description: "Натисніть для введення ключа" },
            onRender: function (item) {
                var currentKey = Lampa.Storage.get('omdb_api_key', '');
                var valueDiv = $('<div class="settings-param__value">' + (currentKey ? currentKey : 'Не встановлено') + '</div>');
                item.find('.settings-param__descr').after(valueDiv);

                item.on('hover:enter', function() {
                    Lampa.Input.edit({
                        title: 'OMDB API Key',
                        value: Lampa.Storage.get('omdb_api_key', ''),
                        free: true,
                        nosave: true
                    }, function(newValue) {
                        Lampa.Storage.set('omdb_api_key', newValue);
                        valueDiv.text(newValue ? newValue : 'Не встановлено');
                    });
                });
            }
        });

        // 2. Вибір розміру (Select)
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: 'omdb_rating_size',
                type: 'select',
                values: {
                    '0.5em': '0.5em (XS)',
                    '0.8em': '0.8em (S)',
                    '1.1em': '1.1em (M)',
                    '1.5em': '1.5em (L)',
                    '2.0em': '2.0em (XL)'
                },
                default: '0.8em'
            },
            field: {
                name: 'Розмір рейтингу',
                description: 'Розмір іконок та тексту'
            }
        });

        // Запуск
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