(function () {
    'use strict';

    if (window.YTranslateLoaded) return;
    window.YTranslateLoaded = true;

    var DefaultSettings = {
        ytranslate_title: true,
        ytranslate_slogan: true,
        ytranslate_desc: true,
        ytranslate_proxies: '' // Базово пусто, лише прямі запити
    };

     var instances = [
        'https://lingva.ml',
        'https://translate.plausibility.cloud',
        'https://lingva.garudalinux.org',
        'https://translate.projectsegfau.lt',
    ];

    var selectors = {
        title: [
            '.full-start-new__title', '.cardify-moved-title', '.m-disp__title', 
            '.info__title', '.full-start__title', '.card__title', '.ydesign-text-title'
        ],
        slogan: [
            '.full-start__slogan', '.info__slogan', '.m-disp__slogan', '.ydesign-slogan'
        ],
        desc: [
            '.full-descr__text', '.info__desc', '.ydesign-desc-under'
        ]
    };

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

    function needsTranslation(text) {
        if (!text || typeof text !== 'string') return false;

        // 1. Якщо є специфічні російські літери - точно перекладаємо
        if (/[ыэъёЫЭЪЁ]/.test(text)) return true;

        // 2. Видаляємо ВСЮ кирилицю (і українську, і російську)
        var withoutCyrillic = text.replace(/[а-яА-ЯіІїЇєЄґҐёЁ]/g, '');
        
        // 3. Якщо після видалення кирилиці залишилися БУДЬ-ЯКІ літери 
        // (латиниця, китайські ієрогліфи, арабська в'язь, гінді тощо) - перекладаємо.
        // \p{L} з прапорцем 'u' знаходить будь-яку літеру з будь-якої мови світу.
        if (/\p{L}/u.test(withoutCyrillic)) return true;

        // 4. Інакше (це суто кирилиця без російських букв, або просто цифри/символи) - не перекладаємо.
        return false;
    }

    async function doTranslate(text) {
        if (!text || !text.trim()) return text;
        
        var cacheKey = 'ytrans_' + hashStr(text);
        var cached = Lampa.Storage.get(cacheKey);
        if (cached) return cached;

        var proxiesStr = getSet('ytranslate_proxies') || '';
        var proxies = proxiesStr.split(',').map(function(p){ return p.trim(); }).filter(function(p){ return p; });
        
        // Першим завжди йде прямий запит (''), потім ваші проксі
        var attempts = ['']; 
        proxies.forEach(function(p) { attempts.push(p); });

        for (var i = 0; i < instances.length; i++) {
            var inst = instances[i];
            
            for (var j = 0; j < attempts.length; j++) {
                var proxy = attempts[j];
                try {
                    var url = proxy ? (proxy + inst) : inst;
                    var reqUrl = url + '/api/v1/auto/uk/' + encodeURIComponent(text);
                    
                    var res = await $.ajax({url: reqUrl, timeout: 5000, dataType: 'json'});
                    if (res && res.translation) {
                        Lampa.Storage.set(cacheKey, res.translation);
                        return res.translation;
                    }
                } catch(e) {
                    // Йдемо до наступного проксі або інстансу
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

        // ДИНАМІЧНА ПЕРЕВІРКА: 
        // Якщо текст такий самий, як ми вже обробляли для цього вузла - пропускаємо.
        // Якщо Lampa підвантажила нову назву (китайську), origText зміниться і ми підемо далі!
        if ($el.data('ytranslate-orig-text') === origText) return;

        if (!needsTranslation(origText)) {
            $el.data('ytranslate-orig-text', origText); 
            return;
        }

        $el.data('ytranslate-loading', true);
        $el.data('ytranslate-orig-text', origText); // Запам'ятовуємо, щоб уникнути зациклення

        var loaderHTML = '<span class="ytrans-loader-dots"></span>';
        var origHtml = $el.html();
        
        $el.html(loaderHTML);

        doTranslate(origText).then(function(translatedText) {
            $el.data('ytranslate-loading', false);
            
            if (translatedText && translatedText !== origText) {
                $el.text(translatedText);
                // Зберігаємо перекладений текст як "оригінальний", щоб сканер його більше не чіпав
                $el.data('ytranslate-orig-text', translatedText); 
            } else {
                $el.html(origHtml); // Якщо переклад не вдався - повертаємо як було
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
        var style = document.createElement('style');
        style.innerHTML = `
            .ytrans-loader-dots {
                display: inline-block; font-weight: bold; min-width: 2em; opacity: 0.7;
            }
            .ytrans-loader-dots::after {
                content: ''; animation: ytransdots 1.5s infinite steps(4, end);
            }
            @keyframes ytransdots {
                0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: ''; }
            }
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

        // 1. Сканування карток при появі
        var CardMaker = Lampa.Maker.map('Card');
        if (CardMaker && CardMaker.Card) {
            var origOnVisible = CardMaker.Card.onVisible;
            CardMaker.Card.onVisible = function () {
                origOnVisible.apply(this, arguments);
                var el = this.html[0] || this.html;
                setTimeout(function() { scanAndTranslate($(el)); }, 150);
            };
        }

        // 2. Сканування при відкритті картки
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

        // 3. РОЗУМНИЙ OBSERVER (Ключове виправлення для китайської назви)
        // Тепер він реагує на зміну самого тексту (characterData), а не лише на появу нових div'ів
        var scanTimer;
        var observer = new MutationObserver(function(mutations) {
            var shouldScan = false;
            
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                // Якщо змінився текст або додалися нові вузли
                if (m.type === 'characterData' || m.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }
            
            if (shouldScan) {
                clearTimeout(scanTimer);
                // Чекаємо 300мс після останньої зміни (щоб Lampa встигла завантажити всі дані), і запускаємо сканер
                scanTimer = setTimeout(function() {
                    var activeHtml = $('.activity--active');
                    if (activeHtml.length) scanAndTranslate(activeHtml);
                }, 300);
            }
        });

        observer.observe(document.body, { 
            childList: true, 
            subtree: true, 
            characterData: true // ДОДАНО: слухає зміну самого тексту
        });
        
        console.log('YTranslate Plugin loaded: Smart DOM text tracking enabled.');
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') init(); });

})();