(function () {
    'use strict';

    function WikiSmartPlugin() {
        var ICON_WIKI = 'https://yarikrazor-star.github.io/lmp/wiki.svg';
        var isOpened = false;

        this.init = function () {
            var _this = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    _this.cleanup();
                    setTimeout(function() {
                        try {
                            _this.render(e.data, e.object.activity.render());
                        } catch (err) {}
                    }, 200);
                }
            });
        };

        this.cleanup = function() {
            $('.lampa-wiki-button').remove();
            isOpened = false;
        };

        this.render = function (data, html) {
            var _this = this;
            var container = $(html);
            if (container.find('.lampa-wiki-button').length) return;

            var button = $('<div class="full-start__button selector lampa-wiki-button">' +
                                '<img src="' + ICON_WIKI + '">' +
                                '<span>Вікі</span>' +
                            '</div>');

            var style = '<style>' +
                '.lampa-wiki-button { display: flex !important; align-items: center; justify-content: center; } ' +
                '.lampa-wiki-button img { width: 1.6em; height: 1.6em; object-fit: contain; margin-right: 5px; } ' +
                '.wiki-select-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 2000; display: flex; align-items: center; justify-content: center; }' +
                '.wiki-select-body { width: 50%; background: #1a1a1a; border-radius: 10px; padding: 25px; border: 1px solid #333; }' +
                '.wiki-item { padding: 15px; margin: 10px 0; background: rgba(255,255,255,0.05); border-radius: 5px; cursor: pointer; border: 2px solid transparent; display: flex; align-items: center; gap: 10px; }' +
                '.wiki-item.focus { border-color: #fff; background: rgba(255,255,255,0.1); outline: none; }' +
                '.wiki-item__lang { font-size: 1.2em; }' +
                '.wiki-item__title { font-size: 1.1em; color: #fff; }' +
                '.wiki-viewer-container { position: fixed; top: 5%; left: 5%; width: 90%; height: 90%; background: #fff; z-index: 2001; border-radius: 10px; overflow: hidden; box-shadow: 0 0 30px rgba(0,0,0,0.7); }' +
                '.wiki-close-btn { position: absolute; top: 10px; right: 10px; width: 45px; height: 45px; background: #000; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2002; font-size: 28px; font-weight: bold; border: 2px solid #fff; line-height: 1; }' +
                '</style>';

            if (!$('style#wiki-plugin-style').length) $('head').append('<style id="wiki-plugin-style">' + style + '</style>');

            var buttons_container = container.find('.full-start-new__buttons, .full-start__buttons');
            var neighbors = buttons_container.find('.selector');
            
            if (neighbors.length >= 2) {
                button.insertAfter(neighbors.eq(1));
            } else {
                buttons_container.append(button);
            }

            button.on('hover:enter click', function() {
                if (!isOpened) _this.startSearch(data.movie);
            });

            if (Lampa.Controller.enabled().name === 'full_start') {
                Lampa.Controller.enable('full_start');
            }
        };

        this.startSearch = function (movie) {
            var _this = this;
            if (!movie) return;
            isOpened = true;
            Lampa.Noty.show('Пошук у Wikipedia...');

            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            var titleUA = (movie.title || movie.name || '').replace(/[^\w\sа-яієїґ]/gi, '');
            var titleEN = (movie.original_title || movie.original_name || '').replace(/[^\w\s]/gi, '');
            var isTV = !!(movie.first_air_date || movie.number_of_seasons);
            
            var results = [];
            var p1 = $.ajax({ url: 'https://uk.wikipedia.org/w/api.php', data: { action: 'query', list: 'search', srsearch: titleUA + ' ' + year + (isTV ? ' серіал' : ' фільм'), srlimit: 3, format: 'json', origin: '*' }, dataType: 'json' });
            var p2 = $.ajax({ url: 'https://en.wikipedia.org/w/api.php', data: { action: 'query', list: 'search', srsearch: titleEN + ' ' + year + (isTV ? ' series' : ' film'), srlimit: 3, format: 'json', origin: '*' }, dataType: 'json' });

            $.when(p1, p2).done(function (r1, r2) {
                if (r1[0].query && r1[0].query.search) {
                    r1[0].query.search.forEach(function(i) {
                        results.push({ title: i.title, lang: '🇺🇦', url: 'https://uk.m.wikipedia.org/wiki/' + encodeURIComponent(i.title) });
                    });
                }
                if (r2[0].query && r2[0].query.search) {
                    r2[0].query.search.forEach(function(i) {
                        results.push({ title: i.title, lang: '🇺🇸', url: 'https://en.m.wikipedia.org/wiki/' + encodeURIComponent(i.title) });
                    });
                }

                if (results.length) _this.showMenu(results, movie.title || movie.name);
                else { Lampa.Noty.show('Нічого не знайдено'); isOpened = false; }
            }).fail(function() { Lampa.Noty.show('Помилка запиту'); isOpened = false; });
        };

        this.showMenu = function(items, movieTitle) {
            var _this = this;
            var current_controller = Lampa.Controller.enabled().name;
            var menu = $('<div class="wiki-select-container"><div class="wiki-select-body">' +
                            '<div style="font-size: 1.4em; margin-bottom: 20px; color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px;">Wikipedia: ' + movieTitle + '</div>' +
                            '<div class="wiki-items-list"></div></div></div>');

            items.forEach(function(item) {
                var el = $('<div class="wiki-item selector">' +
                                '<div class="wiki-item__lang">' + item.lang + '</div>' +
                                '<div class="wiki-item__title">' + item.title + '</div>' +
                            '</div>');
                el.on('hover:enter click', function() {
                    menu.remove();
                    _this.openIframe(item.url, item.title, current_controller);
                });
                menu.find('.wiki-items-list').append(el);
            });

            $('body').append(menu);

            Lampa.Controller.add('wiki_menu', {
                toggle: function() {
                    Lampa.Controller.collectionSet(menu);
                    Lampa.Controller.collectionFocus(menu.find('.wiki-item')[0], menu);
                },
                up: function() {
                    var index = menu.find('.wiki-item').index(menu.find('.wiki-item.focus'));
                    if (index > 0) Lampa.Controller.collectionFocus(menu.find('.wiki-item')[index - 1], menu);
                },
                down: function() {
                    var index = menu.find('.wiki-item').index(menu.find('.wiki-item.focus'));
                    if (index < items.length - 1) Lampa.Controller.collectionFocus(menu.find('.wiki-item')[index + 1], menu);
                },
                back: function() {
                    menu.remove();
                    isOpened = false;
                    Lampa.Controller.toggle(current_controller);
                }
            });
            Lampa.Controller.toggle('wiki_menu');
        };

        this.openIframe = function (url, title, prev_controller) {
            var viewer = $('<div class="wiki-viewer-container">' +
                                '<div class="wiki-close-btn">×</div>' +
                                '<div class="wiki-content-scroll" style="height: 100%; overflow-y: auto;">' +
                                    '<iframe src="' + url + '" style="width: 100%; height: 10000px; border: none; background: #fff;"></iframe>' +
                                '</div></div>');

            $('body').append(viewer);

            var closeViewer = function() {
                viewer.remove();
                isOpened = false;
                Lampa.Controller.toggle(prev_controller);
            };

            viewer.find('.wiki-close-btn').on('click', function(e) {
                e.preventDefault();
                closeViewer();
            });

            Lampa.Controller.add('wiki_viewer', {
                toggle: function() {
                    Lampa.Controller.collectionSet(viewer);
                    Lampa.Controller.collectionFocus(viewer[0], viewer);
                },
                up: function() { viewer.find('.wiki-content-scroll').scrollTop(viewer.find('.wiki-content-scroll').scrollTop() - 500); },
                down: function() { viewer.find('.wiki-content-scroll').scrollTop(viewer.find('.wiki-content-scroll').scrollTop() + 500); },
                back: closeViewer
            });

            Lampa.Controller.toggle('wiki_viewer');
        };
    }

    if (window.Lampa) new WikiSmartPlugin().init();
})();
