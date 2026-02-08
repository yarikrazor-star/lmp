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
                                self.render(e.data, e.object.activity.render());
                            }
                        } catch (err) {
                            console.log('Wiki Error:', err);
                        }
                    }, 500);
                }
            });
        };

        this.render = function (data, html) {
            var self = this;
            var container = $(html);
            if (container.find('.lampa-wiki-button').length) return;

            var button = $('<div class="full-start__button selector lampa-wiki-button">' +
                                '<img src="' + ICON_WIKI + '" style="width: 100%; height: 100%; object-fit: contain;">' +
                                '<style>' +
                                    '.lampa-wiki-button { display: flex; align-items: center; justify-content: center; width: 2.8em; height: 2.8em; padding: 0.5em; min-width: 2.8em; margin-left: 10px; border-radius: 50%; background: rgba(255,255,255,0.1); cursor: pointer; }' +
                                    '.lampa-wiki-button.focus { background: rgba(255,255,255,0.2); }' +
                                '</style>' +
                            '</div>');

            var footer = container.find('.full-start-new__buttons, .full-start__buttons');
            if (footer.length) {
                footer.append(button);
                button.on('hover:enter click', function() {
                    self.startSearch(data.movie);
                });
                if (Lampa.Controller.enabled().name === 'full_start') {
                    Lampa.Controller.enable('full_start');
                }
            }
        };

        this.startSearch = function (movie) {
            var self = this;
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            var cleanTitle = (movie.title || movie.name).replace(/[^\w\sа-яієїґ]/gi, '');
            
            // UA Пошук
            var ukQuery = 'intitle:"' + cleanTitle + '" ' + year;
            $.ajax({
                url: 'https://uk.wikipedia.org/w/api.php',
                data: { action: 'query', list: 'search', srsearch: ukQuery, srlimit: 5, format: 'json', origin: '*' },
                dataType: 'json',
                success: function (res) {
                    var results = res.query ? res.query.search : [];
                    // Шукаємо результат, де в заголовку є назва ТА рік
                    var bestMatch = results.find(function(r) { 
                        return r.title.includes(year) || r.snippet.includes(year); 
                    });

                    if (bestMatch) {
                        self.open('https://uk.m.wikipedia.org/wiki/' + encodeURIComponent(bestMatch.title), movie.title || movie.name);
                    } else {
                        self.searchEN(movie);
                    }
                },
                error: function() { self.searchEN(movie); }
            });
        };

        this.searchEN = function (movie) {
            var self = this;
            var title = (movie.original_title || movie.original_name || '').replace(/[^\w\s]/gi, '');
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            
            // Виправлено: Рік додано як обов'язковий термін через пробіл та фільтр intitle
            // Також розширено srlimit, щоб мати вибір для фільтрації
            var query = 'intitle:"' + title + '" ' + year + ' -intitle:soundtrack';
            
            $.ajax({
                url: 'https://en.wikipedia.org/w/api.php',
                data: { action: 'query', list: 'search', srsearch: query, srlimit: 10, format: 'json', origin: '*' },
                dataType: 'json',
                success: function (res) {
                    var results = (res.query && res.query.search) ? res.query.search : [];
                    
                    // Фільтрація: спочатку шукаємо де є і назва, і рік у заголовку
                    var page = results.find(function(r) {
                        return r.title.toLowerCase().includes(title.toLowerCase()) && r.title.includes(year);
                    });

                    // Якщо не знайшли в заголовку, шукаємо будь-яку згадку року в описі (snippet)
                    if (!page) {
                        page = results.find(function(r) {
                            return r.snippet.includes(year) || r.title.includes('film') || r.title.includes('series');
                        });
                    }

                    if (page) {
                        self.open('https://en.m.wikipedia.org/wiki/' + encodeURIComponent(page.title), movie.title || movie.name);
                    } else if (results.length > 0) {
                        // Якщо нічого не підійшло ідеально, беремо перший результат (як було раніше)
                        self.open('https://en.m.wikipedia.org/wiki/' + encodeURIComponent(results[0].title), movie.title || movie.name);
                    } else {
                        Lampa.Noty.show('На Вікіпедії нічого не знайдено');
                    }
                },
                error: function() { Lampa.Noty.show('Помилка пошуку'); }
            });
        };

        this.open = function (url, title) {
            var self = this;
            var currentController = Lampa.Controller.enabled().name;

            var content = $('<div class="wiki-wrapper" style="background: #fff; border-radius: 8px; overflow: hidden; width: 100%; height: 100%;">' +
                                '<div class="wiki-head" style="padding: 10px; background: #1a1a1a; display: flex; justify-content: space-between; align-items: center;">' +
                                    '<span style="color: #fff; font-size: 1.2em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; font-family: sans-serif;">' + title + '</span>' +
                                    '<div class="wiki-close selector" style="padding: 10px 20px; background: rgba(255,255,255,0.1); color: #fff; border-radius: 4px; cursor: pointer;">Закрити</div>' +
                                '</div>' +
                                '<div class="wiki-body" style="height: 70vh; overflow-y: hidden; position: relative; background: #fff;">' +
                                    '<iframe src="' + url + '" style="width: 100%; height: 10000px; border: none; pointer-events: none;"></iframe>' +
                                '</div>' +
                            '</div>');

            Lampa.Modal.open({
                title: '',
                html: content,
                size: 'large',
                onBack: function () {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle(currentController);
                }
            });

            Lampa.Controller.add('wiki_controller', {
                toggle: function() {
                    Lampa.Controller.collectionSet(content);
                    Lampa.Controller.collectionFocus(content.find('.wiki-close')[0], content);
                },
                up: function() {
                    content.find('.wiki-body').scrollTop(content.find('.wiki-body').scrollTop() - 250);
                },
                down: function() {
                    content.find('.wiki-body').scrollTop(content.find('.wiki-body').scrollTop() + 250);
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
