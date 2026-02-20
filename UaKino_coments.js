(function() {
    'use strict';

    function InlineComments() {
        var proxies = [
            'https://cors.lampa.stream/',
            'https://my-finder.kozak-bohdan.workers.dev/?url=',
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://cors.bwa.workers.dev/'
        ];

        var network = {
            clean: function(str) { return str ? str.toLowerCase().replace(/[^a-z0-9а-яіїєґ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; },
            check: function(itemText, tUa, tEn) {
                var text = this.clean(itemText);
                var u = this.clean(tUa);
                var e = this.clean(tEn);
                return (u && text.indexOf(u) !== -1) || (e && text.indexOf(e) !== -1);
            },
            req: function(url, onSuccess, onError, proxyIdx) {
                proxyIdx = proxyIdx || 0;
                if (proxyIdx >= proxies.length) { if (onError) onError(); return; }
                $.ajax({
                    url: proxies[proxyIdx] + encodeURIComponent(url),
                    method: 'GET',
                    timeout: 5000,
                    success: function(res) {
                        if ((res || '').length < 200) network.req(url, onSuccess, onError, proxyIdx + 1);
                        else onSuccess(res);
                    },
                    error: function() { network.req(url, onSuccess, onError, proxyIdx + 1); }
                });
            }
        };

        var parser = {
            parse: function(html, source) {
                var list = [];
                var doc = $('<div>' + html + '</div>');
                var items = doc.find('.comment, div[id^="comment-id-"], .comm-item');
                var signs = [];
                items.each(function() {
                    var el = $(this);
                    if (el.parents('.comment, div[id^="comment-id-"], .comm-item').length > 0) return;
                    var author = el.find('.comm-author, .name, .comment-author, .acc-name, b').first().text().trim();
                    var textEl = el.find('.comm-text, .comment-content, .text, .comment-body, div[id^="comm-id-"]').clone();
                    textEl.find('div, script, style, .comm-good-bad').remove();
                    var text = textEl.text().trim();
                    var dateEl = el.clone();
                    dateEl.find('.comm-text, .comment-content, .text, .comment-body, div[id^="comm-id-"]').remove();
                    var date = dateEl.find('.comm-date, .date, .comment-date, .comm-two').text().trim();
                    if (date.length > 60) date = '';
                    date = date.replace(/Група:.*?$/i, '').trim();
                    if (author && text) {
                        var sign = author + '|' + text.substring(0, 50);
                        if (signs.indexOf(sign) === -1) {
                            signs.push(sign);
                            list.push({ author: author + ' (' + source + ')', date: date, text: text });
                        }
                    }
                });
                return list;
            }
        };

        var finder = {
            search: function(site, movie, callback) {
                var tUa = movie.title || movie.name || '';
                var tEn = movie.original_title || movie.original_name || '';
                var year = parseInt(movie.release_date || movie.first_air_date || '0');
                var steps = [];
                
                if (site.name === 'UaKino') {
                    if (year) { 
                        steps.push(tUa + ' ' + year); 
                        steps.push(tEn + ' ' + year); 
                    } else {
                        steps.push(tUa); 
                        steps.push(tEn);
                    }
                } else if (site.name === 'UAFlix') {
                    steps.push(tUa); 
                    steps.push(tEn);
                } else {
                    if (year) { steps.push(tUa + ' ' + year); steps.push(tEn + ' ' + year); }
                    steps.push(tUa); steps.push(tEn);
                }

                var run = function(idx) {
                    if (idx >= steps.length) { callback([]); return; }
                    var q = steps[idx];
                    if (!q || q.trim().length < 2) return run(idx + 1);
                    network.req(site.base + site.search + encodeURIComponent(q), function(html) {
                        var target = '';
                        var doc = $('<div>' + html + '</div>');
                        var els = doc.find(site.selector).slice(0, 5);
                        els.each(function() {
                            if (target) return;
                            var it = $(this);
                            var lnk = it.find(site.linkSelector).first();
                            if (!lnk.length && it.is('a')) lnk = it;
                            var href = lnk.attr('href');
                            if (network.check(it.text(), tUa, tEn) && href) target = href;
                        });
                        if (target) {
                            if (target.indexOf('http') !== 0) target = site.base + (target.indexOf('/') === 0 ? '' : '/') + target;
                            network.req(target, function(page) {
                                if (site.name === 'UAFlix') {
                                    // Перевірка на помилку UAFlix (оновлено)
                                    if (page.indexOf('Увага! Виявлено помилку') !== -1 || page.indexOf('Виявлено помилку') !== -1 || page.indexOf('Гості не мають доступу') !== -1) {
                                        return callback([]);
                                    }
                                    if (year) {
                                        var yearRegex = new RegExp('Рік виходу:[\\s\\S]{0,150}?' + year, 'i');
                                        if (!yearRegex.test(page)) {
                                            return run(idx + 1);
                                        }
                                    }
                                }
                                callback(parser.parse(page, site.name));
                            }, function() { run(idx + 1); });
                        } else { run(idx + 1); }
                    }, function() { run(idx + 1); });
                };
                run(0);
            }
        };

        var fetchedComments = [];
        var observer = null;
        var focusApplied = false;

        this.adaptFontSize = function(cardNode) {
            var textEl = cardNode.find('.uk-comment-text')[0];
            if (!textEl) return;
            textEl.style.fontSize = '1.4em';
            if (!cardNode.hasClass('is-expanded')) return;
            var maxH = window.innerHeight * 0.75;
            var currentSize = 1.4;
            while (cardNode[0].scrollHeight > maxH && currentSize > 0.7) {
                currentSize -= 0.05;
                textEl.style.fontSize = currentSize + 'em';
            }
        };

        this.init = function() {
            var _this = this;
            var style = document.createElement('style');
            style.innerHTML = `
                .uk-comments-slider {
                    display: flex;
                    overflow-x: auto;
                    padding: 20px 5px 50px 5px; 
                    gap: 20px;
                    scrollbar-width: none; 
                    align-items: stretch;
                    scroll-behavior: smooth;
                    width: 100%;
                }
                .uk-comments-slider::-webkit-scrollbar { display: none; }
                
                .uk-comment-card {
                    flex: 0 0 500px;
                    width: 500px;
                    height: auto;
                    background: rgba(255,255,255,0.08);
                    border-radius: 16px;
                    padding: 22px;
                    box-sizing: border-box;
                    border: 2px solid transparent;
                    transition: none !important;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                    box-shadow: none !important;
                }
                
                .uk-comment-card.is-expanded {
                    flex: 0 0 750px !important;
                    width: 750px !important;
                    max-width: 75vw !important;
                    max-height: 75vh !important;
                    background: rgba(255,255,255,0.22);
                    z-index: 100;
                    box-shadow: none !important;
                }

                .uk-comment-card.focus {
                    background: rgba(255,255,255,0.12);
                    border-color: #fff;
                }
                
                .uk-comment-text {
                    font-size: 1.4em;
                    color: #ffffff;            
                    line-height: 1.4;
                    word-wrap: break-word;
                    display: -webkit-box;
                    -webkit-line-clamp: 5;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 15px;
                }

                .uk-comment-card.is-expanded .uk-comment-text {
                    display: block;
                    overflow: visible;
                    -webkit-line-clamp: unset;
                }
                
                .uk-comment-footer {
                    margin-top: auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid rgba(255,255,255,0.25);
                    padding-top: 12px;
                    pointer-events: none;
                }
                .uk-comment-author { font-size: 0.9em; color: #e0e0e0; font-weight: bold; display: flex; align-items: center; }
                .uk-comment-date { font-size: 0.85em; color: #e0e0e0; }

                .uk-comment-author img {
                    height: 1.25em;
                    margin-left: 8px;
                    vertical-align: middle;
                    display: inline-block;
                }

                .uk-comments-slider .full-review-add {
                    flex: 0 0 250px !important;
                    margin: 0 !important;
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255,255,255,0.05) !important;
                    border-radius: 16px !important;
                    border: 2px solid transparent !important;
                    height: auto !important;
                    min-height: 200px;
                    order: 999;
                }
                .uk-comments-slider .full-review-add.focus {
                    background: rgba(255,255,255,0.15) !important;
                    border-color: #fff !important;
                }

                @media (orientation: portrait), (max-width: 768px) {
                    .uk-comment-card {
                        flex: 0 0 85vw !important;
                        width: 85vw !important;
                        aspect-ratio: 1 / 1;
                        min-height: 300px;
                    }
                    .uk-comment-card.is-expanded {
                        flex: 0 0 92vw !important;
                        width: 92vw !important;
                        max-width: 92vw !important;
                        aspect-ratio: auto;
                    }
                    .uk-comment-text {
                        -webkit-line-clamp: 8;
                    }
                }
            `;
            document.head.appendChild(style);

            Lampa.Listener.follow('full', function(e) {
                if (e.type === 'complite') { _this.destroy(); _this.fetch(e.data.movie); }
                else if (e.type === 'destroy') { _this.destroy(); }
            });

            Lampa.Controller.listener.follow('focus', function(e) {
                var expanded = $('.uk-comment-card.is-expanded');
                if (expanded.length && expanded[0] !== e.target) {
                    var lastExpanded = expanded;
                    lastExpanded.removeClass('is-expanded');
                    _this.adaptFontSize(lastExpanded); 
                    _this.refreshScroll();
                }
            });
        };

        this.refreshScroll = function() {
            var mainScroll = $('.scroll').data('iscroll');
            if (mainScroll) mainScroll.refresh();
        };

        this.destroy = function() {
            fetchedComments = [];
            focusApplied = false;
            if (observer) { observer.disconnect(); observer = null; }
            $('.my-custom-comments-wrapper').remove();
        };
        
        this.fetch = function(movie) {
            var _this = this;
            var data = { ua: [], fl: [] };
            var done = 0;
            
            var finish = function() {
                done++;
                if (done >= 2) {
                    var all = [];
                    var max = Math.max(data.ua.length, data.fl.length);
                    for (var i = 0; i < max; i++) {
                        if (data.ua[i]) all.push(data.ua[i]);
                        if (data.fl[i]) all.push(data.fl[i]);
                    }
                    if (all.length > 0) { fetchedComments = all; _this.startObserver(); }
                }
            };

            // UaKino - запускаємо стандартно
            finder.search({ name: 'UaKino', base: 'https://uakino.best', search: '/index.php?do=search&subaction=search&story=', selector: 'div.movie-item, .shortstory', linkSelector: 'a.movie-title, a.full-movie, .poster > a' }, movie, function(res) { 
                data.ua = res; 
                finish(); 
            });

            // UAFlix - запускаємо з тайм-аутом 2.5 секунди
            var flixCompleted = false;
            var flixTimeout = setTimeout(function() {
                if (!flixCompleted) {
                    flixCompleted = true;
                    data.fl = []; // Час вийшов, ігноруємо UAFlix
                    finish();
                }
            }, 2500); // 2.5 секунди

            finder.search({ name: 'UAFlix', base: 'https://uaflix.net', search: '/index.php?do=search&subaction=search&story=', selector: '.video-item, .sres-wrap, article.shortstory', linkSelector: 'a' }, movie, function(res) { 
                if (!flixCompleted) {
                    clearTimeout(flixTimeout);
                    flixCompleted = true;
                    data.fl = res; 
                    finish(); 
                }
            });
        };

        this.startObserver = function() {
            var _this = this;
            _this.inject(); 
            observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    if (mutations[i].addedNodes.length) {
                        _this.inject();
                        break;
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        };

        this.inject = function() {
            var _this = this;
            var addBlock = $('.full-review-add');
            
            if (!addBlock.length || $('.uk-comments-slider').find('.full-review-add').length) return;
            if (fetchedComments.length === 0) return;
            if ($('.my-custom-comments-wrapper').length) return;

            var wrapper = $('<div class="my-custom-comments-wrapper" style="flex-basis: 100%; width: 100%; order: -1; margin-bottom: 30px; padding: 0 5px;"></div>');
            var slider = $('<div class="uk-comments-slider"></div>');

            fetchedComments.forEach(function(comment) {
                var card = $('<div class="uk-comment-card selector"></div>');
                card.append('<div class="uk-comment-text">' + comment.text + '</div>');
                
                var authorHtml = comment.author;
                authorHtml = authorHtml.replace('(UaKino)', '<img src="https://yarikrazor-star.github.io/lmp/uak.png">');
                authorHtml = authorHtml.replace('(UAFlix)', '<img src="https://yarikrazor-star.github.io/lmp/uaf.png">');

                card.append('<div class="uk-comment-footer"><div class="uk-comment-author">' + authorHtml + '</div><div class="uk-comment-date">' + comment.date + '</div></div>');

                card.on('hover:focus', function() {
                    var otherExpanded = $('.uk-comment-card.is-expanded').not(this);
                    if(otherExpanded.length) {
                        otherExpanded.removeClass('is-expanded');
                        _this.adaptFontSize(otherExpanded);
                    }
                    if (!$(this).hasClass('is-expanded')) {
                        this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                    _this.refreshScroll();
                });

                card.on('hover:enter', function() {
                    var cardNode = $(this);
                    var otherExpanded = $('.uk-comment-card.is-expanded').not(cardNode);
                    if(otherExpanded.length) {
                        otherExpanded.removeClass('is-expanded');
                        _this.adaptFontSize(otherExpanded);
                    }
                    cardNode.toggleClass('is-expanded');
                    _this.adaptFontSize(cardNode);
                    if (cardNode.hasClass('is-expanded')) {
                        cardNode[0].scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                    }
                    _this.refreshScroll();
                });

                slider.append(card);
            });

            var originalParent = addBlock.parent();
            slider.append(addBlock);
            wrapper.append(slider);
            originalParent.prepend(wrapper);
            originalParent.css({ 'flex-wrap': 'wrap', 'display': 'flex' });

            // Оновлюємо колекцію елементів для контролера, але НЕ викликаємо Lampa.Controller.focus
            Lampa.Controller.collectionSet(originalParent);
        };
    }

    if (window.Lampa) {
        new InlineComments().init();
    }
})();
