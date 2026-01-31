/**
 * Quality+Mod - Enhanced Quality Plugin for Lampa
 * --------------------------------------------------------------------------------
 * Автоматично визначає та показує якість релізу з JacRed:
 * - Мітки на повній і спискових картках
 * - Спрощені (4K/FHD/HD/SD, TS/TC/CAM) або повні підписи — перемикається
 * - Ручні оверрайди для окремих ID
 * - Кеш 48h + тихе фонове оновлення
 * - Черга запитів (до 12 парал.), проксі (HTTPS), поліфіли для старих WebView
 *
 * Налаштування: Інтерфейс → «Мітки якості»
 */

// LQE TV-BOX COMPAT LAYER 
// Цей блок для старих WebView без fetch/Promise/localStorage/CORS
(function () {
    // 1. Проміси (дуже простий поліфіл, достатньо для then/catch)
    if (typeof window.Promise !== 'function') {
        (function () {
            function SimplePromise(executor) {
                var self = this;
                self._state = 'pending';
                self._value = undefined;
                self._handlers = [];

                function resolve(value) {
                    if (self._state !== 'pending') return;
                    self._state = 'fulfilled';
                    self._value = value;
                    run();
                }

                function reject(reason) {
                    if (self._state !== 'pending') return;
                    self._state = 'rejected';
                    self._value = reason;
                    run();
                }

                function run() {
                    setTimeout(function () {
                        for (var i = 0; i < self._handlers.length; i++) {
                            handle(self._handlers[i]);
                        }
                        self._handlers = [];
                    }, 0);
                }

                function handle(h) {
                    if (self._state === 'pending') {
                        self._handlers.push(h);
                        return;
                    }
                    var cb = self._state === 'fulfilled' ? h.onFulfilled : h.onRejected;

                    if (!cb) {
                        (self._state === 'fulfilled' ? h.resolve : h.reject)(self._value);
                        return;
                    }

                    try {
                        var ret = cb(self._value);
                        h.resolve(ret);
                    } catch (e) {
                        h.reject(e);
                    }
                }

                self.then = function (onFulfilled, onRejected) {
                    return new SimplePromise(function (resolve2, reject2) {
                        handle({
                            onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
                            onRejected: typeof onRejected === 'function' ? onRejected : null,
                            resolve: resolve2,
                            reject: reject2
                        });
                    });
                };

                self.catch = function (onRejected) {
                    return self.then(null, onRejected);
                };

                try {
                    executor(resolve, reject);
                } catch (e) {
                    reject(e);
                }
            }

            window.Promise = SimplePromise;
        })();
    }

    // 2. requestAnimationFrame поліфіл
    if (typeof window.requestAnimationFrame !== 'function') {
        window.requestAnimationFrame = function (cb) {
            return setTimeout(cb, 16); // ~60fps
        };
    }

    // 3. Безпечне localStorage
    var safeLocalStorage = (function () {
        try {
            var testKey = '__lqe_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            // якщо дійшли сюди — localStorage живий
            return window.localStorage;
        } catch (e) {
            // fallback у RAM
            var memoryStore = {};
            return {
                getItem: function (k) { return memoryStore[k] || null; },
                setItem: function (k, v) { memoryStore[k] = String(v); },
                removeItem: function (k) { delete memoryStore[k]; }
            };
        }
    })();

    // 4. Якщо чомусь немає Lampa.Storage,
    // створимо просту сумісну версію поверх safeLocalStorage.
    if (!window.Lampa) window.Lampa = {};
    if (!Lampa.Storage) {
        Lampa.Storage = {
            get: function (key, def) {
                try {
                    var raw = safeLocalStorage.getItem(key);
                    return raw ? JSON.parse(raw) : (def || null);
                } catch (e) {
                    return def || null;
                }
            },
            set: function (key, val) {
                try {
                    safeLocalStorage.setItem(key, JSON.stringify(val));
                } catch (e) {
                    // ігноруємо, щоб не завалити плагін
                }
            }
        };
    }

    // 5. safeFetchText: універсальна обгортка, яка:
    //    - якщо є нормальний fetch -> використовує його
    //    - якщо немає fetch -> XHR
    //    - повертає Promise<String>, щоб залишити існуючу логіку з then/catch
    function safeFetchText(url) {
        return new Promise(function (resolve, reject) {
            // Варіант 1: сучасний fetch
            if (typeof fetch === 'function') {
                try {
                    fetch(url)
                        .then(function (res) {
                            if (!res.ok) throw new Error('HTTP ' + res.status);
                            return res.text();
                        })
                        .then(resolve)
                        .catch(reject);
                    return;
                } catch (e) {
                    // якщо сам fetch впав синхронно — просто падати не будемо, йдемо в XHR
                }
            }

            // Варіант 2: старий WebView -> XMLHttpRequest
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(xhr.responseText);
                        } else {
                            reject(new Error('XHR ' + xhr.status));
                        }
                    }
                };
                xhr.onerror = function () {
                    reject(new Error('Network error'));
                };
                xhr.send(null);
            } catch (err) {
                reject(err);
            }
        });
    }

    // Експортуємо, щоб основний код плагіна зміг цим користуватись.
    window.LQE_safeFetchText = safeFetchText;
})();





