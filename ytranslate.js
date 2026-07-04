(function () {
    'use strict';

    if (window.YTranslateLoaded) return;
    window.YTranslateLoaded = true;

    var DefaultSettings = {
        ytranslate_title: true,
        ytranslate_slogan: true,
        ytranslate_desc: true,
        ytranslate_proxies: '' // Базово пусто
    };

    // Розширені селектори для покриття більшості тем і парсерів
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
        ]
    };

    // Список бекендів для перекладу (Google пріоритетний, Lingva запасні)
    var backends = [
        {
            // Google Translate API (швидкий, стабільний, рідко дає 500)
            url: function(text) { return 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=uk&dt=t&q=' + encodeURIComponent(text); },
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
            url: function(text) { return 'https://lingva.ml/api/v1/auto/uk/' + encodeURIComponent(text); },
            parse: function(res) { return res && res.translation ? res.translation : ''; }
        },
        {
            url: function(text) { return 'https://translate.plausibility.cloud/api/v1/auto/uk/' + encodeURIComponent(text); },
            parse: function(res) { return res && res.translation ? res.translation : ''; }
        }
        {
            url: function(text) { return 'https://lingva.garudalinux.org/api/v1/auto/uk/' + encodeURIComponent(text); },
            parse: function(res) { return res && res.translation ? res.translation : ''; }
        }
        {
            url: function(text) { return 'https://translate.projectsegfau.lt/api/v1/auto/uk/' + encodeURIComponent(text); },
            parse: function(res) { return res && res.translation ? res.translation : ''; }
        }
    ];

    function getSet(key) {
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

    // Евристика: чи потрібно перекладати?
    function needsTranslation(text) {
        if (!text || typeof text !== 'string') return false;
        text = text.trim();
        
        // 1. Якщо лише цифри/знаки - не перекладаємо
        if (!/\p{L}/u.test(text)) return false;

        // 2. Якщо є іноземні літери - точно перекладаємо
        if (/[a-zA-ZыэъёЫЭЪЁ]/.test(text) || /[^\u0400-\u04FF\u0500-\u052F\s\d\p{P}]/u.test(text)) return true;

        // 3. Якщо є унікальні українські літери - це вже українська, пропускаємо
        if (/[іІїЇєЄґҐ]/.test(text)) return false;

        // 4. Пошук російських слів-маркерів, що складаються зі "спільних" літер
        var ruMarkers = /\b(что|как|это|так|для|меня|тебя|себя|его|ее|они|мы|вы|он|она|быть|сказать|очень|только|еще|нет|да)\b/i;
        if (ruMarkers.test(text)) return true;

        // 5. Дуже короткі незрозумілі слова ігноруємо
        if (text.replace(/[\s\d\p{P}]/gu, '').length <= 2) return false;

        // 6. Все інше (напр. "Один дома", "Начало") - йде на автовизначення до API
        return true;
    }

    async function doTranslate(text) {
        if (!text || !text.trim()) return text;
        
        var cacheKey = 'ytrans_' + hashStr(text);
        var cached = Lampa.Storage.get(cacheKey);
        if (cached) return cached;

        var proxiesStr = getSet('ytranslate_proxies') || '';
        var proxies = proxiesStr.split(',').map(function(p){ return p.trim(); }).filter(function(p){ return p; });
        
        var attempts = [];
        // ВАЖЛИВО: Спочатку додаємо CORS проксі (якщо користувач їх ввів)
        proxies.forEach(function(p) { attempts.push(p); });
        // В кінці завжди додаємо прямий запит як останній шанс
        attempts.push('');

        for (var b = 0; b < backends.length; b++) {
            var backend = backends[b];
            var targetUrl = backend.url(text);

            for (var a = 0; a < attempts.length; a++) {
                var proxy = attempts[a];
                var reqUrl = targetUrl;
                
                if (proxy) {
                    // Якщо проксі формату "...?url=", цільовий URL треба енкодити
                    if (proxy.endsWith('=')) {
                        reqUrl = proxy + encodeURIComponent(targetUrl);
                    } else {
                        reqUrl = proxy + targetUrl; // Стандарт для corsproxy.io/?
                    }
                }

                try {
                    var res = await $.ajax({url: reqUrl, timeout: 5000, dataType: 'json'});
                    var translatedText = backend.parse(res);
                    
                    if (translatedText && translatedText.trim()) {
                        Lampa.Storage.set(cacheKey, translatedText);
                        return translatedText;
                    }
                } catch(e) {
                    // Якщо помилка (403, 500, CORS) - просто йдемо до наступного проксі або бекенду
                }
            }
        }
        return text; 
    }

    function processElement($el, type) {
        if (!$el.length || $el.data('ytranslate-loading')) return;
        
        var isEnabled = getSet('ytranslate_' + type);
        if (!isEnabled) return;

        var origText = $el.text().trim();
        if (!origText) return;

        if ($el.data('ytranslate-orig-text') === origText) return;

        if (!needsTranslation(origText)) {
            $el.data('ytranslate-orig-text', origText); 
            return;
        }

        $el.data('ytranslate-loading', true);
        $el.data('ytranslate-orig-text', origText); 

        var loaderHTML = '<span class="ytrans-loader-dots"></span>';
        var origHtml = $el.html();
        
        $el.html(loaderHTML);

        doTranslate(origText).then(function(translatedText) {
            $el.data('ytranslate-loading', false);
            
            if (translatedText && translatedText !== origText) {
                $el.text(translatedText);
                $el.data('ytranslate-orig-text', translatedText); 
            } else {
                $el.html(origHtml); 
                $el.data('ytranslate-orig-text', origText);
            }
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
    }

    function injectCSS() {
        if (document.getElementById('ytrans-style')) return;
        var style = document.createElement('style');
        style.id = 'ytrans-style';
        style.innerHTML = `
            .ytrans-loader-dots { display: inline-block; font-weight: bold; min-width: 2em; opacity: 0.7; }
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
            field: { name: 'Очистити кеш перекладів', description: 'Видаляє всі збереженні переклади з пам\'яті' },
            onChange: function() {
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.startsWith('ytrans_')) keysToRemove.push(key);
                }
                keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
                Lampa.Noty.show('Кеш перекладів очищено (' + keysToRemove.length + ' записів)');
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
                    scanAndTranslate(activeHtml);
                }, 400);
            }
        });

        var scanTimer;
        var observer = new MutationObserver(function(mutations) {
            var shouldScan = false;
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].type === 'characterData' || mutations[i].addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }
            if (shouldScan) {
                clearTimeout(scanTimer);
                scanTimer = setTimeout(function() {
                    var activeHtml = $('.activity--active');
                    if (activeHtml.length) scanAndTranslate(activeHtml);
                }, 300);
            }
        });

        observer.observe(document.body, { 
            childList: true, subtree: true, characterData: true
        });
        
        console.log('YTranslate Plugin loaded: Primary Google Engine + CORS First enabled.');
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') init(); });

})();
