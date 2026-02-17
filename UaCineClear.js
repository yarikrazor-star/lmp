(function () {
    'use strict';

    // Налаштування API BanderaOnline
    var api_base = 'https://bbe.lme.isroot.in/api/v2';
    
    // Конфігурація джерел
    var sources_config = [
        { id: 'uaflix', title: 'UAFlix' },
        { id: 'makhno', title: 'Makhno' }
    ];

    // --- CSS СТИЛІ ---
    var style = '<style id="bandera-badges-style">' +
        // Загальні налаштування
        '.ua-sites-container { display: flex; align-items: center; gap: 6px; z-index: 5; }' +
        
        // --- DESKTOP / TV (Великі екрани > 500px) ---
        '@media (min-width: 501px) {' +
            
            // ВАРІАНТ 1: Коли ми всередині TorQual (або іншого контейнера якості)
            // Ми повинні бути "над" ним.
            '.quality-badges .ua-sites-container, .quality-badges-container .ua-sites-container {' +
                'position: absolute;' + 
                'right: 0;' +
                'bottom: 100%;' +
                'margin-bottom: 6px;' +
                'justify-content: flex-end;' +
            '}' +

            // ВАРІАНТ 2: Коли TorQual немає і ми просто в рядку рейтингу
            // Ми стаємо звичайним блоком зліва направо з відступом
            '.full-start-new__rate-line .ua-sites-container {' +
                'position: relative;' +
                'margin-left: 12px;' + /* Відступ від вікового рейтингу */
                'margin-bottom: 0;' +
            '}' +
        '}' +

        // --- MOBILE (Мобільні пристрої <= 500px) ---
        '@media (max-width: 500px) {' +
            '.ua-sites-container { position: relative; width: 100%; justify-content: flex-start; flex-wrap: wrap; margin-top: 10px; }' +
            // На мобільному прибираємо margin-left, бо ми на новому рядку
            '.full-start-new__rate-line .ua-sites-container { margin-left: 0; }' +
        '}' +

        // Стилі кнопок
        '.ua-btn-item { display: flex; cursor: default; height: 1.6em; align-items: center; padding: 0 10px; background: rgba(0, 0, 0, 0.4); border-radius: 6px; position: relative; transition: transform 0.2s, opacity 0.2s; border: 2px solid transparent; }' +
        '.ua-btn-item.active { cursor: pointer; background: rgba(255, 255, 255, 0.1); }' +
        '.ua-btn-item.active::before { content: ""; position: absolute; inset: -2px; border-radius: 8px; padding: 2px; background: linear-gradient(to bottom, #0057b7 50%, #ffd700 50%); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }' +
        '.ua-btn-item.active span { color: #fff; text-shadow: 0 0 2px rgba(0,0,0,0.5); }' +
        '.ua-btn-item.active.focus { transform: scale(1.1); background: rgba(255, 255, 255, 0.2); }' +
        '.ua-btn-item.active.focus::after { content: ""; position: absolute; inset: -4px; border: 2px solid #fff; border-radius: 10px; z-index: 4; }' +
        '.ua-btn-item.inactive { opacity: 0.4; filter: grayscale(100%); }' +
        '.ua-btn-item.inactive span { color: #aaa; }' +
        '.ua-btn-item.loading { opacity: 0.7; animation: pulse-badge 1.5s infinite; }' +
        '@keyframes pulse-badge { 0% { opacity: 0.5; } 50% { opacity: 0.9; } 100% { opacity: 0.5; } }' +
        '.ua-btn-item span { font-weight: bold; font-size: 0.8em; white-space: nowrap; z-index: 3; position: relative; }' +
    '</style>';

    if (!$('#bandera-badges-style').length) $('body').append(style);

    // --- Мережа ---
    var Network = {
        get: function(url, callback, error) {
            var network = new Lampa.Reguest();
            network.silent(url, callback, error);
        },
        post: function(url, data, callback, error) {
            var network = new Lampa.Reguest();
            network.silent(url, callback, error, JSON.stringify(data), {
                dataType: 'json',
                headers: { 'Content-Type': 'application/json' }
            });
        }
    };

    // --- Утиліти ---
    function addParam(url, key, value) {
        if (!value && value !== 0) return url;
        return Lampa.Utils.addUrlComponent(url, key + '=' + encodeURIComponent(value));
    }

    function getYear(movie) {
        var date = movie.release_date || movie.first_air_date || movie.year || movie.start_date;
        return date ? (date + '').slice(0, 4) : '';
    }

    function isAshdiUrl(url) {
        return /(^|\/\/)([^\/]*\.)?ashdi\.vip(\/|$)/i.test(url || '');
    }

    function wrapAshdiProxy(url) {
        var base = 'https://tut.im/proxy.php?url=';
        if (url.indexOf(base) === 0) return url;
        return base + encodeURIComponent(url);
    }

    function normalizeStreamUrl(url) {
        if (!url) return url;
        var player = Lampa.Storage.get('player');
        if (player && player !== 'inner') return url; 
        if (isAshdiUrl(url)) return wrapAshdiProxy(url);
        return url;
    }

    // --- Контролер ---

    function BanderaController(component, movie) {
        this.component = component;
        this.movie = movie;
    }

    BanderaController.prototype.start = function() {
        var _this = this;
        var render = this.component.activity.render();
        var rateLine = $('.full-start-new__rate-line', render);
        
        if (!rateLine.length) return;

        // 1. Створюємо контейнер
        var container = $('.ua-sites-container', rateLine);
        if (!container.length) {
            container = $('<div class="ua-sites-container"></div>');
        } else {
            container.empty();
            // Якщо контейнер вже був, треба перевірити, чи він на правильному місці
            // Але простіше видалити і створити заново, якщо батьківський елемент змінився, 
            // та Lampa зазвичай перерендерить всю картку.
            // Тому просто очистимо.
        }

        // 2. Логіка вбудовування
        var torqCont = $('.quality-badges, .quality-badges-container', rateLine);

        if (torqCont.length) {
            // Є TorQual: вставляємо всередину (працює CSS absolute)
            // Видаляємо container з rateLine, якщо він там був
            if (container.parent().is(rateLine)) container.detach();
            
            torqCont.css('position', 'relative').append(container);
        } else {
            // Немає TorQual: вставляємо в загальний рядок (працює CSS relative + margin)
            // Видаляємо container з torqCont, якщо він там був
            if (container.parent().is(torqCont)) container.detach();
            
            // Важливо: rateLine в Lampa має display: flex або inline-block. 
            // Додавання контейнера в кінець поставить його справа від останнього елемента.
            rateLine.append(container);
        }

        // 3. Запускаємо бейджі
        sources_config.forEach(function(source) {
            _this.createBadge(container, source);
        });
    };

    BanderaController.prototype.createBadge = function(container, sourceConfig) {
        var _this = this;
        var btn = $('<div class="ua-btn-item selector loading" data-source="' + sourceConfig.id + '">' +
            '<span>' + sourceConfig.title + '</span>' +
        '</div>');

        container.append(btn);
        
        this.search(sourceConfig.id, function(items) {
            btn.removeClass('loading');
            
            if (items && items.length > 0) {
                btn.addClass('active');
                btn.on('hover:enter click', function(e) {
                    e.stopPropagation();
                    if (items.length > 1) {
                        _this.showSearchResults(sourceConfig.id, items);
                    } else {
                        _this.loadStructure(sourceConfig.id, items[0]);
                    }
                });
            } else {
                btn.addClass('inactive');
                btn.removeClass('selector');
            }
        });
    };

    BanderaController.prototype.search = function(sourceId, callback) {
        var url = api_base + '/search';
        var movie = this.movie;
        
        url = addParam(url, 'source', sourceId);
        url = addParam(url, 'title', movie.title || movie.name);
        url = addParam(url, 'original_title', movie.original_title || movie.original_name);
        url = addParam(url, 'imdb_id', movie.imdb_id);
        url = addParam(url, 'tmdb_id', movie.id);
        url = addParam(url, 'year', getYear(movie));
        url = addParam(url, 'serial', (movie.name || movie.number_of_seasons) ? 1 : 0);

        Network.get(url, function(json) {
            if (json && json.ok && json.items && json.items.length > 0) {
                callback(json.items);
            } else {
                callback(null);
            }
        }, function() {
            callback(null);
        });
    };

    // --- Меню ---
    BanderaController.prototype.showSearchResults = function(sourceId, items) {
        var _this = this;
        var menuItems = items.map(function(item) {
            return {
                title: item.title + (item.year ? ' (' + item.year + ')' : ''),
                subtitle: item.original_title,
                item: item
            };
        });

        Lampa.Select.show({
            title: 'Знайдено декілька варіантів',
            items: menuItems,
            onSelect: function(a) { _this.loadStructure(sourceId, a.item); },
            onBack: function() { Lampa.Controller.toggle('content'); }
        });
    };

    BanderaController.prototype.loadStructure = function(sourceId, searchItem) {
        var _this = this;
        Lampa.Loading.start();
        Network.post(api_base + '/content', { source: sourceId, ref: searchItem.ref, full: true }, function(content) {
            Lampa.Loading.stop();
            if (!content || !content.ok) { Lampa.Noty.show(Lampa.Lang.translate('online_nolink')); return; }
            _this.processContent(sourceId, content, searchItem.title);
        }, function() {
            Lampa.Loading.stop();
            Lampa.Noty.show(Lampa.Lang.translate('network_error'));
        });
    };

    BanderaController.prototype.processContent = function(sourceId, content, mainTitle) {
        var _this = this;
        if (content.type === 'series' && content.voices && content.voices.length) {
            _this.showVoiceSelector(content.voices, function(voice) {
                _this.showSeasonSelector(voice.seasons, function(season) {
                    _this.showEpisodeSelector(season.episodes, function(episode) {
                        var title = mainTitle + ' - ' + (voice.display_name || 'Voice') + ' - ' + (season.title || season.number) + ' - ' + (episode.title || episode.number);
                        _this.play(sourceId, episode.ref, title);
                    }, function() {
                        _this.showSeasonSelector(voice.seasons, arguments.callee, function() {
                            _this.showVoiceSelector(content.voices, _this.showSeasonSelector);
                        });
                    });
                }, function() { _this.processContent(sourceId, content, mainTitle); });
            });
        } else {
            var items = [];
            if (content.voices && content.voices.length) {
                items = content.voices.map(function(v) {
                    var ref = v.ref || (v.streams && v.streams[0] ? v.streams[0].ref : null);
                    if (!ref && v.seasons && v.seasons[0] && v.seasons[0].episodes && v.seasons[0].episodes[0]) ref = v.seasons[0].episodes[0].ref;
                    return { title: v.display_name || v.title || 'Варіант ' + (items.length + 1), ref: ref };
                }).filter(function(i) { return i.ref; });
            } else if (content.streams && content.streams.length) {
                items = content.streams.map(function(s) {
                    return { title: s.title || s.quality || 'Основний', ref: s.ref, url: s.url };
                });
            } else if (content.stream_ref) {
                items.push({ title: 'Дивитися', ref: content.stream_ref });
            }

            if (items.length === 0) { Lampa.Noty.show('Контент не знайдено'); return; }

            if (items.length > 1) {
                Lampa.Select.show({
                    title: 'Виберіть озвучку / якість',
                    items: items,
                    onSelect: function(a) {
                        if (a.url) _this.playDirectUrl(a.url, mainTitle);
                        else _this.play(sourceId, a.ref, mainTitle + ' (' + a.title + ')');
                    },
                    onBack: function() { Lampa.Controller.toggle('content'); }
                });
            } else {
                var item = items[0];
                if (item.url) _this.playDirectUrl(item.url, mainTitle);
                else _this.play(sourceId, item.ref, mainTitle);
            }
        }
    };

    BanderaController.prototype.showVoiceSelector = function(voices, onSelect) {
        var menuItems = voices.map(function(v) { return { title: v.display_name || v.name || v.title || 'Озвучка', voice: v }; });
        Lampa.Select.show({ title: 'Виберіть озвучку', items: menuItems, onSelect: function(a) { onSelect(a.voice); }, onBack: function() { Lampa.Controller.toggle('content'); } });
    };

    BanderaController.prototype.showSeasonSelector = function(seasons, onSelect, onBack) {
        var menuItems = seasons.map(function(s) { return { title: s.title || ('Сезон ' + s.number), season: s }; });
        Lampa.Select.show({ title: 'Виберіть сезон', items: menuItems, onSelect: function(a) { onSelect(a.season); }, onBack: onBack || function() { Lampa.Controller.toggle('content'); } });
    };

    BanderaController.prototype.showEpisodeSelector = function(episodes, onSelect, onBack) {
        var menuItems = episodes.map(function(e) { return { title: (e.number ? e.number + '. ' : '') + (e.title || 'Серія ' + e.number), episode: e }; });
        Lampa.Select.show({ title: 'Виберіть серію', items: menuItems, onSelect: function(a) { onSelect(a.episode); }, onBack: onBack });
    };

    BanderaController.prototype.play = function(sourceId, ref, title) {
        var _this = this;
        Lampa.Loading.start();
        Network.post(api_base + '/stream', { source: sourceId, ref: ref }, function(streamJson) {
            Lampa.Loading.stop();
            if (!streamJson || !streamJson.ok || !streamJson.streams || !streamJson.streams.length) { Lampa.Noty.show(Lampa.Lang.translate('online_nolink')); return; }
            var streams = streamJson.streams;
            var qualitys = {};
            var subtitles = [];
            streams.forEach(function(s) {
                var qLabel = s.quality || s.title || 'Video';
                var qUrl = normalizeStreamUrl(s.url);
                if(qUrl) qualitys[qLabel] = qUrl;
                if(s.subtitles) subtitles = subtitles.concat(s.subtitles);
            });
            var firstStream = streams[0];
            var playUrl = normalizeStreamUrl(firstStream.url);
            if (!playUrl) {
                var keys = Object.keys(qualitys);
                if (keys.length) playUrl = qualitys[keys[0]];
                else { Lampa.Noty.show(Lampa.Lang.translate('online_nolink')); return; }
            }
            Lampa.Player.play({ url: playUrl, quality: qualitys, title: title, subtitles: subtitles });
            if (Lampa.Favorite && typeof Lampa.Favorite.add === 'function') Lampa.Favorite.add('history', _this.movie, 100);
        }, function() {
            Lampa.Loading.stop();
            Lampa.Noty.show(Lampa.Lang.translate('network_error'));
        });
    };

    BanderaController.prototype.playDirectUrl = function(url, title) {
        Lampa.Player.play({ url: normalizeStreamUrl(url), title: title });
        if (Lampa.Favorite && typeof Lampa.Favorite.add === 'function') Lampa.Favorite.add('history', this.movie, 100);
    };

    function startPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                if (e.data && e.data.movie) {
                    var controller = new BanderaController(e.object, e.data.movie);
                    controller.start();
                }
            }
        });
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") startPlugin(); });

})();
