(function () {
    'use strict';

    function WikiSmartPlugin() {
        var _this = this;
        var ICON_WIKI = 'https://yarikrazor-star.github.io/lmp/wiki.svg';
        var cachedResults = null;
        var isFallbackUsed = false;
        var searchPromise = null;
        var isOpened = false;

        this.init = function () {
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
            $('.lampa-wiki-smart-btn').remove();
            cachedResults = null;
            isFallbackUsed = false;
            searchPromise = null;
            isOpened = false;
        };

        this.render = function (data, html) {
            var _this = this;
            var container = $(html);
            if (container.find('.lampa-wiki-smart-btn').length) return;

            var button = $('<div class="full-start__button selector lampa-wiki-smart-btn">' +
                                '<img src="' + ICON_WIKI + '">' +
                                '<span>Вікі</span>' +
                            '</div>');

            var style = '<style>' +
                '.lampa-wiki-smart-btn { display: flex !important; align-items: center; justify-content: center; } ' +
                '.lampa-wiki-smart-btn img { width: 1.6em; height: 1.6em; object-fit: contain; margin-right: 5px; } ' +
                
                /* Вікно на 100% екрану */
                '.wiki-smart-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #121212; z-index: 5000; display: flex; flex-direction: column; overflow: hidden; }' +
                
                /* Шапка навігації */
                '.wiki-smart-header { padding: 25px 5%; background: #1a1a1a; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.5); z-index: 2; }' +
                '.wiki-smart-nav { display: flex; align-items: center; gap: 10px; flex: 1; overflow: hidden; }' +
                
                /* Стрілки з підтримкою touch */
                '.wiki-smart-arrow { font-size: 2.5em; color: #444; font-weight: bold; line-height: 1; padding: 0 20px; user-select: none; transition: 0.2s; -webkit-tap-highlight-color: transparent; }' +
                '.wiki-smart-arrow.active { color: #fff; cursor: pointer; }' +
                '.wiki-smart-arrow.active:active { transform: scale(0.9); }' +
                
                '.wiki-smart-info { display: flex; flex-direction: column; overflow: hidden; white-space: nowrap; padding: 0 10px; }' +
                '.wiki-smart-type { font-size: 1em; color: #888; text-transform: capitalize; margin-bottom: 5px; }' +
                '.wiki-smart-title { font-size: 1.6em; color: #fff; font-weight: bold; text-overflow: ellipsis; overflow: hidden; }' +
                '.wiki-smart-warning { font-size: 0.9em; color: #ffbd2e; margin-top: 6px; font-weight: normal; display: flex; align-items: center; gap: 8px; }' +
                '.wiki-smart-counter { font-size: 1.3em; color: #666; margin-left: 15px; font-weight: bold; }' +
                
                /* Кнопка Закрити */
                '.wiki-smart-close { width: 55px; height: 55px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: bold; color: #aaa; background: #252525; border: 2px solid transparent; cursor: pointer; transition: 0.2s; -webkit-tap-highlight-color: transparent; }' +
                '.wiki-smart-close.focus, .wiki-smart-close:active { background: #fff; color: #000; border-color: #fff; outline: none; box-shadow: 0 0 15px rgba(255,255,255,0.4); }' +

                /* Контент статті */
                '.wiki-smart-content { flex: 1; overflow-y: auto; padding: 40px 6% 80px 6%; color: #d0d0d0; line-height: 1.65; font-size: 1.45em; -webkit-overflow-scrolling: touch; word-wrap: break-word; }' +
                '.wiki-smart-loader { display: flex; justify-content: center; align-items: center; height: 100%; font-size: 1.3em; color: #888; }' +
                
                /* Форматування тексту */
                '.wiki-smart-content h1, .wiki-smart-content h2, .wiki-smart-content h3 { color: #fff; border-bottom: 1px solid #333; margin-top: 1em; padding-bottom: 0.3em; font-weight: normal; }' +
                '.wiki-smart-content p { margin-bottom: 0.8em; text-align: justify; }' +
                '.wiki-smart-content a { color: #d0d0d0; text-decoration: none; pointer-events: none; border-bottom: 1px dashed #555; }' +
                
                /* Стилі для витягнутого тексту з таблиць */
                '.wiki-smart-extracted-table { margin: 1.2em 0; padding: 15px 20px; background: #1a1a1a; border-left: 4px solid #444; border-radius: 0 8px 8px 0; color: #bbb; font-size: 0.9em; line-height: 1.7; }' +
                '.wiki-smart-extracted-img { max-width: 350px !important; height: auto; display: block; margin: 20px auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.6); }' +
                
                /* Технічне сміття Вікіпедії (більшість видаляється скриптом, але залишаємо для підстраховки) */
                '.wiki-smart-content .mw-empty-elt, .wiki-smart-content .hatnote, .wiki-smart-content .ambox, .wiki-smart-content .navbox, .wiki-smart-content .reflist, .wiki-smart-content .reference, .wiki-smart-content .noprint { display: none !important; }' +
                '</style>';

            if (!$('style#wiki-smart-style').length) $('head').append('<style id="wiki-smart-style">' + style + '</style>');

            var buttons_container = container.find('.full-start-new__buttons, .full-start__buttons');
            var neighbors = buttons_container.find('.selector');
            if (neighbors.length >= 2) button.insertAfter(neighbors.eq(1));
            else buttons_container.append(button);

            if (Lampa.Controller.enabled().name === 'full_start') {
                Lampa.Controller.toggle('full_start');
            }

            _this.startFullSearch(data.movie);

            button.on('hover:enter click', function() {
                if (!isOpened) _this.handleButtonClick(data.movie);
            });
        };

        this.handleButtonClick = function(movie) {
            var _this = this;
            if (!movie) return;
            isOpened = true;

            if (cachedResults && cachedResults.length > 0) {
                _this.openViewer(cachedResults, isFallbackUsed);
            } else if (searchPromise) {
                Lampa.Noty.show('Пошук у Wikipedia...');
                searchPromise.done(function(results, isFallback) {
                    if (results.length) {
                        _this.openViewer(results, isFallback);
                    } else {
                        Lampa.Noty.show('Нічого не знайдено'); isOpened = false;
                    }
                }).fail(function() {
                    Lampa.Noty.show('Помилка завантаження даних'); isOpened = false;
                });
            } else {
                _this.startFullSearch(movie).done(function(results, isFallback) {
                     if (results.length) {
                         _this.openViewer(results, isFallback);
                     } else {
                         Lampa.Noty.show('Нічого не знайдено'); isOpened = false;
                     }
                }).fail(function() {
                     Lampa.Noty.show('Нічого не знайдено'); isOpened = false;
                });
            }
        };

        this.startFullSearch = function(movie) {
            var _this = this;
            var def = $.Deferred();

            this.searchWikidata(movie).done(function(results) {
                if (results && results.length > 0) {
                    cachedResults = results;
                    isFallbackUsed = false;
                    def.resolve(results, false);
                } else {
                    _this.searchTextFallback(movie).done(function(fallbackResults) {
                        cachedResults = fallbackResults;
                        isFallbackUsed = true;
                        def.resolve(fallbackResults, true);
                    }).fail(function() { def.reject(); });
                }
            }).fail(function() {
                _this.searchTextFallback(movie).done(function(fallbackResults) {
                    cachedResults = fallbackResults;
                    isFallbackUsed = true;
                    def.resolve(fallbackResults, true);
                }).fail(function() { def.reject(); });
            });

            searchPromise = def.promise();
            return searchPromise;
        };

        this.searchWikidata = function (movie) {
            var def = $.Deferred();
            if (!movie || !movie.id) return def.reject().promise();
            
            var method = (movie.original_name || movie.name) ? 'tv' : 'movie';
            var mainType = method === 'tv' ? 'Серіал' : 'Фільм';
            var tmdbKey = Lampa.TMDB.key();

            $.ajax({
                url: Lampa.TMDB.api(method + '/' + movie.id + '/external_ids?api_key=' + tmdbKey),
                dataType: 'json',
                success: function(extResp) {
                    var mainQId = extResp.wikidata_id;
                    if (!mainQId) return def.reject();

                    $.ajax({
                        url: 'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + mainQId + '&props=claims&format=json&origin=*',
                        dataType: 'json',
                        success: function(claimResp) {
                            var claims = claimResp.entities[mainQId].claims || {};
                            var targets = [];

                            var extractQIds = function(prop, typeName, limit) {
                                if (claims[prop]) {
                                    var items = claims[prop];
                                    if (limit) items = items.slice(0, limit);
                                    items.forEach(function(item) {
                                        if (item.mainsnak && item.mainsnak.datavalue && item.mainsnak.datavalue.value && item.mainsnak.datavalue.value.id) {
                                            targets.push({ qId: item.mainsnak.datavalue.value.id, type: typeName });
                                        }
                                    });
                                }
                            };

                            targets.push({ qId: mainQId, type: mainType });
                            extractQIds('P144', 'Основано на', 1);
                            extractQIds('P155', 'Передісторія', 1);
                            extractQIds('P156', 'Продовження', 1);
                            extractQIds('P57', 'Режисер', 2);
                            extractQIds('P161', 'Актор', 7);

                            var qIdList = targets.map(function(t) { return t.qId; });
                            var uniqueQIds = qIdList.filter(function(item, pos) { return qIdList.indexOf(item) == pos; });

                            $.ajax({
                                url: 'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + uniqueQIds.join('|') + '&props=sitelinks&format=json&origin=*',
                                dataType: 'json',
                                success: function(siteResp) {
                                    var finalResults = [];
                                    var entities = siteResp.entities || {};

                                    targets.forEach(function(t) {
                                        var entity = entities[t.qId];
                                        if (entity && entity.sitelinks) {
                                            if (entity.sitelinks.ukwiki) {
                                                finalResults.push({ type: t.type, title: entity.sitelinks.ukwiki.title, lang: 'ua', langIcon: '🇺🇦' });
                                            } else if (entity.sitelinks.enwiki) {
                                                finalResults.push({ type: t.type, title: entity.sitelinks.enwiki.title, lang: 'en', langIcon: '🇺🇸' });
                                            }
                                        }
                                    });

                                    var uniqueResults = [];
                                    var seenTitles = new Set();
                                    finalResults.forEach(function(item) {
                                        if (!seenTitles.has(item.title)) {
                                            seenTitles.add(item.title);
                                            uniqueResults.push(item);
                                        }
                                    });

                                    def.resolve(uniqueResults);
                                },
                                error: function() { def.reject(); }
                            });
                        },
                        error: function() { def.reject(); }
                    });
                },
                error: function() { def.reject(); }
            });
            return def.promise();
        };

        this.searchTextFallback = function(movie) {
            var def = $.Deferred();
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            var titleUA = (movie.title || movie.name || '').replace(/[^\w\sа-яієїґ]/gi, '');
            var titleEN = (movie.original_title || movie.original_name || '').replace(/[^\w\s]/gi, '');
            var isTV = !!(movie.first_air_date || movie.number_of_seasons);
            
            var p1 = $.ajax({ url: 'https://uk.wikipedia.org/w/api.php', data: { action: 'query', list: 'search', srsearch: titleUA + ' ' + year + (isTV ? ' серіал' : ' фільм'), srlimit: 3, format: 'json', origin: '*' }, dataType: 'json' });
            var p2 = $.ajax({ url: 'https://en.wikipedia.org/w/api.php', data: { action: 'query', list: 'search', srsearch: titleEN + ' ' + year + (isTV ? ' series' : ' film'), srlimit: 3, format: 'json', origin: '*' }, dataType: 'json' });

            $.when(p1, p2).done(function (r1, r2) {
                var results = [];
                if (r1[0].query && r1[0].query.search) {
                    r1[0].query.search.forEach(function(i) {
                        results.push({ type: 'Знайдено (UA)', title: i.title, lang: 'ua', langIcon: '🇺🇦' });
                    });
                }
                if (r2[0].query && r2[0].query.search) {
                    r2[0].query.search.forEach(function(i) {
                        results.push({ type: 'Знайдено (EN)', title: i.title, lang: 'en', langIcon: '🇺🇸' });
                    });
                }
                
                if (results.length > 0) def.resolve(results);
                else def.reject();
            }).fail(function() { def.reject(); });
            
            return def.promise();
        };

        this.openViewer = function(articles, isFallback) {
            var prev_controller = Lampa.Controller.enabled().name;
            var currentIndex = 0;

            var warningHtml = isFallback 
                ? '<div class="wiki-smart-warning"><span>⚠️</span> Статтю не знайдено, альтернативні статті:</div>' 
                : '';

            var viewer = $('<div class="wiki-smart-overlay">' +
                                '<div class="wiki-smart-header">' +
                                    '<div class="wiki-smart-nav">' +
                                        '<div class="wiki-smart-arrow arrow-left">‹</div>' +
                                        '<div class="wiki-smart-info">' +
                                            '<div class="wiki-smart-type"></div>' +
                                            '<div class="wiki-smart-title"></div>' +
                                            warningHtml +
                                        '</div>' +
                                        '<div class="wiki-smart-arrow arrow-right">›</div>' +
                                        '<div class="wiki-smart-counter"></div>' +
                                    '</div>' +
                                    '<div class="wiki-smart-close selector">×</div>' +
                                '</div>' +
                                '<div class="wiki-smart-content"></div>' +
                            '</div>');

            $('body').append(viewer);

            var closeViewer = function() {
                viewer.remove();
                isOpened = false;
                Lampa.Controller.toggle(prev_controller);
            };

            viewer.find('.wiki-smart-close').on('hover:enter click', function() {
                closeViewer();
            });

            var goLeft = function() {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateUI();
                }
            };

            var goRight = function() {
                if (currentIndex < articles.length - 1) {
                    currentIndex++;
                    updateUI();
                }
            };

            viewer.find('.arrow-left').on('click', goLeft);
            viewer.find('.arrow-right').on('click', goRight);

            var updateUI = function() {
                var item = articles[currentIndex];
                
                viewer.find('.wiki-smart-type').text(item.type + ' ' + item.langIcon);
                viewer.find('.wiki-smart-title').text(item.title);
                viewer.find('.wiki-smart-counter').text('[' + (currentIndex + 1) + '/' + articles.length + ']');
                
                viewer.find('.arrow-left').toggleClass('active', currentIndex > 0);
                viewer.find('.arrow-right').toggleClass('active', currentIndex < articles.length - 1);

                var contentDiv = viewer.find('.wiki-smart-content');
                contentDiv.scrollTop(0);
                contentDiv.html('<div class="wiki-smart-loader">Завантаження статті...</div>');

                var apiUrl = 'https://' + (item.lang === 'ua' ? 'uk' : 'en') + '.wikipedia.org/api/rest_v1/page/html/' + encodeURIComponent(item.title);

                $.ajax({
                    url: apiUrl,
                    timeout: 10000,
                    success: function(htmlContent) {
                        // 1. Попередня обробка: ВИДАЛЕННЯ ТЕГІВ, ЯКІ ЛАМАЛИ НАВІГАЦІЮ (base)
                        htmlContent = htmlContent.replace(/<base[^>]*>/gi, '');
                        htmlContent = htmlContent.replace(/<meta[^>]*>/gi, '');
                        htmlContent = htmlContent.replace(/src="\/\//g, 'src="https://');
                        htmlContent = htmlContent.replace(/href="\//g, 'href="https://wikipedia.org/');
                        htmlContent = htmlContent.replace(/srcset=/g, 'data-srcset=');
                        htmlContent = htmlContent.replace(/style="[^"]*"/g, ""); 
                        htmlContent = htmlContent.replace(/bgcolor="[^"]*"/g, "");
                        
                        // 2. Створення віртуального DOM для безпечної та точної очистки
                        var tempDiv = $('<div>').html(htmlContent);
                        
                        // 3. Видалення непотрібних блоків (сміття вікіпедії)
                        tempDiv.find('script, style, link, title, base, meta, .mw-empty-elt, .hatnote, .ambox, .navbox, .reflist, .reference, .noprint, .infobox-header').remove();

                        // 4. ПОВНЕ ПЕРЕТВОРЕННЯ ТАБЛИЦЬ НА ЗВИЧАЙНИЙ ТЕКСТ
                        tempDiv.find('table').each(function() {
                            var table = $(this);
                            var contentHtml = '';

                            // Зберігаємо важливі картинки з таблиці (наприклад, постери)
                            table.find('img').each(function() {
                                var img = $(this);
                                if (img.attr('width') > 50 || img.attr('height') > 50 || !img.attr('width')) {
                                    contentHtml += '<img src="' + img.attr('src') + '" class="wiki-smart-extracted-img">';
                                }
                            });

                            // Витягуємо текст рядок за рядком
                            var textBlocks = [];
                            table.find('tr').each(function() {
                                var rowText = [];
                                $(this).children('th, td').each(function() {
                                    // Отримуємо чистий текст (видаляючи зайві пробіли/переноси)
                                    var cellText = $(this).text().replace(/\s+/g, ' ').trim();
                                    if (cellText && cellText !== '-' && cellText.length > 0) {
                                        rowText.push(cellText);
                                    }
                                });
                                
                                if (rowText.length > 0) {
                                    textBlocks.push(rowText.join(' — ')); // Об'єднуємо комірки через тире
                                }
                            });

                            // Формуємо красивий блок тексту замість таблиці
                            if (textBlocks.length > 0) {
                                contentHtml += '<div class="wiki-smart-extracted-table">' + textBlocks.join('<br>') + '</div>';
                            }

                            // Видаляємо оригінальну таблицю, залишаючи лише наш текст та картинки
                            table.replaceWith(contentHtml);
                        });

                        // 5. ОЧИЩЕННЯ ВІД "ВЕЛИКИХ ДІРОК" (видалення порожніх абзаців)
                        tempDiv.find('p, h1, h2, h3, h4, div').each(function() {
                            // Якщо блок не має тексту і в ньому немає картинок — видаляємо його
                            if ($.trim($(this).text()) === '' && $(this).find('img').length === 0 && !$(this).hasClass('wiki-smart-extracted-table')) {
                                $(this).remove();
                            }
                        });

                        // 6. Вставка обробленого контенту на сторінку
                        contentDiv.html(tempDiv.html());
                    },
                    error: function() {
                        contentDiv.html('<div class="wiki-smart-loader" style="color:#d9534f;">Помилка завантаження статті.</div>');
                    }
                });
            };

            Lampa.Controller.add('wiki_smart_viewer', {
                toggle: function() {
                    Lampa.Controller.collectionSet(viewer);
                    Lampa.Controller.collectionFocus(viewer.find('.wiki-smart-close')[0], viewer);
                },
                up: function() { 
                    viewer.find('.wiki-smart-content').scrollTop(viewer.find('.wiki-smart-content').scrollTop() - 300); 
                },
                down: function() { 
                    viewer.find('.wiki-smart-content').scrollTop(viewer.find('.wiki-smart-content').scrollTop() + 300); 
                },
                left: goLeft,
                right: goRight,
                back: closeViewer
            });

            Lampa.Controller.toggle('wiki_smart_viewer');
            updateUI();
        };
    }

    if (window.Lampa) new WikiSmartPlugin().init();
})();
