(function () {
    'use strict';

    function UaKinoComments() {
        var ICON_URL = 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Comments-solid-white.svg';
        
        var proxies = [
            'https://cors.lampa.stream/',
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://my-finder.kozak-bohdan.workers.dev/?url=',
            'https://cors.bwa.workers.dev/'
        ];

        var clean = function(str) {
            return str ? str.toLowerCase().replace(/[^a-z0-9а-яіїєґ]/g, ' ').replace(/\s+/g, ' ').trim() : '';
        };

        var checkMatch = function(itemText, tUa, tEn) {
            var text = clean(itemText);
            var u = clean(tUa);
            var e = clean(tEn);
            return (u && text.indexOf(u) !== -1) || (e && text.indexOf(e) !== -1);
        };

        this.init = function () {
            var _this = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    var render = e.object.activity.render();
                    setTimeout(function() {
                        _this.renderButton(e.data, render);
                    }, 200);
                }
            });
            this.addStyles();
        };

        this.addStyles = function() {
            var css = `
                /* Стандартний вигляд кнопки */
                .uakino-comments-btn { 
                    display: flex !important; 
                    align-items: center; 
                    justify-content: center; 
                }
                
                .uakino-comments-btn img { 
                    width: 1.8em; 
                    height: 1.8em; 
                    object-fit: contain; 
                }
                
                .uakino-comments-btn span { 
                    display: none; /* Текст схований, коли немає фокусу */
                }

                /* Стан фокусу (стандартний для Lampa) */
                .uakino-comments-btn.focus img { 
                    filter: brightness(0); /* Робимо іконку чорною */
                }

                .uakino-comments-btn.focus span { 
                    display: inline-block; 
                    margin-left: 0.6em;
                    color: #000 !important; /* Чорний текст на білому/світлому фокусі */
                }

                /* Модальне вікно */
                .uk-comments-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; align-items: center; justify-content: center; }
                .uk-comments-modal { width: 60%; max-height: 80%; background: #242424; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
                .uk-comments-head { padding: 20px; font-size: 1.5em; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); background: #1f1f1f; display: flex; justify-content: space-between; align-items: center; }
                .uk-comments-list { padding: 20px; overflow-y: auto; flex-grow: 1; }
                
                .uk-comment-item { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 15px; margin-bottom: 15px; border: 2px solid transparent; }
                .uk-comment-item.focus { background: rgba(255,255,255,0.1); border-color: #fbd323; }
                .uk-comment-meta { display: flex; justify-content: space-between; margin-bottom: 8px; color: #aaa; font-size: 0.9em; }
                .uk-comment-author { color: #fbd323; font-weight: bold; font-size: 1.1em; }
                .uk-comment-text { font-size: 1.1em; line-height: 1.5; color: #ddd; white-space: pre-wrap; }
                .uk-no-comments { text-align: center; padding: 50px; color: #888; font-size: 1.2em; }
            `;
            if (!$('#uakino-comments-style').length) $('head').append('<style id="uakino-comments-style">' + css + '</style>');
        };

        this.renderButton = function (data, render) {
            var _this = this;
            var buttons_container = render.find('.full-start-new__buttons, .full-start__buttons');
            
            if (render.find('.uakino-comments-btn').length) return;

            var btn = $('<div class="full-start__button selector uakino-comments-btn">' +
                            '<img src="' + ICON_URL + '">' +
                            '<span>Коментарі</span>' +
                        '</div>');

            var neighbors = buttons_container.find('.selector');
            if (neighbors.length >= 2) {
                btn.insertAfter(neighbors.eq(1));
            } else {
                buttons_container.append(btn);
            }

            btn.on('hover:enter click', function() {
                _this.startSearch(data.movie);
            });

            var currentController = Lampa.Controller.enabled();
            if (currentController.name === 'full_start') {
                Lampa.Controller.collectionSet(buttons_container);
            }
        };

        this.startSearch = function(movie) {
            var _this = this;
            Lampa.Noty.show('Пошук на UaKino...');

            var titleUa = movie.title || movie.name || '';
            var titleEn = movie.original_title || movie.original_name || '';
            var year = parseInt(movie.release_date || movie.first_air_date || '0');

            var steps = [
                { q: titleEn + ' ' + (year || ''), checkYear: true },
                { q: titleUa + ' ' + (year || ''), checkYear: true }
            ];

            var uakinoBase = 'https://uakino.best';
            var searchPath = '/index.php?do=search&subaction=search&story=';

            function performSearch(stepIdx) {
                if (stepIdx >= steps.length) {
                    Lampa.Noty.show('Фільм не знайдено на UaKino');
                    return;
                }
                
                var query = steps[stepIdx].q;
                if (!query || query.length < 2) return performSearch(stepIdx + 1);

                var searchUrl = uakinoBase + searchPath + encodeURIComponent(query);

                _this.request(searchUrl, function(html) {
                    if (!html) return performSearch(stepIdx + 1);
                    var doc = $('<div>' + html + '</div>');
                    var foundUrl = '';
                    var items = doc.find('div.movie-item, .shortstory').slice(0, 5);
                    items.each(function() {
                        if (foundUrl) return;
                        var item = $(this);
                        var link = item.find('a.movie-title, a.full-movie, .poster > a').first();
                        var itemHref = link.attr('href');
                        var itemText = item.text();
                        if (checkMatch(itemText, titleUa, titleEn) && itemHref) {
                            foundUrl = itemHref;
                        }
                    });

                    if (foundUrl) {
                        if (foundUrl.indexOf('http') !== 0) foundUrl = uakinoBase + (foundUrl.indexOf('/') === 0 ? '' : '/') + foundUrl;
                        _this.fetchComments(foundUrl, movie.title);
                    } else {
                        performSearch(stepIdx + 1);
                    }
                }, function() {
                    performSearch(stepIdx + 1);
                });
            }
            performSearch(0);
        };

        this.request = function(url, onSuccess, onError, proxyIdx) {
            var _this = this;
            proxyIdx = proxyIdx || 0;
            if (proxyIdx >= proxies.length) {
                if (onError) onError();
                return;
            }
            $.ajax({
                url: proxies[proxyIdx] + encodeURIComponent(url),
                method: 'GET',
                timeout: 10000,
                success: function(res) {
                    var cleanHtml = (res || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
                    if (cleanHtml.length < 200) _this.request(url, onSuccess, onError, proxyIdx + 1);
                    else onSuccess(cleanHtml);
                },
                error: function() {
                    _this.request(url, onSuccess, onError, proxyIdx + 1);
                }
            });
        };

        this.fetchComments = function(url, movieTitle) {
            var _this = this;
            Lampa.Noty.show('Завантаження коментарів...');
            this.request(url, function(html) {
                var doc = $('<div>' + html + '</div>');
                var comments = [];
                var commItems = doc.find('.comment, div[id^="comment-id-"]');
                commItems.each(function() {
                    var el = $(this);
                    var author = el.find('.comm-author, .name, .comment-author, b').first().text().trim();
                    var date = el.find('.comm-date, .date, .comment-date').text().trim();
                    var textEl = el.find('.comm-text, .comment-content, .text, div[id^="comm-id-"]');
                    var textClone = textEl.clone();
                    textClone.find('div, script, style').remove();
                    var textContent = textClone.text().trim();
                    if (author && textContent) {
                        comments.push({ author: author, date: date, text: textContent });
                    }
                });
                _this.showModal(comments, movieTitle);
            }, function() {
                Lampa.Noty.show('Помилка завантаження сторінки');
            });
        };

        this.showModal = function(comments, title) {
            var _this = this;
            var prev_controller = Lampa.Controller.enabled().name;
            var html = '<div class="uk-comments-layer"><div class="uk-comments-modal"><div class="uk-comments-head"><span>' + title + ' (' + comments.length + ')</span></div><div class="uk-comments-list"></div></div></div>';
            var modal = $(html);
            var list = modal.find('.uk-comments-list');
            if (comments.length === 0) {
                list.append('<div class="uk-no-comments">Коментарів немає.</div>');
            } else {
                comments.forEach(function(c) {
                    list.append('<div class="uk-comment-item selector"><div class="uk-comment-meta"><span class="uk-comment-author">' + c.author + '</span><span>' + c.date + '</span></div><div class="uk-comment-text">' + c.text + '</div></div>');
                });
            }
            $('body').append(modal);
            var close = function() {
                modal.remove();
                Lampa.Controller.toggle(prev_controller);
            };
            Lampa.Controller.add('uakino_comments', {
                toggle: function() {
                    Lampa.Controller.collectionSet(list);
                    Lampa.Controller.collectionFocus(list.find('.selector')[0], list);
                },
                up: function() {
                    var focus = list.find('.focus');
                    if (focus.length) {
                        var prev = focus.prev('.selector');
                        if (prev.length) {
                            Lampa.Controller.collectionFocus(prev[0], list);
                            var offset = prev.offset().top - list.offset().top;
                            if (offset < 0) list.scrollTop(list.scrollTop() + offset - 20);
                        }
                    }
                },
                down: function() {
                    var focus = list.find('.focus');
                    if (focus.length) {
                        var next = focus.next('.selector');
                        if (next.length) {
                            Lampa.Controller.collectionFocus(next[0], list);
                            var offset = next.offset().top - list.offset().top + next.outerHeight();
                            if (offset > list.height()) list.scrollTop(list.scrollTop() + offset - list.height() + 20);
                        }
                    }
                },
                back: close
            });
            Lampa.Controller.toggle('uakino_comments');
        };
    }

    if (window.Lampa) new UaKinoComments().init();
})();