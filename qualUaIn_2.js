(function () {
    'use strict';

    // Polyfill for AbortController and AbortSignal (для сумісності зі старими браузерами/TV)
    if (typeof AbortController === 'undefined') {
        window.AbortController = function () {
            this.signal = {
                aborted: false,
                addEventListener: function (event, callback) {
                    if (event === 'abort') {
                        this._onabort = callback;
                    }
                }
            };
            this.abort = function () {
                this.signal.aborted = true;
                if (typeof this.signal._onabort === 'function') {
                    this.signal._onabort();
                }
            };
        };
    }

    // Polyfill for performance.now
    if (!window.performance || !window.performance.now) {
        window.performance = window.performance || {};
        window.performance.now = function () {
            return new Date().getTime();
        };
    }

    // Polyfill for String.prototype.padStart
    if (!String.prototype.padStart) {
        String.prototype.padStart = function (targetLength, padString) {
            targetLength = targetLength >> 0; // Convert to integer
            padString = String(padString || ' ');
            if (this.length >= targetLength) {
                return String(this);
            }
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(Math.ceil(targetLength / padString.length));
            }
            return padString.slice(0, targetLength) + String(this);
        };
    }

    // --- НАЛАШТУВАННЯ ---
    var ENABLE_LOGGING = true; // Логування в консоль
    var Q_CACHE_TIME = 72 * 60 * 60 * 1000; // Час життя кешу (72 години)
    var QUALITY_CACHE = 'surs_quality_cache';
    var JACRED_PROTOCOL = 'https://';
    var JACRED_URL = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz'; // Адреса JacRed
    var PROXY_LIST = [
        'http://api.allorigins.win/raw?url=',
        'http://cors.bwa.workers.dev/'
    ];
    var PROXY_TIMEOUT = 8000; // Таймаут проксі (збільшено для надійності)

    // Об'єкт для логування
    var SURS_QUALITY = {
        log: function (message) {
            if (ENABLE_LOGGING && typeof console !== 'undefined' && console.log) {
                console.log("[SURS_QUALITY_UA_MAX] ", message);
            }
        }
    };

    // Форматування часу для логів
    function formatTime() {
        var now = new Date();
        var hours = now.getHours().toString().padStart(2, '0');
        var minutes = now.getMinutes().toString().padStart(2, '0');
        var seconds = now.getSeconds().toString().padStart(2, '0');
        return hours + ':' + minutes + ':' + seconds;
    }

    // Логування виконання функцій
    function logExecution(functionName, startTime, additionalInfo) {
        var elapsed = (performance.now() - startTime).toFixed(2);
        var logMessage = functionName + ' час: ' + formatTime() + ' (' + elapsed + ' мс)';
        if (additionalInfo) {
            logMessage += ' | Інфо: ' + additionalInfo;
        }
        SURS_QUALITY.log(logMessage);
    }

    // SVG Прапор України (переданий користувачем)
    var UA_FLAG_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="width: 1.4em; height: 1.4em; vertical-align: middle; margin-right: 4px;"><path d="M31,8c0-2.209-1.791-4-4-4H5c-2.209,0-4,1.791-4,4v9H31V8Z" fill="#2455b2"></path><path d="M5,28H27c2.209,0,4-1.791,4-4v-8H1v8c0,2.209,1.791,4,4,4Z" fill="#f9da49"></path><path d="M5,28H27c2.209,0,4-1.791,4-4V8c0-2.209-1.791-4-4-4H5c-2.209,0-4,1.791-4,4V24c0,2.209,1.791,4,4,4ZM2,8c0-1.654,1.346-3,3-3H27c1.654,0,3,1.346,3,3V24c0,1.654-1.346,3-3,3H5c-1.654,0-3-1.346-3-3V8Z" opacity=".15"></path><path d="M27,5H5c-1.657,0-3,1.343-3,3v1c0-1.657,1.343-3,3-3H27c1.657,0,3,1.343,3,3v-1c0-1.657-1.343-3-3-3Z" fill="#fff" opacity=".2"></path></svg>';

    // --- CSS СТИЛІ ---
    var style = document.createElement('style');
    style.textContent = [
        '.full-start__status.surs_quality {',
        '    padding: 0.3em 0.6em;',
        '    border-radius: 4px;',
        '    font-weight: bold;',
        '    color: #fff;',
        '    text-shadow: 1px 1px 1px rgba(0,0,0,0.3);',
        '    margin-left: 0.5em;',
        '    display: inline-flex;',
        '    align-items: center;',
        '    gap: 0.2em;',
        '    line-height: 1;',
        '}',
        /* 4K - Смарагдовий */
        '.surs_quality.q_4k {',
        '    background-color: #50c878;',
        '}',
        /* 1080 - Синій */
        '.surs_quality.q_1080 {',
        '    background-color: #007bff;',
        '}',
        /* 720 - Жовтий (текст темний) */
        '.surs_quality.q_720 {',
        '    background-color: #ffc107;',
        '    color: #000;',
        '    text-shadow: none;',
        '}',
        /* SD - Сірий */
        '.surs_quality.q_sd {',
        '    background-color: #6c757d;',
        '}',
        /* TS/CamRip - Червоний */
        '.surs_quality.q_cam {',
        '    background-color: #dc3545;',
        '}',
        /* No UA - Прозорий */
        '.surs_quality.q_none {',
        '    background-color: transparent;',
        '    color: #aaa;',
        '    padding: 0;',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    // Функція для роботи з проксі (мережеві запити)
    function fetchWithProxy(url, cardId, callback) {
        var startTime = performance.now();
        var currentProxyIndex = 0;
        var callbackCalled = false;
        var controller = new AbortController();
        var signal = controller.signal;

        function tryNextProxy() {
            if (currentProxyIndex >= PROXY_LIST.length) {
                if (!callbackCalled) {
                    callbackCalled = true;
                    callback(new Error('Всі проксі вичерпані для ' + url));
                    logExecution('fetchWithProxy', startTime, 'card: ' + cardId + ', Помилка всіх проксі');
                }
                return;
            }
            var proxyUrl = PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);
            SURS_QUALITY.log('card: ' + cardId + ', Проксі: ' + proxyUrl);
            var timeoutId = setTimeout(function () {
                controller.abort();
                if (!callbackCalled) {
                    SURS_QUALITY.log('card: ' + cardId + ', Таймаут проксі');
                    currentProxyIndex++;
                    tryNextProxy();
                }
            }, PROXY_TIMEOUT);
            fetch(proxyUrl, { signal: signal })
                .then(function (response) {
                    clearTimeout(timeoutId);
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.text();
                })
                .then(function (data) {
                    if (!callbackCalled) {
                        callbackCalled = true;
                        clearTimeout(timeoutId);
                        callback(null, data);
                        logExecution('fetchWithProxy', startTime, 'card: ' + cardId + ', Успіх через проксі');
                    }
                })
                .catch(function (error) {
                    clearTimeout(timeoutId);
                    SURS_QUALITY.log('card: ' + cardId + ', Помилка проксі: ' + error.message);
                    if (!callbackCalled) {
                        currentProxyIndex++;
                        tryNextProxy();
                    }
                });
        }

        SURS_QUALITY.log('card: ' + cardId + ', Прямий запит: ' + url);
        var directTimeoutId = setTimeout(function () {
            controller.abort();
            if (!callbackCalled) {
                SURS_QUALITY.log('card: ' + cardId + ', Таймаут прямого запиту -> Проксі');
                tryNextProxy();
            }
        }, PROXY_TIMEOUT);

        fetch(url, { signal: signal })
            .then(function (response) {
                clearTimeout(directTimeoutId);
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.text();
            })
            .then(function (data) {
                if (!callbackCalled) {
                    callbackCalled = true;
                    clearTimeout(directTimeoutId);
                    callback(null, data);
                    logExecution('fetchWithProxy', startTime, 'card: ' + cardId + ', Успіх прямого запиту');
                }
            })
            .catch(function (error) {
                clearTimeout(directTimeoutId);
                SURS_QUALITY.log('card: ' + cardId + ', Помилка прямого запиту: ' + error.message);
                if (!callbackCalled) {
                    SURS_QUALITY.log('card: ' + cardId + ', Перехід на проксі');
                    tryNextProxy();
                }
            });
    }

    // --- ЛОГІКА ПОШУКУ ТА ФІЛЬТРАЦІЇ ---
    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
        var startTime = performance.now();
        if (!JACRED_URL) {
            callback(null);
            return;
        }

        // Клас CSS на основі якості
        function getQualityClass(quality, isCamrip) {
            if (isCamrip) return 'q_cam';
            if (quality >= 2160) return 'q_4k';
            if (quality >= 1080) return 'q_1080';
            if (quality >= 720) return 'q_720';
            return 'q_sd';
        }

        // Текст якості
        function translateQualityText(quality, isCamrip) {
            if (isCamrip) return 'CAM/TS';
            if (quality >= 2160) return '4K';
            if (quality >= 1080) return '1080p';
            if (quality >= 720) return '720p';
            if (quality > 0) return 'SD';
            return 'SD';
        }

        var year = '';
        var dateStr = normalizedCard.release_date || '';
        if (dateStr.length >= 4) {
            year = dateStr.substring(0, 4);
        }
        if (!year || isNaN(year)) {
            SURS_QUALITY.log('card: ' + cardId + ', Немає року');
            callback(null);
            return;
        }

        function searchJacredApi(searchTitle, searchYear, exactMatch, strategyName, apiCallback) {
            var apiStartTime = performance.now();
            var apiUrl = JACRED_PROTOCOL + JACRED_URL + '/api/v1.0/torrents?search=' +
                encodeURIComponent(searchTitle) +
                '&year=' + searchYear +
                (exactMatch ? '&exact=true' : '');

            fetchWithProxy(apiUrl, cardId, function (error, responseText) {
                if (error || !responseText) {
                    apiCallback(null);
                    return;
                }
                try {
                    var torrents = JSON.parse(responseText);
                    if (!Array.isArray(torrents) || torrents.length === 0) {
                        apiCallback(null);
                        return;
                    }

                    // --- ОНОВЛЕНА ЛОГІКА ПОШУКУ UA ---
                    var ukrCandidates = [];

                    // Розширений Regex:
                    // Шукає: ukr, ua, ukrainian, ukrain, укр, українська, toloka, mazepa, hurtom
                    // Враховує роздільники: пробіли, крапки, слеші (ua/en), дужки тощо.
                    // (?:^|[\s\.\-\/\(\[]) - початок рядка або роздільник перед словом
                    // (ukr|ua|...) - ключові слова
                    // (?:$|[\s\.\-\/\)\]]) - кінець рядка або роздільник після слова
                    var softUaRegex = /(?:^|[\s\.\-\/\(\[])(ukr|ua|ukrainian|ukrain|укр|україн|toloka|mazepa|hurtom)(?:$|[\s\.\-\/\)\]])/i;
                    
                    // Regex для специфічних трекерів (окрема перевірка)
                    var trackerRegex = /(toloka|mazepa|hurtom)/i;

                    for (var i = 0; i < torrents.length; i++) {
                        var currentTorrent = torrents[i];
                        
                        // Формуємо повний рядок для пошуку
                        var searchString = (currentTorrent.title || '') + ' ' + 
                                           (currentTorrent.name || '') + ' ' + 
                                           (currentTorrent.details || '') + ' ' +
                                           (currentTorrent.tracker || ''); // Якщо API поверне трекер

                        // Додаємо весь об'єкт текстом для надійності
                        try {
                             searchString += ' ' + JSON.stringify(currentTorrent);
                        } catch(e) {}
                        
                        searchString = searchString.toLowerCase();

                        // 1. Перевірка на "наші" трекери (гарантовано UA)
                        var isTrackerMatch = trackerRegex.test(searchString);
                        
                        // 2. Перевірка на мовні теги
                        var isLangMatch = softUaRegex.test(searchString);

                        // Якщо знайдено хоч щось
                        if (isTrackerMatch || isLangMatch) {
                            var titleLower = (currentTorrent.title || '').toLowerCase();
                            var isCam = /\b(ts|telesync|camrip|cam|TC|звук с TS)\b/i.test(titleLower);
                            var qVal = currentTorrent.quality || 0;
                            
                            ukrCandidates.push({
                                qualityVal: qVal,
                                isCamrip: isCam,
                                title: currentTorrent.title,
                                seeds: parseInt(currentTorrent.seeders || 0) // Просто для інфо
                            });
                        }
                    }

                    if (ukrCandidates.length > 0) {
                        // Сортуємо:
                        // 1. Пріоритет нормальній якості (не CamRip)
                        // 2. Максимальна роздільна здатність
                        ukrCandidates.sort(function(a, b) {
                            if (a.isCamrip !== b.isCamrip) {
                                return a.isCamrip ? 1 : -1; // Camrip в кінець
                            }
                            return b.qualityVal - a.qualityVal; // Більше число якості вище
                        });

                        var best = ukrCandidates[0];
                        
                        var textQuality = translateQualityText(best.qualityVal, best.isCamrip);
                        var cssClass = getQualityClass(best.qualityVal, best.isCamrip);

                        SURS_QUALITY.log('card: ' + cardId + ', Знайдено UA: ' + best.title + ' (' + textQuality + ')');
                        
                        apiCallback({
                            qualityText: textQuality,
                            cssClass: cssClass,
                            foundUkr: true
                        });
                    } else {
                        SURS_QUALITY.log('card: ' + cardId + ', UA не знайдено в ' + strategyName);
                        apiCallback(null); 
                    }

                } catch (e) {
                    SURS_QUALITY.log('card: ' + cardId + ', Помилка JSON: ' + e.message);
                    apiCallback(null);
                }
            });
        }

        var searchStrategies = [];
        if (normalizedCard.original_title && /[a-zа-яё0-9]/i.test(normalizedCard.original_title)) {
            searchStrategies.push({
                title: normalizedCard.original_title.trim(),
                year: year,
                exact: true,
                name: 'OriginalTitle'
            });
        }
        if (normalizedCard.title && /[a-zа-яё0-9]/i.test(normalizedCard.title)) {
            searchStrategies.push({
                title: normalizedCard.title.trim(),
                year: year,
                exact: true,
                name: 'Title'
            });
        }

        function executeNextStrategy(index) {
            if (index >= searchStrategies.length) {
                // Якщо нічого не знайшли після всіх спроб
                callback({ foundUkr: false });
                return;
            }
            var strategy = searchStrategies[index];
            SURS_QUALITY.log('card: ' + cardId + ', Стратегія: ' + strategy.name);
            searchJacredApi(strategy.title, strategy.year, strategy.exact, strategy.name, function (result) {
                if (result !== null && result.foundUkr) {
                    callback(result);
                } else {
                    executeNextStrategy(index + 1);
                }
            });
        }

        if (searchStrategies.length > 0) {
            executeNextStrategy(0);
        } else {
            callback(null);
        }
    }

    // --- РОБОТА З КЕШЕМ ---
    function getQualityCache(key) {
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};
        var item = cache[key];
        return item && (Date.now() - item.timestamp < Q_CACHE_TIME) ? item : null;
    }

    function saveQualityCache(key, data, localCurrentCard) {
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};
        // Очищення старого кешу
        for (var cacheKey in cache) {
            if (cache.hasOwnProperty(cacheKey)) {
                if (Date.now() - cache[cacheKey].timestamp >= Q_CACHE_TIME) {
                    delete cache[cacheKey];
                }
            }
        }
        cache[key] = {
            qualityText: data.qualityText,
            cssClass: data.cssClass,
            foundUkr: data.foundUkr,
            timestamp: Date.now()
        };
        Lampa.Storage.set(QUALITY_CACHE, cache);
        SURS_QUALITY.log('card: ' + localCurrentCard + ', Кеш збережено: ' + key);
    }

    // Очищення елементів
    function clearQualityElements(render) {
        if (render) {
            $('.full-start__status.surs_quality', render).remove();
        }
    }

    // Плейсхолдер (поки вантажиться)
    function showQualityPlaceholder(render) {
        if (!render) return;
        var rateLine = $('.full-start-new__rate-line', render);
        
        // Видаляємо старі, якщо є
        $('.full-start__status.surs_quality', render).remove();

        if (rateLine.length) {
            var placeholder = document.createElement('div');
            placeholder.className = 'full-start__status surs_quality';
            placeholder.textContent = '...';
            placeholder.style.opacity = '0.7';
            placeholder.style.backgroundColor = '#444'; 
            rateLine.append(placeholder);
        }
    }

    // --- ВІДОБРАЖЕННЯ (РЕНДЕР) ---
    function updateQualityElement(data, localCurrentCard, render) {
        if (!render) return;
        
        var rateLine = $('.full-start-new__rate-line', render);
        // Якщо rateLine ще не існує (рідкісний випадок), нічого не робимо
        if (!rateLine.length) return;

        // Шукаємо наш елемент або створюємо новий
        var element = $('.full-start__status.surs_quality', render);
        if (!element.length) {
            var div = document.createElement('div');
            div.className = 'full-start__status surs_quality';
            rateLine.append(div);
            element = $(div);
        }

        var className = 'full-start__status surs_quality';
        var htmlContent = '';

        if (data.foundUkr) {
            // Вставляємо SVG прапор + текст якості
            htmlContent = UA_FLAG_SVG + '<span>' + data.qualityText + '</span>';
            className += ' ' + data.cssClass;
        } else {
            // Не знайдено
            htmlContent = '<span>🚫</span>';
            className += ' q_none';
        }

        element.attr('class', className);
        element.html(htmlContent); // Використовуємо .html() для вставки SVG
        element.css('opacity', '1');
        
        SURS_QUALITY.log('card: ' + localCurrentCard + ', Елемент оновлено');
    }

    // Запит якості
    function fetchQualitySequentially(normalizedCard, localCurrentCard, qCacheKey, render) {
        getBestReleaseFromJacred(normalizedCard, localCurrentCard, function (result) {
            var dataToSave = {};
            
            if (result && result.foundUkr) {
                dataToSave = {
                    qualityText: result.qualityText,
                    cssClass: result.cssClass,
                    foundUkr: true
                };
            } else {
                dataToSave = {
                    foundUkr: false,
                    qualityText: '',
                    cssClass: ''
                };
            }

            saveQualityCache(qCacheKey, dataToSave, localCurrentCard);
            // Перевіряємо чи render все ще живий
            if (render && render.find) {
                updateQualityElement(dataToSave, localCurrentCard, render);
            }
        });
    }

    function getCardType(card) {
        var type = card.media_type || card.type;
        if (type === 'movie' || type === 'tv') return type;
        return (card.name || card.original_name) ? 'tv' : 'movie';
    }

    // --- ГОЛОВНА ФУНКЦІЯ ---
    function fetchQualityForCard(card, render) {
        if (!render) return;
        var localCurrentCard = card.id;
        
        var normalizedCard = {
            id: card.id,
            title: card.title || card.name || '',
            original_title: card.original_title || card.original_name || '',
            type: getCardType(card),
            release_date: card.release_date || card.first_air_date || ''
        };

        // Тільки фільми
        if (normalizedCard.type === 'tv') {
            clearQualityElements(render);
            return;
        }

        var qCacheKey = normalizedCard.type + '_ua_max_' + (normalizedCard.id || normalizedCard.imdb_id);
        var cacheQualityData = getQualityCache(qCacheKey);

        // Примусово показуємо плейсхолдер або кеш одразу
        // Ми НЕ ховаємо rateLine, щоб уникнути "стрибків" і багів відображення
        
        if (cacheQualityData) {
            updateQualityElement(cacheQualityData, localCurrentCard, render);
        } else {
            showQualityPlaceholder(render);
            fetchQualitySequentially(normalizedCard, localCurrentCard, qCacheKey, render);
        }
    }

    // Ініціалізація
    function startPlugin() {
        var startTime = performance.now();
        SURS_QUALITY.log('Запуск плагіна (UA MAX + SVG + Fix)!');
        window.sursQualityPlugin = true;

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                // Викликаємо функцію, передаючи контекст рендера картки
                var render = e.object.activity.render();
                fetchQualityForCard(e.data.movie, render);
            }
        });
        
        logExecution('startPlugin', startTime, 'Готово');
    }

    if (!window.sursQualityPlugin) {
        startPlugin();
    }
})();