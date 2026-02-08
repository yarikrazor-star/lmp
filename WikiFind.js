(function () {
    'use strict';

    function WikiSmartPlugin() {
        var ICON_WIKI = 'https://yarikrazor-star.github.io/lmp/wiki.svg';
        
        this.init = function () {
            var self = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    setTimeout(function() {
                        try {
                            if (e.object && e.object.activity && e.object.activity.render) {
                                self.render(e.data.movie, e.object.activity.render());
                            }
                        } catch (err) {
                            console.log('Wiki Error:', err);
                        }
                    }, 500);
                }
            });
        };

        this.render = function (movie, html) {
            var self = this;
            var container = $(html);
            if (container.find('.lampa-wiki-button').length) return;

            var button = $('<div class="full-start__button selector lampa-wiki-button">' +
                                '<img src="' + ICON_WIKI + '" style="width: 100%; height: 100%; object-fit: contain;">' +
                                '<style>.lampa-wiki-button { display: flex; align-items: center; justify-content: center; width: 2.8em; height: 2.8em; padding: 0.5em; min-width: 2.8em; margin-left: 10px; border-radius: 50%; background: rgba(255,255,255,0.1); } .lampa-wiki-button.focus { background: #fff; }</style>' +
                            '</div>');

            var footer = container.find('.full-start-new__buttons, .full-start__buttons');
            if (footer.length) {
                footer.append(button);
                // Змушуємо Lampa перерахувати доступні кнопки
                if (Lampa.Activity.active().activity.toggle) {
                    Lampa.Activity.active().activity.toggle();
                }
            }

            this.prepareSearch(movie, button);
        };

        this.prepareSearch = function (movie, button) {
            var self = this;
            var isTV = (movie.number_of_seasons || movie.first_air_date || (movie.name && !movie.title));
            var typeSpec = isTV ? '(TV series)' : '(film)';
            var title = (movie.original_title || movie.original_name || '').replace(/[^\w\s]/gi, '');
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            var query = title + ' ' + typeSpec + ' ' + year;
            
            $.ajax({
                url: 'https://en.wikipedia.org/w/api.php',
                data: { action: 'query', list: 'search', srsearch: query, srlimit: 1, format: 'json', origin: '*' },
                dataType: 'json',
                success: function (res) {
                    var page = (res.query && res.query.search && res.query.search.length > 0) ? res.query.search[0] : null;
                    if (page) {
                        self.findUK(page.title, function (ukLink) {
                            var finalUrl = ukLink || ('https://en.m.wikipedia.org/wiki/' + encodeURIComponent(page.title));
                            button.on('hover:enter click', function () {
                                self.open(finalUrl, movie.title || movie.name);
                            });
                        });
                    } else { button.css('opacity', '0.2'); }
                },
                error: function () { button.css('opacity', '0.2'); }
            });
        };

        this.findUK = function (title, callback) {
            $.ajax({
                url: 'https://en.wikipedia.org/w/api.php',
                data: { action: 'query', titles: title, prop: 'langlinks', lllang: 'uk', format: 'json', origin: '*' },
                dataType: 'json',
                success: function (res) {
                    try {
                        var pages = res.query.pages;
                        var id = Object.keys(pages)[0];
                        if (pages[id].langlinks && pages[id].langlinks[0]) {
                            callback('https://uk.m.wikipedia.org/wiki/' + encodeURIComponent(pages[id].langlinks[0]['*']));
                        } else { callback(null); }
                    } catch (e) { callback(null); }
                },
                error: function () { callback(null); }
            });
        };

        this.open = function (url, title) {
            var currentController = Lampa.Controller.enabled().name;
            var scrollStep = 250;

            // Створюємо контент з явною кнопкою закриття для фокусу
            var content = $('<div class="wiki-wrapper" style="background: #fff; border-radius: 8px; overflow: hidden;">' +
                                '<div class="wiki-head" style="padding: 10px; background: #1a1a1a; display: flex; justify-content: space-between; align-items: center;">' +
                                    '<span style="color: #fff; font-size: 1.2em;">' + title + '</span>' +
                                    '<div class="wiki-close selector" style="padding: 10px 20px; background: #e50914; color: #fff; border-radius: 4px;">ЗАКРИТИ</div>' +
                                '</div>' +
                                '<div class="wiki-body" style="height: 60vh; overflow-y: hidden; position: relative;">' +
                                    '<iframe src="' + url + '" style="width: 100%; height: 5000px; border: none; pointer-events: none;"></iframe>' +
                                '</div>' +
                            '</div>');

            Lampa.Modal.open({
                title: '', // Заголовок всередині нашого html
                html: content,
                size: 'large',
                onBack: function () {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle(currentController);
                }
            });

            // Контролер для керування модалкою
            Lampa.Controller.add('wiki_controller', {
                toggle: function() {
                    Lampa.Controller.collectionSet(content);
                    Lampa.Controller.collectionFocus(content.find('.wiki-close')[0], content);
                },
                up: function() {
                    content.find('.wiki-body').scrollTop(content.find('.wiki-body').scrollTop() - scrollStep);
                },
                down: function() {
                    content.find('.wiki-body').scrollTop(content.find('.wiki-body').scrollTop() + scrollStep);
                },
                back: function() {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle(currentController);
                }
            });

            Lampa.Controller.toggle('wiki_controller');

            content.find('.wiki-close').on('click', function() {
                Lampa.Modal.close();
                Lampa.Controller.toggle(currentController);
            });
        };
    }

    if (window.Lampa) {
        new WikiSmartPlugin().init();
    } else {
        $(document).off('lampa:ready').on('lampa:ready', function () {
            new WikiSmartPlugin().init();
        });
    }
})();