(function () {
    'use strict'; // Використання суворого режиму для запобігання помилок

    // ===================== КОНФІГУРАЦІЯ =====================
    var LQE_CONFIG = {
        CACHE_VERSION: 3, // Версія кешу для інвалідації старих даних
        LOGGING_GENERAL: true, // Загальне логування для налагодження
        LOGGING_QUALITY: false, // Логування процесу визначення якості
        LOGGING_CARDLIST: true, // Логування для спискових карток
        CACHE_VALID_TIME_MS: 48 * 60 * 60 * 1000, // Час життя кешу (48 години)
        CACHE_REFRESH_THRESHOLD_MS: 24 * 60 * 60 * 1000, // Час для фонового оновлення кешу (24 годин)
        CACHE_KEY: 'lampa_quality_cache', // Ключ для зберігання кешу в LocalStorage
        JACRED_PROTOCOL: 'https://', // Протокол для API JacRed
        JACRED_URL: 'jacred.xyz', // Домен API JacRed (redapi.cfhttp.top або jacred.xyz)
        JACRED_API_KEY: '', // Ключ API (не використовується в даній версії)
        PROXY_LIST: [ // Список проксі серверів для обходу CORS обмежень
            'https://my-finder.kozak-bohdan.workers.dev/?url=',
            'https://cors.bwa.workers.dev/',
            'https://api.allorigins.win/raw?url='
        ],
        PROXY_TIMEOUT_MS: 4000, // Таймаут для проксі запитів (4 секунди)
        SHOW_QUALITY_FOR_TV_SERIES: false, // ✅ Показувати якість для серіалів
        SHOW_FULL_CARD_LABEL: true,       // ✅ Показувати мітку якості у повній картці

        MAX_PARALLEL_REQUESTS: 12, // Максимальна кількість паралельних запитів

        USE_SIMPLE_QUALITY_LABELS: true, // ✅ Використовувати спрощені мітки якості (4K, FHD, TS, TC тощо) "true" - так /  "false" - ні

        // Стилі для відображення якості на повній картці
        FULL_CARD_LABEL_BORDER_COLOR: '#FFFFFF',
        FULL_CARD_LABEL_TEXT_COLOR: '#FFFFFF',
        FULL_CARD_LABEL_FONT_WEIGHT: 'normal',
        FULL_CARD_LABEL_FONT_SIZE: '1.2em',
        FULL_CARD_LABEL_FONT_STYLE: 'normal',

        // Стилі для відображення якості на спискових картках
        LIST_CARD_LABEL_BORDER_COLOR: '#3DA18D',
        LIST_CARD_LABEL_BACKGROUND_COLOR: 'rgba(61, 161, 141, 0.9)', //Стандартна прозорість фону 0.8 (1 - фон не прозорий)
        LIST_CARD_LABEL_BACKGROUND_TRANSPARENT: false,
        LIST_CARD_LABEL_TEXT_COLOR: '#FFFFFF',
        LIST_CARD_LABEL_FONT_WEIGHT: '600',
        LIST_CARD_LABEL_FONT_SIZE: '1.1em',
        LIST_CARD_LABEL_FONT_STYLE: 'normal',

        // Ручні перевизначення якості для конкретних ID контенту
        MANUAL_OVERRIDES: {
            '338969': {
                quality_code: 2160,
                full_label: '4K WEB-DL', //✅ Повна мітка
                simple_label: '4K'  	 //✅ Спрощена мітка
            },
            '654028': {
                quality_code: 2160,
                full_label: '4K WEB-DL', //✅ Повна мітка
                simple_label: '4K'  	 //✅ Спрощена мітка
            },
            '12556': {
                quality_code: 1080,
                full_label: '1080 ВDRemux', //✅ Повна мітка
                simple_label: 'FHD'  	 //✅ Спрощена мітка
            },
            '604079': {
                quality_code: 2160,
                full_label: '4K WEB-DL', //✅ Повна мітка
                simple_label: '4K'  	 //✅ Спрощена мітка
            },
            '1267905': {
                quality_code: 2160,
                full_label: '4K WEB-DL', //✅ Повна мітка
                simple_label: '4K'  	 //✅ Спрощена мітка
            }

            /*'Тут ID фільму': { 
                quality_code: 1080, 
                full_label: '1080p WEB-DLRip',  //✅ Повна мітка
                simple_label: 'FHD'  		    //✅ Спрощена мітка
            },*/
            /*'Тут ID фільму': { 
                quality_code: 2160, 
                full_label: '4K WEB-DL',     //✅ Повна мітка
                simple_label: '4K'  		 //✅ Спрощена мітка
            }*/
        }
    };


    window.LQE_CONFIG = LQE_CONFIG;
    var currentGlobalMovieId = null; // Змінна для відстеження поточного ID фільму

    // ===================== МАПИ ДЛЯ ПАРСИНГУ ЯКОСТІ =====================

    // Мапа для прямих відповідностей назв якості (fallback)
    var QUALITY_DISPLAY_MAP = {
        "WEBRip 1080p | AVC @ звук с TS": "1080P WEBRip/TS",
        "TeleSynch 1080P": "1080P TS",
        "4K Web-DL 10bit HDR P81 HEVC": "4K WEB-DL",
        "Telecine [H.264/1080P] [звук с TS] [AD]": "1080P TS",
        "WEB-DLRip @ Синема УС": "WEB-DLRip",
        "UHD Blu-ray disc 2160p": "4K Blu-ray",
        "Blu-ray disc 1080P]": "1080P Blu-ray",
        "Blu-Ray Remux (1080P)": "1080P BDRemux",
        "BDRemux 1080P] [Крупний план]": "1080P BDRemux",
        "Blu-ray disc (custom) 1080P]": "1080P BDRip",
        "DVDRip [AV1/2160p] [4K, SDR, 10-bit] [hand made Upscale AI]": "4K Upscale AI",
        "Hybrid (2160p)": "4K Hybrid",
        "Blu-ray disc] [Mastered in 4K] [Extended Cut]": "4K Blu-ray",
        "4K, HEVC, HDR / Blu-Ray Remux (2160p)": "4K BDRemux",
        "4K, HEVC, HDR, HDR10+, Dolby Vision / Hybrid (2160p)": "4K Hybrid",
        "4K, HEVC, HDR, Dolby Vision P7 / Blu-Ray Remux (2160p)": "4K BDRemux",
        "4K, HEVC, HDR, Dolby Vision / Blu-Ray Remux (2160p)": "4K BDRemux",
        "Blu-Ray Remux 2160p | 4K | HDR | Dolby Vision P7": "4K BDRemux",
        "4K, HEVC, HDR / WEB-DLRip (2160p)": "4K WEB-DLRip",
        "Blu-ray disc (custom) 1080P] [StudioCanal]": "1080P BDRip",
        "HDTVRip [H.264/720p]": "720p HDTVRip",
        "HDTVRip 720p": "720p HDTVRip",
        "2025 / ЛМ / TC": "TC", // Telecine

        // Стандартні варіанти якості
        "2160p": "4K", "4k": "4K", "4К": "4K", "1080p": "1080p", "1080": "1080p",
        "1080i": "1080p", "hdtv 1080i": "1080i FHDTV", "480p": "SD", "480": "SD",
        "web-dl": "WEB-DL", "webrip": "WEBRip", "web-dlrip": "WEB-DLRip",
        "bluray": "BluRay", "bdrip": "BDRip", "bdremux": "BDRemux",
        "hdtvrip": "HDTVRip", "dvdrip": "DVDRip", "ts": "TS", "camrip": "CAMRip",

        "blu-ray remux (2160p)": "4K BDRemux", "hdtvrip 2160p": "4K HDTVRip", "hybrid 2160p": "4K Hybrid",
        "web-dlrip (2160p)": "4K WEB-DLRip",
        "1080p web-dlrip": "1080p WEB-DLRip", "webdlrip": "WEB-DLRip", "hdtvrip-avc": "HDTVRip-AVC",
        "HDTVRip (1080p)": "1080p FHDTVRip", "hdrip": "HDRip",
        "hdtvrip (720p)": "720p HDTVRip",
        "dvdrip": "DVDRip", "hdtv": "HDTV", "dsrip": "DSRip", "satrip": "SATRip",
        "telecine": "TC", "tc": "TC", "ts": "TS"

    };

    // Мапа для визначення роздільності з назви
    var RESOLUTION_MAP = {
        "2160p": "4K", "2160": "4K", "4k": "4K", "4к": "4K", "uhd": "4K", "ultra hd": "4K", "ultrahd": "4K", "dci 4k": "4K",
        "1440p": "QHD", "1440": "QHD", "2k": "QHD", "qhd": "QHD",
        "1080p": "1080p", "1080": "1080p", "1080i": "1080i", "full hd": "1080p", "fhd": "1080p",
        "720p": "720p", "720": "720p", "hd": "720p", "hd ready": "720p",
        "576p": "576p", "576": "576p", "pal": "576p",
        "480p": "480p", "480": "480p", "sd": "480p", "standard definition": "480p", "ntsc": "480p",
        "360p": "360p", "360": "360p", "low": "360p"
    };
    // Мапа для визначення джерела відео
    var SOURCE_MAP = {
        "blu-ray remux": "BDRemux", "uhd bdremux": "4K BDRemux", "bdremux": "BDRemux",
        "remux": "BDRemux", "blu-ray disc": "Blu-ray", "bluray": "Blu-ray",
        "blu-ray": "Blu-ray", "bdrip": "BDRip", "brrip": "BDRip",
        "uhd blu-ray": "4K Blu-ray", "4k blu-ray": "4K Blu-ray",
        "web-dl": "WEB-DL", "webdl": "WEB-DL", "web dl": "WEB-DL",
        "web-dlrip": "WEB-DLRip", "webdlrip": "WEB-DLRip", "web dlrip": "WEB-DLRip",
        "webrip": "WEBRip", "web rip": "WEBRip", "hdtvrip": "HDTVRip",
        "hdtv": "HDTVRip", "hdrip": "HDRip", "dvdrip": "DVDRip", "dvd rip": "DVDRip",
        "dvd": "DVD", "dvdscr": "DVDSCR", "scr": "SCR", "bdscr": "BDSCR", "r5": "R5",
        "hdrip": "HDRip",
        "screener": "SCR",
        "telecine": "TC", "tc": "TC", "hdtc": "TC", "telesync": "TS", "ts": "TS",
        "hdts": "TS", "camrip": "CAMRip", "cam": "CAMRip", "hdcam": "CAMRip",
        "vhsrip": "VHSRip", "vcdrip": "VCDRip", "dcp": "DCP", "workprint": "Workprint",
        "preair": "Preair", "tv": "TVRip", "line": "Line Audio", "hybrid": "Hybrid",
        "uhd hybrid": "4K Hybrid", "upscale": "Upscale", "ai upscale": "AI Upscale",
        "bd3d": "3D Blu-ray", "3d blu-ray": "3D Blu-ray"
    };
    // Мапа для спрощення повних назв якості до коротких форматів
    var QUALITY_SIMPLIFIER_MAP = {
        // Якість (роздільність)
        "2160p": "4K", "2160": "4K", "4k": "4K", "4к": "4K", "uhd": "4K", "ultra hd": "4K", "dci 4k": "4K", "ultrahd": "4K",
        "1440p": "QHD", "1440": "QHD", "2k": "QHD", "qhd": "QHD",
        "1080p": "FHD", "1080": "FHD", "1080i": "FHD", "full hd": "FHD", "fhd": "FHD",
        "720p": "HD", "720": "HD", "hd ready": "HD", "hd": "HD",
        "480p": "SD", "480": "SD", "sd": "SD", "pal": "SD", "ntsc": "SD", "576p": "SD", "576": "SD",
        "360p": "LQ", "360": "LQ",

        // Погана якість (джерело) - мають пріоритет над роздільністю при відображенні
        "camrip": "CamRip", "cam": "CamRip", "hdcam": "CamRip", "камрип": "CamRip",
        "telesync": "TS", "ts": "TS", "hdts": "TS", "телесинк": "TS",
        "telecine": "TC", "tc": "TC", "hdtc": "TC", "телесин": "TC",
        "dvdscr": "SCR", "scr": "SCR", "bdscr": "SCR", "screener": "SCR",

        // Якісні джерела
        "remux": "Remux", "bdremux": "Remux", "blu-ray remux": "Remux",
        "bluray": "BR", "blu-ray": "BR", "bdrip": "BRip", "brrip": "BRip",
        "web-dl": "WebDL", "webdl": "WebDL",
        "webrip": "WebRip", "web-dlrip": "WebDLRip", "webdlrip": "WebDLRip",
        "hdtv": "HDTV", "hdtvrip": "HDTV",
        "hdrip": "HDRip",
        "dvdrip": "DVDRip", "dvd": "DVD"
    };
    
    // ===================== СТИЛІ CSS =====================
    // Основні стилі для відображення якості
    var styleLQE = "<style id=\"lampa_quality_styles\">" +
        ".full-start-new__rate-line {" + // Контейнер для лінії рейтингу повної картки
        /* visibility: hidden;  // ← прибрано, бо ховало весь рядок назавжди */ // Приховано під час завантаження
        "flex-wrap: wrap;" + // Дозволити перенос елементів
        "gap: 0.4em 0;" + // Відступи між елементами
        "}" +
        ".full-start-new__rate-line > * {" + // Стилі для всіх дітей лінії рейтингу
        "margin-right: 0.5em;" + // Відступ праворуч
        "flex-shrink: 0;" + // Заборонити стискання
        "flex-grow: 0;" + // Заборонити розтягування
        "}" +
        ".lqe-quality {" + // Стилі для мітки якості на повній картці
        "min-width: 2.8em;" + // Мінімальна ширина
        "text-align: center;" + // Вирівнювання тексту по центру
        "text-transform: none;" + // Без трансформації тексту
        "border: 1px solid " + LQE_CONFIG.FULL_CARD_LABEL_BORDER_COLOR + " !important;" + // ✅ Колір рамки з конфігурації
        "color: " + LQE_CONFIG.FULL_CARD_LABEL_TEXT_COLOR + " !important;" + // ✅ Колір тексту
        "font-weight: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_WEIGHT + " !important;" + // ✅ Товщина шрифту
        "font-size: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_SIZE + " !important;" + // ✅ Розмір шрифту
        "font-style: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_STYLE + " !important;" + // ✅ Стиль шрифту
        "border-radius: 0.2em;" + // ✅ Закруглення кутів
        "padding: 0.3em;" + // Внутрішні відступи
        "height: 1.72em;" + // Фіксована висота
        "display: flex;" + // Flexbox для центрування
        "align-items: center;" + // Вертикальне центрування
        "justify-content: center;" + // Горизонтальне центрування
        "box-sizing: border-box;" + // Box-model
        "}" +
        /* === КОЛЬОРОВІ МОДИФІКАТОРИ ДЛЯ ПОВНОЇ КАРТКИ (border/text) === */
        ".lqe-quality.q-4k { border-color: #2ecc71 !important; color: #2ecc71 !important; }" + // Смарагдовий
        ".lqe-quality.q-1080 { border-color: #3498db !important; color: #3498db !important; }" + // Синій
        ".lqe-quality.q-720 { border-color: #f1c40f !important; color: #f1c40f !important; }" + // Жовтий
        ".lqe-quality.q-bad { border-color: #e74c3c !important; color: #e74c3c !important; }" + // Червоний
        
        ".card__view {" + // Контейнер для картки у списку
        " position: relative; " + // Відносне позиціонування
        "}" +
        ".card__quality {" + // Стилі для мітки якості на списковій картці
        " position: absolute; " + // Абсолютне позиціонування
        " bottom: 0.50em; " + // ✅ Відступ від низу
        " left: 0; " + // ✅ Вирівнювання по лівому краю
        " margin-left: -0.78em; " + //ВІДСТУП за лівий край 
        " background-color: " + (LQE_CONFIG.LIST_CARD_LABEL_BACKGROUND_TRANSPARENT ? "transparent" : LQE_CONFIG.LIST_CARD_LABEL_BACKGROUND_COLOR) + " !important;" + // ✅ Колір фону
        " z-index: 10;" + // Z-index для поверх інших елементів
        " width: fit-content; " + // Ширина по вмісту
        " max-width: calc(100% - 1em); " + // Максимальна ширина
        " border-radius: 0.3em 0.3em 0.3em 0.3em; " + // ✅ Закруглення кутів
        " overflow: hidden;" + // Обрізання переповнення
        "}" +
        /* === КОЛЬОРОВІ МОДИФІКАТОРИ ДЛЯ СПИСКОВОЇ КАРТКИ (background) === */
        ".card__quality.q-4k { background-color: #2ecc71 !important; }" + // Смарагдовий
        ".card__quality.q-1080 { background-color: #3498db !important; }" + // Синій
        ".card__quality.q-720 { background-color: #f1c40f !important; }" + // Жовтий
        ".card__quality.q-720 div { color: #000 !important; text-shadow: none !important; }" + // Жовтий фон -> темний текст
        ".card__quality.q-bad { background-color: #e74c3c !important; }" + // Червоний

        ".card__quality div {" + // Стилі для тексту всередині мітки якості
        " text-transform: uppercase; " + // Великі літери
        " font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif; " + // Шрифт
        " font-weight: 700; " + // ✅ Жирний шрифт
        " letter-spacing: 0.1px; " + // Відстань між літерами
        " font-size: 1.10em; " + // ✅ Розмір шрифту
        " color: " + LQE_CONFIG.LIST_CARD_LABEL_TEXT_COLOR + " !important;" + // ✅ Колір тексту
        " padding: 0.1em 0.1em 0.08em 0.1em; " + // ✅ Внутрішні відступи
        " white-space: nowrap;" + // Заборонити перенос тексту
        " text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3); " + // Тінь тексту
        "}" +
        ".lqe-hide-full .full-start__status.lqe-quality { display: none !important; }" +
        "</style>";
    // Додаємо стилі до DOM
    Lampa.Template.add('lampa_quality_css', styleLQE);
    $('body').append(Lampa.Template.get('lampa_quality_css', {}, true));
    // Стилі для плавного з'явлення міток якості
    var fadeStyles = "<style id='lampa_quality_fade'>" +
        ".card__quality, .full-start__status.lqe-quality {" + // Елементи для анімації
        "opacity: 0;" + // Початково прозорі
        "transition: opacity 0.22s ease-in-out;" + // Плавна зміна прозорості
        "}" +
        ".card__quality.show, .full-start__status.lqe-quality.show {" + // Клас для показу
        "opacity: 1;" + // Повністю видимі
        "}" +
        ".card__quality.show.fast, .full-start__status.lqe-quality.show.fast {" + // Вимкнення переходу
        "transition: none !important;" +
        "}" +
        "</style>";

    // LQE: пошук якості всередині rate-line
    var lqeLoaderCss = "<style id=\"lqe_search_loader_css\">" +
        "#lqe-search-loader.loading-dots-container{display:inline-flex;align-items:center;gap:.4em;color:#ccc;font-size:.85em;background:rgba(0,0,0,.3);padding:.6em 1em;border-radius:.5em;pointer-events:none;}" +
        "#lqe-search-loader .loading-dots__text{margin-right:.6em;}" +
        "#lqe-search-loader .loading-dots__dot{width:.5em;height:.5em;border-radius:50%;background:currentColor;animation:lqe-dots-bounce 1.4s infinite ease-in-out both;}" +
        "#lqe-search-loader .loading-dots__dot:nth-child(2){animation-delay:-.16s;}" +
        "#lqe-search-loader .loading-dots__dot:nth-child(3){animation-delay:-.32s;}" +
        "@keyframes lqe-dots-bounce{0%,80%,100%{transform:translateY(0);opacity:.6;}40%{transform:translateY(-.5em);opacity:1;}}" +
        ".full-start-new__rate-line.lqe-is-loading>:not(#lqe-search-loader),.full-start__rate-line.lqe-is-loading>:not(#lqe-search-loader){opacity:0!important;pointer-events:none!important;transition:opacity .15s;}" +
        "@media (max-width:600px){#lqe-search-loader.loading-dots-container{font-size:.8em;padding:.4em .8em;}}" +
        "</style>";
    Lampa.Template.add('lqe_search_loader_css', lqeLoaderCss);
    $('body').append(Lampa.Template.get('lqe_search_loader_css', {}, true));


    Lampa.Template.add('lampa_quality_fade', fadeStyles);
    $('body').append(Lampa.Template.get('lampa_quality_fade', {}, true));

    // ===================== МЕРЕЖЕВІ ФУНКЦІЇ =====================
    /**
     * Виконує запит через проксі з обробкою помилок + fallback для старих WebView
     * @param {string} url - оригінальний URL, який хочемо викликати
     * @param {string} cardId - ID картки (тільки для логів)
     * @param {function} callback - callback(err, data)
     */
    function fetchWithProxy(url, cardId, callback) {
        var currentProxyIndex = 0;       // який проксі зараз пробуємо
        var callbackCalled = false;      // щоб не викликати callback двічі

        function tryNextProxy() {
            // якщо всі проксі вже впали
            if (currentProxyIndex >= LQE_CONFIG.PROXY_LIST.length) {
                if (!callbackCalled) {
                    callbackCalled = true;
                    callback(new Error('All proxies failed for ' + url));
                }
                return;
            }

            // формуємо фінальний URL через поточний проксі
            var proxyUrl = LQE_CONFIG.PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);

            if (LQE_CONFIG.LOGGING_GENERAL) {
                console.log("LQE-LOG", "card: " + cardId + ", Fetch with proxy: " + proxyUrl);
            }

            var finished = false;
            var timeoutId = setTimeout(function () {
                // якщо за таймаут не дочекались — пробуємо наступний проксі
                if (finished) return;
                finished = true;
                currentProxyIndex++;
                tryNextProxy();
            }, LQE_CONFIG.PROXY_TIMEOUT_MS);

            // ВАЖЛИВО:
            // Використовуємо LQE_safeFetchText (Promise), який вже сам вирішить:
            // - fetch+then або
            // - XHR у старих WebView
            LQE_safeFetchText(proxyUrl)
                .then(function (data) {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeoutId);

                    if (!callbackCalled) {
                        callbackCalled = true;
                        callback(null, data); // успіх
                    }
                })
                .catch(function (error) {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeoutId);

                    console.error(
                        "LQE-LOG",
                        "card: " + cardId + ", Proxy fetch error for " + proxyUrl + ":",
                        error
                    );

                    // переходимо до наступного проксі
                    currentProxyIndex++;
                    tryNextProxy();
                });
        }

        tryNextProxy();
    }
    // ===================== АНІМАЦІЯ ЗАВАНТАЖЕННЯ =====================
    /**
     * Додає анімацію завантаження до картки
     * @param {string} cardId - ID картки
     * @param {Element} renderElement - DOM елемент
     */
    /**
     * Додає анімацію завантаження всередині рядка рейтингів,
     * не змінюючи видимість самого рядка.
     * - НІКОЛИ не ховає .full-start-new__rate-line
     * - Не додає дублікат, якщо анімація вже є
     * - Поважає налаштування: якщо мітку вимкнено — анімацію не показуємо
     */
    //LQE loader
    var __lqeRateLineObs = null;

    function addLoadingAnimation(cardId, renderElement) {
        if (!renderElement) return;
        if (window.LQE_CONFIG && LQE_CONFIG.SHOW_FULL_CARD_LABEL === false) return;

        var render = $(renderElement);
        if (!render.length) return;

        if ($('#lqe-search-loader', render).length) return; // вже є

        var loaderHtml =
            '<div id="lqe-search-loader" class="loading-dots-container">' +
            '<span class="loading-dots__text">Пошук…</span>' +
            '<span class="loading-dots__dot"></span>' +
            '<span class="loading-dots__dot"></span>' +
            '<span class="loading-dots__dot"></span>' +
            '</div>';

        var realSel = '.full-start-new__rate-line:not([data-lqe-fake]), .full-start__rate-line:not([data-lqe-fake])';
        var rateLine = $(realSel, render).first();

        if (rateLine.length) {
            rateLine.append(loaderHtml).addClass('lqe-is-loading');
            return;
        }

        // якщо реального рядка ще немає — ставимо тимчасовий
        var fake = $(
            '<div class="full-start-new__rate-line" id="lqe-loader-fake" data-lqe-fake="1" ' +
            '     style="min-height:28px; display:flex; align-items:center;"></div>'
        );
        var anchor = $('.full-start-new__title, .full-start__title', render).first();
        if (anchor.length) anchor.after(fake); else render.append(fake);
        fake.append(loaderHtml);

        try { if (__lqeRateLineObs) __lqeRateLineObs.disconnect(); } catch (_) { }
        __lqeRateLineObs = new MutationObserver(function () {
            var rl = $(realSel, render).first();
            var loader = $('#lqe-search-loader', render);
            if (rl.length && loader.length) {
                rl.append(loader).addClass('lqe-is-loading');
                $('#lqe-loader-fake', render).remove();
                try { __lqeRateLineObs.disconnect(); } catch (_) { }
                __lqeRateLineObs = null;
            }
        });
        if (render[0]) __lqeRateLineObs.observe(render[0], { childList: true, subtree: true });

        setTimeout(function () {
            if (__lqeRateLineObs) {
                try { __lqeRateLineObs.disconnect(); } catch (_) { }
                __lqeRateLineObs = null;
            }
        }, 6000);
    }

    function removeLoadingAnimation(cardId, renderElement) {
        if (!renderElement) return;
        var render = $(renderElement);
        if (!render.length) return;

        $('#lqe-search-loader', render).remove();
        $('#lqe-loader-fake', render).remove();

        var rl = $('.full-start-new__rate-line:not([data-lqe-fake]), .full-start__rate-line:not([data-lqe-fake])', render).first();
        if (rl.length) rl.removeClass('lqe-is-loading');

        try { if (__lqeRateLineObs) __lqeRateLineObs.disconnect(); } catch (_) { }
        __lqeRateLineObs = null;
    }
    // ===================== УТІЛІТИ =====================
    /**
     * Визначає тип контенту (фільм/серіал)
     * @param {object} cardData - Дані картки
     * @returns {string} - 'movie' або 'tv'
     */
    function getCardType(cardData) {
        var type = cardData.media_type || cardData.type; // Отримуємо тип з даних
        if (type === 'movie' || type === 'tv') return type; // Якщо тип визначено
        return cardData.name || cardData.original_name ? 'tv' : 'movie'; // Визначаємо по наявності назви
    }
    /**
     * Очищує та нормалізує назву для пошуку
     * @param {string} title - Оригінальна назва
     * @returns {string} - Нормалізована назва
     */
    function sanitizeTitle(title) {
        if (!title) return ''; // Перевірка на пусту назву
        // Приводимо до нижнього регістру, замінюємо роздільники на пробіли, видаляємо зайві пробіли
        return title.toString().toLowerCase()
            .replace(/[\._\-\[\]\(\),]+/g, ' ') // Заміна роздільників на пробіли
            .replace(/\s+/g, ' ') // Видалення зайвих пробілів
            .trim(); // Обрізка пробілів по краях
    }
    /**
     * Генерує ключ для кешу
     * @param {number} version - Версія кешу
     * @param {string} type - Тип контенту
     * @param {string} id - ID картки
     * @returns {string} - Ключ кешу
     */
    function makeCacheKey(version, type, id) {
        return version + '_' + (type === 'tv' ? 'tv' : 'movie') + '_' + id; // Форматуємо ключ
    }

    // ===================== ПАРСИНГ ЯКОСТІ =====================
    /**
     * Спрощує повну назву якості до короткого формату 
     * @param {string} fullLabel - Повна назва якості (вибрана з найкращого релізу JacRed)
     * @param {string} originalTitle - Оригінальна назва торренту
     * @returns {string} - Спрощена назва для відображення на мітці
     */
    function simplifyQualityLabel(fullLabel, originalTitle) {
        if (!fullLabel) return ''; // Перевірка на пусту назву

        var lowerLabel = fullLabel.toLowerCase(); // Нижній регістр для порівняння
        // var lowerTitle = (originalTitle || '').toLowerCase(); // ❌ БІЛЬШЕ НЕ ВИКОРИСТОВУЄМО (перебиває якісний реліз)

        // --- Крок 1: Погані якості (найвищий пріоритет) ---
        // Якщо JacRed вибрав реліз з поганою якістю - показуємо тип якості
        // Це означає що кращих варіантів немає

        // CamRip - найгірша якість (запис з кінотеатру камерою)
        if (/(camrip|камрип|cam\b)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to CamRip");
            return "CamRip";
        }

        // TS (Telesync) - погана якість (запис з проектора)
        if (/(telesync|телесинк|ts\b)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to TS");
            return "TS";
        }

        // TC (Telecine) - погана якість (запис з кіноплівки)
        if (/(telecine|телесин|tc\b)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to TC");
            return "TC";
        }

        // SCR (DVD Screener) - погана якість (промо-копія)
        if (/(dvdscr|scr\b)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to SCR");
            return "SCR";
        }

        // --- Крок 2: Якісні джерела (тільки якщо немає поганих якостей) ---
        // Якщо JacRed вибрав якісний реліз - показуємо роздільність

        // 4K (Ultra HD) - найвища якість
        if (/(2160p|4k|uhd|ultra hd)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to 4K");
            return "4K";
        }

        // 2К (QHD) - висока якість
        if (/(1440p|1440|2k|qhd)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to QHD");
            return "QHD";
        }

        // FHD (Full HD) - висока якість
        if (/(1080p|1080|fullhd|fhd)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to FHD");
            return "FHD";
        }

        // HD (High Definition) - середня якість
        if (/(720p|720|hd\b)/.test(lowerLabel)) {
            var hdRegex = /(720p|720|^hd$| hd |hd$)/;
            if (hdRegex.test(lowerLabel)) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to HD");
                return "HD";
            }
        }

        // Крок WEB-DLRip без роздільності → HD (ДОДАНО)
        if (/(web-dlrip|webdlrip)\b/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to HD");
            return "HD";
        }

        // SD (Standard Definition) - базова якість
        if (/(480p|480|sd\b)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to SD");
            return "SD";
        }

        // LQ (Low Quality) - дуже низька якість
        if (/(360p|360|low quality|lq\b)/.test(lowerLabel)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified to LQ");
            return "LQ";
        }

        // --- Крок 3: Fallback ---
        // Якщо нічого з вищеперерахованого не знайдено, повертаємо оригінальну повну назву
        if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "No simplification rules matched, keeping original:", fullLabel);
        return fullLabel;
    }

    /**
     * Отримати клас CSS для кольору залежно від якості
     */
    function getQualityClass(label) {
        if (!label) return '';
        var l = label.toLowerCase();
        // Смарагдовий (4K)
        if (/(4k|2160|uhd|qhd|1440|2k)/.test(l)) return 'q-4k';
        // Синій (1080)
        if (/(1080|fhd)/.test(l)) return 'q-1080';
        // Жовтий (720/HD)
        if (/(720|hd)/.test(l)) return 'q-720';
        // Червоний (TS/CAM/Bad)
        if (/(ts|tc|cam|scr)/.test(l)) return 'q-bad';
        return '';
    }

    /**
     * Перетворює технічну назву якості на читабельну
     * @param {number} qualityCode - Код якості
     * @param {string} fullTorrentTitle - Повна назва торренту
     * @returns {string} - Відформатована назва якості
     */
    function translateQualityLabel(qualityCode, fullTorrentTitle) {
        if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "translateQualityLabel:", qualityCode, fullTorrentTitle);
        var title = sanitizeTitle(fullTorrentTitle || ''); // Нормалізуємо назву
        var titleForSearch = ' ' + title + ' '; // Додаємо пробіли для точного пошуку

        // Пошук роздільності в назві
        var resolution = '';
        var bestResKey = '';
        var bestResLen = 0;
        for (var rKey in RESOLUTION_MAP) {
            if (!RESOLUTION_MAP.hasOwnProperty(rKey)) continue; // Перевірка власної властивості
            var lk = rKey.toString().toLowerCase(); // Нижній регістр ключа
            // Шукаємо повне слово в назві
            if (titleForSearch.indexOf(' ' + lk + ' ') !== -1 || title.indexOf(lk) !== -1) {
                // Вибираємо найдовший збіг (найточніший)
                if (lk.length > bestResLen) {
                    bestResLen = lk.length;
                    bestResKey = rKey;
                }
            }
        }
        if (bestResKey) resolution = RESOLUTION_MAP[bestResKey]; // Отримуємо роздільність

        // Пошук джерела в назві
        var source = '';
        var bestSrcKey = '';
        var bestSrcLen = 0;
        for (var sKey in SOURCE_MAP) {
            if (!SOURCE_MAP.hasOwnProperty(sKey)) continue;
            var lk2 = sKey.toString().toLowerCase();
            if (titleForSearch.indexOf(' ' + lk2 + ' ') !== -1 || title.indexOf(lk2) !== -1) {
                if (lk2.length > bestSrcLen) {
                    bestSrcLen = lk2.length;
                    bestSrcKey = sKey;
                }
            }
        }
        if (bestSrcKey) source = SOURCE_MAP[bestSrcKey]; // Отримуємо джерело

        // Комбінуємо роздільність та джерело
        var finalLabel = '';
        if (resolution && source) {
            if (source.toLowerCase().includes(resolution.toLowerCase())) {
                finalLabel = source; // Якщо джерело вже містить роздільність
            } else {
                finalLabel = resolution + ' ' + source; // Комбінуємо
            }
        } else if (resolution) {
            finalLabel = resolution; // Тільки роздільність
        } else if (source) {
            finalLabel = source; // Тільки джерело
        }

        // Fallback на пряму мапу
        if (!finalLabel || finalLabel.trim() === '') {
            var bestDirectKey = '';
            var maxDirectLen = 0;
            for (var qk in QUALITY_DISPLAY_MAP) {
                if (!QUALITY_DISPLAY_MAP.hasOwnProperty(qk)) continue;
                var lkq = qk.toString().toLowerCase();
                if (title.indexOf(lkq) !== -1) {
                    if (lkq.length > maxDirectLen) {
                        maxDirectLen = lkq.length;
                        bestDirectKey = qk;
                    }
                }
            }
            if (bestDirectKey) {
                finalLabel = QUALITY_DISPLAY_MAP[bestDirectKey]; // Використовуємо пряму мапу
            }
        }

        // Останній fallback
        if (!finalLabel || finalLabel.trim() === '') {
            if (qualityCode) {
                var qc = String(qualityCode).toLowerCase();
                finalLabel = QUALITY_DISPLAY_MAP[qc] || qualityCode; // По коду або оригіналу
            } else {
                finalLabel = fullTorrentTitle || ''; // Оригінальна назва
            }
        }

        // Автоматичне спрощення якості (якщо увімкнено в конфігурації)
        if (LQE_CONFIG.USE_SIMPLE_QUALITY_LABELS) {
            var simplifiedLabel = simplifyQualityLabel(finalLabel, fullTorrentTitle);
            if (simplifiedLabel && simplifiedLabel !== finalLabel) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Simplified quality:", finalLabel, "→", simplifiedLabel);
                finalLabel = simplifiedLabel;
            }
        }

        if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Final quality label:", finalLabel);
        return finalLabel;
    }

    // ===================== ЧЕРГА ЗАПИТІВ (Lite-черга) =====================

    var requestQueue = []; // Масив для зберігання завдань у черзі
    var activeRequests = 0; // Лічильник активних запитів

    /**
     * Додає завдання до черги та запускає обробку
     * @param {function} fn - Функція завдання (приймає callback done)
     */
    function enqueueTask(fn) {
        requestQueue.push(fn); // Додаємо завдання в кінець черги
        processQueue(); // Запускаємо обробку черги
    }

    /**
     * Обробляє чергу завдань з дотриманням обмеження паралельності
     */
    function processQueue() {
        // Перевіряємо, чи не перевищено ліміт паралельних запитів
        if (activeRequests >= LQE_CONFIG.MAX_PARALLEL_REQUESTS) return;
        var task = requestQueue.shift(); // Беремо перше завдання з черги
        if (!task) return; // Якщо черга порожня - виходимо

        activeRequests++; // Збільшуємо лічильник активних запитів

        try {
            // Виконуємо завдання з callback-функцією завершення
            task(function onTaskDone() {
                activeRequests--; // Зменшуємо лічильник
                setTimeout(processQueue, 0); // Запускаємо наступне завдання
            });
        } catch (e) {
            // Обробляємо помилки виконання завдання
            console.error("LQE-LOG", "Queue task error:", e);
            activeRequests--; // Все одно зменшуємо лічильник
            setTimeout(processQueue, 0); // Продовжуємо обробку
        }
    }

    // ===================== ПОШУК В JACRED =====================
    /**
     * Визначає якість з назви торренту
     * @param {string} title - Назва торренту
     * @returns {number} - Числовий код якості (2160, 1440, 1080, 720, 480, 3, 2, 1)
     */
    function extractNumericQualityFromTitle(title) {
        if (!title) return 0; // Перевірка на пусту назву
        var lower = title.toLowerCase(); // Нижній регістр для порівняння

        // ✅ ПРАВИЛЬНІ ПРІОРИТЕТИ:
        if (/2160p|4k/.test(lower)) return 2160; // Найвищий пріоритет - 4K
        if (/1440p|qhd|2k/.test(lower)) return 1440; // QHD
        if (/1080p/.test(lower)) return 1080; // Full HD
        if (/720p/.test(lower)) return 720; // HD
        if (/480p/.test(lower)) return 480; // SD
        // Погані якості - правильний порядок (TC > TS > CamRip):
        if (/tc|telecine/.test(lower)) return 3; // TC краще за TS
        if (/ts|telesync/.test(lower)) return 2; // TS краще за CamRip
        if (/camrip|камрип/.test(lower)) return 1; // CamRip - найгірше

        return 0; // Якість не визначена
    }

    /**
     * Знаходить найкращий реліз в JacRed API
     * @param {object} normalizedCard - Нормалізовані дані картки
     * @param {string} cardId - ID картки
     * @param {function} callback - Callback функція
     */
    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
        enqueueTask(function (done) {
            // === ЗМІНА 1: Додано перевірку на майбутній реліз ===
            var releaseDate = normalizedCard.release_date ? new Date(normalizedCard.release_date) : null;
            if (releaseDate && releaseDate.getTime() > Date.now()) {
                if (LQE_CONFIG.LOGGING_QUALITY) {
                    console.log("LQE-QUALITY", "card: " + cardId + ", Future release. Skipping JacRed search.");
                }
                callback(null);
                done();
                return;
            }
            // === КІНЕЦЬ ЗМІНИ 1 ===

            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Searching JacRed...");

            // Перевірка налаштувань JacRed
            if (!LQE_CONFIG.JACRED_URL) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", JacRed URL not configured");
                callback(null);
                done();
                return;
            }

            // Витягуємо рік з дати релізу
            var year = '';
            if (normalizedCard.release_date && normalizedCard.release_date.length >= 4) {
                year = normalizedCard.release_date.substring(0, 4);
            }
            if (!year || isNaN(year)) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Invalid year");
                callback(null);
                done();
                return;
            }

            var searchYearNum = parseInt(year, 10);
            // Допоміжна функція для витягування року з назви
            function extractYearFromTitle(title) {
                var regex = /(?:^|[^\d])(\d{4})(?:[^\d]|$)/g;
                var match, lastYear = 0;
                var currentYear = new Date().getFullYear();
                while ((match = regex.exec(title)) !== null) {
                    var extractedYear = parseInt(match[1], 10);
                    if (extractedYear >= 1900 && extractedYear <= currentYear + 1) {
                        lastYear = extractedYear;
                    }
                }
                return lastYear;
            }

            // Функція пошуку в JacRed API
            function searchJacredApi(searchTitle, searchYear, exactMatch, strategyName, apiCallback) {
                var userId = Lampa.Storage.get('lampac_unic_id', '');
                var apiUrl = LQE_CONFIG.JACRED_PROTOCOL + LQE_CONFIG.JACRED_URL + '/api/v1.0/torrents?search=' +
                    encodeURIComponent(searchTitle) +
                    '&year=' + searchYear +
                    (exactMatch ? '&exact=true' : '') +
                    '&uid=' + userId;
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", JacRed: " + strategyName + " URL: " + apiUrl);
                // Таймаут для запиту
                var timeoutId = setTimeout(function () {
                    if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "card: " + cardId + ", JacRed: " + strategyName + " request timed out.");
                    apiCallback(null);
                }, LQE_CONFIG.PROXY_TIMEOUT_MS * LQE_CONFIG.PROXY_LIST.length + 1000);

                // Виконуємо запит через проксі
                fetchWithProxy(apiUrl, cardId, function (error, responseText) {
                    clearTimeout(timeoutId);

                    if (error || !responseText) {
                        if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", JacRed fetch error:", error);
                        apiCallback(null);
                        return;
                    }

                    try {
                        var torrents = JSON.parse(responseText);
                        if (!Array.isArray(torrents) || torrents.length === 0) {
                            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", No torrents found");
                            apiCallback(null);
                            return;
                        }

                        var bestNumericQuality = -1; // Найкраща знайдена якість
                        var bestFoundTorrent = null; // Найкращий знайдений торрент

                        // Аналізуємо кожен торрент
                        for (var i = 0; i < torrents.length; i++) {
                            var currentTorrent = torrents[i];


                            // Якщо картка - це серіал (tv)
                            if (normalizedCard.type === 'tv') {
                                var tTitle = currentTorrent.title.toLowerCase(); // назву приводимо до нижнього регістру
                                // Перевірка: у назві має бути "сезон", "season", "s01", "s1", "серии" тощо
                                if (!/(сезон|season|s\d{1,2}|\d{1,2}\s*из\s*\d{1,2}|серии)/.test(tTitle)) {
                                    if (LQE_CONFIG.LOGGING_QUALITY) {
                                        console.log(
                                            "LQE-QUALITY",
                                            "card: " + cardId + ", Пропускаємо торрент без ознаки сезону:", currentTorrent.title
                                        );
                                    }
                                    continue; // пропускаємо реліз, якщо це серіал, але немає сезону в назві
                                }
                            }

                            // Якщо картка - це фільм (movie)
                            if (normalizedCard.type === 'movie') {
                                var tTitleMovie = currentTorrent.title.toLowerCase();
                                // Якщо в назві є ознаки серіалу – пропускаємо (щоб не брати якість від серіалів)
                                if (/(сезон|season|s\d{1,2}|\d{1,2}\s*из\s*\d{1,2}|серии)/.test(tTitleMovie)) {
                                    if (LQE_CONFIG.LOGGING_QUALITY) {
                                        console.log(
                                            "LQE-QUALITY",
                                            "card: " + cardId + ", Пропускаємо реліз із ознаками серіалу для фільму:",
                                            currentTorrent.title
                                        );
                                    }
                                    continue; // пропускаємо цей торрент
                                }
                            }

                            // Визначаємо якість (спочатку з поля, потім з назви)
                            var currentNumericQuality = currentTorrent.quality;
                            if (typeof currentNumericQuality !== 'number' || currentNumericQuality === 0) {
                                var extractedQuality = extractNumericQualityFromTitle(currentTorrent.title);
                                if (extractedQuality > 0) {
                                    currentNumericQuality = extractedQuality;
                                } else {
                                    continue; // Пропускаємо якщо якість не визначена
                                }
                            }

                            // === ЗМІНА 2: Покращена валідація року ===
                            var torrentYearRaw = currentTorrent.relased;
                            var parsedYear = 0;
                            if (torrentYearRaw && !isNaN(torrentYearRaw)) {
                                parsedYear = parseInt(torrentYearRaw, 10);
                            }
                            // Якщо рік не знайдено в полі 'relased', спробуємо витягнути з назви
                            if (parsedYear < 1900) {
                                parsedYear = extractYearFromTitle(currentTorrent.title);
                            }

                            // ✅✅✅ Дозволяємо різницю в 1 рік (наприклад, реліз в грудні, а торрент з'явився в січні)
                            var yearDifference = Math.abs(parsedYear - searchYearNum);
                            if (parsedYear > 1900 && yearDifference > 1) {
                                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Torrent year mismatch, skipping. Torrent: " + currentTorrent.title + ", Searched: " + searchYearNum + ", Found: " + parsedYear);
                                continue;
                            }
                            // === КІНЕЦЬ ЗМІНИ 2 ===

                            if (LQE_CONFIG.LOGGING_QUALITY) {
                                console.log(
                                    "LQE-QUALITY",
                                    "card: " + cardId +
                                    ", Torrent: " + currentTorrent.title +
                                    " | Quality: " + currentNumericQuality + "p" +
                                    " | Year: " + (parsedYear || "unknown") +
                                    " | Strategy: " + strategyName
                                );
                            }

                            // ✅ ЛОГІКА ВИБОРУ ТОРРЕНТУ
                            if (currentNumericQuality > bestNumericQuality) {
                                // Знайшли торрент з кращою якістю
                                bestNumericQuality = currentNumericQuality;
                                bestFoundTorrent = currentTorrent;
                            }
                            else if (currentNumericQuality === bestNumericQuality && bestFoundTorrent &&
                                currentTorrent.title.length > bestFoundTorrent.title.length) {
                                // Якість рівна - беремо торрент з довшою назвою (більше деталей)
                                bestFoundTorrent = currentTorrent;
                            }
                        }

                        if (bestFoundTorrent) {
                            var result = {
                                quality: bestFoundTorrent.quality || bestNumericQuality,
                                full_label: bestFoundTorrent.title
                            };
                            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Best torrent found:", result, "Quality:", bestNumericQuality);
                            apiCallback(result);
                        } else {
                            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", No suitable torrent found");
                            apiCallback(null);
                        }

                    } catch (e) {
                        console.error("LQE-LOG", "card: " + cardId + ", JacRed API parse error:", e);
                        apiCallback(null);
                    }
                });
            }

            // ✅ СТРАТЕГІЇ ПОШУКУ
            var searchStrategies = [];
            // Стратегія 1: Оригінальна назва + точний рік
            if (normalizedCard.original_title && (/[a-zа-яё]/i.test(normalizedCard.original_title) || /^\d+$/.test(normalizedCard.original_title))) {
                searchStrategies.push({
                    title: normalizedCard.original_title.trim(),
                    year: year,
                    exact: true,
                    name: "OriginalTitle Exact Year"
                });
            }

            // Стратегія 2: Локалізована назва + точний рік  
            if (normalizedCard.title && (/[a-zа-яё]/i.test(normalizedCard.title) || /^\d+$/.test(normalizedCard.title))) {
                searchStrategies.push({
                    title: normalizedCard.title.trim(),
                    year: year,
                    exact: true,
                    name: "Title Exact Year"
                });
            }

            // Рекурсивна функція виконання стратегій
            function executeNextStrategy(index) {
                if (index >= searchStrategies.length) {
                    if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", All strategies failed. No quality found.");
                    callback(null);
                    done();
                    return;
                }

                var s = searchStrategies[index];
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Trying strategy", index + 1, ":", s.name);
                searchJacredApi(s.title, s.year, s.exact, s.name, function (result) {
                    if (result !== null) {
                        callback(result);
                        done();
                    } else {
                        executeNextStrategy(index + 1); // Наступна стратегія
                    }
                });
            }

            if (searchStrategies.length > 0) {
                executeNextStrategy(0);
            } else {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", No valid search titles or strategies defined.");
                callback(null);
                done();
            }
        });
    }

    // ===================== КЕШУВАННЯ =====================
    // In-memory кеш для швидкого доступу та мінімізації звернень до Storage.
    var memoryCache = {};
    var storageCache = null;

    function getStorageCache() {
        if (!storageCache) storageCache = Lampa.Storage.get(LQE_CONFIG.CACHE_KEY) || {};
        return storageCache;
    }

    // Захист від дубльованих мережевих запитів по одному ключу.
    var inflightRequests = {};

    /**
     * Отримує дані з кешу
     * @param {string} key - Ключ кешу
     * @returns {object|null} - Дані кешу або null
     */
    function getQualityCache(key) {
        var memoryItem = memoryCache[key];
        if (memoryItem && (Date.now() - memoryItem.timestamp < LQE_CONFIG.CACHE_VALID_TIME_MS)) {
            return memoryItem;
        }

        var cache = getStorageCache(); // Отримуємо кеш або пустий об'єкт
        var item = cache[key]; // Отримуємо елемент по ключу
        var isCacheValid = item && (Date.now() - item.timestamp < LQE_CONFIG.CACHE_VALID_TIME_MS); // Перевіряємо валідність

        if (LQE_CONFIG.LOGGING_QUALITY) {
            console.log("LQE-QUALITY", "Cache: Checking quality cache for key:", key, "Found:", !!item, "Valid:", isCacheValid);
        }

        if (isCacheValid) memoryCache[key] = item;
        return isCacheValid ? item : null; // Повертаємо елемент або null
    }

    /**
     * Зберігає дані в кеш
     * @param {string} key - Ключ кешу
     * @param {object} data - Дані для зберігання
     * @param {string} cardId - ID картки для логування
     */
    function saveQualityCache(key, data, cardId) {
        if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Cache: Saving quality cache for key:", key, "Data:", data);
        var cache = getStorageCache();
        var payload = {
            quality_code: data.quality_code,
            full_label: data.full_label,
            timestamp: Date.now() // Поточний час
        };
        cache[key] = payload;
        memoryCache[key] = payload;
        Lampa.Storage.set(LQE_CONFIG.CACHE_KEY, cache); // Зберігаємо в LocalStorage
    }

    /**
     * Видаляє застарілі записи кешу
     */
    function removeExpiredCacheEntries() {
        var cache = getStorageCache();
        var changed = false;
        var now = Date.now();

        for (var k in cache) {
            if (!cache.hasOwnProperty(k)) continue;
            var item = cache[k];
            if (!item || !item.timestamp || (now - item.timestamp) > LQE_CONFIG.CACHE_VALID_TIME_MS) {
                delete cache[k]; // Видаляємо застарілий запис
                changed = true;
            }
        }

        if (changed) {
            Lampa.Storage.set(LQE_CONFIG.CACHE_KEY, cache);
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Cache: Removed expired entries");
        }
    }

    /**
     * Повне очищення кешу (для налаштувань)
     */
    function clearQualityCache() {
        storageCache = {};
        memoryCache = {};
        Lampa.Storage.set(LQE_CONFIG.CACHE_KEY, storageCache);
    }

    // Очищаємо застарілий кеш при ініціалізації
    removeExpiredCacheEntries();
    // ===================== UI ДОПОМІЖНІ ФУНКЦІЇ =====================
    /**
     * Очищає елементи якості на повній картці
     * @param {string} cardId - ID картки
     * @param {Element} renderElement - DOM елемент
     */
    function clearFullCardQualityElements(cardId, renderElement) {
        if (renderElement) {
            var existingElements = $('.full-start__status.lqe-quality', renderElement);
            if (existingElements.length > 0) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Clearing existing quality elements on full card.");
                existingElements.remove(); // Видаляємо існуючі елементи
            }
        }
    }

    /**
     * Оновлює елемент якості на повній картці
     * @param {number} qualityCode - Код якості
     * @param {string} fullTorrentTitle - Назва торренту
     * @param {string} cardId - ID картки
     * @param {Element} renderElement - DOM елемент
     * @param {boolean} bypassTranslation - Пропустити переклад
     */
    function updateFullCardQualityElement(qualityCode, fullTorrentTitle, cardId, renderElement, bypassTranslation) {
        if (!renderElement) return;
        var element = $('.full-start__status.lqe-quality', renderElement);
        var rateLine = $('.full-start-new__rate-line', renderElement);
        if (!rateLine.length) return;

        var displayQuality = bypassTranslation ? fullTorrentTitle : translateQualityLabel(qualityCode, fullTorrentTitle);

        // ✅ Якщо це ручне перевизначення і увімкнено спрощення - беремо спрощену мітку
        if (bypassTranslation && LQE_CONFIG.USE_SIMPLE_QUALITY_LABELS) {
            var manualData = LQE_CONFIG.MANUAL_OVERRIDES[cardId];
            if (manualData && manualData.simple_label) {
                displayQuality = manualData.simple_label;
            }
        }

        var colorClass = getQualityClass(displayQuality);

        if (element.length) {
            // Оновлюємо існуючий елемент
            if (LQE_CONFIG.LOGGING_QUALITY) console.log('LQE-QUALITY', 'card: ' + cardId + ', Updating existing element with quality "' + displayQuality + '" on full card.');
            element.text(displayQuality).css('opacity', '1').addClass('show');
            // Оновлюємо колірний клас
            element.removeClass('q-4k q-1080 q-720 q-bad');
            if (colorClass) element.addClass(colorClass);

        } else {
            // Створюємо новий елемент
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Creating new element with quality '" + displayQuality + "' on full card.");
            var div = document.createElement('div');
            div.className = 'full-start__status lqe-quality';
            if (colorClass) div.classList.add(colorClass); // Додаємо клас кольору
            div.textContent = displayQuality;
            rateLine.append(div);
            // Додаємо клас для анімації
            setTimeout(function () {
                $('.full-start__status.lqe-quality', renderElement).addClass('show');
            }, 20);
        }
    }

    /**
     * Оновлює елемент якості на списковій картці
     * @param {Element} cardView - DOM елемент картки
     * @param {number} qualityCode - Код якості
     * @param {string} fullTorrentTitle - Назва торренту
     * @param {boolean} bypassTranslation - Пропустити переклад
     */
    function updateCardListQualityElement(cardView, qualityCode, fullTorrentTitle, bypassTranslation) {
        var displayQuality = bypassTranslation ? fullTorrentTitle : translateQualityLabel(qualityCode, fullTorrentTitle);

        // Старі WebView не мають optional chaining, тому робимо руками
        if (bypassTranslation && LQE_CONFIG.USE_SIMPLE_QUALITY_LABELS) {
            var detectedCardId = null;

            // cardView.card_data.id ?
            if (cardView && cardView.card_data && cardView.card_data.id) {
                detectedCardId = cardView.card_data.id;
            } else {
                // або cardView.closest('.card').card_data.id ?
                var closestCard = (cardView && cardView.closest) ? cardView.closest('.card') : null;
                if (closestCard && closestCard.card_data && closestCard.card_data.id) {
                    detectedCardId = closestCard.card_data.id;
                }
            }

            if (detectedCardId && LQE_CONFIG.MANUAL_OVERRIDES[detectedCardId]) {
                var manualData = LQE_CONFIG.MANUAL_OVERRIDES[detectedCardId];
                if (manualData && manualData.simple_label) {
                    displayQuality = manualData.simple_label;
                }
            }
        }

        var colorClass = getQualityClass(displayQuality);

        // прибираємо старий .card__quality, якщо він уже є
        var existing = cardView.querySelector('.card__quality');
        if (existing) {
            var inner = existing.querySelector('div');
            if (inner && inner.textContent === displayQuality) {
                // Вже правильний текст, але перевіримо клас кольору
                existing.classList.remove('q-4k', 'q-1080', 'q-720', 'q-bad');
                if (colorClass) existing.classList.add(colorClass);
            } else {
                existing.remove(); // Видаляємо, якщо текст змінився
            }
        }

        // якщо елемента немає або ми його щойно зняли — ставимо свіжий
        if (!cardView.querySelector('.card__quality')) {
            var qualityDiv = document.createElement('div');
            qualityDiv.className = 'card__quality';
            if (colorClass) qualityDiv.classList.add(colorClass); // Додаємо клас кольору

            var innerElement = document.createElement('div');
            innerElement.textContent = displayQuality;
            qualityDiv.appendChild(innerElement);

            cardView.appendChild(qualityDiv);

            // плавне з'явлення, з поліфілом requestAnimationFrame це працюватиме навіть у старому WebView
            requestAnimationFrame(function () {
                qualityDiv.classList.add('show');
            });
        }
    }

    // ===================== ОБРОБКА ПОВНОЇ КАРТКИ =====================
    /**
     * Обробляє якість для повної картки
     * @param {object} cardData - Дані картки
     * @param {Element} renderElement - DOM елемент
     */
    function processFullCardQuality(cardData, renderElement) {
        // Захист від некоректного виклику
        if (!renderElement) {
            console.error("LQE-LOG", "Render element is null in processFullCardQuality. Aborting.");
            return;
        }

        var cardId = cardData && cardData.id;

        if (LQE_CONFIG.LOGGING_GENERAL) {
            console.log("LQE-LOG", "card: " + cardId + ", Processing full card. Data: ", cardData);
        }

        // Нормалізуємо дані картки (єдине джерело правди для пошуку/кешу)
        var normalizedCard = {
            id: cardData.id,
            title: cardData.title || cardData.name || '',
            original_title: cardData.original_title || cardData.original_name || '',
            type: getCardType(cardData),
            release_date: cardData.release_date || cardData.first_air_date || ''
        };

        if (LQE_CONFIG.LOGGING_GENERAL) {
            console.log("LQE-LOG", "card: " + cardId + ", Normalized full card data: ", normalizedCard);
        }

        // Рядок із рейтингами та статусами (НЕ ховаємо його ніколи)

        var rateLine = $('.full-start-new__rate-line', renderElement);
        if (rateLine.length) {
            rateLine.addClass('done');
        } else {
            if (LQE_CONFIG.LOGGING_GENERAL) {
                console.log("LQE-LOG", "card: " + cardId + ", .full-start-new__rate-line not found, skipping loading animation.");
            }
        }

        // Якщо вимкнено показ мітки якості у повній картці:
        // - прибираємо можливі попередні мітки
        // - знімаємо анімацію завантаження
        // - і виходимо (рядок із IMDb/віком/статусом лишається)
        if (window.LQE_CONFIG && LQE_CONFIG.SHOW_FULL_CARD_LABEL === false) {
            if (LQE_CONFIG.LOGGING_GENERAL) {
                console.log("LQE-LOG", "Full-card quality label disabled by setting");
            }
            clearFullCardQualityElements(cardId, renderElement);
            removeLoadingAnimation(cardId, renderElement);
            return;
        }

        // Тип контенту та ключ кешу
        var isTvSeries = (normalizedCard.type === 'tv' || normalizedCard.name);
        var cacheKey = LQE_CONFIG.CACHE_VERSION + '_' + (isTvSeries ? 'tv_' : 'movie_') + normalizedCard.id;

        // Ручне перевизначення має найвищий пріоритет
        var manualOverrideData = LQE_CONFIG.MANUAL_OVERRIDES[cardId];
        if (manualOverrideData) {
            if (LQE_CONFIG.LOGGING_QUALITY) {
                console.log("LQE-QUALITY", "card: " + cardId + ", Found manual override:", manualOverrideData);
            }
            // bypassTranslation=true — показати саме наш напис (із можливим спрощенням через apply())
            updateFullCardQualityElement(null, manualOverrideData.full_label, cardId, renderElement, true);
            removeLoadingAnimation(cardId, renderElement);
            return;
        }

        // Якщо вимкнено мітки для серіалів — прибираємо лише нашу мітку/анімацію і виходимо
        if (isTvSeries && LQE_CONFIG.SHOW_QUALITY_FOR_TV_SERIES === false) {
            if (LQE_CONFIG.LOGGING_QUALITY) {
                console.log('LQE-QUALITY', 'card: ' + cardId + ', Quality feature disabled for TV series (as configured), skipping quality fetch.');
            }
            clearFullCardQualityElements(cardId, renderElement);
            removeLoadingAnimation(cardId, renderElement);
            return;
        }

        // Спроба взяти дані з кешу
        var cachedQualityData = getQualityCache(cacheKey);
        if (cachedQualityData) {
            if (LQE_CONFIG.LOGGING_QUALITY) {
                console.log("LQE-QUALITY", "card: " + cardId + ", Quality data found in cache:", cachedQualityData);
            }

            // Миттєво малюємо мітку з кешу
            updateFullCardQualityElement(
                cachedQualityData.quality_code,
                cachedQualityData.full_label,
                cardId,
                renderElement
            );

            // Якщо кеш застаріває — тихо оновимо у фоні, без впливу на інші елементи рядка
            if (Date.now() - cachedQualityData.timestamp > LQE_CONFIG.CACHE_REFRESH_THRESHOLD_MS) {
                if (LQE_CONFIG.LOGGING_QUALITY) {
                    console.log("LQE-QUALITY", "card: " + cardId + ", Cache is old, scheduling background refresh AND UI update.");
                }
                getBestReleaseFromJacred(normalizedCard, cardId, function (jrResult) {
                    if (jrResult && jrResult.quality && jrResult.quality !== 'NO') {
                        saveQualityCache(cacheKey, {
                            quality_code: jrResult.quality,
                            full_label: jrResult.full_label
                        }, cardId);
                        updateFullCardQualityElement(
                            jrResult.quality,
                            jrResult.full_label,
                            cardId,
                            renderElement
                        );
                        if (LQE_CONFIG.LOGGING_QUALITY) {
                            console.log("LQE-QUALITY", "card: " + cardId + ", Background cache and UI refresh completed.");
                        }
                    }
                });
            }

            // Анімацію прибираємо (рядок рейтингу завжди видимий)
            removeLoadingAnimation(cardId, renderElement);
            return;
        }

        // Кешу нема — робимо свіжий пошук
        clearFullCardQualityElements(cardId, renderElement);

        // показуємо лоадер рівно на час запиту
        addLoadingAnimation(cardId, renderElement);

        getBestReleaseFromJacred(normalizedCard, cardId, function (jrResult) {
            var qualityCode = (jrResult && jrResult.quality) || null;
            var fullTorrentTitle = (jrResult && jrResult.full_label) || null;

            if (qualityCode && qualityCode !== 'NO') {
                saveQualityCache(cacheKey, { quality_code: qualityCode, full_label: fullTorrentTitle }, cardId);
                updateFullCardQualityElement(qualityCode, fullTorrentTitle, cardId, renderElement);
            } else {
                clearFullCardQualityElements(cardId, renderElement);
            }
            removeLoadingAnimation(cardId, renderElement);
        });

        if (LQE_CONFIG.LOGGING_GENERAL) {
            console.log("LQE-LOG", "card: " + cardId + ", Full card quality processing initiated.");
        }
    }

    // ===================== ОБРОБКА СПИСКОВИХ КАРТОК =====================
    /**
     * Оновлює якість для спискової картки
     * @param {object|Element} cardInstance - інстанс картки Lampa або DOM елемент
     */
    function updateCardListQuality(cardInstance) {
        if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST", "Processing list card");
        var cardRoot = cardInstance && cardInstance.html ? (cardInstance.html[0] || cardInstance.html) : cardInstance;
        if (!cardRoot || !cardRoot.isConnected || !document.body.contains(cardRoot)) return;

        var cardView = cardRoot.querySelector ? cardRoot.querySelector('.card__view') : null;
        var cardData = cardInstance && cardInstance.data ? cardInstance.data : cardRoot.card_data;

        if (!cardData || !cardView) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST", "Invalid card data or view");
            return;
        }

        var isTvSeries = (getCardType(cardData) === 'tv');
        if (isTvSeries && LQE_CONFIG.SHOW_QUALITY_FOR_TV_SERIES === false) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST", "Skipping TV series");
            return;
        }

        // Нормалізуємо дані
        var normalizedCard = {
            id: cardData.id || '',
            title: cardData.title || cardData.name || '',
            original_title: cardData.original_title || cardData.original_name || '',
            type: getCardType(cardData),
            release_date: cardData.release_date || cardData.first_air_date || ''
        };

        var cardId = normalizedCard.id;
        if (!cardId) return;
        var cacheKey = makeCacheKey(LQE_CONFIG.CACHE_VERSION, normalizedCard.type, cardId);

        // Перевіряємо ручні перевизначення
        var manualOverrideData = LQE_CONFIG.MANUAL_OVERRIDES[cardId];
        if (manualOverrideData) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Manual override for list");
            updateCardListQualityElement(cardView, null, manualOverrideData.full_label, true);
            return;
        }

        // Перевіряємо кеш
        var cachedQualityData = getQualityCache(cacheKey);
        if (cachedQualityData) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', Using cached quality');
            updateCardListQualityElement(cardView, cachedQualityData.quality_code, cachedQualityData.full_label);

            // Фонове оновлення застарілого кешу
            if (Date.now() - cachedQualityData.timestamp > LQE_CONFIG.CACHE_REFRESH_THRESHOLD_MS) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Background refresh for list");
                if (inflightRequests[cacheKey]) return;
                inflightRequests[cacheKey] = true;
                getBestReleaseFromJacred(normalizedCard, cardId, function (jrResult) {
                    if (jrResult && jrResult.quality && jrResult.quality !== 'NO') {
                        saveQualityCache(cacheKey, {
                            quality_code: jrResult.quality,
                            full_label: jrResult.full_label
                        }, cardId);
                        if (document.body.contains(cardRoot)) {
                            updateCardListQualityElement(cardView, jrResult.quality, jrResult.full_label);
                        }
                    }
                    delete inflightRequests[cacheKey];
                });
            }
            return;
        }

        // Завантажуємо нові дані
        if (inflightRequests[cacheKey]) return;
        inflightRequests[cacheKey] = true;
        getBestReleaseFromJacred(normalizedCard, cardId, function (jrResult) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', JacRed result for list');

            if (!document.body.contains(cardRoot)) {
                if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'Card removed from DOM');
                delete inflightRequests[cacheKey];
                return;
            }

            var qualityCode = (jrResult && jrResult.quality) || null;
            var fullTorrentTitle = (jrResult && jrResult.full_label) || null;

            if (qualityCode && qualityCode !== 'NO') {
                if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', Quality found for list');
                saveQualityCache(cacheKey, {
                    quality_code: qualityCode,
                    full_label: fullTorrentTitle
                }, cardId);
                updateCardListQualityElement(cardView, qualityCode, fullTorrentTitle);
            } else {
                if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', No quality for list');
            }

            delete inflightRequests[cacheKey];
        });
    }

    // ===================== LIST CARD HOOK (onVisible) ===================
    // ======================= ІНІЦІАЛІЗАЦІЯ ПЛАГІНА ======================
    /**
     * Ініціалізує плагін якості
     */
    function initializeLampaQualityPlugin() {
        if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "Lampa Quality Enhancer: Initializing...");
        window.lampaQualityPlugin = true; // Позначаємо плагін як ініціалізований
        var card = Lampa.Maker.map('Card');
        if (!card || !card.Card) {
            if (LQE_CONFIG.LOGGING_GENERAL) console.log('LQE-LOG: Card module недоступний, плагін не ініціалізовано');
            return;
        }

        // Підписуємось на lifecycle картки, щоб працювати лише з видимими елементами.
        var originalOnVisible = card.Card.onVisible;
        card.Card.onVisible = function () {
            var self = this;
            if (typeof originalOnVisible === 'function') originalOnVisible.apply(self, arguments);
            updateCardListQuality(self);
        };
        // Підписуємося на події повної картки
        Lampa.Listener.follow('full', function (event) {
            if (event.type == 'complite') {
                var renderElement = event.object.activity.render();
                currentGlobalMovieId = event.data.movie.id;


                if (LQE_CONFIG.LOGGING_GENERAL) {
                    console.log("LQE-LOG", "Full card completed for ID:", currentGlobalMovieId);
                }

                processFullCardQuality(event.data.movie, renderElement);
            }
        });
        if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "Lampa Quality Enhancer: Initialized successfully!");
    }

    // Ініціалізуємо плагін якщо ще не ініціалізовано
    if (!window.lampaQualityPlugin) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeLampaQualityPlugin); // Чекаємо завантаження DOM
        } else {
            initializeLampaQualityPlugin(); // Ініціалізуємо негайно
        }
    }

    /* LQE: Settings (Interface -> "Мітки якості") */
    (function () {
        'use strict';

        var SETTINGS_KEY = 'lqe_user_settings_v1';
        var st;
        // Простий тост з fallback, якщо Lampa.Noty недоступний
        function lqeToast(msg) {
            try {
                if (Lampa && typeof Lampa.Noty === 'function') { Lampa.Noty(msg); return; }
                if (Lampa && Lampa.Noty && Lampa.Noty.show) { Lampa.Noty.show(msg); return; }
            } catch (e) { }
            var id = 'lqe_toast';
            var el = document.getElementById(id);
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:2rem;padding:.6rem 1rem;background:rgba(0,0,0,.85);color:#fff;border-radius:.5rem;z-index:9999;font-size:14px;transition:opacity .2s;opacity:0';
                document.body.appendChild(el);
            }
            el.textContent = msg;
            el.style.opacity = '1';
            setTimeout(function () { el.style.opacity = '0'; }, 1300);
        }

        function load() {
            var s = (Lampa.Storage.get(SETTINGS_KEY) || {});
            return {
                show_tv: (typeof s.show_tv === 'boolean') ? s.show_tv : true,
                show_full_card: (typeof s.show_full_card === 'boolean') ? s.show_full_card : true,
                label_style: s.label_style || 'short'
            };
        }

        function apply() {
            LQE_CONFIG.SHOW_QUALITY_FOR_TV_SERIES = !!st.show_tv;
            if (typeof LQE_CONFIG.SHOW_FULL_CARD_LABEL !== 'boolean') LQE_CONFIG.SHOW_FULL_CARD_LABEL = true;
            LQE_CONFIG.SHOW_FULL_CARD_LABEL = !!st.show_full_card;
            // Відображення саме повної мітки (не всього рядка)
            if (document && document.body) {
                document.body.classList.toggle('lqe-hide-full', !LQE_CONFIG.SHOW_FULL_CARD_LABEL);
            }

            LQE_CONFIG.USE_SIMPLE_QUALITY_LABELS = (st.label_style === 'short');
        }

        function save() {
            Lampa.Storage.set(SETTINGS_KEY, st);
            apply();
            lqeToast('Збережено');
        }

        // Кнопка "Очистити кеш"
        function lqeClearCache() {
            try {
                if (typeof clearQualityCache === 'function') clearQualityCache();
                else {
                    var key = (window.LQE_CONFIG && LQE_CONFIG.CACHE_KEY) ? LQE_CONFIG.CACHE_KEY : 'lampa_quality_cache';
                    Lampa.Storage.set(key, {}); // повне очищення кеш-об’єкта
                }
                lqeToast('Кеш очищено');
            } catch (e) {
                console.error('LQE clear cache error:', e);
            }
        }

        function registerUI() {
            // 1) Кнопка в «Інтерфейс», що відкриває нашу сторінку
            Lampa.Template.add('settings_lqe', '<div></div>');
            Lampa.SettingsApi.addParam({
                component: 'interface',
                param: { type: 'button', component: 'lqe' },
                field: {
                    name: 'Мітки якості',
                    description: 'Керування відображенням міток якості'
                },
                onChange: function () {
                    Lampa.Settings.create('lqe', {
                        template: 'settings_lqe',
                        onBack: function () { Lampa.Settings.create('interface'); }
                    });
                }
            });

            // 2) Перемикач (через select): мітки для серіалів
            Lampa.SettingsApi.addParam({
                component: 'lqe',
                param: {
                    name: 'lqe_show_tv',
                    type: 'select',
                    values: { 'true': 'Увімкнено', 'false': 'Вимкнено' },
                    default: String(st.show_tv)
                },
                field: { name: 'Відображати мітки якості для серіалів' },
                onChange: function (v) { st.show_tv = (String(v) === 'true'); save(); }
            });

            // 3) Перемикач (через select): мітка у повній картці
            Lampa.SettingsApi.addParam({
                component: 'lqe',
                param: {
                    name: 'lqe_show_full_card',
                    type: 'select',
                    values: { 'true': 'Увімкнено', 'false': 'Вимкнено' },
                    default: String(st.show_full_card)
                },
                field: { name: 'Відображати мітку якості у повній картці' },
                onChange: function (v) { st.show_full_card = (String(v) === 'true'); save(); }
            });

            // 4) Селектор стилю мітки
            Lampa.SettingsApi.addParam({
                component: 'lqe',
                param: {
                    name: 'lqe_label_style',
                    type: 'select',
                    values: {
                        short: 'Скорочене відображення (4K, FHD)',
                        full: 'Повне відображення (4K WEB-DL, 1080P BRRIP)'
                    },
                    default: st.label_style
                },
                field: { name: 'Стиль мітки якості' },
                onChange: function (v) { st.label_style = v; save(); }
            });

            // 5) Кнопка "Очистити кеш"
            Lampa.SettingsApi.addParam({
                component: 'lqe',
                param: { type: 'button', component: 'lqe_clear_cache' },
                field: { name: 'Очистити кеш' },
                onChange: function () { lqeClearCache(); }
            });
        }

        function start() {
            st = load();
            apply();

            if (Lampa && Lampa.SettingsApi && typeof Lampa.SettingsApi.addParam === 'function') {
                // !!! ЗАСТОСУВАТИ ЗМІНУ ТУТ: обгортаємо виклик у setTimeout(..., 0)
                setTimeout(registerUI, 0);
            }
        }

        // Реєструємо після готовності застосунку
        if (window.appready) start();
        else if (Lampa && Lampa.Listener) Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });

        // при застосуванні/збереженні:
        //LQE_CONFIG.SHOW_FULL_CARD_LABEL = !!st.show_full_card;

    })();

})();
