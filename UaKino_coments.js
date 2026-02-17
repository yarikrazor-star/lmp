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
                    // Чекаємо трохи довше, щоб Lampa встигла ініціалізувати свій контролер
                    setTimeout(function() {
                        _this.renderButton(e.data, render);
                    }, 100);
                }
            });
            this.addStyles();
        };

        this.addStyles = function() {
            var css = `
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
                    display: none; 
                }
                .uakino-comments-btn.focus img { 
                    filter: brightness(0); 
                }
                .uakino-comments-btn.focus span { 
                    display: inline-block; 
                    margin-left: 0.8em;
                    color: #000 !important;
                }
                .uk-comments-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; align-items: center; justify-content: center; }
                .uk-comments-modal { width: 60%; max-height: 80%; background: #242424; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
                .uk-comments-head { padding: 20px; font-size: 1.5em; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); background: #1f1f1f; }
                .uk-comments-list { padding: 20px; overflow-y: auto; flex-grow: 1; }
                .uk-comment-item { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 15px; margin-bottom: 15px; border: 2px solid transparent; }
                .uk-comment-item.focus { background: #fff; }
                .uk-comment-item.focus .uk-comment-author, 
                .uk-comment-item.focus .uk-comment-text, 
                .uk-comment-item.focus .uk-comment-meta { color: #000 !important; }
                .uk-comment-meta { display: flex; justify-content: space-between; margin-bottom: 8px; color: #aaa; font-size: 0.9em; }
                .uk-comment-author { color: #fbd323; font-weight: bold; }
                .uk-comment-text { font-size: 1.1em; line-height: 1.5; color: #ddd; white-space: pre-wrap; }
                .uk-no-comments { text-align: center; padding: 50px; color: #888; }
            `;
            if (!$('#uakino-comments-style').length) $('head').append('<style id="uakino-comments-style">' + css + '</style>');
        };

        this.renderButton = function (data, render) {
            var _this = this;
            var buttons_container = render.find('.full-start-new__buttons, .full-start__buttons');
            
            if (render.find('.uakino-comments-btn').length || !buttons_container.length) return;

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

            // ВИПРАВЛЕННЯ ФОКУСУ:
            var current = Lampa.Controller.enabled();
            if (current && current.name === 'full_start') {
                // Оновлюємо список елементів, які бачить контролер
                Lampa.Controller.collectionSet(buttons_container);
                
                // Якщо фокус зник або він не на кнопках - ставимо на першу кнопку блоку
                var firstBtn = buttons_container.find('.selector').first();
                if (firstBtn.length) {
                    Lampa.Controller.collectionFocus(firstBtn[0], buttons_container);
                }
            }
        };

        this.startSearch = function(movie) {
            var _this = this;
            Lampa.Noty.show('Пошук на UaKino...');
            var titleUa = movie.title || movie.name || '';
            var titleEn = movie.original_title || movie.original_name || '';
            var year = parseInt(movie.release_date || movie.first_air_date || '0');
            var steps = [{ q: titleEn + ' ' + (year || '') }, { q: titleUa + ' ' + (year || '') }];
            var uakinoBase = 'https://uakino.best';
            var searchPath = '/index.php?do=search&subaction=search&story=';

            function performSearch(stepIdx) {
                if (stepIdx >= steps.length) { Lampa.Noty.show('Фільм не знайдено'); return; }
                var query = steps[stepIdx].q;
                _this.request(uakinoBase + searchPath + encodeURIComponent(query), function(html) {
                    var foundUrl = '';
                    var doc = $('<div>' + html + '</div>');
                    doc.find('div.movie-item, .shortstory').slice(0, 5).each(function() {
                        if (foundUrl) return;
                        var link = $(this).find('a.movie-title, a.full-movie, .poster > a').first();
                        if (checkMatch($(this).text(), titleUa, titleEn) && link.attr('href')) foundUrl = link.attr('href');
                    });
                    if (foundUrl) {
                        if (foundUrl.indexOf('http') !== 0) foundUrl = uakinoBase + (foundUrl.indexOf('/') === 0 ? '' : '/') + foundUrl;
                        _this.fetchComments(foundUrl, movie.title || movie.name);
                    } else performSearch(stepIdx + 1);
                }, function() { performSearch(stepIdx + 1); });
            }
            performSearch(0);
        };

        this.request = function(url, onSuccess, onError, proxyIdx) {
            var _this = this;
            proxyIdx = proxyIdx || 0;
            if (proxyIdx >= proxies.length) { if (onError) onError(); return; }
            $.ajax({
                url: proxies[proxyIdx] + encodeURIComponent(url),
                method: 'GET', timeout: 10000,
                success: function(res) {
                    if ((res || '').length < 200) _this.request(url, onSuccess, onError, proxyIdx + 1);
                    else onSuccess(res);
                },
                error: function() { _this.request(url, onSuccess, onError, proxyIdx + 1); }
            });
        };

        this.fetchComments = function(url, movieTitle) {
            var _this = this;
            Lampa.Noty.show('Завантаження коментарів...');
            this.request(url, function(html) {
                var comments = [];
                var doc = $('<div>' + html + '</div>');
                doc.find('.comment, div[id^="comment-id-"]').each(function() {
                    var el = $(this);
                    var author = el.find('.comm-author, .name, .comment-author, b').first().text().trim();
                    var text = el.find('.comm-text, .comment-content, .text, div[id^="comm-id-"]').clone();
                    text.find('div, script, style').remove();
                    if (author && text.text().trim()) comments.push({ author: author, date: el.find('.comm-date, .date, .comment-date').text().trim(), text: text.text().trim() });
                });
                _this.showModal(comments, movieTitle);
            }, function() { Lampa.Noty.show('Помилка'); });
        };

        this.showModal = function(comments, title) {
            var _this = this;
            var prev_controller = Lampa.Controller.enabled().name;
            var modal = $('<div class="uk-comments-layer"><div class="uk-comments-modal"><div class="uk-comments-head"><span>' + title + ' (' + comments.length + ')</span></div><div class="uk-comments-list"></div></div></div>');
            var list = modal.find('.uk-comments-list');
            if (comments.length === 0) list.append('<div class="uk-no-comments">Коментарів немає.</div>');
            else comments.forEach(function(c) {
                list.append('<div class="uk-comment-item selector"><div class="uk-comment-meta"><span class="uk-comment-author">' + c.author + '</span><span>' + c.date + '</span></div><div class="uk-comment-text">' + c.text + '</div></div>');
            });
            $('body').append(modal);
            var close = function() { modal.remove(); Lampa.Controller.toggle(prev_controller); };
            Lampa.Controller.add('uakino_comments', {
                toggle: function() { Lampa.Controller.collectionSet(list); Lampa.Controller.collectionFocus(list.find('.selector')[0], list); },
                up: function() { 
                    var focus = list.find('.focus');
                    if (focus.prev().length) {
                        Lampa.Controller.collectionFocus(focus.prev()[0], list);
                        list.scrollTop(list.scrollTop() + focus.prev().offset().top - list.offset().top - 20);
                    }
                },
                down: function() {
                    var focus = list.find('.focus');
                    if (focus.next().length) {
                        Lampa.Controller.collectionFocus(focus.next()[0], list);
                        list.scrollTop(list.scrollTop() + focus.next().offset().top - list.offset().top - list.height() + focus.next().outerHeight() + 20);
                    }
                },
                back: close
            });
            Lampa.Controller.toggle('uakino_comments');
        };
    }

    if (window.Lampa) new UaKinoComments().init();
})();
