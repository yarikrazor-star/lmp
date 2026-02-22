(function () {
    'use strict';

    var COMPONENT_NAME = 'omdb_config_ui';
    var RATINGS_PREFIX = 'omdb_rating_toggle_';
    var CONTAINER_CLASS = 'omdb-mdb-yarik-rate';

    var mdblistSvg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='%23ffffff' style='opacity:1;'%3E%3Cpath d='M1.928.029A2.47 2.47 0 0 0 .093 1.673c-.085.248-.09.629-.09 10.33s.005 10.08.09 10.33a2.51 2.51 0 0 0 1.512 1.558l.276.108h20.237l.277-.108a2.51 2.51 0 0 0 1.512-1.559c.085-.25.09-.63.09-10.33s-.005-10.08-.09-10.33A2.51 2.51 0 0 0 22.395.115l-.277-.109L12.117 0C6.615-.004 2.032.011 1.929.029m7.48 8.067l2.123 2.004v1.54c0 .897-.02 1.536-.043 1.527s-.92-.845-1.995-1.86c-1.071-1.01-1.962-1.84-1.977-1.84s-.024 1.91-.024 4.248v4.25H4.911V6.085h1.188l1.183.006zm9.729 3.93v5.94h-2.63l-.01-4.25l-.013-4.25l-1.907 1.795a367 367 0 0 1-1.98 1.864c-.076.056-.08-.047-.08-1.489v-1.555l2.127-1.995l2.122-1.995l1.187-.005h1.184z'/%3E%3C/svg%3E";

    var renderOrder = {
        'oscar': 1, 'award': 2, 'tmdb': 3, 'imdb': 4, 'rt': 5,
        'mc': 6, 'trakt': 7, 'cub': 8, 'popcorn': 9, 'mdblist': 10, 'letterboxd': 11
    };

    var icons = {
        imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
        rt: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
        mc: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Metacritic_logo_Roundel.svg',
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg',
        oscar: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Oscar_gold_silhouette.svg',
        award: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Barnstar_film_3.svg',
        trakt: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Trakt.tv-favicon.svg',
        mdblist: mdblistSvg,
        popcorn: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Rotten_Tomatoes_positive_audience.svg',
        letterboxd: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Letterboxd_2023_logo.png'
    };

    var availableRatings = [
        { key: 'tmdb', name: 'TMDB', default: true },
        { key: 'imdb', name: 'IMDb', default: true },
        { key: 'rt', name: 'Rotten Tomatoes', default: true },
        { key: 'mc', name: 'Metacritic', default: true },
        { key: 'trakt', name: 'Trakt TV', default: true },
        { key: 'cub', name: 'Lampa (CUB)', default: true },
        { key: 'popcorn', name: 'RT Audience (Popcorn)', default: true },
        { key: 'mdblist', name: 'MDBList Score', default: true },
        { key: 'letterboxd', name: 'Letterboxd', default: true },
        { key: 'awards', name: 'Нагороди (Awards)', default: true }
    ];

    var style = $('<style>\
        .' + CONTAINER_CLASS + ' {\
            display: flex;\
            flex-wrap: wrap;\
            align-items: center;\
            width: 100%;\
            min-height: 25px;\
            margin: 0;\
        }\
        @media screen and (orientation: portrait) {\
            .' + CONTAINER_CLASS + ' {\
                justify-content: center;\
            }\
        }\
        .' + CONTAINER_CLASS + '.is-bw-text .custom-rating div {\
            color: #cccccc !important;\
        }\
        .full-start__rate.custom-rating {\
            display: inline-flex !important;\
            align-items: center !important;\
            margin: 0 !important;\
            flex-shrink: 0 !important;\
            gap: 0.35em;\
            white-space: nowrap !important;\
        }\
        .custom-rating .rating-icon-wrap { width: 1.1em; height: 1.1em; display: flex; align-items: center; justify-content: center; }\
        .custom-rating img { width: 100%; height: 100%; object-fit: contain; display: block; }\
        .custom-rating div { font-weight: bold; line-height: 1; font-size: 1em !important; }\
        .omdb-api-val { margin-left: auto; font-size: 0.9em; opacity: 0.7; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 10px; }\
        div[data-component="' + COMPONENT_NAME + '"], div[data-component="omdb_ratings_select"] { display: none !important; }\
        .rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } \
    </style>');
    $('body').append(style);

    function isRatingEnabled(key) { return Lampa.Storage.get(RATINGS_PREFIX + key, true); }

    function normalizeValue(val, type) {
        if (!val && val !== 0) return '0.0';
        var strVal = String(val).replace('%', ''); 
        var num = parseFloat(strVal);
        if (isNaN(num)) return '0.0';
        if (type === 'letterboxd' && num <= 5) num = num * 2;
        else if (num > 10) num = num / 10;
        return num.toFixed(1);
    }

    function getColor(rating) {
        var val = parseFloat(rating);
        if (!val || val === 0) return '#fff';
        if (val < 3) return '#ff4d4d';
        else if (val < 5) return '#ff9f43';
        else if (val < 7.0) return '#feca57';
        else return '#2ecc71';
    }

    function getRatingSize() { return Lampa.Storage.get('omdb_rating_size', '0.8em'); }
    function getRatingGap() { return Lampa.Storage.get('omdb_rating_gap', '0.5em'); }
    function getRatingMargin() { return Lampa.Storage.get('omdb_rating_margin', '10px'); }
    function getSaturation() { return Lampa.Storage.get('omdb_rating_saturation', '100%'); }

    function createBlock(className, iconUrl, value, color, orderKey) {
        var size = getRatingSize();
        var order = renderOrder[orderKey] || 50;
        var sat = getSaturation();
        var imgStyle = 'filter: saturate(' + sat + ');';
        
        return $('<div class="full-start__rate custom-rating ' + className + '" style="font-size: ' + size + '; order: ' + order + ';">\
            <div class="rating-icon-wrap"><img src="' + iconUrl + '" style="' + imgStyle + '" /></div>\
            <div style="color: ' + (color || '#fff') + '">' + value + '</div>\
        </div>');
    }

    function addRatingBlock(container, className, iconUrl, rawValue, keyName) {
        if (keyName && !isRatingEnabled(keyName)) return;
        if (container.find('.' + className).length > 0) return; 
        if (!rawValue || rawValue === '0' || rawValue === '0.0' || rawValue === 'N/A' || rawValue === '0%') return;
        
        var isAward = (keyName === 'awards');
        var finalValue = isAward ? rawValue : normalizeValue(rawValue, keyName);
        if (!isAward && finalValue === '0.0') return;

        var color = isAward ? '#feca57' : getColor(finalValue);
        if (isAward) color = (className.indexOf('oscar') > -1) ? '#feca57' : '#fff';

        var orderKey = keyName;
        if (className.indexOf('oscar') > -1) orderKey = 'oscar';
        else if (className.indexOf('award') > -1) orderKey = 'award';

        var block = createBlock(className, iconUrl, finalValue, color, orderKey);
        container.append(block);
    }

    function getCubRating(e) {
        if (!e.object || !e.object.source || !(e.object.source === 'cub' || e.object.source === 'tmdb')) return null;
        var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
        var sum = 0, cnt = 0;
        if (e.data && e.data.reactions && e.data.reactions.result) {
            var reactions = e.data.reactions.result;
            for (var i = 0; i < reactions.length; i++) {
                if (reactions[i].counter) {
                    sum += (reactions[i].counter * reactionCoef[reactions[i].type]);
                    cnt += reactions[i].counter;
                }
            }
        }
        if (cnt >= 20) {
            var isTv = e.object.method === 'tv';
            var avg = isTv ? 7.436 : 6.584;
            var m = isTv ? 69 : 274;
            return ((avg * m + sum) / (m + cnt)).toFixed(1);
        }
        return null;
    }

    function updateRatings(e) {
        var render = e.object.activity.render();
        var movie = e.data.movie;
        
        render.find('.rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates').remove();

        var container = render.find('.' + CONTAINER_CLASS);

        if (container.length > 1) {
            container.not(':first').remove();
            container = render.find('.' + CONTAINER_CLASS).first();
        }

        if (container.length === 0) {
            container = $('<div class="' + CONTAINER_CLASS + '"></div>');
            
            var cardifyLeft = render.find('.cardify__left');
            if (cardifyLeft.length > 0) {
                var localRateLine = cardifyLeft.find('.full-start-new__rate-line, .full-start__rate-line').first();
                var localTitle = cardifyLeft.find('.full-start-new__title, .full-start__title').first();
                
                if (localRateLine.length > 0) {
                    container.insertBefore(localRateLine);
                } else if (localTitle.length > 0) {
                    container.insertAfter(localTitle);
                } else {
                    cardifyLeft.append(container);
                }
            } else {
                var rateLine = render.find('.full-start-new__rate-line, .full-start__rate-line').first();
                var titleLine = render.find('.full-start-new__title, .full-start__title').first();
                var infoBlock = render.find('.full-start__info');

                if (rateLine.length > 0) {
                    container.insertBefore(rateLine);
                } else if (titleLine.length > 0) {
                    container.insertAfter(titleLine);
                } else if (infoBlock.length > 0) {
                    infoBlock.prepend(container);
                }
            }
        }

        var marginVal = getRatingMargin();
        var sat = getSaturation();
        container.css({
            'gap': getRatingGap(),
            'margin-top': marginVal,
            'margin-bottom': marginVal
        });

        if (sat === '0%') {
            container.addClass('is-bw-text');
        } else {
            container.removeClass('is-bw-text');
        }

        var tmdbVal = movie.vote_average || 0;
        if (tmdbVal > 0 && isRatingEnabled('tmdb')) {
            addRatingBlock(container, 'rate--tmdb-custom', icons.tmdb, tmdbVal, 'tmdb');
        }

        if (isRatingEnabled('cub')) {
            var cubVal = getCubRating(e);
            if (cubVal) addRatingBlock(container, 'rate--cub-custom', icons.cub, cubVal, 'cub');
        }

        var imdb_id = movie.imdb_id || (movie.external_ids ? movie.external_ids.imdb_id : '');

        var requestMDBList = function(id) {
            var key = Lampa.Storage.get('mdblist_api_key', '');
            if (!key) return;
            $.getJSON('https://mdblist.com/api/?apikey=' + key + '&i=' + id, function(data) {
                if (!data) return;
                if (data.score && isRatingEnabled('mdblist')) addRatingBlock(container, 'rate--mdblist-score', icons.mdblist, data.score, 'mdblist');
                if (data.ratings && Array.isArray(data.ratings)) {
                    data.ratings.forEach(function(r) {
                        if (r.source === 'trakt' && isRatingEnabled('trakt')) addRatingBlock(container, 'rate--mdblist-trakt', icons.trakt, r.value, 'trakt');
                        if (r.source === 'letterboxd' && isRatingEnabled('letterboxd')) addRatingBlock(container, 'rate--mdblist-lb', icons.letterboxd, r.value, 'letterboxd');
                        if (r.source === 'tomatoesaudience' && isRatingEnabled('popcorn')) addRatingBlock(container, 'rate--mdblist-popcorn', icons.popcorn, r.value, 'popcorn');
                        if (r.source === 'metacritic' && isRatingEnabled('mc') && container.find('.rate--omdb-meta').length === 0) addRatingBlock(container, 'rate--mdblist-meta', icons.mc, r.value, 'mc');
                        if (r.source === 'tomatoes' && isRatingEnabled('rt') && container.find('.rate--omdb-rt').length === 0) addRatingBlock(container, 'rate--mdblist-rt', icons.rt, r.value, 'rt');
                        if (r.source === 'imdb' && isRatingEnabled('imdb') && container.find('.rate--omdb-imdb').length === 0) addRatingBlock(container, 'rate--mdblist-imdb', icons.imdb, r.value, 'imdb');
                    });
                }
            });
        };

        var requestOMDB = function(id) {
            var key = Lampa.Storage.get('omdb_api_key', '');
            var onDone = function() { requestMDBList(id); };
            if (!key) return onDone();

            $.getJSON('https://www.omdbapi.com/?apikey=' + key + '&i=' + id, function(data) {
                if (data && data.Response !== "False") {
                    if (isRatingEnabled('awards') && data.Awards && data.Awards !== "N/A") {
                        var oscars = data.Awards.match(/Won (\d+) Oscar/i);
                        var wins = data.Awards.match(/(\d+) win/i);
                        if (oscars && parseInt(oscars[1]) > 0) addRatingBlock(container, 'rate--omdb-oscar', icons.oscar, oscars[1], 'awards');
                        if (wins && parseInt(wins[1]) > 0) addRatingBlock(container, 'rate--omdb-awards', icons.award, wins[1], 'awards');
                    }
                    if (data.Metascore && data.Metascore !== 'N/A' && isRatingEnabled('mc')) addRatingBlock(container, 'rate--omdb-meta', icons.mc, data.Metascore, 'mc');
                    var rt = (data.Ratings || []).find(function(r) { return r.Source === 'Rotten Tomatoes'; });
                    if (rt && isRatingEnabled('rt')) addRatingBlock(container, 'rate--omdb-rt', icons.rt, rt.Value, 'rt');
                    if (data.imdbRating && data.imdbRating !== 'N/A' && isRatingEnabled('imdb')) addRatingBlock(container, 'rate--omdb-imdb', icons.imdb, data.imdbRating, 'imdb');
                }
            }).always(onDone);
        };

        if (imdb_id) requestOMDB(imdb_id);
        else if (movie.id) {
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
        Lampa.SettingsApi.addComponent({ component: COMPONENT_NAME, name: 'OMDB' });
        Lampa.SettingsApi.addComponent({ component: 'omdb_ratings_select', name: 'Вибір рейтингів' });

        Lampa.SettingsApi.addParam({
            component: "interface",
            param: { name: "omdb_entry_btn", type: "static" },
            field: { name: "OMDB & MDBList", description: "Налаштування рейтингів" },
            onRender: function (item) { item.on("hover:enter", function () { Lampa.Settings.create(COMPONENT_NAME); }); }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { name: "omdb_back", type: "static" },
            field: { name: "Назад", description: "До інтерфейсу" },
            onRender: function (item) { item.on("hover:enter", function () { Lampa.Settings.create("interface"); }); }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { name: "omdb_api_key_set", type: "static" },
            field: { name: "OMDB API Key", description: "Встановити ключ" },
            onRender: function (item) {
                var currentKey = Lampa.Storage.get('omdb_api_key', '');
                var valEl = $('<div class="omdb-api-val">' + (currentKey || 'Не встановлено') + '</div>');
                item.find('.settings-param__descr').after(valEl);
                item.on('hover:enter', function() {
                    Lampa.Input.edit({ title: 'OMDB API Key', value: Lampa.Storage.get('omdb_api_key', ''), free: true, nosave: true }, function(newValue) {
                        Lampa.Storage.set('omdb_api_key', newValue);
                        valEl.text(newValue || 'Не встановлено');
                    });
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { name: "mdblist_api_key_set", type: "static" },
            field: { name: "MDBList API Key", description: "Встановити ключ" },
            onRender: function (item) {
                var currentKey = Lampa.Storage.get('mdblist_api_key', '');
                var valEl = $('<div class="omdb-api-val">' + (currentKey || 'Не встановлено') + '</div>');
                item.find('.settings-param__descr').after(valEl);
                item.on('hover:enter', function() {
                    Lampa.Input.edit({ title: 'MDBList API Key', value: Lampa.Storage.get('mdblist_api_key', ''), free: true, nosave: true }, function(newValue) {
                        Lampa.Storage.set('mdblist_api_key', newValue);
                        valEl.text(newValue || 'Не встановлено');
                    });
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { name: 'omdb_rating_size', type: 'select', values: { '0.5em': 'XS', '0.8em': 'S', '1.1em': 'M', '1.5em': 'L', '2.0em': 'XL' }, default: '0.8em' },
            field: { name: 'Розмір рейтингів' }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { name: 'omdb_rating_gap', type: 'select', values: { '0px': '0', '0.2em': '0.2em', '0.5em': '0.5em', '1em': '1em', '1.5em': '1.5em', '2em': '2em' }, default: '0.5em' },
            field: { name: 'Відстань між рейтингами', description: 'Відступ (gap) між іконками' }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { 
                name: 'omdb_rating_margin', 
                type: 'select', 
                values: { '-1em': '-1em', '-0.5em': '-0.5em', '0px': '0', '10px': '10px (Стандарт)', '0.5em': '0.5em', '1em': '1em', '1.5em': '1.5em', '2em': '2em' }, 
                default: '10px' 
            },
            field: { name: 'Відступ до інших рядків', description: 'Верхній та нижній відступ' }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { 
                name: 'omdb_rating_saturation', 
                type: 'select', 
                values: { '100%': '100% (Стандарт)', '75%': '75%', '50%': '50%', '25%': '25%', '0%': '0% (Ч/Б)' }, 
                default: '100%' 
            },
            field: { name: 'Насиченість', description: 'Рівень кольоровості іконок' }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT_NAME,
            param: { name: "omdb_select_ratings", type: "static" },
            field: { name: "Вибір рейтингів", description: "Вкл/Викл джерел" },
            onRender: function (item) { item.on("hover:enter", function () { Lampa.Settings.create('omdb_ratings_select'); }); }
        });

        Lampa.SettingsApi.addParam({
            component: 'omdb_ratings_select',
            param: { name: "omdb_ratings_back", type: "static" },
            field: { name: "Назад", description: "До налаштувань" },
            onRender: function (item) { item.on("hover:enter", function () { Lampa.Settings.create(COMPONENT_NAME); }); }
        });

        availableRatings.forEach(function(rating) {
            Lampa.SettingsApi.addParam({
                component: 'omdb_ratings_select',
                param: { 
                    name: RATINGS_PREFIX + rating.key, 
                    type: 'trigger', 
                    default: Lampa.Storage.get(RATINGS_PREFIX + rating.key, rating.default) 
                },
                field: { name: rating.name }
            });
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
