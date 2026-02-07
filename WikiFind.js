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
            var container = $(html);
            container.find('.lampa-wiki-button').remove();

            var button = $('<div class="full-start__button selector lampa-wiki-button" style="display: flex; align-items: center; justify-content: center; width: 2.8em; height: 2.8em; padding: 0; min-width: 2.8em;">' +
                                '<img src="' + ICON_WIKI + '" style="width: 100%; height: 100%; object-fit: contain;">' +
                            '</div>');

            var footer = container.find('.full-start-new__buttons, .full-start__buttons');
            if (footer.length) {
                footer.append(button);
                try {
                    if (Lampa.Activity.active().activity.toggle) Lampa.Activity.active().activity.toggle();
                } catch(e) {}
            }

            this.prepareSearch(movie, button);
        };

        this.prepareSearch = function (movie, button) {
            var self = this;
            
            // Визначаємо тип для уточнення в дужках
            var isTV = (movie.number_of_seasons || movie.first_air_date || (movie.name && !movie.title));
            var typeSpec = isTV ? '(TV series)' : '(film)';
            
            // Очищаємо назву (тільки латиниця та цифри)
            var title = (movie.original_title || movie.original_name || '').replace(/[^\w\s]/gi, '');
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            
            // Чіткий шаблон: "Назва (film/TV series) рік"
            // Це виключає акторів, бо у них в дужках написано (actor)
            var query = title + ' ' + typeSpec + ' ' + year;
            
            $.ajax({
                url: 'https://en.wikipedia.org/w/api.php',
                data: {
                    action: 'query',
                    list: 'search',
                    srsearch: query,
                    srlimit: 1,
                    format: 'json',
                    origin: '*'
                },
                dataType: 'json',
                success: function (res) {
                    var page = (res.query && res.query.search && res.query.search.length > 0) ? res.query.search[0] : null;
                    if (page) {
                        self.findUK(page.title, function (ukLink) {
                            var finalUrl = ukLink || ('https://en.m.wikipedia.org/wiki/' + encodeURIComponent(page.title));
                            button.off('hover:enter').on('hover:enter', function () {
                                self.open(finalUrl, movie.title || movie.name);
                            });
                        });
                    } else {
                        button.css('opacity', '0.3');
                    }
                },
                error: function () {
                    button.css('opacity', '0.3');
                }
            });
        };

        this.findUK = function (title, callback) {
            $.ajax({
                url: 'https://en.wikipedia.org/w/api.php',
                data: {
                    action: 'query',
                    titles: title,
                    prop: 'langlinks',
                    lllang: 'uk',
                    format: 'json',
                    origin: '*'
                },
                dataType: 'json',
                success: function (res) {
                    try {
                        var pages = res.query.pages;
                        var id = Object.keys(pages)[0];
                        if (pages[id].langlinks && pages[id].langlinks[0]) {
                            var ukTitle = pages[id].langlinks[0]['*'];
                            callback('https://uk.m.wikipedia.org/wiki/' + encodeURIComponent(ukTitle));
                        } else {
                            callback(null);
                        }
                    } catch (e) { callback(null); }
                },
                error: function () { callback(null); }
            });
        };

        this.open = function (url, title) {
            var currentController = Lampa.Controller.enabled().name;
            Lampa.Modal.open({
                title: title,
                html: $('<div style="height: 500px;"><iframe src="' + url + '" style="width: 100%; height: 100%; border: none; background: #fff; border-radius: 8px;"></iframe></div>'),
                size: 'large',
                onBack: function () {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle(currentController);
                }
            });
        };
    }

    // Запуск без конфліктів
    if (window.Lampa) {
        new WikiSmartPlugin().init();
    } else {
        $(document).off('lampa:ready').on('lampa:ready', function () {
            new WikiSmartPlugin().init();
        });
    }
})();
