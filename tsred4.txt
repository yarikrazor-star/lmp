(function () {
    'use strict';

    var settings = {
        apn: [''],
        api: [{
            url: 'https://api.apbugall.org',
            token: '8da1c9beda9545174264dc9f63a77d'
        }, {
            url: 'https://upn.stull.xyz',
            token: 'd317441359e505c343c2063edc97e7'
        }],
        cache: {
            key: 'alloha_ts_symmetric_fix',
            size: 1000,
            time: 1000 * 60 * 60 * 24
        },
        queue: {
            maxParallel: 12
        }
    };

    var cache = null;

    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(context, args);
            }, wait);
        };
    }

    function random(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    function getCacheKey(item) {
        return (item.original_name ? 'tv' : 'movie') + '_' + (item.id || item.kinopoisk_id || 'unknown');
    }

    function determineQuality(responseData) {
        if (!responseData || !responseData.quality) return null;
        var q = String(responseData.quality).toLowerCase();
        // Реагуємо лише на TS/TC
        if (q.indexOf('ts') !== -1 || q.indexOf('tc') !== -1) return 'TS';
        return null;
    }

    function buildApiUrl(item) {
        var apn = random(settings.apn).trim();
        var api = random(settings.api);
        var baseUrl = (apn + api.url).replace(/\s+/g, '');
        var url = baseUrl + '?token=' + api.token;
        if (item.kinopoisk_id) url += '&kp=' + encodeURIComponent(item.kinopoisk_id);
        else if (item.imdb_id) url += '&imdb=' + encodeURIComponent(item.imdb_id);
        else if (item.id) url += '&tmdb=' + encodeURIComponent(item.id);
        return url;
    }

    function Cache(storageKey, cacheSize, cacheTime) {
        var self = this;
        var storage = {};
        self.save = debounce(function () {
            if (window.Lampa && Lampa.Storage) Lampa.Storage.set(storageKey, storage);
        }, 500);
        self.init = function () {
            if (window.Lampa && Lampa.Storage) storage = Lampa.Storage.get(storageKey, {});
        };
        self.get = function (id) {
            var memory = storage[id];
            if (memory && (Date.now() - memory.timestamp < cacheTime)) return memory;
            return null;
        };
        self.set = function (id, value) {
            storage[id] = { quality: value, timestamp: Date.now() };
            var keys = Object.keys(storage);
            if (keys.length > cacheSize) delete storage[keys[0]];
            self.save();
        };
    }

    // СТИЛІ З СИМЕТРИЧНИМ ЗАОКРУГЛЕННЯМ (ЗВЕРХУ-СПРАВА ТА ЗНИЗУ-ЗЛІВА)
    function injectStyles() {
        if (document.getElementById('ts-style-symmetric')) return;
        var style = document.createElement('style');
        style.id = 'ts-style-symmetric';
        style.innerHTML = 
            '.card__quality-ts-symmetric {' +
                'position: absolute;' +
                'left: 0;' +
                'bottom: 0;' +
                'padding: 0.2em 0.45em;' + // Взято з card_style.js
                'border-radius: 0 0.75em;' + // Симетричне заокруглення: зверху-справа та знизу-зліва
                'background: rgba(231, 76, 60, 0.85);' + // Колір e74c3c
                'color: #fff;' +
                'font-weight: bold;' +
                'z-index: 5;' +
                'line-height: 1;' +
                'font-size: 1.2em;' +
            '}';
        document.head.appendChild(style);
    }

    function renderTsOnCard(html, quality) {
        if (quality !== 'TS') return;
        var $cardView = $(html).find('.card__view');
        if ($cardView.length === 0 || $cardView.find('.card__quality-ts-symmetric').length > 0) return;

        var $label = $('<div class="card__quality-ts-symmetric">TS</div>');
        $cardView.append($label);
    }

    var requestQueue = {
        queue: [],
        activeCount: 0,
        maxParallel: settings.queue.maxParallel,
        add: function (task) { this.queue.push(task); this.process(); },
        process: function () {
            if (this.activeCount >= this.maxParallel || this.queue.length === 0) return;
            var task = this.queue.shift();
            var self = this;
            this.activeCount++;
            task(function () { self.activeCount--; self.process(); });
        }
    };

    function fetchQuality(item, cacheKey, callback) {
        var url = buildApiUrl(item);
        requestQueue.add(function (complete) {
            Lampa.Network.silent(url, function (res) {
                complete();
                var quality = (res && res.status === 'success') ? determineQuality(res.data) : null;
                cache.set(cacheKey, quality);
                if (quality) callback(quality);
            }, complete);
        });
    }

    function enhanceCard(cardComponent) {
        var data = cardComponent.data;
        if (!data || !data.id) return;
        var cacheKey = getCacheKey(data);
        var cached = cache.get(cacheKey);
        if (cached) {
            if (cached.quality === 'TS') renderTsOnCard(cardComponent.html, cached.quality);
            return;
        }
        fetchQuality(data, cacheKey, function (quality) {
            renderTsOnCard(cardComponent.html, quality);
        });
    }

    // ВИДАЛЕННЯ ВСІЄЇ ІНФОРМАЦІЇ ПРО ЯКІСТЬ ВСЕРЕДИНІ
    function cleanFullView(event) {
        if (event.type !== 'complite') return;
        var $render = event.object.activity.render();
        
        // Видаляємо текст "Якість: ..."
        var qualityText = Lampa.Lang.translate('player_quality') + ':';
        $render.find('.full-start-new__details span').each(function() {
            if ($(this).text().indexOf(qualityText) === 0) {
                $(this).prev('.full-start-new__split').remove();
                $(this).remove();
            }
        });

        // Видаляємо плашки в статусній лінії (якщо вони там з'явилися)
        $render.find('.full-start__status').remove();
    }

    function start() {
        if (window.alloha_ts_symmetric_loaded) return;
        window.alloha_ts_symmetric_loaded = true;

        injectStyles();
        cache = new Cache(settings.cache.key, settings.cache.size, settings.cache.time);
        cache.init();

        var CardMaker = Lampa.Maker.map('Card');
        var originalOnVisible = CardMaker.Card.onVisible;
        CardMaker.Card.onVisible = function () {
            originalOnVisible.apply(this, arguments);
            enhanceCard(this);
        };

        // Хук для очищення внутрішньої картки
        Lampa.Listener.follow('full', cleanFullView);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();