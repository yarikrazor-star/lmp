(function () {
    'use strict';
    function CombinedComments() {
        var _this = this;
        var proxies = [
            'https://cors.lampa.stream/',
            'https://my-finder.kozak-bohdan.workers.dev/?url=',
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://cors.bwa.workers.dev/'
        ];

        var clean = function (str) {
            return str ? str.toLowerCase().replace(/[^a-z0-9а-яіїєґ]/g, ' ').replace(/\s+/g, ' ').trim() : '';
        };

        var checkMatch = function (itemText, tUa, tEn) {
            var text = clean(itemText);
            var u = clean(tUa);
            var e = clean(tEn);
            return (u && text.indexOf(u) !== -1) || (e && text.indexOf(e) !== -1);
        };

        var request = function (url, onSuccess, onError, proxyIdx) {
            proxyIdx = proxyIdx || 0;
            if (proxyIdx >= proxies.length) {
                if (onError) onError();
                return;
            }
            $.ajax({
                url: proxies[proxyIdx] + encodeURIComponent(url),
                method: 'GET',
                timeout: 5000,
                success: function (res) {
                    if ((res || '').length < 200) request(url, onSuccess, onError, proxyIdx + 1);
                    else onSuccess(res);
                },
                error: function () {
                    request(url, onSuccess, onError, proxyIdx + 1);
                }
            });
        };

        var parseComments = function (html, sourceName) {
            var comments = [];
            var doc = $('<div>' + html + '</div>');
            var items = doc.find('.comment, div[id^="comment-id-"], .comm-item');
            var uniqueSignatures = [];

            items.each(function () {
                var el = $(this);
                
                if(el.parents('.comment, div[id^="comment-id-"], .comm-item').length > 0) return;

                var author = el.find('.comm-author, .name, .comment-author, .acc-name, b').first().text().trim();

                var textEl = el.find('.comm-text, .comment-content, .text, .comment-body, div[id^="comm-id-"]').clone();
                textEl.find('div, script, style, .comm-good-bad').remove();
                var text = textEl.text().trim();

                var dateClone = el.clone();
                dateClone.find('.comm-text, .comment-content, .text, .comment-body, div[id^="comm-id-"]').remove();
                
                var date = dateClone.find('.comm-date, .date, .comment-date, .comm-two').text().trim();

                if (date.length > 60) date = '';
                if (text && date.indexOf(text) !== -1) date = '';
                date = date.replace(/Група:.*?$/i, '').trim();

                if (author && text) {
                    var signature = author + '|' + date + '|' + text.substring(0, 50);
                    
                    if (uniqueSignatures.indexOf(signature) === -1) {
                        uniqueSignatures.push(signature);
                        comments.push({
                            author: author + ' (' + sourceName + ')',
                            date: date,
                            text: text
                        });
                    }
                }
            });
            return comments;
        };

        var searchSite = function (site, movie, callback) {
            var titleUa = movie.title || movie.name || '';
            var titleEn = movie.original_title || movie.original_name || '';
            var year = parseInt(movie.release_date || movie.first_air_date || '0');
            
            var steps = [];
            if (site.yearCheck) {
                steps.push(titleEn + ' ' + (year || ''));
                steps.push(titleUa + ' ' + (year || ''));
            } else {
                steps.push(titleEn);
                steps.push(titleUa);
            }

            var performSearch = function (stepIdx) {
                if (stepIdx >= steps.length) {
                    callback([]);
                    return;
                }
                
                var query = steps[stepIdx];
                if (!query || query.trim().length < 2) {
                    performSearch(stepIdx + 1);
                    return;
                }

                var searchUrl = site.base + site.search + encodeURIComponent(query);

                request(searchUrl, function (html) {
                    var foundUrl = '';
                    var doc = $('<div>' + html + '</div>');
                    var items = doc.find(site.selector).slice(0, 5);

                    items.each(function () {
                        if (foundUrl) return;
                        var item = $(this);
                        var link = item.find(site.linkSelector).first();
                        if (!link.length && item.is('a')) link = item;
                        
                        var href = link.attr('href');
                        var text = item.text();

                        if (checkMatch(text, titleUa, titleEn) && href) {
                            foundUrl = href;
                        }
                    });

                    if (foundUrl) {
                        if (foundUrl.indexOf('http') !== 0) foundUrl = site.base + (foundUrl.indexOf('/') === 0 ? '' : '/') + foundUrl;
                        
                        request(foundUrl, function (pageHtml) {
                            if (site.name === 'UAFlix') {
                                if (pageHtml.indexOf('Увага! Виявлено помилку') !== -1 || 
                                    pageHtml.indexOf('Гості не мають доступу для перегляду статей з цього розділу') !== -1) {
                                    callback([]);
                                    return;
                                }
                            }
                            
                            callback(parseComments(pageHtml, site.name));
                        }, function () {
                            performSearch(stepIdx + 1);
                        });
                    } else {
                        performSearch(stepIdx + 1);
                    }
                }, function () {
                    performSearch(stepIdx + 1);
                });
            };

            performSearch(0);
        };

        this.init = function () {
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    var render = e.object.activity.render();
                    setTimeout(function () {
                        _this.renderButton(e.data, render);
                    }, 100);
                }
            });
            this.addStyles();
        };

        this.addStyles = function () {
            var css = `
                /* Стилі кнопки */
                .uk-comments-btn { display: flex !important; align-items: center; justify-content: center; }
                .uk-comments-btn > img { width: 1.8em; height: 1.8em; object-fit: contain; }
                
                /* Текст ховаємо за замовчуванням, показуємо при фокусі. Стилі (колір) беремо стандартні від Lampa */
                .uk-comments-btn > span { display: none; margin-left: 0.6em; }
                .uk-comments-btn.focus > span { display: inline-block; }
                
                /* Модальне вікно */
                .uk-comments-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; align-items: center; justify-content: center; }
                .uk-comments-modal { width: 95%; max-height: 80%; background: #242424; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
                .uk-comments-head { padding: 15px 20px; font-size: 1.5em; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); background: #1f1f1f; display: flex; justify-content: space-between; align-items: center; }
                .uk-comments-list { padding: 20px; overflow-y: auto; flex-grow: 1; }
                .uk-comment-item { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 15px; margin-bottom: 15px; border: 2px solid transparent; }
                .uk-comment-item.focus { background: #fff; }
                .uk-comment-item.focus .uk-comment-author, .uk-comment-item.focus .uk-comment-text, .uk-comment-item.focus .uk-comment-meta { color: #000 !important; }
                .uk-comment-meta { display: flex; justify-content: space-between; margin-bottom: 8px; color: #aaa; font-size: 0.9em; }
                .uk-comment-author { color: #fbd323; font-weight: bold; }
                .uk-comment-text { font-size: 1.1em; line-height: 1.5; color: #ddd; white-space: pre-wrap; }
                .uk-no-comments { text-align: center; padding: 50px; color: #888; }
                .uk-close-btn { font-size: 0.8em; padding: 5px 15px; background: rgba(255,255,255,0.1); border-radius: 5px; cursor: pointer; }
                .uk-close-btn.focus { background: #fff; color: #000; }
            `;
            if (!$('#uk-comments-style').length) $('head').append('<style id="uk-comments-style">' + css + '</style>');
        };

        this.renderButton = function (data, render) {
            var buttons_container = render.find('.full-start-new__buttons, .full-start__buttons');
            if (render.find('.uk-comments-btn').length || !buttons_container.length) return;

            // Нова іконка
            var btn = $('<div class="full-start__button selector uk-comments-btn">' +
                '<img src="https://yarikrazor-star.github.io/lmp/coment.svg">' +
                '<span>Коментарі</span>' +
                '</div>');

            var neighbors = buttons_container.find('.selector');
            if (neighbors.length >= 2) btn.insertAfter(neighbors.eq(1));
            else buttons_container.append(btn);

            btn.on('hover:enter click', function () {
                _this.loadComments(data.movie);
            });

            var current = Lampa.Controller.enabled();
            if (current && current.name === 'full_start') {
                Lampa.Controller.collectionSet(buttons_container);
                var firstBtn = buttons_container.find('.selector').first();
                if (firstBtn.length) Lampa.Controller.collectionFocus(firstBtn[0], buttons_container);
            }
        };

        this.loadComments = function (movie) {
            Lampa.Noty.show('Пошук коментарів...');
            
            var results = { uakino: [], uaflix: [] };
            var completed = 0;

            var checkDone = function () {
                completed++;
                if (completed >= 2) {
                    var combined = [];
                    var maxLen = Math.max(results.uakino.length, results.uaflix.length);
                    
                    for (var i = 0; i < maxLen; i++) {
                        if (results.uakino[i]) combined.push(results.uakino[i]);
                        if (results.uaflix[i]) combined.push(results.uaflix[i]);
                    }
                    _this.showModal(combined, movie.title || movie.name);
                }
            };

            // UaKino
            searchSite({
                name: 'UaKino',
                base: 'https://uakino.best',
                search: '/index.php?do=search&subaction=search&story=',
                selector: 'div.movie-item, .shortstory',
                linkSelector: 'a.movie-title, a.full-movie, .poster > a',
                yearCheck: true
            }, movie, function (comments) {
                results.uakino = comments;
                checkDone();
            });

            // UAFlix
            var uaflixFinished = false;
            var uaflixTimer = setTimeout(function() {
                if (!uaflixFinished) {
                    uaflixFinished = true;
                    console.log('UAFlix timeout');
                    results.uaflix = [];
                    checkDone();
                }
            }, 2000); 

            searchSite({
                name: 'UAFlix',
                base: 'https://uaflix.net',
                search: '/index.php?do=search&subaction=search&story=',
                selector: '.video-item, .sres-wrap, article.shortstory',
                linkSelector: 'a',
                yearCheck: false
            }, movie, function (comments) {
                if (!uaflixFinished) {
                    uaflixFinished = true;
                    clearTimeout(uaflixTimer);
                    results.uaflix = comments;
                    checkDone();
                }
            });
        };

        this.showModal = function (comments, title) {
            var prev_controller = Lampa.Controller.enabled().name;
            var modal = $(
                '<div class="uk-comments-layer">' +
                    '<div class="uk-comments-modal">' +
                        '<div class="uk-comments-head">' +
                            '<span>' + title + ' (' + comments.length + ')</span>' +
                            '<div class="uk-close-btn selector">✕ Закрити</div>' +
                        '</div>' +
                        '<div class="uk-comments-list"></div>' +
                    '</div>' +
                '</div>'
            );
            var list = modal.find('.uk-comments-list');
            var closeBtn = modal.find('.uk-close-btn');

            if (comments.length === 0) {
                list.append('<div class="uk-no-comments">Коментарів не знайдено.</div>');
            } else {
                comments.forEach(function (c) {
                    var dateHtml = c.date ? '<span>' + c.date + '</span>' : '';
                    list.append('<div class="uk-comment-item selector"><div class="uk-comment-meta"><span class="uk-comment-author">' + c.author + '</span>' + dateHtml + '</div><div class="uk-comment-text">' + c.text + '</div></div>');
                });
            }

            $('body').append(modal);

            var close = function () {
                modal.remove();
                Lampa.Controller.toggle(prev_controller);
            };

            closeBtn.on('hover:enter click', close);

            Lampa.Controller.add('combined_comments', {
                toggle: function () {
                    Lampa.Controller.collectionSet(list);
                    Lampa.Controller.collectionFocus(list.find('.selector')[0], list);
                },
                up: function () {
                    var focus = list.find('.focus');
                    if (focus.prev().length) {
                        Lampa.Controller.collectionFocus(focus.prev()[0], list);
                        list.scrollTop(list.scrollTop() + focus.prev().offset().top - list.offset().top - 20);
                    } else {
                        Lampa.Controller.collectionFocus(closeBtn[0], modal);
                    }
                },
                down: function () {
                    var focus = list.find('.focus');
                    if (focus.hasClass('uk-close-btn')) {
                         if (list.find('.selector').length) {
                             Lampa.Controller.collectionFocus(list.find('.selector')[0], list);
                         }
                         return;
                    }
                    if (focus.next().length) {
                        Lampa.Controller.collectionFocus(focus.next()[0], list);
                        list.scrollTop(list.scrollTop() + focus.next().offset().top - list.offset().top - list.height() + focus.next().outerHeight() + 20);
                    }
                },
                back: close
            });

            Lampa.Controller.toggle('combined_comments');
        };
    }

    if (window.Lampa) new CombinedComments().init();
})();
