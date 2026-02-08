(function () {
    'use strict';

    function WikiSmartPlugin() {
        var ICON_WIKI = 'https://yarikrazor-star.github.io/lmp/wiki.svg';
        var isOpened = false;

        this.init = function () {
            var _this = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    // Видаляємо старі кнопки, щоб не накопичувалися
                    $('.lampa-wiki-button').remove();
                    setTimeout(function() {
                        try {
                            _this.render(e.data, e.object.activity.render());
                        } catch (err) {}
                    }, 100);
                }
            });
        };

        this.render = function (data, html) {
            var _this = this;
            var container = $(html);
            if (container.find('.lampa-wiki-button').length) return;

            var button = $('<div class="full-start__button selector lampa-wiki-button">' +
                                '<img src="' + ICON_WIKI + '" style="width: 100%; height: 100%; object-fit: contain;">' +
                            '</div>');

            var style = '<style>.lampa-wiki-button { display: flex; align-items: center; justify-content: center; width: 2.8em; height: 2.8em; padding: 0.5em; min-width: 2.8em; margin-left: 10px; border-radius: 50%; background: rgba(255,255,255,0.1); cursor: pointer; } .lampa-wiki-button.focus { background: rgba(255,255,255,0.2); border: 2px solid #fff; }</style>';
            if (!$('style#wiki-plugin-style').length) $('head').append('<style id="wiki-plugin-style">' + style + '</style>');

            var footer = container.find('.full-start-new__buttons, .full-start__buttons');
            if (footer.length) {
                footer.append(button);
                
                button.on('hover:enter click', function() {
                    if (!isOpened) _this.startSearch(data.movie);
                });

                // ОСНОВНЕ ВИПРАВЛЕННЯ: активуємо контролер, щоб кнопка стала доступною для пульта відразу
                if (Lampa.Controller.enabled().name === 'full_start') {
                    Lampa.Controller.enable('full_start');
                }
            }
        };

        this.startSearch = function (movie) {
            var _this = this;
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            var isTV = !!(movie.first_air_date || movie.number_of_seasons);
            var typeUA = isTV ? 'серіал' : 'фільм';
            var titleUA = (movie.title || movie.name || '').replace(/[^\w\sа-яієїґ]/gi, '');
            
            isOpened = true;

            $.ajax({
                url: 'https://uk.wikipedia.org/w/api.php',
                data: { action: 'query', list: 'search', srsearch: titleUA + ' ' + year + ' ' + typeUA, srlimit: 10, format: 'json', origin: '*' },
                dataType: 'json',
                success: function (res) {
                    var results = (res.query && res.query.search) ? res.query.search : [];
                    var match = results.find(function(r) {
                        var t = r.title.toLowerCase();
                        return t.includes(titleUA.toLowerCase()) || r.snippet.toLowerCase().includes(year);
                    });

                    if (match) {
                        _this.open('https://uk.m.wikipedia.org/wiki/' + encodeURIComponent(match.title), movie.title || movie.name);
                    } else {
                        _this.searchEN(movie, isTV);
                    }
                },
                error: function() { _this.searchEN(movie, isTV); }
            });
        };

        this.searchEN = function (movie, isTV) {
            var _this = this;
            var typeEN = isTV ? 'series' : 'film';
            var titleEN = (movie.original_title || movie.original_name || '').replace(/[^\w\s]/gi, '');
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);

            $.ajax({
                url: 'https://en.wikipedia.org/w/api.php',
                data: { action: 'query', list: 'search', srsearch: titleEN + ' ' + year + ' ' + typeEN, srlimit: 10, format: 'json', origin: '*' },
                dataType: 'json',
                success: function (res) {
                    var results = (res.query && res.query.search) ? res.query.search : [];
                    var match = results[0];
                    if (match) {
                        _this.open('https://en.m.wikipedia.org/wiki/' + encodeURIComponent(match.title), movie.title || movie.name);
                    } else {
                        isOpened = false;
                        Lampa.Noty.show('Нічого не знайдено');
                    }
                },
                error: function() { 
                    isOpened = false;
                    Lampa.Noty.show('Помилка пошуку'); 
                }
            });
        };

        this.open = function (url, title) {
            var _this = this;
            var current_controller = Lampa.Controller.enabled().name;

            var content = $('<div class="wiki-modal-container" style="height: 100%; width: 100%; background: #000; position: fixed; top: 0; left: 0; z-index: 999;">' +
                                '<div class="wiki-nav" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background: #1a1a1a; height: 60px;">' +
                                    '<div style="color: #fff; font-size: 1.2em; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 80%;">' + title + '</div>' +
                                    '<div class="wiki-close selector" style="padding: 10px 20px; background: #e74c3c; color: #fff; border-radius: 5px; cursor: pointer;">ЗАКРИТИ</div>' +
                                '</div>' +
                                '<div class="wiki-scroll-pane" style="height: calc(100% - 60px); overflow-y: auto; background: #fff; position: relative;">' +
                                    '<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;"></div>' +
                                    '<iframe src="' + url + '" style="width: 100%; height: 10000px; border: none;"></iframe>' +
                                '</div>' +
                            '</div>');

            $('body').append(content);

            Lampa.Controller.add('wiki_modal', {
                toggle: function() {
                    Lampa.Controller.collectionSet(content);
                    Lampa.Controller.collectionFocus(content.find('.wiki-close')[0], content);
                },
                up: function() {
                    content.find('.wiki-scroll-pane').scrollTop(content.find('.wiki-scroll-pane').scrollTop() - 400);
                },
                down: function() {
                    content.find('.wiki-scroll-pane').scrollTop(content.find('.wiki-scroll-pane').scrollTop() + 400);
                },
                back: function() {
                    _this.close(content, current_controller);
                }
            });

            Lampa.Controller.toggle('wiki_modal');

            content.find('.wiki-close').on('click', function() {
                _this.close(content, current_controller);
            });
        };

        this.close = function(content, prev_controller) {
            content.remove();
            isOpened = false;
            Lampa.Controller.toggle(prev_controller);
        };
    }

    if (window.Lampa) {
        new WikiSmartPlugin().init();
    }
})();
