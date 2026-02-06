(function () {
    'use strict';

    function UnifiedWikiPlugin() {
        var ICON_WIKI = 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Wikipedia-logo-v2-en.svg';
        
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
                            console.log('Wiki Error:', err);
                        }
                    }, 400);
                }
            });
        };

        this.process = function (movie, render) {
            if (!movie || !render) return;

            var $render = $(render);
            // Видаляємо старі елементи, якщо вони є
            $render.find('.surs_wiki_unified').remove();

            // 1. Рядок з виробником (залишаємо під слоганом)
            var studioRow = $('<div class="surs_wiki_unified surs_studio_row" style="width: 100%; display: block; margin: 0.4em 0; clear: both;">' +
                                '<div class="wiki_studio_info" style="font-size: 1.2em; color: #fff; opacity: 0.9;">' +
                                    '<span>Виробник: <span class="studio_list">Пошук...</span></span>' +
                                '</div>' +
                            '</div>');

            // 2. Створення кнопки Вікіпедії як стандартної кнопки Lampa
            var wikiBtn = $('<div class="full-start__button selector surs_wiki_unified surs_wiki_btn_row">' +
                                '<img src="' + ICON_WIKI + '" style="width: 1.1em; height: 1.1em; filter: invert(1); vertical-align: middle; margin-right: 8px; opacity: 0.8;">' +
                                '<span class="wiki_text">WIKI: ...</span>' +
                            '</div>');

            var slogan = $render.find('.full-start__slogan');
            var ratings = $render.find('.full-start-new__rate-line, .full-start__rate-line');
            var buttonsContainer = $render.find('.full-start-new__buttons, .full-start__buttons');

            // Вставляємо інфо про студію
            if (slogan.length) slogan.after(studioRow);
            else if (ratings.length) ratings.before(studioRow);
            else $render.find('.full-start__info').prepend(studioRow);

            // Вставляємо кнопку в блок до інших кнопок
            if (buttonsContainer.length) {
                buttonsContainer.append(wikiBtn);
                // Оновлюємо активність контролера, щоб кнопка стала доступною для пульта
                if (Lampa.Activity.active().activity.toggle) {
                    Lampa.Activity.active().activity.toggle();
                }
            }

            this.search(movie, wikiBtn, studioRow);
        };

        this.search = function (movie, wikiBtn, studioRow) {
            var self = this;
            var wikiText = wikiBtn.find('.wiki_text');
            var studioList = studioRow.find('.studio_list');
            
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
                        // Пошук української версії статті
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

                        // Пошук виробника (студії)
                        $.ajax({
                            url: 'https://en.wikipedia.org/w/api.php',
                            data: { action: 'parse', pageid: pageEN.pageid, prop: 'text', section: 0, format: 'json', origin: '*' },
                            dataType: 'json',
                            success: function(data) {
                                if (data.parse && data.parse.text) {
                                    var html = data.parse.text['*'];
                                    var parser = new DOMParser();
                                    var doc = parser.parseFromString(html, 'text/html');
                                    var rows = doc.querySelectorAll('.infobox tr');
                                    var company = "";

                                    for (var i = 0; i < rows.length; i++) {
                                        var label = rows[i].querySelector('.infobox-label');
                                        if (label) {
                                            var txt = label.textContent.toLowerCase();
                                            if ((txt.indexOf('company') > -1 || txt.indexOf('production') > -1) && txt.indexOf('location') === -1) {
                                                var dataCell = rows[i].querySelector('.infobox-data');
                                                if (dataCell) {
                                                    company = dataCell.textContent.replace(/\[\d+\]/g, '').trim();
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    studioList.text(company || 'Не вказано');
                                }
                            }
                        });
                    } else {
                        studioList.text('Не знайдено');
                        wikiText.text('WIKI: ?');
                    }
                },
                error: function() {
                    studioList.text('Помилка');
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
        new UnifiedWikiPlugin().init();
    } else {
        $(document).on('lampa:ready', function() { 
            new UnifiedWikiPlugin().init(); 
        });
    }
})();
