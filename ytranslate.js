(function () {
    'use strict';

    if (window.YTranslateLoaded) return;
    window.YTranslateLoaded = true;

    var DefaultSettings = {
        ytranslate_title: true,
        ytranslate_slogan: true,
        ytranslate_desc: true,
        ytranslate_ydes_title: true,
        ytranslate_proxies: ''
    };

    // Розширені селектори для покриття більшості тем і парсерів Lampa
    var selectors = {
        title: [
            '.full-start-new__title', '.cardify-moved-title', '.m-disp__title', 
            '.info__title', '.full-start__title', '.card__title', '.ydesign-text-title',
            '.full-start__name', '.full-start-new__name', '.torrent-item__title', '.torrent-item__name'
        ],
        slogan: [
            '.full-start__slogan', '.info__slogan', '.m-disp__slogan', '.ydesign-slogan',
            '.full-start-new__slogan', '.full-start__original-title'
        ],
        desc: [
            '.full-descr__text', '.info__desc', '.ydesign-desc-under',
            '.full-start__desc', '.full-start-new__desc', '.full-start__text'
        ],
        ydes_title: [
            '.ydesign-add-title' // Селектор для додаткових назв від YDesign
        ]
    };

    // Ієрархія відкритих швидких бекендів (від найкращого до резервних)
    var backends = [
        {
            id: 'google_chrome',
            name: 'Google Chrome API',
            url: function(text) {
                return 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=uk&q=' + encodeURIComponent(text);
            },
            type: 'GET',
            parse: function(res) {
                if (Array.isArray(res)) {
                    if (Array.isArray(res[0]) && typeof res[0][0] === 'string') {
                        return res.map(function(item) { return Array.isArray(item) ? item[0] : item; }).join('');
                    }
                    if (typeof res[0] === 'string') return res[0];
                }
                return typeof res === 'string' ? res : '';
            }
        },
        {
            id: 'google_gtx',
            name: 'Google GTX API',
            url: function(text) {
                return 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=uk&dt=t&q=' + encodeURIComponent(text);
            },
            type: 'GET',
            parse: function(res) {
                var trans = '';
                if (res && res[0] && Array.isArray(res[0])) {
                    res[0].forEach(function(item) {
                        if (item && item[0]) trans += item[0];
                    });
                }
                return trans;
            }
        },
        {
            id: 'mymemory',
            name: 'MyMemory Open API',
            url: function(text) {
                var isCyrillic = /[\u0400-\u04FF]/.test(text);
                var lang = isCyrillic ? 'ru' : 'en';
                return 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + lang + '|uk';
            },
            type: 'GET',
            parse: function(res) {
                return (res && res.responseData && res.responseData.translatedText) ? res.responseData.translatedText : '';
            }
        },
        {
            id: 'simply',
            name: 'SimplyTranslate',
            url: function(text) {
                return 'https://simplytranslate.org/api/translate/?engine=google&from=auto&to=uk&text=' + encodeURIComponent(text);
            },
            type: 'GET',
            parse: function(res) {
                return (res && res.translated_text) ? res.translated_text : '';
            }
        },
        {
            id: 'libre',
            name: 'Disroot LibreTranslate',
            url: function() {
                return 'https://translate.disroot.org/translate';
            },
            type: 'POST',
            contentType: 'application/json',
            body: function(text) {
                return JSON.stringify({ q: text, source: 'auto', target: 'uk', format: 'text' });
            },
            parse: function(res) {
                return (res && res.translatedText) ? res.translatedText : '';
            }
        }
    ];

    // L1 Швидкий кеш у пам'яті + дедуплікація + кулдаун збійних рушіїв
    var memoryCache = new Map();
    var inFlightPromises = new Map();
    var engineFailures = new Map(); // id -> timestamp

    function getSet(key) {
        if (!window.Lampa || !Lampa.Storage) return DefaultSettings[key];
        var val = Lampa.Storage.get(key);
        if (val !== null && val !== undefined && val !== '') return val;
        return DefaultSettings[key];
    }

    function hashStr(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    // Перевірка чи текст уже українською мовою
    function isUkrainian(text) {
        if (!text || typeof text !== 'string') return false;
        text = text.trim();

        // 1. Якщо є латиниця — це іноземна мова
        if (/[a-zA-Z]/.test(text)) return false;

        // 2. Якщо є суто російські літери — це не українська
        if (/[ыэъёЫЭЪЁ]/.test(text)) return false;

        // 3. Пошук російських слів-маркерів
        var ruWords = /\b(что|как|это|этот|эта|эти|этого|для|меня|тебя|себя|его|ее|её|их|они|мы|вы|он|она|оно|быть|был|была|были|будет|будут|сказать|очень|только|еще|ещё|нет|да|сериал|фильм|сезон|серии|серия|озвучка|смотреть|вместе|когда|почему|зачем|потому|если|тоже|также|после|всегда|никогда|сейчас|потом|опять|снова|здесь|тут|там|где|куда|откуда)\b/i;
        if (ruWords.test(text)) return false;

        // 4. Наявність унікальних українських літер (і, ї, є, ґ)
        if (/[іІїЇєЄґҐ]/.test(text)) return true;

        // 5. Український апостроф усередині кириличного слова (напр. м'ясо, зв'язок, сім'я)
        if (/[\u0400-\u04FF]['’ʼ][\u0400-\u04FF]/.test(text)) return true;

        // 6. Характерні українські слова, сполучники та прийменники
        var ukWords = /\b(та|або|чи|але|про|для|від|до|на|під|над|перед|через|після|що|як|це|цей|ця|ці|той|та|те|ті|хто|чий|який|яка|яке|які|дуже|ще|вже|теж|також|лише|тільки|навіть|разом|сьогодні|зараз|тоді|потім|знову|завжди|ніколи|сезони|серій|серії|серія|мультфільм|року|році|років|сюжет|опис|хтось|щось|якийсь|десь|колись|чомусь|ніби|немов|неначе|мовби|усі|всі|їхній|наш|ваш|багато|мало)\b/i;
        if (ukWords.test(text)) return true;

        return false;
    }

    // Евристика: чи потрібно надсилати на переклад?
    function needsTranslation(text) {
        if (!text || typeof text !== 'string') return false;
        text = text.trim();
        
        // Лише цифри/знаки/пунктуація — не перекладаємо
        if (!/\p{L}/u.test(text)) return false;

        // 1-2 літери без сенсу — ігноруємо
        if (text.replace(/[\s\d\p{P}]/gu, '').length <= 1) return false;

        // Якщо це вже українська — блокуємо відправку в API
        if (isUkrainian(text)) return false;

        return true;
    }

    // Отримання списку рушіїв з урахуванням тимчасового кулдауну збійних
    function getSortedBackends() {
        var now = Date.now();
        var active = [];
        var cooled = [];
        for (var i = 0; i < backends.length; i++) {
            var b = backends[i];
            var failTime = engineFailures.get(b.id) || 0;
            if (now - failTime < 60000) { // кулдаун 60 сек
                cooled.push(b);
            } else {
                active.push(b);
            }
        }
        return active.concat(cooled);
    }

    async function sendRequest(backend, text, proxyUrl) {
        var targetUrl = backend.url(text);
        var reqUrl = targetUrl;
        
        if (proxyUrl) {
            if (proxyUrl.endsWith('=')) {
                reqUrl = proxyUrl + encodeURIComponent(targetUrl);
            } else {
                reqUrl = proxyUrl + targetUrl;
            }
        }

        var ajaxOptions = {
            url: reqUrl,
            type: backend.type || 'GET',
            timeout: 2500, // Швидкий таймаут 2.5с для миттєвого перемикання на резерв
            dataType: 'json'
        };

        if (backend.type === 'POST' && backend.body) {
            ajaxOptions.data = backend.body(text);
            if (backend.contentType) ajaxOptions.contentType = backend.contentType;
        }

        return new Promise(function(resolve, reject) {
            if (window.$ && $.ajax) {
                $.ajax(ajaxOptions).done(resolve).fail(reject);
            } else {
                var fetchOpts = {
                    method: ajaxOptions.type,
                    headers: {}
                };
                if (ajaxOptions.contentType) fetchOpts.headers['Content-Type'] = ajaxOptions.contentType;
                if (ajaxOptions.data) fetchOpts.body = ajaxOptions.data;

                var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (controller) {
                    fetchOpts.signal = controller.signal;
                    setTimeout(function() { controller.abort(); }, 2500);
                }

                fetch(reqUrl, fetchOpts)
                    .then(function(r) {
                        if (!r.ok) throw new Error('HTTP ' + r.status);
                        return r.json();
                    })
                    .then(resolve)
                    .catch(reject);
            }
        });
    }

    async function doTranslate(text) {
        if (!text || !text.trim()) return text;
        text = text.trim();

        // 1. Швидкий L1 кеш у RAM (0ms)
        if (memoryCache.has(text)) {
            return memoryCache.get(text);
        }

        // 2. Постійний L2 кеш у Lampa.Storage
        var cacheKey = 'ytrans_' + hashStr(text);
        var cached = (window.Lampa && Lampa.Storage) ? Lampa.Storage.get(cacheKey) : null;
        if (cached) {
            memoryCache.set(text, cached);
            return cached;
        }

        // 3. Дедуплікація однакових паралельних запитів
        if (inFlightPromises.has(text)) {
            return inFlightPromises.get(text);
        }

        var translatePromise = (async function() {
            var proxiesStr = getSet('ytranslate_proxies') || '';
            var userProxies = proxiesStr.split(',').map(function(p){ return p.trim(); }).filter(function(p){ return p; });
            
            // Прямий запит першим, потім резервні проксі користувача
            var attempts = [''];
            userProxies.forEach(function(p) { attempts.push(p); });

            var activeBackends = getSortedBackends();

            for (var b = 0; b < activeBackends.length; b++) {
                var backend = activeBackends[b];

                for (var a = 0; a < attempts.length; a++) {
                    var proxy = attempts[a];

                    try {
                        var res = await sendRequest(backend, text, proxy);
                        var translatedText = backend.parse(res);
                        
                        if (translatedText && typeof translatedText === 'string' && translatedText.trim()) {
                            var cleanResult = translatedText.trim();
                            
                            // Зберігаємо в кеш RAM та Storage
                            memoryCache.set(text, cleanResult);
                            if (window.Lampa && Lampa.Storage) {
                                Lampa.Storage.set(cacheKey, cleanResult);
                            }
                            return cleanResult;
                        }
                    } catch(e) {
                        // Якщо прямий запит до цього бекенду зазнав невдачі — записуємо час збою
                        if (!proxy) {
                            engineFailures.set(backend.id, Date.now());
                        }
                    }
                }
            }

            // Якщо всі бекенди не відповіли — повертаємо оригінал та кешуємо в RAM
            memoryCache.set(text, text);
            return text;
        })();

        inFlightPromises.set(text, translatePromise);
        try {
            var result = await translatePromise;
            return result;
        } finally {
            inFlightPromises.delete(text);
        }
    }

    function processElement($el, type) {
        // Блокування для елементів Vinyl
        if ($el.closest('.card--vinyl, .vinyl-main, .vinyl-full, .vinyl-start, .vinyl-descr, .vinyl-line, .vinyl-all-grid, .vinyl-search-line, .vinyl-track').length > 0) {
            return;
        }

        if (!$el.length || $el.data('ytranslate-loading')) return;
        
        var isEnabled = getSet('ytranslate_' + type);
        if (!isEnabled) return;

        var origText = $el.text().trim();
        if (!origText) return;

        // Якщо елемент уже оброблений цим самим текстом — пропускаємо
        if ($el.attr('data-ytrans-done') === '1' && $el.data('ytranslate-orig-text') === origText) {
            return;
        }

        if (!needsTranslation(origText)) {
            $el.attr('data-ytrans-done', '1');
            $el.data('ytranslate-orig-text', origText); 
            return;
        }

        $el.data('ytranslate-loading', true);
        $el.data('ytranslate-orig-text', origText);
        $el.addClass('ytrans-loading');

        doTranslate(origText).then(function(translatedText) {
            $el.data('ytranslate-loading', false);
            $el.removeClass('ytrans-loading');
            $el.attr('data-ytrans-done', '1');
            
            if (translatedText && translatedText !== origText) {
                $el.text(translatedText);
                $el.data('ytranslate-orig-text', translatedText); 
            } else {
                $el.data('ytranslate-orig-text', origText);
            }
        }).catch(function() {
            $el.data('ytranslate-loading', false);
            $el.removeClass('ytrans-loading');
            $el.attr('data-ytrans-done', '1');
        });
    }

    function scanAndTranslate(context) {
        if (!context || !context.find) return;

        selectors.title.forEach(function(sel) {
            context.find(sel).each(function() { processElement($(this), 'title'); });
        });
        selectors.slogan.forEach(function(sel) {
            context.find(sel).each(function() { processElement($(this), 'slogan'); });
        });
        selectors.desc.forEach(function(sel) {
            context.find(sel).each(function() { processElement($(this), 'desc'); });
        });
        if (selectors.ydes_title) {
            selectors.ydes_title.forEach(function(sel) {
                context.find(sel).each(function() { processElement($(this), 'ydes_title'); });
            });
        }
    }

    function injectCSS() {
        if (document.getElementById('ytrans-style')) return;
        var style = document.createElement('style');
        style.id = 'ytrans-style';
        style.innerHTML = `
            .ytrans-loading { opacity: 0.85; transition: opacity 0.2s ease-in-out; }
            .ytrans-loader-dots { display: inline-block; font-weight: bold; min-width: 1.5em; opacity: 0.7; }
            .ytrans-loader-dots::after { content: ''; animation: ytransdots 1.5s infinite steps(4, end); }
            @keyframes ytransdots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: ''; } }
        `;
        document.head.appendChild(style);
    }

    function createSettings() {
        if (!window.Lampa || !Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'ytranslate',
            name: 'YTranslate',
            icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6"></path><path d="M4 14l6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="M22 22l-5-10-5 10"></path><path d="M14 18h6"></path></svg>`
        });

        Lampa.SettingsApi.addParam({
            component: 'ytranslate',
            param: { name: 'ytranslate_title', type: 'trigger', default: DefaultSettings.ytranslate_title },
            field: { name: 'Перекладати Назву', description: 'Переклад назв на картках та всередині сторінки' }
        });

        Lampa.SettingsApi.addParam({
            component: 'ytranslate',
            param: { name: 'ytranslate_ydes_title', type: 'trigger', default: DefaultSettings.ytranslate_ydes_title },
            field: { name: 'Перекладати додаткові назви YDes', description: 'Переклад додаткових назв під логотипами, що формує YDesign' }
        });

        Lampa.SettingsApi.addParam({
            component: 'ytranslate',
            param: { name: 'ytranslate_slogan', type: 'trigger', default: DefaultSettings.ytranslate_slogan },
            field: { name: 'Перекладати Слоган' }
        });

        Lampa.SettingsApi.addParam({
            component: 'ytranslate',
            param: { name: 'ytranslate_desc', type: 'trigger', default: DefaultSettings.ytranslate_desc },
            field: { name: 'Перекладати Опис' }
        });

        Lampa.SettingsApi.addParam({
            component: 'ytranslate',
            param: { name: 'ytranslate_proxies_btn', type: 'button' },
            field: { name: 'Додаткові CORS Проксі', description: getSet('ytranslate_proxies') ? 'Встановлено' : 'Не встановлено (тільки прямі запити)' },
            onChange: function() {
                Lampa.Input.edit({ 
                    title: 'Введіть через кому (напр. https://corsproxy.io/? )', 
                    value: getSet('ytranslate_proxies'), 
                    free: true, nosave: true 
                }, function (new_val) {
                    if (new_val !== undefined) { 
                        Lampa.Storage.set('ytranslate_proxies', new_val.trim()); 
                        Lampa.Settings.update(); 
                    }
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'ytranslate',
            param: { name: 'ytranslate_clear_cache', type: 'button' },
            field: { name: 'Очистити кеш перекладів', description: 'Видаляє всі збережені переклади з пам\'яті' },
            onChange: function() {
                memoryCache.clear();
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.startsWith('ytrans_')) keysToRemove.push(key);
                }
                keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
                if (window.Lampa && Lampa.Noty) {
                    Lampa.Noty.show('Кеш перекладів очищено (' + keysToRemove.length + ' записів)');
                }
            }
        });
    }

    function init() {
        createSettings();
        injectCSS();

        var CardMaker = Lampa.Maker.map('Card');
        if (CardMaker && CardMaker.Card) {
            var origOnVisible = CardMaker.Card.onVisible;
            CardMaker.Card.onVisible = function () {
                origOnVisible.apply(this, arguments);
                var el = this.html[0] || this.html;
                setTimeout(function() { scanAndTranslate($(el)); }, 150);
            };
        }

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'build') {
                var html = e.html || (e.object && e.object.render ? e.object.render() : null);
                if (html) scanAndTranslate(html);

                setTimeout(function() {
                    var activeHtml = $('.activity--active');
                    if (activeHtml.length) scanAndTranslate(activeHtml);
                }, 350);
            }
        });

        var scanTimer;
        var observer = new MutationObserver(function(mutations) {
            var shouldScan = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.target && m.target.classList && m.target.classList.contains('ytrans-loading')) continue;
                if (m.addedNodes && m.addedNodes.length > 0) {
                    for (var j = 0; j < m.addedNodes.length; j++) {
                        var node = m.addedNodes[j];
                        if (node.nodeType === 1) {
                            if (node.classList && node.classList.contains('ytrans-loading')) continue;
                            shouldScan = true;
                            break;
                        }
                    }
                } else if (m.type === 'characterData') {
                    var p = m.target ? m.target.parentElement : null;
                    if (p && !p.classList.contains('ytrans-loading') && !p.hasAttribute('data-ytrans-done')) {
                        shouldScan = true;
                    }
                }
                if (shouldScan) break;
            }
            if (shouldScan) {
                clearTimeout(scanTimer);
                scanTimer = setTimeout(function() {
                    var activeHtml = $('.activity--active');
                    if (activeHtml.length) scanAndTranslate(activeHtml);
                }, 350);
            }
        });

        observer.observe(document.body, { 
            childList: true, subtree: true, characterData: true
        });
        
        console.log('YTranslate Plugin loaded: Fully Automated Multi-Engine Translation enabled.');
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') init(); });

})();
