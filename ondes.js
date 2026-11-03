(function () {
    'use strict';

    if (window.plugin_uakino_online_theme_ready) return;
    window.plugin_uakino_online_theme_ready = true;

    var SVG_REFRESH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>';
    var SVG_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>';
    var SVG_STAR = '<svg viewBox="0 0 24 24" fill="currentColor" style="width:0.9em;height:0.9em;margin-right:0.25em;vertical-align:-0.1em;display:inline-block;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

    var tmdbSeasonCache = {};

    // --- CSS СТИЛІ UAKINO ДИЗАЙНУ ---
    var CSS = '<style id="uakino-online-theme">' +
        /* ПОВНЕ ВИДАЛЕННЯ ЛІВОЇ ПАНЕЛІ ОПИСУ ДЛЯ ВСІХ ОНЛАЙН АКТИВНОСТЕЙ (БЕЗ :has ДЛЯ СУМІСНОСТІ З ТВ) */
        'body .uakino-online-theme-active .explorer__left, ' +
        'body .uakino-online-theme-active .files__left, ' +
        'body .explorer.uakino-online-theme-active .explorer__left, ' +
        'body .files.uakino-online-theme-active .files__left { ' +
        '  display: none !important; width: 0 !important; max-width: 0 !important; ' +
        '  min-width: 0 !important; flex: 0 0 0% !important; padding: 0 !important; margin: 0 !important; ' +
        '  overflow: hidden !important; pointer-events: none !important; ' +
        '}' +

        /* РОЗШИРЕННЯ ОСНОВНОЇ ЧАСТИНИ НА 100% ШИРИНИ ТА ЗАХИСТ ВІД ОБРІЗАННЯ КУРСОРА */
        'body .uakino-online-theme-active .explorer, ' +
        'body .uakino-online-theme-active .files, ' +
        'body .explorer.uakino-online-theme-active, ' +
        'body .files.uakino-online-theme-active { ' +
        '  width: 100% !important; max-width: 100% !important; display: block !important; ' +
        '  margin-left: 0 !important; padding: 0 !important; box-sizing: border-box !important; ' +
        '}' +

        'body .uakino-online-theme-active .explorer__files, ' +
        'body .uakino-online-theme-active .files__body, ' +
        'body .explorer.uakino-online-theme-active .explorer__files, ' +
        'body .files.uakino-online-theme-active .files__body { ' +
        '  width: 100% !important; max-width: 100% !important; min-width: 100% !important; ' +
        '  flex: 1 1 100% !important; flex-grow: 1 !important; ' +
        '  margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; ' +
        '  overflow: visible !important; ' +
        '}' +

        'body .uakino-online-theme-active .explorer__files-head, ' +
        'body .explorer.uakino-online-theme-active .explorer__files-head { ' +
        '  width: 100% !important; max-width: 100% !important; ' +
        '  margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; ' +
        '  overflow: visible !important; ' +
        '}' +

        /* ЗАБОРОНЯЄМО БАТЬКІВСЬКИМ БЛОКАМ ОБРІЗАТИ РАМКИ */
        'body .uakino-online-theme-active .scroll.scroll--horizontal, ' +
        'body .uakino-online-theme-active .filter { ' +
        '  overflow: visible !important; ' +
        '}' +

        /* ТЕМНИЙ КІНЕМАТОГРАФІЧНИЙ ФОН */
        'body .uakino-online-theme-active { background: #0b0d11 !important; }' +
        'body .uakino-online-theme-active .explorer, ' +
        'body .uakino-online-theme-active .scroll { background: transparent !important; }' +

        /* ПРИБИРАЄМО МАСКУ-ЗАТЕМНЕННЯ ТА ВЕЛИКИЙ ВІДСТУП У SCROLL__CONTENT */
        'body .uakino-online-theme-active .scroll--mask, ' +
        'body .explorer.uakino-online-theme-active .scroll--mask, ' +
        'body .files.uakino-online-theme-active .scroll--mask, ' +
        'body .scroll--mask { ' +
        '  -webkit-mask-image: none !important; mask-image: none !important; ' +
        '}' +
        'body .uakino-online-theme-active .scroll__content, ' +
        'body .explorer.uakino-online-theme-active .scroll__content, ' +
        'body .files.uakino-online-theme-active .scroll__content, ' +
        'body .uakino-online-theme-active .explorer__files .scroll__content, ' +
        'body .explorer__files-body .scroll__content, ' +
        'body .explorer__files-body .scroll--mask .scroll__content, ' +
        'body .uakino-online-theme-active .scroll--mask .scroll__content { ' +
        '  padding: 0 !important; padding-top: 0 !important; padding-bottom: 2em !important; margin-top: 0 !important; ' +
        '}' +

        /* ОСНОВНА ЧАСТИНА З КАРТКАМИ — БЕЗ ЗАТЕМНЕННЯ ПОВЕРХ КАРТОК */
        'body .uakino-online-theme-active .explorer__files-body { ' +
        '  position: relative !important; width: 100% !important; overflow: visible !important; ' +
        '}' +

        /* HERO HEADER (Шапка фільму/серіалу: на всю ширину екрану, 0 відступів, 0 заокруглень, кнопки на фоні) */
        '.uakino-online__head { ' +
        '  position: relative !important; width: 100% !important; max-width: 100% !important; min-width: 100% !important; ' +
        '  margin: 0 !important; padding: 1.1em 2.8em 0.5em 2.8em !important; border-radius: 0 !important; ' +
        '  min-height: 12.5em !important; box-sizing: border-box !important; overflow: hidden !important; ' +
        '  display: flex !important; flex-direction: column !important; justify-content: flex-end !important; ' +
        '  background: #0b0d11 !important; ' +
        '}' +
        '.uakino-online__hero-bg { ' +
        '  position: absolute !important; left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important; ' +
        '  background-size: cover !important; background-position: center 25% !important; opacity: 0.88 !important; z-index: 0 !important; ' +
        '  pointer-events: none !important; ' +
        '}' +
        '.uakino-online__hero-shade { ' +
        '  position: absolute !important; left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important; ' +
        '  background: linear-gradient(to right, rgba(11,13,17,0.92) 0%, rgba(11,13,17,0.55) 45%, rgba(11,13,17,0.1) 80%, transparent 100%) !important; z-index: 1 !important; ' +
        '  pointer-events: none !important; ' +
        '}' +
        /* РОЗЧИНЕННЯ БАНЕРА ЗНИЗУ ГРАДІЄНТОМ ПІД КАРТКАМИ СЕРІЙ */
        '.uakino-online__hero-fade-bottom { ' +
        '  position: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important; ' +
        '  height: 55% !important; ' +
        '  background: linear-gradient(to bottom, rgba(11,13,17,0) 0%, rgba(11,13,17,0.3) 30%, rgba(11,13,17,0.85) 75%, #0b0d11 100%) !important; ' +
        '  pointer-events: none !important; z-index: 2 !important; ' +
        '}' +

        /* ВЕРХНЯ ЧАСТИНА ХЕРО БАНЕРА (ПОСТЕР + ТЕКСТ) */
        '.uakino-online__head-body { ' +
        '  position: relative !important; display: flex !important; align-items: center !important; ' +
        '  width: 100% !important; z-index: 3 !important; margin-bottom: 0.6em !important; ' +
        '}' +
        
        /* ПОСТЕР ЯК АКТИВНА КНОПКА (ПОВЕРНЕННЯ ДО КАРТКИ ФІЛЬМУ) */
        '.uakino-online__poster { ' +
        '  position: relative !important; width: 4.6em !important; height: 6.8em !important; ' +
        '  border-radius: 0.6em !important; margin-right: 1.4em !important; flex-shrink: 0 !important; ' +
        '  border: 3px solid rgba(255,255,255,0.25) !important; overflow: hidden !important; ' +
        '  cursor: pointer !important; box-sizing: border-box !important; transition: border-color 0.18s ease !important; ' +
        '  outline: none !important; transform: none !important; ' +
        '}' +
        '.uakino-online__poster > img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }' +
        '.uakino-online__poster.focus, ' +
        '.uakino-online__poster:hover { border: 3px solid #ffffff !important; transform: none !important; outline: none !important; box-shadow: none !important; }' +

        '.uakino-online__head-text { position: relative !important; max-width: 82% !important; z-index: 3 !important; }' +
        '.uakino-online__head-title { font-size: 1.85em !important; font-weight: 700 !important; line-height: 1.15 !important; letter-spacing: -0.01em !important; color: #fff !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; text-shadow: 0 2px 4px rgba(0,0,0,0.6) !important; }' +
        '.uakino-online__head-sub { margin-top: 0.35em !important; font-size: 0.95em !important; color: rgba(255,255,255,0.8) !important; display: flex !important; align-items: center !important; flex-wrap: wrap !important; text-shadow: 0 1px 3px rgba(0,0,0,0.6) !important; }' +
        '.uakino-online__badge { display: inline-block !important; margin-left: 0.6em !important; padding: 0.08em 0.45em !important; border: 1px solid rgba(255,255,255,0.7) !important; border-radius: 0.3em !important; font-size: 0.8em !important; font-weight: 700 !important; color: #fff !important; vertical-align: middle !important; line-height: 1.1 !important; }' +
        '.uakino-online__head-descr { margin-top: 0.45em !important; font-size: 0.88em !important; line-height: 1.35 !important; color: rgba(255,255,255,0.7) !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow: hidden !important; text-overflow: ellipsis !important; text-shadow: 0 1px 3px rgba(0,0,0,0.6) !important; }' +

        /* КОНТЕЙНЕР ДЛЯ КНОПОК ПОВЕРХ КАРТИНКИ НА ХЕРО БАНЕРІ */
        '.uakino-online__hero-buttons { ' +
        '  position: relative !important; width: 100% !important; z-index: 3 !important; ' +
        '  display: flex !important; align-items: center !important; margin: 0 !important; ' +
        '  padding: 0 !important; overflow: visible !important; ' +
        '}' +

        /* ПОВНЕ ПРИХОВУВАННЯ СТАНДАРТНИХ ФІЛЬТРІВ ТОРРЕНТІВ (ПОШУК, СОРТУВАННЯ, ФІЛЬТР) ТА ЗАЙВИХ БЛОКІВ */
        'body .filter--search, ' +
        'body .filter--sort, ' +
        'body .filter--filter, ' +
        'body .simple-button, ' +
        'body .simple-button--filter, ' +
        'body .simple-button--sort, ' +
        'body .simple-button--search, ' +
        'body [data-name="search"], ' +
        'body [data-name="sort"], ' +
        'body [data-name="filter"], ' +
        'body .explorer__files-head > *:not(.uakino-online__head), ' +
        'body .uakino-online-theme-active .explorer__files-head > *:not(.uakino-online__head), ' +
        'body .uakino-online__hero-buttons .filter, ' +
        'body .uakino-online__hero-buttons .torrent-filter, ' +
        'body .uakino-online-theme-active .filter:empty, ' +
        'body .uakino-online-theme-active .torrent-filter:empty, ' +
        'body [style*="display: none"], ' +
        'body .hide, ' +
        'body .bal-source-btn[style*="display: none"], ' +
        'body .bal-source-btn.hide { ' +
        '  display: none !important; visibility: hidden !important; ' +
        '  width: 0 !important; height: 0 !important; min-height: 0 !important; max-height: 0 !important; ' +
        '  margin: 0 !important; padding: 0 !important; border: none !important; ' +
        '  overflow: hidden !important; pointer-events: none !important; ' +
        '}' +

        /* ДЛЯ ФІЛЬМІВ — ХОВАЄМО КНОПКУ СЕЗОНІВ */
        'body.online-theme--movie .bal-btn-season, ' +
        'body .uakino-online-theme-active.is-movie .bal-btn-season, ' +
        'body .uakino-online-theme-active.is-movie .filter--season, ' +
        'body .uakino-online-theme-active.is-movie [data-name="season"] { ' +
        '  display: none !important; ' +
        '}' +

        /* КНОПКИ ДЛЯ ПЛАНШЕТІВ ТА ПК: НАМАГАТИСЯ В ОДИН РЯД, ЯКЩО НЕ ПОМІЩАЮТЬСЯ — ПЕРЕНОСИТИ НА ДРУГИЙ */
        'body .bal-btns-wrapper, ' +
        'body .uakino-online__hero-buttons, ' +
        'body .uakino-online__hero-buttons .bal-btns-wrapper, ' +
        'body .uakino-online-theme-active .filter .scroll__body, ' +
        'body .uakino-online-theme-active .explorer__files-head .scroll__body { ' +
        '  display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; ' +
        '  align-items: center !important; justify-content: flex-start !important; ' +
        '  width: 100% !important; max-width: 100% !important; margin: 0 !important; ' +
        '  padding: 0.1em 0 !important; gap: 0.75em !important; ' +
        '  box-sizing: border-box !important; overflow: visible !important; ' +
        '}' +

        /* КНОПКИ-ПІГУЛКИ У ЗВИЧАЙНОМУ СТАНІ (ПК ТА ПЛАНШЕТИ — АВТО-ШИРИНА) */
        'body .bal-btns-wrapper .selector, ' +
        'body .bal-source-btn:not([style*="display: none"]):not(.hide), ' +
        'body .bal-btn-source:not([style*="display: none"]):not(.hide), ' +
        'body .bal-btn-season:not([style*="display: none"]):not(.hide), ' +
        'body .bal-btn-voice:not([style*="display: none"]):not(.hide), ' +
        'body .bal-btn-refine:not([style*="display: none"]):not(.hide), ' +
        'body .bal-btn-update:not([style*="display: none"]):not(.hide), ' +
        'body .online-theme-btn-update:not([style*="display: none"]):not(.hide), ' +
        'body .uakino-online__hero-buttons .selector { ' +
        '  display: inline-flex !important; align-items: center !important; justify-content: center !important; ' +
        '  padding: 0.55em 1.35em !important; min-height: 2.5em !important; border-radius: 2em !important; ' +
        '  background: rgba(255, 255, 255, 0.14) !important; border: 3px solid transparent !important; ' +
        '  -webkit-backdrop-filter: blur(8px) !important; backdrop-filter: blur(8px) !important; ' +
        '  font-size: 1.1em !important; font-weight: 500 !important; color: #ffffff !important; ' +
        '  white-space: nowrap !important; box-sizing: border-box !important; ' +
        '  flex: 0 0 auto !important; width: auto !important; max-width: 100% !important; ' +
        '  cursor: pointer !important; margin: 0 !important; outline: none !important; ' +
        '  transform: none !important; ' +
        '  transition: background-color 0.18s ease, border-color 0.18s ease !important; ' +
        '}' +
        'body .bal-source-btn span, ' +
        'body .bal-source-btn span.source-color, ' +
        'body .bal-source-btn span.source-name-text, ' +
        'body .online-theme-btn-update span { color: #ffffff !important; }' +

        /* ФОКУС / НАВЕДЕННЯ НА КНОПКИ — БЕЗ ЗБІЛЬШЕННЯ РОЗМІРУ ЧИ ЖИРНОСТІ ТЕКСТУ, ТІЛЬКИ ЧІТКА БІЛА РАМКА 3PX */
        'body .bal-btns-wrapper .selector.focus, ' +
        'body .bal-btns-wrapper .selector:hover, ' +
        'body .bal-btns-wrapper .selector:active, ' +
        'body .bal-source-btn.focus, ' +
        'body .bal-source-btn:hover, ' +
        'body .bal-source-btn:active, ' +
        'body .online-theme-btn-update.focus, ' +
        'body .online-theme-btn-update:hover, ' +
        'body .online-theme-btn-update:active, ' +
        'body .uakino-online__hero-buttons .selector.focus, ' +
        'body .uakino-online__hero-buttons .selector:hover { ' +
        '  background: rgba(255, 255, 255, 0.14) !important; ' +
        '  color: #ffffff !important; ' +
        '  border: 3px solid #ffffff !important; ' +
        '  border-color: #ffffff !important; ' +
        '  border-radius: 2em !important; ' +
        '  outline: none !important; ' +
        '  box-shadow: none !important; ' +
        '  text-shadow: none !important; ' +
        '  transform: none !important; ' +
        '  font-size: 1.1em !important; ' +
        '  font-weight: 500 !important; ' +
        '  z-index: 5 !important; ' +
        '}' +
        'body .bal-source-btn.focus svg, ' +
        'body .bal-source-btn:hover svg, ' +
        'body .online-theme-btn-update.focus svg, ' +
        'body .online-theme-btn-update:hover svg, ' +
        'body .simple-button.focus svg, ' +
        'body .simple-button:hover svg { ' +
        '  stroke: #ffffff !important; fill: none !important; filter: none !important; transform: none !important; ' +
        '}' +
        'body .bal-source-btn.focus span, ' +
        'body .bal-source-btn:hover span, ' +
        'body .bal-source-btn.focus span.source-color, ' +
        'body .bal-source-btn:hover span.source-color, ' +
        'body .bal-source-btn.focus span.source-name-text, ' +
        'body .bal-source-btn:hover span.source-name-text, ' +
        'body .online-theme-btn-update.focus span, ' +
        'body .online-theme-btn-update:hover span { ' +
        '  color: #ffffff !important; font-weight: 500 !important; font-size: 1em !important; text-shadow: none !important; ' +
        '}' +

        'body .bal-source-btn svg, ' +
        'body .online-theme-btn-update svg { width: 1.15em !important; height: 1.15em !important; margin-right: 0.45em !important; stroke: #ffffff !important; fill: none !important; stroke-width: 2.3 !important; stroke-linecap: round !important; stroke-linejoin: round !important; flex-shrink: 0 !important; }' +

        /* АНІМАЦІЯ КНОПКИ ОНОВИТИ */
        '@keyframes uakino-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
        'body .online-theme-btn-update.is-refreshing svg, ' +
        'body .bal-btn-update.is-refreshing svg { animation: uakino-spin 0.75s linear infinite !important; }' +

        /* СІТКА КАРТОК 16:9 — РОЗТАШОВУЄТЬСЯ ВІДРАЗУ ПІД РОЗЧИНЕНИМ БАНЕРОМ */
        'body .torrent-list, ' +
        'body .explorer__files .scroll__body { ' +
        '  display: flex !important; flex-wrap: wrap !important; align-items: flex-start !important; ' +
        '  justify-content: flex-start !important; margin: 0 !important; ' +
        '  padding: 0.2em 2em 3em 2em !important; box-sizing: border-box !important; ' +
        '  overflow: visible !important; ' +
        '}' +

        /* КАРТКА У ЗВИЧАЙНОМУ СТАНІ — ПІД ГРАДІЄНТОМ */
        'body .online-prestige.online-prestige { ' +
        '  display: flex !important; flex-direction: column !important; align-items: stretch !important; ' +
        '  width: calc(25% - 1.6em) !important; margin: 0.2em 0.8em 1.6em !important; ' +
        '  background-color: transparent !important; border-radius: 1em !important; ' +
        '  border: none !important; position: relative !important; z-index: 2 !important; ' +
        '  box-sizing: border-box !important; will-change: transform !important; ' +
        '  transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1) !important; ' +
        '  cursor: pointer !important; overflow: visible !important; outline: none !important; ' +
        '}' +

        /* ЯКЩО В СПИСКУ ЛИШЕ 1 ВІДЕО */
        'body .online-prestige:only-child { width: calc(33.333% - 1.6em) !important; max-width: 24em !important; }' +

        /* 16:9 ПРЕВ\'Ю КАРТКИ */
        'body .online-prestige__img { ' +
        '  position: relative !important; width: 100% !important; height: 0 !important; min-height: 0 !important; ' +
        '  padding-top: 56.25% !important; border-radius: 0.9em !important; background: #1b1f27 center/cover no-repeat !important; ' +
        '  overflow: hidden !important; border: 3px solid transparent !important; box-sizing: border-box !important; ' +
        '  box-shadow: 0 0.6em 1.4em rgba(0, 0, 0, 0.45) !important; ' +
        '  transition: border-color 0.2s ease !important; flex-shrink: 0 !important; ' +
        '}' +
        'body .online-prestige__img > img { ' +
        '  position: absolute !important; left: 0 !important; top: 0 !important; ' +
        '  width: 100% !important; height: 100% !important; object-fit: cover !important; ' +
        '  border-radius: 0.7em !important; display: block !important; opacity: 1 !important; visibility: visible !important; ' +
        '}' +

        /* ТЕМНИЙ ГРАДІЄНТ ЗНИЗУ ПРЕВ\'Ю */
        'body .online-prestige__img::after { ' +
        '  content: "" !important; position: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important; ' +
        '  height: 55% !important; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%) !important; ' +
        '  pointer-events: none !important; z-index: 1 !important; ' +
        '}' +

        /* НОМЕР СЕРІЇ ЗНИЗУ ЗЛІВА */
        'body .online-prestige__episode-number { ' +
        '  position: absolute !important; inset: auto !important; left: 0.55em !important; bottom: 0.35em !important; ' +
        '  top: auto !important; right: auto !important; width: auto !important; height: auto !important; ' +
        '  font-size: 1.9em !important; font-weight: 800 !important; color: #ffffff !important; ' +
        '  background: transparent !important; text-shadow: 0 0.1em 0.4em rgba(0, 0, 0, 0.8) !important; ' +
        '  pointer-events: none !important; z-index: 2 !important; display: flex !important; ' +
        '}' +
        'body .online-prestige__episode-number:empty { display: none !important; }' +

        /* КНОПКА PLAY ПО ЦЕНТРУ КАРТКИ — ПОВНІСТЮ ПРИХОВАНО ДЛЯ ВСІХ КАРТОК */
        'body .online-prestige__play, ' +
        'body .online-prestige.focus .online-prestige__play, ' +
        'body .online-prestige:hover .online-prestige__play { ' +
        '  display: none !important; visibility: hidden !important; ' +
        '  opacity: 0 !important; pointer-events: none !important; ' +
        '  width: 0 !important; height: 0 !important; ' +
        '}' +
        'body.online-theme--movie .online-prestige__episode-number, ' +
        'body .is-movie .online-prestige__episode-number { ' +
        '  display: none !important; visibility: hidden !important; ' +
        '}' +

        /* ІНДИКАТОР ПЕРЕГЛЯНУТО */
        'body .online-prestige__viewed { ' +
        '  position: absolute !important; top: 0.55em !important; right: 0.55em !important; ' +
        '  left: auto !important; transform: none !important; width: 1.65em !important; height: 1.65em !important; ' +
        '  padding: 0 !important; border-radius: 50% !important; background: rgba(0, 0, 0, 0.65) !important; ' +
        '  -webkit-backdrop-filter: blur(4px) !important; backdrop-filter: blur(4px) !important; ' +
        '  display: flex !important; align-items: center !important; justify-content: center !important; ' +
        '  color: #ffffff !important; z-index: 3 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.4) !important; ' +
        '}' +
        'body .online-prestige__viewed svg { width: 0.95em !important; height: 0.95em !important; stroke: #ffffff !important; fill: none !important; stroke-width: 3 !important; }' +

        /* ТАЙМЛАЙН ПРОГРЕСУ — ВИКЛЮЧНО ВНИЗУ КАРТИНКИ (ЖОДНИХ ЛІНІЙ НАД/ПІД ТЕКСТОМ) */
        'body .online-prestige__body .online-prestige__timeline, ' +
        'body .online-prestige__body .time-line, ' +
        'body .online-prestige__body > .online-prestige__timeline, ' +
        'body .online-prestige__footer .time-line, ' +
        'body .online-prestige__footer .online-prestige__timeline { ' +
        '  display: none !important; visibility: hidden !important; ' +
        '  height: 0 !important; min-height: 0 !important; ' +
        '  margin: 0 !important; padding: 0 !important; ' +
        '  border: none !important; background: transparent !important; ' +
        '  overflow: hidden !important; pointer-events: none !important; ' +
        '}' +
        'body .online-prestige__img > .online-prestige__timeline { ' +
        '  display: none; position: absolute !important; left: 0.8em !important; right: 0.8em !important; bottom: 0.55em !important; ' +
        '  margin: 0 !important; padding: 0 !important; z-index: 5 !important; height: 4px !important; border-radius: 2px !important; ' +
        '  overflow: hidden !important; background: rgba(255, 255, 255, 0.25) !important; pointer-events: none !important; ' +
        '}' +
        'body .online-prestige__img > .online-prestige__timeline.has-progress, ' +
        'body .online-prestige__img > .online-prestige__timeline:not(:empty) { display: block !important; }' +
        'body .online-prestige__img > .online-prestige__timeline > .time-line { ' +
        '  display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important; ' +
        '  width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background: transparent !important; ' +
        '}' +
        'body .online-prestige__img > .online-prestige__timeline > .time-line.hide { display: none !important; }' +
        'body .online-prestige__img > .online-prestige__timeline > .time-line > div { ' +
        '  height: 100% !important; background: #ffffff !important; border-radius: 2px !important; transition: width 0.25s linear !important; ' +
        '  box-shadow: 0 0 3px rgba(255,255,255,0.7) !important; ' +
        '}' +

        /* НАЗВА ТА ОПИС КАРТКИ — ЧИСТИЙ ТЕКСТ */
        'body .online-prestige__body { padding: 0.65em 0.2em 0 !important; background: transparent !important; display: flex !important; flex-direction: column !important; width: 100% !important; box-sizing: border-box !important; position: relative !important; }' +
        'body .online-prestige__head { display: block !important; margin: 0 !important; }' +
        'body .online-prestige__title { font-size: 1.05em !important; font-weight: 600 !important; color: rgba(255,255,255,0.9) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; line-height: 1.25 !important; }' +
        'body .online-prestige__footer { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-top: 0.25em !important; }' +
        'body .online-prestige__info { font-size: 0.85em !important; color: rgba(255,255,255,0.55) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; display: flex !important; align-items: center !important; flex-wrap: wrap !important; }' +

        /* СТАТУС ПЕРЕГЛЯНУТО */
        'body .online-prestige.is-viewed .online-prestige__title { color: rgba(255, 255, 255, 0.65) !important; }' +
        'body .online-prestige.is-viewed .online-prestige__img > img { filter: brightness(0.85) !important; }' +

        /* ПОВНЕ ВИДАЛЕННЯ СТАРИХ РАМОК ТА PSEUDO-ELEMENTS, ЩО ПЕРЕКРЕСЛЮВАЛИ ТЕКСТ */
        'body .online-prestige::after, ' +
        'body .online-prestige::before, ' +
        'body .online-prestige.focus::after, ' +
        'body .online-prestige.focus::before, ' +
        'body .online-prestige:hover::after, ' +
        'body .online-prestige:hover::before { ' +
        '  display: none !important; content: none !important; border: none !important; outline: none !important; box-shadow: none !important; ' +
        '}' +
        'body .online-prestige, ' +
        'body .online-prestige.focus, ' +
        'body .online-prestige:hover { ' +
        '  border: none !important; outline: none !important; box-shadow: none !important; ' +
        '}' +

        /* ФОКУС КАРТКИ — БЕЗ РОЗМИВАННЯ/СВІЧЕННЯ, ТІЛЬКИ ЧІТКА БІЛА РАМКА 3PX НАВКОЛО ПРЕВ\'Ю, НАД ГРАДІЄНТОМ */
        'body .online-prestige.focus, ' +
        'body .online-prestige:hover { ' +
        '  transform: scale(1.04) !important; z-index: 30 !important; ' +
        '  background: transparent !important; outline: none !important; ' +
        '}' +
        'body .online-prestige.focus .online-prestige__img, ' +
        'body .online-prestige:hover .online-prestige__img { ' +
        '  border-color: #ffffff !important; ' +
        '  box-shadow: none !important; ' +
        '}' +
        'body .online-prestige.focus .online-prestige__title, ' +
        'body .online-prestige:hover .online-prestige__title { color: #ffffff !important; font-weight: 700 !important; }' +

        /* АДАПТИВНІСТЬ ДЛЯ ЕКРАНІВ */
        '@media screen and (max-width: 1200px) { ' +
        '  body .online-prestige.online-prestige { width: calc(33.333% - 1.6em) !important; } ' +
        '}' +

        /* ВЕРТИКАЛЬНИЙ ЕКРАН (PORTRAIT) ТА ТЕЛЕФОНИ (MAX-WIDTH: 600PX): ' +
           КНОПКИ ОДНА ЗА ОДНОЮ ВНИЗ, 1 КНОПКА ПО ШИРИНІ НА 1 РЯД */
        '@media screen and (orientation: portrait), screen and (max-width: 600px) { ' +
        '  body .bal-btns-wrapper, ' +
        '  body .uakino-online__hero-buttons, ' +
        '  body .uakino-online__hero-buttons .bal-btns-wrapper, ' +
        '  body .uakino-online-theme-active .filter .scroll__body, ' +
        '  body .uakino-online-theme-active .explorer__files-head .scroll__body { ' +
        '    display: flex !important; flex-direction: column !important; flex-wrap: nowrap !important; ' +
        '    align-items: stretch !important; justify-content: flex-start !important; ' +
        '    width: 100% !important; max-width: 100% !important; ' +
        '    gap: 0.55em !important; padding: 0.3em 0 !important; margin: 0 !important; ' +
        '  }' +
        '  body .bal-btns-wrapper .selector, ' +
        '  body .bal-btns-wrapper .bal-source-btn, ' +
        '  body .bal-source-btn, ' +
        '  body .bal-btn-source, ' +
        '  body .bal-btn-season, ' +
        '  body .bal-btn-voice, ' +
        '  body .bal-btn-refine, ' +
        '  body .bal-btn-update, ' +
        '  body .online-theme-btn-update, ' +
        '  body .uakino-online__hero-buttons .selector { ' +
        '    display: flex !important; align-items: center !important; justify-content: center !important; ' +
        '    width: 100% !important; min-width: 100% !important; max-width: 100% !important; ' +
        '    flex: 1 1 100% !important; margin: 0 !important; padding: 0.6em 1em !important; ' +
        '    text-align: center !important; min-height: 2.7em !important; box-sizing: border-box !important; ' +
        '  }' +
        '  .uakino-online__head { ' +
        '    padding: 1.2em 1.2em 0.5em 1.2em !important; margin: 0 !important; ' +
        '    width: 100% !important; max-width: 100% !important; border-radius: 0 !important; ' +
        '    min-height: auto !important; ' +
        '  }' +
        '  body .torrent-list, body .explorer__files .scroll__body { ' +
        '    padding: 0.2em 1.2em 3em 1.2em !important; ' +
        '  }' +
        '  body .online-prestige.online-prestige, ' +
        '  body .online-prestige:only-child { ' +
        '    width: 100% !important; min-width: 100% !important; max-width: 100% !important; ' +
        '    margin: 0.3em 0 1.2em 0 !important; ' +
        '  }' +
        '  .uakino-online__poster { width: 3.8em !important; height: 5.6em !important; margin-right: 1em !important; } ' +
        '  .uakino-online__head-title { font-size: 1.4em !important; } ' +
        '  .uakino-online__head-text { max-width: calc(100% - 4.8em) !important; } ' +
        '  .uakino-online__head-descr { display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow: hidden !important; font-size: 0.82em !important; } ' +
        '}' +
        '@media screen and (max-width: 480px) { ' +
        '  .uakino-online__head-descr { display: none !important; } ' +
        '}' +
        '</style>';

    function injectStyles() {
        if ($('#uakino-online-theme').length) {
            $('#uakino-online-theme').remove();
        }
        $('head').append(CSS);
    }

    function tmdbImage(path, size) {
        if (!path) return '';
        size = size || 'w780';
        if (window.Lampa && Lampa.TMDB && Lampa.TMDB.image) {
            return Lampa.TMDB.image('t/p/' + size + path);
        }
        return 'https://image.tmdb.org/t/p/' + size + path;
    }

    // Отримання даних сезону з TMDB (кешується)
    function getTmdbSeason(tvId, seasonNum, callback) {
        if (!tvId) return callback(null);
        var cacheKey = tvId + '_' + seasonNum;
        if (tmdbSeasonCache[cacheKey]) return callback(tmdbSeasonCache[cacheKey]);

        var apiKey = (window.Lampa && Lampa.Storage && Lampa.Storage.get('tmdb_api_key')) || '4cb1eeab94f45affe2536f2c684a5c9e';
        var lang = (window.Lampa && Lampa.Storage && Lampa.Storage.get('language')) || 'uk-UA';
        var url = 'https://api.themoviedb.org/3/tv/' + tvId + '/season/' + seasonNum + '?api_key=' + apiKey + '&language=' + lang;

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            timeout: 5000,
            success: function (res) {
                tmdbSeasonCache[cacheKey] = res;
                callback(res);
            },
            error: function () {
                callback(null);
            }
        });
    }

    function buildHeroHeader(movie) {
        if (!movie) return null;
        var title = movie.title || movie.name || '';
        var orig = movie.original_title || movie.original_name || '';
        var year = (movie.release_date || movie.first_air_date || '').split('-')[0] || movie.year || '';
        var poster = movie.poster_path ? tmdbImage(movie.poster_path, 'w300') : (movie.img || '');
        var backdrop = movie.backdrop_path ? (tmdbImage(movie.backdrop_path, 'w1280') || tmdbImage(movie.backdrop_path, 'w780')) : (poster || '');
        var vote = movie.vote_average ? parseFloat(movie.vote_average).toFixed(1) : '';

        var head = $('<div class="uakino-online__head">' +
            '<div class="uakino-online__hero-bg"></div>' +
            '<div class="uakino-online__hero-shade"></div>' +
            '<div class="uakino-online__hero-fade-bottom"></div>' +
            '<div class="uakino-online__head-body">' +
                '<div class="uakino-online__head-text">' +
                    '<div class="uakino-online__head-title"></div>' +
                    '<div class="uakino-online__head-sub"></div>' +
                    '<div class="uakino-online__head-descr"></div>' +
                '</div>' +
            '</div>' +
            '<div class="uakino-online__hero-buttons"></div>' +
        '</div>');

        if (backdrop) {
            head.find('.uakino-online__hero-bg').css('background-image', 'url("' + backdrop + '")');
        }

        // Постер як активна кнопка-селектор для повернення назад до картки фільму
        if (poster) {
            var posterBtn = $('<div class="uakino-online__poster selector" tabindex="0" title="Назад до картки"><img src="' + poster + '" alt=""></div>');
            posterBtn.on('hover:focus', function () {
                if (window.Lampa && Lampa.Helper) {
                    Lampa.Helper.show('bal_file', 'Повернутися до картки фільму', posterBtn);
                }
            });
            posterBtn.on('hover:enter click', function (e) {
                e.stopPropagation();
                if (window.Lampa && Lampa.Activity && Lampa.Activity.back) {
                    Lampa.Activity.back();
                }
            });
            head.find('.uakino-online__head-text').before(posterBtn);
        }

        head.find('.uakino-online__head-title').text(title);

        var subParts = [];
        if (orig && orig !== title) subParts.push(orig);
        if (year) subParts.push(year);
        if (vote && vote > 0) subParts.push(SVG_STAR + ' ' + vote);
        head.find('.uakino-online__head-sub').html(subParts.join(' &nbsp;·&nbsp; '));

        if (movie.overview) {
            head.find('.uakino-online__head-descr').text(movie.overview);
        }

        return head;
    }

    // Прикріплюємо виключно потрібні кнопки онлайн-джерел прямо поверх фону херо банера
    function attachButtonsToHero(render, hero) {
        if (!hero || !hero.length) return;
        var heroBtns = hero.find('.uakino-online__hero-buttons');
        if (!heroBtns.length) return;

        // 1. Повністю видаляємо небажані стандартні фільтри торрентів (пошук, сортування, фільтр)
        render.find('.filter--search, .filter--sort, .filter--filter, .simple-button--sort, .simple-button--filter, .simple-button--search, .simple-button, [data-name="search"], [data-name="sort"], [data-name="filter"]').remove();
        hero.find('.filter--search, .filter--sort, .filter--filter, .simple-button--sort, .simple-button--filter, .simple-button--search, .simple-button, [data-name="search"], [data-name="sort"], [data-name="filter"]').remove();

        // 2. Цільовий контейнер bal-btns-wrapper всередині heroBtns
        var targetWrapper = heroBtns.find('.bal-btns-wrapper');
        if (!targetWrapper.length) {
            targetWrapper = $('<div class="bal-btns-wrapper"></div>');
            heroBtns.append(targetWrapper);
        }

        // 3. Якщо поза heroBtns є інший bal-btns-wrapper, переносимо його кнопки в targetWrapper і видаляємо старий блок
        var extWrapper = render.find('.bal-btns-wrapper').not(targetWrapper);
        if (extWrapper.length) {
            extWrapper.children().appendTo(targetWrapper);
            extWrapper.remove();
        }

        // 4. Підхоплюємо будь-які окремі кнопки онлайн-джерел .bal-source-btn
        var strayBtns = render.find('.bal-source-btn').not(targetWrapper.find('.bal-source-btn'));
        if (strayBtns.length) {
            targetWrapper.append(strayBtns);
        }

        // 5. Видаляємо будь-які інші елементи/обгортки в explorer__files-head окрім самого херо банера
        render.find('.explorer__files-head > *:not(.uakino-online__head)').remove();
    }

    function triggerRefresh(activityObj, btnEl) {
        if (btnEl) {
            btnEl.addClass('is-refreshing');
            setTimeout(function () {
                btnEl.removeClass('is-refreshing');
            }, 1000);
        }

        if (window.Lampa && Lampa.Noty) {
            Lampa.Noty.show('Оновлення списку...');
        }

        var comp = activityObj ? (activityObj.componentInstance || activityObj) : null;
        if (comp && typeof comp.forceRefresh === 'function') {
            comp.forceRefresh();
            return;
        }
        if (comp && typeof comp.refresh === 'function') {
            comp.refresh();
            return;
        }
        if (comp && typeof comp.reload === 'function') {
            comp.reload();
            return;
        }

        var cur = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
        if (cur && Lampa.Activity.replace) {
            Lampa.Activity.replace(cur);
        }
    }

    function ensureRefreshButton(headContainer, activityObj) {
        if (!headContainer || !headContainer.length) return;

        var existingUpdate = headContainer.find('.bal-btn-update');
        if (existingUpdate.length) {
            if (!existingUpdate.find('svg').length) {
                existingUpdate.prepend(SVG_REFRESH);
            }
            return;
        }

        if (headContainer.find('.online-theme-btn-update').length) return;

        var btnUpdate = $('<div class="selector bal-source-btn online-theme-btn-update">' + SVG_REFRESH + '<span>Оновити</span></div>');

        btnUpdate.on('hover:enter click', function (e) {
            e.stopPropagation();
            triggerRefresh(activityObj, btnUpdate);
        });

        var wrapper = headContainer.find('.bal-btns-wrapper');
        if (wrapper.length) {
            wrapper.append(btnUpdate);
        } else {
            var scrollBody = headContainer.find('.scroll__body');
            if (scrollBody.length) {
                scrollBody.append(btnUpdate);
            } else {
                headContainer.append(btnUpdate);
            }
        }
    }

    // Покращення карток (перенесення таймлайну, додавання рейтингу TMDB після дати)
    function enhanceCards(container, movie) {
        if (!container || !container.length) return;
        var items = container.find('.online-prestige');
        if (!items.length) return;

        var isTv = movie ? !!(movie.name || movie.first_air_date || (movie.number_of_seasons && movie.number_of_seasons > 0)) : false;

        // Визначаємо поточний номер сезону
        var currentSeason = 1;
        if (isTv) {
            var sBtnText = container.closest('.activity').find('.bal-btn-season span').text();
            var sm = sBtnText ? sBtnText.match(/\d+/) : null;
            if (sm) currentSeason = parseInt(sm[0], 10);
        }

        function applyToItems(tmdbSeasonData) {
            items.each(function () {
                var item = $(this);
                var imgBox = item.find('.online-prestige__img');
                var epNumEl = item.find('.online-prestige__episode-number');
                var epNumStr = epNumEl.text().trim();
                var epNum = parseInt(epNumStr, 10);
                var hasNum = epNumStr.length > 0 && !isNaN(epNum);

                // 1. ПЕРЕМІЩУЄМО ТАЙМЛАЙН ВСЕРЕДИНУ КАРТИНКИ
                var timeline = item.find('.online-prestige__timeline');
                if (timeline.length && !imgBox.find('.online-prestige__timeline').length) {
                    imgBox.append(timeline);
                }
                // Видаляємо будь-які залишкові смуги або дублікати з тіла картки, щоб не перекреслювати текст
                item.find('.online-prestige__body .online-prestige__timeline, .online-prestige__body .time-line, .online-prestige__footer .time-line, .online-prestige__footer .online-prestige__timeline').remove();

                // Перевіряємо та оновлюємо прогрес одразу
                var tlBox = imgBox.find('.online-prestige__timeline');
                var line = tlBox.find('.time-line');
                var hash = line.attr('data-hash') || item.attr('data-hash');
                if (hash && window.Lampa && Lampa.Timeline) {
                    var viewData = Lampa.Timeline.view(hash);
                    var p = (viewData && viewData.percent) ? Math.max(0, Math.min(100, Math.round(viewData.percent))) : 0;
                    if (p > 0) {
                        tlBox.addClass('has-progress').show();
                        line.removeClass('hide').show();
                        var bar = line.children('div');
                        if (bar.length) bar.css({ width: p + '%', background: '#ffffff' });
                        else line.html('<div style="width: ' + p + '%; background: #ffffff;"></div>');
                    } else {
                        tlBox.removeClass('has-progress').hide();
                        line.addClass('hide').hide();
                    }
                }

                // 2. ПРИБИРАЄМО ТРИКУТНИК PLAY ТА НОМЕРИ СЕРІЙ ДЛЯ ФІЛЬМІВ
                item.find('.online-prestige__play').remove();
                if (!isTv) {
                    item.find('.online-prestige__episode-number').remove();
                }

                // 3. ДОДАВАННЯ РЕЙТИНГУ TMDB ПІСЛЯ ДАТИ
                var infoEl = item.find('.online-prestige__info');
                if (infoEl.length && !infoEl.find('.uakino-rating').length) {
                    var rateVal = null;

                    if (isTv && tmdbSeasonData && tmdbSeasonData.episodes) {
                        var tEp = tmdbSeasonData.episodes.find(function (e) { return e.episode_number === epNum; });
                        if (tEp && tEp.vote_average && tEp.vote_average > 0) {
                            rateVal = parseFloat(tEp.vote_average).toFixed(1);
                        }
                    }

                    if (!rateVal && movie && movie.vote_average && movie.vote_average > 0) {
                        rateVal = parseFloat(movie.vote_average).toFixed(1);
                    }

                    if (rateVal) {
                        infoEl.append('<span class="uakino-rating">&nbsp;•&nbsp;<span style="color:#ffd700;">★</span> ' + rateVal + '</span>');
                    }
                }
            });
        }

        if (isTv && movie && (movie.id || movie.tmdb_id)) {
            getTmdbSeason(movie.tmdb_id || movie.id, currentSeason, function (sData) {
                applyToItems(sData);
            });
        } else {
            applyToItems(null);
        }
    }

    function isOnlineActivity(act) {
        if (!act) return false;
        var comp = (act.component || (act.object && act.object.component) || '').toLowerCase();
        if (comp.indexOf('bal') !== -1 || comp.indexOf('online') !== -1 || comp.indexOf('playlist') !== -1 ||
            comp.indexOf('filmix') !== -1 || comp.indexOf('rezka') !== -1 || comp.indexOf('vcdn') !== -1) {
            return true;
        }
        var render = (act.activity && act.activity.render) ? act.activity.render() : null;
        if (render && (render.find('.bal-btns-wrapper').length || render.find('.online-prestige').length)) {
            return true;
        }
        return false;
    }

    function removeLeftPanel(render) {
        if (!render || !render.length) return;
        var left = render.find('.explorer__left, .files__left');
        if (left.length) {
            if (window.Lampa && Lampa.Navigator) {
                left.find('.selector').each(function () {
                    Lampa.Navigator.remove(this);
                });
            }
            left.remove();
        }
    }

    function applyThemeToActivity(act) {
        if (!window.Lampa || !Lampa.Storage) return;
        if (!Lampa.Storage.get('online_theme_enabled', true)) return;

        var render = (act.activity && act.activity.render) ? act.activity.render() : null;
        if (!render || !render.length) {
            var active = Lampa.Activity.active();
            if (active && active.activity) render = active.activity.render();
        }
        if (!render || !render.length) return;

        render.addClass('uakino-online-theme-active');
        render.find('.explorer').addClass('uakino-online-theme-active');
        render.find('.explorer').css({ width: '100%', maxWidth: '100%', display: 'block' });
        render.find('.explorer__files').css({ width: '100%', maxWidth: '100%', minWidth: '100%', flex: '1 1 100%', margin: '0', padding: '0' });
        render.find('.explorer__files-head').css({ width: '100%', maxWidth: '100%', padding: '0', margin: '0' });
        injectStyles();

        // 1. ВИДАЛЯЄМО ЛІВУ ПАНЕЛЬ
        removeLeftPanel(render);

        var movie = act.movie || (act.object && act.object.movie) || (Lampa.Activity.active() && Lampa.Activity.active().movie);

        // 2. ПЕРЕВІРКА ТИПУ КОНТЕНТУ (ФІЛЬМ ЧИ СЕРІАЛ)
        var isTv = false;
        if (movie) {
            isTv = !!(movie.name || movie.first_air_date || (movie.number_of_seasons && movie.number_of_seasons > 0));
        }

        if (!isTv) {
            render.addClass('is-movie');
            $('body').addClass('online-theme--movie');
            var seasonBtn = render.find('.bal-btn-season, .filter--season, [data-name="season"]');
            if (seasonBtn.length) {
                seasonBtn.hide().addClass('hide');
                if (window.Lampa && Lampa.Navigator) {
                    Lampa.Navigator.remove(seasonBtn[0]);
                }
            }
        } else {
            render.removeClass('is-movie');
            $('body').removeClass('online-theme--movie');
        }

        // 3. ДОДАЄМО HERO HEADER
        var showHero = Lampa.Storage.get('online_theme_hero', true);
        var hero = render.find('.uakino-online__head');
        if (showHero && movie && !hero.length) {
            var headTarget = render.find('.explorer__files-head');
            if (!headTarget.length) headTarget = render.find('.bal-btns-wrapper').parent();
            if (!headTarget.length) headTarget = render.find('.scroll.scroll--horizontal').parent();
            if (!headTarget.length) headTarget = render.find('.scroll__body').first();

            if (headTarget.length) {
                hero = buildHeroHeader(movie);
                if (hero) headTarget.prepend(hero);
            }
        }

        // ПЕРЕМІЩУЄМО КНОПКИ В СЕРЕДИНУ HERO БАНЕРА (ПОВЕРХ ФОНУ)
        if (hero && hero.length) {
            attachButtonsToHero(render, hero);
        }

        // 4. КНОПКА «ОНОВИТИ»
        var headFilter = (hero && hero.length && hero.find('.uakino-online__hero-buttons').length) ?
            hero.find('.uakino-online__hero-buttons') : render.find('.explorer__files-head');
        if (!headFilter.length) headFilter = render.find('.bal-btns-wrapper').parent();
        if (!headFilter.length) headFilter = render;
        ensureRefreshButton(headFilter, act);

        // ПРИБИРАЄМО СТАНДАРТНІ ФІЛЬТРИ ТА ЗАЙВІ КОНТЕЙНЕРИ
        render.find('.filter--search, .filter--sort, .filter--filter, .simple-button--sort, .simple-button--filter, .simple-button--search, .simple-button, [data-name="search"], [data-name="sort"], [data-name="filter"]').remove();
        render.find('.explorer__files-head > *:not(.uakino-online__head)').remove();

        // 5. КАРТКИ ТА РЕЙТИНГИ TMDB (ПРИБИРАЄМО МАСКУ-ЗАТЕМНЕННЯ ЗІ SCROLL)
        render.find('.scroll').removeClass('scroll--mask').css({
            '-webkit-mask-image': 'none',
            'mask-image': 'none'
        });
        render.find('.scroll__content').css({
            'padding-top': '0',
            'margin-top': '0'
        });
        enhanceCards(render, movie);

        // 6. OBSERVER ДЛЯ ДИНАМІЧНИХ ОНОВЛЕНЬ
        if (window.MutationObserver && render[0] && !render[0]._uakino_observed) {
            render[0]._uakino_observed = true;
            var observer = new MutationObserver(function () {
                removeLeftPanel(render);
                render.find('.explorer').css({ width: '100%', maxWidth: '100%', display: 'block' });
                render.find('.explorer__files').css({ width: '100%', maxWidth: '100%', minWidth: '100%', flex: '1 1 100%', margin: '0', padding: '0' });
                render.find('.explorer__files-head').css({ width: '100%', maxWidth: '100%', padding: '0', margin: '0' });
                render.find('.filter--search, .filter--sort, .filter--filter, .simple-button--sort, .simple-button--filter, .simple-button--search, .simple-button, [data-name="search"], [data-name="sort"], [data-name="filter"]').remove();
                render.find('.explorer__files-head > *:not(.uakino-online__head)').remove();
                render.find('.scroll').removeClass('scroll--mask').css({
                    '-webkit-mask-image': 'none',
                    'mask-image': 'none'
                });
                render.find('.scroll__content').css({
                    'padding-top': '0',
                    'margin-top': '0'
                });
                if (!isTv) {
                    render.find('.bal-btn-season, .filter--season, [data-name="season"]').hide().addClass('hide');
                }
                var curHero = render.find('.uakino-online__head');
                if (curHero.length) {
                    attachButtonsToHero(render, curHero);
                }
                enhanceCards(render, movie);
                var filterBox = (curHero.length && curHero.find('.uakino-online__hero-buttons').length) ?
                    curHero.find('.uakino-online__hero-buttons') : (render.find('.explorer__files-head').length ? render.find('.explorer__files-head') : render);
                ensureRefreshButton(filterBox, act);
            });
            observer.observe(render[0], { childList: true, subtree: true });
        }
    }

    // Зручна 2D-навігація пультом телевізора до постера афіші та назад до кнопок
    function setupPosterNavigation() {
        if (window._uakino_nav_installed) return;
        window._uakino_nav_installed = true;

        if (window.Lampa && Lampa.Keypad && Lampa.Keypad.listener) {
            Lampa.Keypad.listener.follow('keydown', function (e) {
                var poster = $('.uakino-online__poster:visible').first();
                if (!poster.length) return;

                var active = window.Lampa && Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
                var render = (active && active.activity && active.activity.render) ? active.activity.render() : null;
                if (!render || (!render.hasClass('uakino-online-theme-active') && !render.find('.uakino-online__head').length)) {
                    if (!$('.uakino-online-theme-active').length) return;
                }

                var focusedEl = $(Lampa.Navigator ? Lampa.Navigator.focused() : document.activeElement);
                var isPosterFocused = focusedEl.hasClass('uakino-online__poster') || focusedEl.closest('.uakino-online__poster').length > 0;
                var isBtnFocused = focusedEl.hasClass('bal-source-btn') || focusedEl.closest('.uakino-online__hero-buttons, .bal-btns-wrapper, .torrent-filter, .filter').length > 0;

                var code = e.code;
                var isUp = (code === 38 || code === 29460);
                var isDown = (code === 40 || code === 29461);
                var isLeft = (code === 37 || code === 4);
                var isRight = (code === 39 || code === 5);
                var isEnter = (code === 13 || code === 29443 || code === 65385);

                // 1. Коли фокус на кнопках — перехід ВГОРУ або ВЛІВО з найвищої кнопки фокусує постер
                if (isBtnFocused) {
                    var firstVisibleBtn = $('.uakino-online__hero-buttons .selector:visible, .bal-btns-wrapper .selector:visible, .filter .scroll__body .selector:visible, .torrent-filter .selector:visible').first();
                    var isFirstBtn = firstVisibleBtn.length && (focusedEl[0] === firstVisibleBtn[0] || focusedEl.closest(firstVisibleBtn).length);

                    if (isUp) {
                        var isTopRow = isFirstBtn;
                        if (!isTopRow && firstVisibleBtn.length && focusedEl.length && focusedEl.offset()) {
                            var topDiff = Math.abs(focusedEl.offset().top - firstVisibleBtn.offset().top);
                            if (topDiff < 15) isTopRow = true;
                        }

                        if (isTopRow) {
                            if (e.event) e.event.preventDefault();
                            if (window.Lampa && Lampa.Controller) {
                                Lampa.Controller.collectionFocus(poster[0]);
                            }
                            if (window.Lampa && Lampa.Sound) Lampa.Sound.play('hover');
                            return;
                        }
                    }
                    if (isLeft && isFirstBtn) {
                        if (e.event) e.event.preventDefault();
                        if (window.Lampa && Lampa.Controller) {
                            Lampa.Controller.collectionFocus(poster[0]);
                        }
                        if (window.Lampa && Lampa.Sound) Lampa.Sound.play('hover');
                        return;
                    }
                }

                // 2. Коли фокус на постері афіші
                if (isPosterFocused) {
                    if (isEnter) {
                        if (e.event) e.event.preventDefault();
                        if (window.Lampa && Lampa.Activity && Lampa.Activity.back) {
                            Lampa.Activity.back();
                        }
                        return;
                    }
                    if (isDown || isRight) {
                        if (e.event) e.event.preventDefault();
                        var targetBtn = $('.uakino-online__hero-buttons .selector:visible, .bal-btns-wrapper .selector:visible, .filter .scroll__body .selector:visible, .torrent-filter .selector:visible').first();
                        if (targetBtn.length && window.Lampa && Lampa.Controller) {
                            Lampa.Controller.collectionFocus(targetBtn[0]);
                        }
                        if (window.Lampa && Lampa.Sound) Lampa.Sound.play('hover');
                        return;
                    }
                    if (isUp) {
                        if (e.event) e.event.preventDefault();
                        if (window.Lampa && Lampa.Controller) {
                            Lampa.Controller.toggle('head');
                        }
                        return;
                    }
                    if (isLeft) {
                        if (e.event) e.event.preventDefault();
                        if (window.Lampa && Lampa.Controller) {
                            Lampa.Controller.toggle('menu');
                        }
                        return;
                    }
                }
            });
        }
    }

    // Миттєва синхронізація таймкоду з плеєра кожну секунду в таймлайн карток
    function setupLiveTimelineSync() {
        if (window._uakino_timeline_sync_installed) return;
        window._uakino_timeline_sync_installed = true;

        var lastSyncSec = -1;

        function updateCardBar(hash, pct) {
            if (!hash) return;
            pct = Math.min(100, Math.max(0, Math.round(pct || 0)));

            var lines = $('.time-line[data-hash="' + hash + '"]');
            if (lines.length) {
                lines.each(function () {
                    var l = $(this);
                    var parentTl = l.closest('.online-prestige__timeline');
                    if (pct > 0) {
                        l.removeClass('hide').show();
                        if (parentTl.length) parentTl.addClass('has-progress').show();
                        var bar = l.children('div');
                        if (!bar.length) {
                            l.html('<div style="width: ' + pct + '%; background: #ffffff;"></div>');
                        } else {
                            bar.css({ width: pct + '%', background: '#ffffff' });
                        }
                    } else {
                        l.addClass('hide').hide();
                        if (parentTl.length) parentTl.removeClass('has-progress').hide();
                    }
                });
            }

            if (pct >= 80) {
                lines.closest('.online-prestige').each(function () {
                    var card = $(this);
                    card.addClass('is-viewed');
                    var imgBox = card.find('.online-prestige__img');
                    if (imgBox.length && !imgBox.find('.online-prestige__viewed').length) {
                        imgBox.append('<div class="online-prestige__viewed"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>');
                    }
                });
            }
        }

        function syncTimeline(curTime, duration, force) {
            if (curTime === undefined || curTime === null) return;
            var curSec = Math.floor(curTime);
            if (!force && curSec === lastSyncSec) return;
            lastSyncSec = curSec;

            var pd = (window.Lampa && Lampa.Player && typeof Lampa.Player.playdata === 'function') ? Lampa.Player.playdata() : null;
            if (!pd) return;

            var tl = pd.timeline;
            var hash = (tl && tl.hash) || pd.hash;
            if (!hash) return;

            duration = duration || (tl && tl.duration) || 0;
            if (!duration && window.Lampa && Lampa.PlayerVideo && Lampa.PlayerVideo.video) {
                duration = Lampa.PlayerVideo.video.duration || 0;
            }
            if (!duration || duration <= 0) return;

            var pct = Math.min(100, Math.max(0, Math.round((curTime / duration) * 100)));

            if (tl) {
                tl.percent = pct;
                tl.time = curTime;
                tl.duration = duration;
                if (typeof tl.handler === 'function') {
                    tl.handler(pct, curTime, duration);
                }
            }

            if (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.update === 'function') {
                Lampa.Timeline.update({
                    hash: hash,
                    percent: pct,
                    time: curTime,
                    duration: duration
                });
            }

            updateCardBar(hash, pct);
        }

        // Слухаємо timeupdate з відео (спрацьовує кілька разів на секунду)
        if (window.Lampa && Lampa.PlayerVideo && Lampa.PlayerVideo.listener) {
            Lampa.PlayerVideo.listener.follow('timeupdate', function (e) {
                if (!e) return;
                var cur = e.current !== undefined ? e.current : 0;
                var dur = e.duration !== undefined ? e.duration : 0;
                syncTimeline(cur, dur, false);
            });
        }

        // Також слухаємо pause, seeked та destroy плеєра
        if (window.Lampa && Lampa.Player && Lampa.Player.listener) {
            Lampa.Player.listener.follow('destroy', function () {
                var pd = (Lampa.Player && typeof Lampa.Player.playdata === 'function') ? Lampa.Player.playdata() : null;
                if (pd && pd.timeline) {
                    syncTimeline(pd.timeline.time || 0, pd.timeline.duration || 0, true);
                }
                setTimeout(function () {
                    $('.online-prestige').each(function () {
                        var card = $(this);
                        var line = card.find('.time-line');
                        var h = line.attr('data-hash');
                        if (h && window.Lampa && Lampa.Timeline) {
                            var viewData = Lampa.Timeline.view(h);
                            var p = (viewData && viewData.percent) ? Math.round(viewData.percent) : 0;
                            updateCardBar(h, p);
                        }
                    });
                }, 50);
            });
        }

        // Слухаємо зміни стану таймлайну Lampa (від інших модулів або сокетів)
        if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('state:changed', function (e) {
                if (e && e.target === 'timeline' && e.data && e.data.hash) {
                    var p = (e.data.road && e.data.road.percent) !== undefined ? e.data.road.percent : 0;
                    updateCardBar(e.data.hash, p);
                }
            });
        }
    }

    function addSettings() {
        if (!window.Lampa || !Lampa.SettingsApi) return;
        Lampa.SettingsApi.addComponent({
            component: 'online_theme',
            name: 'Дизайн онлайну',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'online_theme',
            param: {
                name: 'online_theme_enabled',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Увімкнути стиль UAKino',
                description: 'Застосовувати сучасний дизайн карток та фільтрів для всіх онлайн плагінів'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'online_theme',
            param: {
                name: 'online_theme_hero',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Шапка фільму (Hero Header)',
                description: 'Показувати банер, постер, назву та опис фільму у верхній частині'
            }
        });
    }

    function init() {
        injectStyles();
        addSettings();
        setupPosterNavigation();
        setupLiveTimelineSync();

        if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('activity', function (e) {
                if (e.type === 'start' || e.type === 'create') {
                    setTimeout(function () {
                        if (isOnlineActivity(e.object || e)) {
                            applyThemeToActivity(e.object || e);
                        }
                    }, 10);
                }
            });
        }

        setTimeout(function () {
            var cur = window.Lampa && Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
            if (cur && isOnlineActivity(cur)) {
                applyThemeToActivity(cur);
            }
        }, 100);
    }

    if (window.Lampa && Lampa.Component) {
        init();
    } else {
        var waitLampa = setInterval(function () {
            if (window.Lampa && Lampa.Component) {
                clearInterval(waitLampa);
                init();
            }
        }, 50);
    }
})();
