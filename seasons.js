(function () {
    'use strict';

    // ============================================================
    // ===      ЗАХИСТ ВІД ПОВТОРНОГО ЗАПУСКУ ПЛАГІНА           ===
    // ============================================================
    if (window.SeasonBadgePlugin && window.SeasonBadgePlugin.__initialized) return;

    window.SeasonBadgePlugin = window.SeasonBadgePlugin || {};
    window.SeasonBadgePlugin.__initialized = true;

    // ============================================================
    // ===  ПОЛІФІЛИ ДЛЯ СТАРИХ ANDROID TV / WEBVIEW            ===
    // ============================================================
    
    // --- [1] Promise ---
    if (typeof window.Promise === 'undefined') {
        (function () {
            function SimplePromise(executor) {
                var self = this;
                self._state = 'pending';
                self._value = undefined;
                self._handlers = [];

                function fulfill(result) {
                    if (self._state !== 'pending') return;
                    self._state = 'fulfilled';
                    self._value = result;
                    runHandlers();
                }

                function reject(err) {
                    if (self._state !== 'pending') return;
                    self._state = 'rejected';
                    self._value = err;
                    runHandlers();
                }

                function runHandlers() {
                    setTimeout(function () {
                        var handlers = self._handlers.slice();
                        self._handlers = [];
                        for (var i = 0; i < handlers.length; i++) {
                            handle(handlers[i]);
                        }
                    }, 0);
                }

                function handle(handler) {
                    if (self._state === 'pending') {
                        self._handlers.push(handler);
                        return;
                    }
                    var cb = self._state === 'fulfilled' ? handler.onFulfilled : handler.onRejected;
                    if (!cb) {
                        if (self._state === 'fulfilled') handler.resolve(self._value);
                        else handler.reject(self._value);
                        return;
                    }
                    try {
                        var ret = cb(self._value);
                        handler.resolve(ret);
                    } catch (e) {
                        handler.reject(e);
                    }
                }

                self.then = function (onFulfilled, onRejected) {
                    return new SimplePromise(function (resolve, reject) {
                        handle({
                            onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
                            onRejected: typeof onRejected === 'function' ? onRejected : null,
                            resolve: resolve,
                            reject: reject
                        });
                    });
                };

                self.catch = function (onRejected) {
                    return self.then(null, onRejected);
                };

                try {
                    executor(fulfill, reject);
                } catch (e) {
                    reject(e);
                }
            }
            window.Promise = SimplePromise;
        })();
    }

    // --- [2] requestAnimationFrame ---
    if (typeof window.requestAnimationFrame === 'undefined') {
        window.requestAnimationFrame = function (cb) {
            return setTimeout(cb, 16);
        };
    }

    // --- [3] Element.matches / Element.closest ---
    (function () {
        if (!Element.prototype.matches) {
            Element.prototype.matches =
                Element.prototype.msMatchesSelector ||
                Element.prototype.webkitMatchesSelector ||
                function (selector) {
                    var node = this;
                    var matches = (node.document || node.ownerDocument).querySelectorAll(selector);
                    var i = matches.length;
                    while (i-- > 0 && matches.item(i) !== node) { }
                    return i > -1;
                };
        }
        if (!Element.prototype.closest) {
            Element.prototype.closest = function (selector) {
                var el = this;
                while (el && el.nodeType === 1) {
                    if (el.matches(selector)) return el;
                    el = el.parentElement || el.parentNode;
                }
                return null;
            };
        }
    })();

    // --- [4] safeStorage ---
    var safeStorage = (function () {
        var memoryStore = {};
        try {
            if (typeof window.localStorage !== 'undefined') {
                var testKey = '__season_test__';
                window.localStorage.setItem(testKey, '1');
                window.localStorage.removeItem(testKey);
                return window.localStorage;
            }
        } catch (e) {}
        return {
            getItem: function (k) { return memoryStore.hasOwnProperty(k) ? memoryStore[k] : null; },
            setItem: function (k, v) { memoryStore[k] = String(v); },
            removeItem: function (k) { delete memoryStore[k]; }
        };
    })();

    // --- [5] safeFetch ---
    function safeFetch(url) {
        if (typeof window.fetch === 'function') return window.fetch(url);
        return new Promise(function (resolve, reject) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        var status = xhr.status;
                        var respText = xhr.responseText;
                        var responseObj = {
                            ok: status >= 200 && status < 300,
                            status: status,
                            json: function () {
                                return new Promise(function (res, rej) {
                                    try { res(JSON.parse(respText)); } catch (err) { rej(err); }
                                });
                            },
                            text: function () { return new Promise(function (res) { res(respText); }); }
                        };
                        if (status >= 200 && status < 300) resolve(responseObj);
                        else reject(new Error('HTTP ' + status));
                    }
                };
                xhr.onerror = function () { reject(new Error('Network error')); };
                xhr.send(null);
            } catch (err) { reject(err); }
        });
    }

    // --- [6] createObserver ---
    var NativeMutationObserver = window.MutationObserver ||
        window.WebKitMutationObserver ||
        window.MozMutationObserver;

    function createObserver(callback) {
        if (NativeMutationObserver) return new NativeMutationObserver(callback);
        return { observe: function () {}, disconnect: function () {} };
    }

    // ============================================================
    // ===  НАЛАШТУВАННЯ ПЛАГІНА                                ===
    // ============================================================
    var CONFIG = {
        tmdbApiKey: '',
        cacheTime: 23 * 60 * 60 * 1000,
        enabled: true,
        language: 'uk'
    };

    function tmdbGet(tvId, resolve, reject) {
        try {
            if (window.Lampa && Lampa.TMDB) {
                if (typeof Lampa.TMDB.tv === 'function') {
                    Lampa.TMDB.tv(tvId, function (data) { resolve(data); }, function (err) { reject(err); }, { language: CONFIG.language });
                    return;
                }
                if (typeof Lampa.TMDB.get === 'function') {
                    Lampa.TMDB.get('tv/' + tvId, { language: CONFIG.language, api_key: CONFIG.tmdbApiKey }, function (data) { resolve(data); }, function (err) { reject(err); });
                    return;
                }
            }
        } catch (e) {}

        var url = 'https://api.themoviedb.org/3/tv/' + tvId + '?api_key=' + CONFIG.tmdbApiKey + '&language=' + CONFIG.language;
        safeFetch(url).then(function (r) { return r.json(); }).then(resolve).catch(reject);
    }

    // ============================================================
    // ===  СТИЛІ                                               ===
    // ============================================================
    var style = document.createElement('style');
    style.textContent =
        ".card--season-complete, .card--season-progress { position: absolute; left: 0; margin-left: -0.65em; bottom: 0.50em; z-index: 12; width: fit-content; max-width: calc(100% - 1em); border-radius: 0.3em; overflow: hidden; opacity: 0; transition: opacity 0.22s; }\n" +
        ".card--season-complete { background-color: rgba(61, 161, 141, 0.95); }\n" +
        ".card--season-progress { background-color: rgba(255, 66, 66, 1); }\n" +
        ".card--season-complete div, .card--season-progress div { text-transform: uppercase; font-family: Roboto, Arial, sans-serif; font-weight: 700; font-size: 1.0em; padding: 0.3em 0.5em; white-space: nowrap; display: flex; align-items: center; gap: 4px; color: #fff; text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.5); }\n" +
        ".card--season-complete.show, .card--season-progress.show { opacity: 1; }\n" +
        "@media (max-width: 768px) { .card--season-complete div, .card--season-progress div { font-size: 0.85em; } }";
    document.head.appendChild(style);

    // ============================================================
    // ===  ЛОГІКА КАРТОК                                       ===
    // ============================================================
    var cache = {};
    try {
        var cacheRaw = safeStorage.getItem('seasonBadgeCache') || '{}';
        cache = JSON.parse(cacheRaw);
    } catch (e) { cache = {}; }

    function fetchSeriesData(tmdbId) {
        return new Promise(function (resolve, reject) {
            var now = (new Date()).getTime();
            if (cache[tmdbId] && (now - cache[tmdbId].timestamp < CONFIG.cacheTime)) {
                resolve(cache[tmdbId].data);
                return;
            }
            if (!CONFIG.tmdbApiKey) return reject(new Error('No API Key'));

            tmdbGet(tmdbId, function (data) {
                if (data && data.success === false) return reject(new Error('API error'));
                cache[tmdbId] = { data: data, timestamp: now };
                try { safeStorage.setItem('seasonBadgeCache', JSON.stringify(cache)); } catch (e) {}
                resolve(data);
            }, reject);
        });
    }

    function getSeasonProgress(tmdbData) {
        if (!tmdbData || !tmdbData.seasons || !tmdbData.last_episode_to_air) return false;
        var last = tmdbData.last_episode_to_air;
        var current = null;
        for (var i = 0; i < tmdbData.seasons.length; i++) {
            if (tmdbData.seasons[i].season_number === last.season_number && tmdbData.seasons[i].season_number > 0) {
                current = tmdbData.seasons[i];
                break;
            }
        }
        if (!current) return false;
        return {
            season: last.season_number,
            aired: last.episode_number || 0,
            total: current.episode_count || 0,
            isComplete: (last.episode_number || 0) >= (current.episode_count || 0)
        };
    }

    function adjustBadgePosition(cardEl, badge) {
        if (!cardEl || !badge) return;
        var quality = cardEl.querySelector('.card__quality');
        if (quality) {
            var qH = quality.offsetHeight || 0;
            var qB = 0;
            if (window.getComputedStyle) {
                var s = window.getComputedStyle(quality).bottom;
                qB = parseFloat(s) || 0;
            }
            badge.style.bottom = (qH + qB + 2) + 'px';
        } else {
            badge.style.bottom = '0.50em';
        }
    }

    function addSeasonBadge(cardEl) {
        if (!cardEl || cardEl.hasAttribute('data-season-processed')) return;
        if (!cardEl.card_data) {
            requestAnimationFrame(function () { addSeasonBadge(cardEl); });
            return;
        }
        var data = cardEl.card_data;
        var isTV = data.name || data.first_air_date || (data.number_of_seasons);
        if (!isTV) return;

        var view = cardEl.querySelector('.card__view');
        if (!view) return;

        var badge = document.createElement('div');
        badge.className = 'card--season-progress';
        badge.innerHTML = '<div>...</div>';
        view.appendChild(badge);
        adjustBadgePosition(cardEl, badge);

        cardEl.setAttribute('data-season-processed', 'loading');

        fetchSeriesData(data.id).then(function (tmdbData) {
            var prog = getSeasonProgress(tmdbData);
            if (prog) {
                badge.className = prog.isComplete ? 'card--season-complete' : 'card--season-progress';
                var text = prog.isComplete ? "S" + prog.season : "S" + prog.season + " " + prog.aired + "/" + prog.total;
                badge.innerHTML = '<div>' + text + '</div>';
                adjustBadgePosition(cardEl, badge);
                setTimeout(function () { badge.classList.add('show'); }, 50);
                cardEl.setAttribute('data-season-processed', 'done');
            } else {
                if (badge.parentNode) badge.parentNode.removeChild(badge);
            }
        }).catch(function () {
            if (badge.parentNode) badge.parentNode.removeChild(badge);
        });
    }

    // ============================================================
    // ===  СПОСТЕРЕЖЕННЯ ТА ІНІЦІАЛІЗАЦІЯ                      ===
    // ============================================================
    var mainObserver = createObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            if (m.addedNodes) {
                for (var j = 0; j < m.addedNodes.length; j++) {
                    var n = m.addedNodes[j];
                    if (n.nodeType !== 1) continue;
                    if (n.classList.contains('card')) addSeasonBadge(n);
                    else {
                        var cards = n.querySelectorAll('.card');
                        for (var k = 0; k < cards.length; k++) addSeasonBadge(cards[k]);
                    }
                }
            }
        }
    });

    function init() {
        if (!CONFIG.enabled) return;
        mainObserver.observe(document.body, { childList: true, subtree: true });
        var existing = document.querySelectorAll('.card');
        for (var i = 0; i < existing.length; i++) {
            (function(c, t){ setTimeout(function(){ addSeasonBadge(c); }, t); })(existing[i], i * 50);
        }
    }

    // ============================================================
    // ===  НАЛАШТУВАННЯ (SETTINGS)                             ===
    // ============================================================
    (function () {
        var SETTINGS_KEY = 'sbadger_settings_v1';
        var st = { tmdb_key: '' };

        function load() {
            var s = Lampa.Storage.get(SETTINGS_KEY) || {};
            st.tmdb_key = s.tmdb_key || '';
            if (st.tmdb_key) CONFIG.tmdbApiKey = st.tmdb_key;
        }

        function registerUI() {
            if (!Lampa.SettingsApi) return;
            
            Lampa.SettingsApi.addParam({
                component: 'interface',
                param: { type: 'button', component: 'sbadger' },
                field: { name: 'Мітки сезонів', description: 'Налаштування прогресу серій' },
                onChange: function () {
                    Lampa.Settings.create('sbadger', {
                        template: 'settings_sbadger',
                        onBack: function () { Lampa.Settings.create('interface'); }
                    });
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'sbadger',
                param: { name: 'sbadger_tmdb_key', type: 'input', values: '', "default": st.tmdb_key },
                field: { name: 'TMDB API ключ', description: 'Введіть ваш API ключ від TMDB' },
                onChange: function (v) {
                    st.tmdb_key = String(v || '').trim();
                    Lampa.Storage.set(SETTINGS_KEY, st);
                    CONFIG.tmdbApiKey = st.tmdb_key;
                }
            });
        }

        Lampa.Template.add('settings_sbadger', '<div></div>');
        
        function startSettings() {
            load();
            setTimeout(registerUI, 500);
        }

        if (window.appready) { startSettings(); init(); }
        else {
            try {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') { startSettings(); init(); }
                });
            } catch (e) { setTimeout(function(){ startSettings(); init(); }, 2000); }
        }
    })();

})();