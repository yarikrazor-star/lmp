(function () {
    'use strict';

    function WikiOnlyPlugin() {
        var ICON_WIKI = 'https://yarikrazor-star.github.io/lmp/wiki.svg';
        
        this.init = function () {
            var self = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    setTimeout(function() {
                        try {
                            if (e.object && e.object.activity && e.object.activity.render) {
                                self.process(e.data.movie, e.object.activity.render());
                            }
                        } catch (err) {
                            console.log('Wiki Plugin Error:', err);
                        }
                    }, 400);
                }
            });
        };

        this.process = function (movie, render) {
            if (!movie || !render) return;

            var $render = $(render);
            $render.find('.lampa-wiki-button').remove();

            // Створення кнопки з вирівнюванням по центру
            var wikiBtn = $('<div class="full-start__button selector lampa-wiki-button" style="display: flex; align-items: center; justify-content: center;">' +
                                '<img src="' + ICON_WIKI + '" style="width: 1.1em; height: 1.1em; margin-right: 8px; vertical-align: middle;">' +
                                '<span class="wiki_text">WIKI: Пошук...</span>' +
                            '</div>');

            var buttonsContainer = $render.find('.full-start-new__buttons, .full-start__buttons');

            if (buttonsContainer.length) {
                buttonsContainer.append(wikiBtn);
                
                if (Lampa.Activity.active().activity.toggle) {
                    Lampa.Activity.active().activity.toggle();
                }
            }

            this.search(movie, wikiBtn);
        };

        this.search = function (movie, wikiBtn) {
            var self = this;
            var wikiText = wikiBtn.find('.wiki_text');
            
            var titleEN = (movie.original_title || movie.original_name || movie.title || movie.name || '').replace(/[^\w\s]/gi, '');
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);

            var category = 'film';
            if (movie.number_of_seasons || movie.first_air_date || (movie.name && !movie.title)) {
                category = 'television series';
            }
            
            var isAnim = false;
            if (movie.genre_ids && movie.genre_ids.indexOf(16) !== -1) isAnim = true;
            if (movie.genres && Array.isArray(movie.genres)) {
                isAnim = movie.genres.some(function(g) { return g.id === 16; });
            }
            if (isAnim) category = 'animated ' + category;

            var queryStr = (titleEN + ' ' + year + ' ' + category).trim();

            $.ajax({
                url: 'https://en.wikipedia.org/w/api.php',
                data: { action: 'query', list: 'search', srsearch: queryStr, format: 'json', origin: '*' },
                dataType: 'json',
                success: function(res) {
                    var pageEN = (res.query && res.query.search && res.query.search[0]) ? res.query.search[0] : null;

                    if (pageEN) {
                        $.ajax({
                            url: 'https://en.wikipedia.org/w/api.php',
                            data: { action: 'query', prop: 'langlinks', lllang: 'uk', pageids: pageEN.pageid, format: 'json', origin: '*' },
                            dataType: 'json',
                            success: function(details) {
                                var pageData = (details.query && details.query.pages && details.query.pages[pageEN.pageid]) ? details.query.pages[pageEN.pageid] : {};
                                var uaTitle = (pageData.langlinks && pageData.langlinks[0]) ? pageData.langlinks[0]['*'] : null;
                                
                                wikiText.text(uaTitle ? 'WIKI: UA' : 'WIKI: EN');

                                wikiBtn.off('hover:enter').on('hover:enter', function() {
                                    var url = uaTitle 
                                        ? 'https://uk.m.wikipedia.org/wiki/' + encodeURIComponent(uaTitle)
                                        : 'https://en.m.wikipedia.org/?curid=' + pageEN.pageid;
                                    self.open(url, movie.title || movie.name);
                                });
                            }
                        });
                    } else {
                        wikiText.text('WIKI: ?');
                    }
                },
                error: function() {
                    wikiText.text('WIKI: !');
                }
            });
        };

        this.open = function (url, title) {
            var enabled = Lampa.Controller.enabled().name;
            Lampa.Modal.open({
                title: title,
                html: $('<div style="height: 500px;"><iframe src="' + url + '" style="width: 100%; height: 100%; border: none; background: #fff; border-radius: 8px;"></iframe></div>'),
                size: 'large',
                onBack: function() {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle(enabled);
                }
            });
        };
    }

    if (window.Lampa) {
        new WikiOnlyPlugin().init();
    } else {
        $(document).on('lampa:ready', function() { 
            new WikiOnlyPlugin().init(); 
        });
    }
})();
