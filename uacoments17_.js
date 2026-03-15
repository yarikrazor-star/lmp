(function() {
    'use strict';

    // --- Допоміжна функція безпечного виводу тексту ---
    function safeText(str) {
        return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    // --- Допоміжна функція безпечного парсингу HTML (щоб уникнути помилок 404 у консолі) ---
    function parseHTML(html) {
        // Ретельно замінюємо src/href на data-src/data-href для потенційно проблемних тегів,
        // щоб браузер не намагався їх завантажити до того, як ми обробимо DOM.
        var safeHtml = (html || '')
            .replace(/<img([^>]*)src\s*=/gi, '<img$1data-src=') // img tags
            .replace(/<script([^>]*)src\s*=/gi, '<script$1data-src=') // script tags
            .replace(/<link([^>]*)href\s*=/gi, '<link$1data-href=') // link tags (stylesheets)
            .replace(/<iframe([^>]*)src\s*=/gi, '<iframe$1data-src='); // iframe tags

        return $('<div>' + safeHtml + '</div>');
    }

    // --- Центрування картки при фокусі ---
    function centerCard(cardEl) {
        var container = cardEl.parent();
        if (!container.length) return;
        var targetLeft = cardEl[0].offsetLeft;
        var targetWidth = cardEl.width();
        var containerWidth = container.width();
        var scrollLeft = targetLeft - (containerWidth / 2) + (targetWidth / 2);
        container.stop(true, false).animate({ scrollLeft: scrollLeft }, 150); // Покращена анімація
    }

    // --- НОВА СИСТЕМА: Нижня панель-повідомлення (Без втрати фокусу) ---
    var UaCommentNotify = {
        active: false,
        element: null,

        show: function(data) {
            if (this.active) this.hide();
            this.active = true;

            var sourceIcon = '';
            var reviewBadge = '';
            if (data.source === 'UaKino') {
                sourceIcon = '<img src="https://yarikrazor-star.github.io/lmp/uak.png" class="ua-source-icon">';
            } else if (data.source === 'UAFlix') {
                sourceIcon = '<img src="https://yarikrazor-star.github.io/lmp/uaf.png" class="ua-source-icon">';
            } else if (data.source === 'UASerials') {
                sourceIcon = '<img src="https://upload.wikimedia.org/wikipedia/commons/d/d4/Clapperboard_-_The_Noun_Project.svg" class="ua-source-icon" style="filter: brightness(0) invert(1);">';
            } else if (data.source === 'KinoBaza') {
                sourceIcon = '<img src="https://kinobaza.com.ua/assets/img/kinobazav4.svg" class="ua-source-icon">';
                if (data.isReview) {
                    reviewBadge = '<span style="background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-left: 8px; border: 1px solid rgba(255, 193, 7, 0.5); white-space: nowrap; flex-shrink: 0;">Рецензія</span>';
                }
            }

            var html = `
                <div class="ua-comment-notify">
                    <div class="ua-comment-notify-header">
                        ${sourceIcon}<span class="author-name">${data.author}</span>${reviewBadge}
                    </div>
                    <div class="ua-comment-notify-text">${safeText(data.text)}</div>
                </div>
            `;

            this.element = $(html);
            $('body').append(this.element);

            // Адаптивний розмір шрифту
            var textEl = this.element.find('.ua-comment-notify-text')[0];
            if (textEl) {
                textEl.style.fontSize = '1.3em';
                var currentSize = 1.3;
                while (textEl.scrollHeight > textEl.clientHeight && currentSize > 0.85) {
                    currentSize -= 0.05;
                    textEl.style.fontSize = currentSize + 'em';
                }
            }

            setTimeout(function() {
                if (UaCommentNotify.active) {
                    window.addEventListener('keydown', UaCommentNotify.keyHandler, true);
                    window.addEventListener('click', UaCommentNotify.closeHandler, true);
                    window.addEventListener('touchstart', UaCommentNotify.closeHandler, true);
                }
            }, 50);
        },

        hide: function() {
            if (!this.active) return;
            this.active = false;
            
            if (this.element) {
                this.element.remove();
                this.element = null;
            }

            window.removeEventListener('keydown', UaCommentNotify.keyHandler, true);
            window.removeEventListener('click', UaCommentNotify.closeHandler, true);
            window.removeEventListener('touchstart', UaCommentNotify.closeHandler, true);
        },

        keyHandler: function(e) {
            if (!UaCommentNotify.active) return;
            var code = e.keyCode;
            
            // Якщо натиснуто Назад(8, 27, 461, 10009, 10000) або Ок(13)
            if ([8, 13, 27, 461, 10009, 10000].indexOf(code) !== -1) {
                e.preventDefault();
                e.stopPropagation();
                UaCommentNotify.hide();
            } 
            // Якщо натиснуто Стрілочки - закриваємо панель і ПРОПУСКАЄМО подію далі в Лампу
            else if ([37, 38, 39, 40].indexOf(code) !== -1) {
                UaCommentNotify.hide();
            }
        },

        closeHandler: function() {
            if (UaCommentNotify.active) {
                UaCommentNotify.hide();
            }
        }
    };
    
    // Прив'язка контексту для безпечного видалення слухачів
    UaCommentNotify.keyHandler = UaCommentNotify.keyHandler.bind(UaCommentNotify);
    UaCommentNotify.closeHandler = UaCommentNotify.closeHandler.bind(UaCommentNotify);


    // --- 1. Налаштування проксі ---
    var proxies =[
        'https://cors.lampa.stream/',
        'https://cors.eu.org/',
        'https://corsproxy.io/?url='
    ];

    // --- 2. Мережевий шар ---
    var network = {
        req: function(url, onSuccess, onError, proxyIdx) {
            proxyIdx = proxyIdx || 0;
            if (proxyIdx >= proxies.length) { if (onError) onError(); return; }
            $.ajax({
                url: proxies[proxyIdx] + encodeURIComponent(url),
                method: 'GET',
                timeout: 6000,
                success: function(res) {
                    if ((res || '').length < 200) network.req(url, onSuccess, onError, proxyIdx + 1);
                    else onSuccess(res);
                },
                error: function() { network.req(url, onSuccess, onError, proxyIdx + 1); }
            });
        }
    };

    // --- 3. Парсер коментарів ---
    var parser = {
        parse: function(html, source, primarySelector) {
            var list =[];
            var doc = parseHTML(html); // Використовуємо parseHTML для безпечної обробки
            
            var commentsBlock = doc;
            if (primarySelector) {
                var foundBlock = doc.find(primarySelector);
                if (foundBlock.length > 0) commentsBlock = foundBlock;
            }

            var items = commentsBlock.find('.comment, div[id^="comment-id-"], .comm-item');
            if (!items.length && commentsBlock !== doc) {
                items = doc.find('.comment, div[id^="comment-id-"], .comm-item');
            }

            var signs =[];
            items.each(function() {
                var el = $(this);
                if (el.parents('.comment, div[id^="comment-id-"], .comm-item').length > 0) return;
                
                var author = el.find('.comm-author, .name, .comment-author, .acc-name, b').first().text().trim();
                
                var textEl = el.find('.comm-text, .comment-content, .text, .comment-body, div[id^="comm-id-"]').clone();
                // Додатково видаляємо iframe, якщо вони випадково потрапили
                textEl.find('div, script, style, iframe, .comm-good-bad').remove(); 
                textEl.find('br').replaceWith('\n'); 
                var text = textEl.text().trim();
                
                if (author && text) {
                    var sign = author + '|' + text.substring(0, 50);
                    if (signs.indexOf(sign) === -1) {
                        signs.push(sign);
                        list.push({ author: author, source: source, text: text });
                    }
                }
            });
            return list;
        }
    };

    // --- 4. Пошукова логіка ---
    var finder = {
        areTitlesSimilar: function(searchTitle, pageTitle) {
            var clean = function(str) {
                return str.toLowerCase()
                    .replace(/\(.*\)|\[.*\]/g, '')
                    .replace(/фільм|мультфільм|серіал|сезон|серія|дивитись|онлайн|всі серії|скачати|торрент|hd|якість|безкоштовно/g, '')
                    .replace(/[^a-z0-9а-яіїєґ\s]/g, '')
                    .replace(/\s+/g, ' ').trim();
            };

            var cleanSearch = clean(searchTitle);
            var cleanPage = clean(pageTitle);

            if (!cleanSearch) return true;
            if (!cleanPage) return false;

            if (cleanPage.includes(cleanSearch) || cleanSearch.includes(cleanPage)) {
                return true;
            }

            var searchWords = new Set(cleanSearch.split(' ').filter(Boolean)); 
            var pageWords = new Set(cleanPage.split(' ').filter(Boolean));

            if (searchWords.size === 0) return true;

            var intersection = new Set([...searchWords].filter(word => pageWords.has(word)));
            if (intersection.size === 0) return false;

            var pageToSearchSimilarity = intersection.size / pageWords.size;
            if (pageToSearchSimilarity >= 0.9) return true;

            var searchToPageSimilarity = intersection.size / searchWords.size;
            if (searchToPageSimilarity >= 0.7) return true;

            return false;
        },
        
        search: function(site, movie, callback) {
            var tUa = movie.title || movie.name || '';
            var tEn = movie.original_title || movie.original_name || '';
            var yearStr = movie.release_date || movie.first_air_date || '';
            var yearMatch = yearStr.match(/^(\d{4})/);
            var year = yearMatch ? parseInt(yearMatch[1]) : 0;
            var isTv = movie.type === 'tv' || typeof movie.first_air_date !== 'undefined' || (movie.name && !movie.title);
            
            var queries =[];
            if (tEn) queries.push(tEn);
            if (tUa && tUa.toLowerCase() !== tEn.toLowerCase()) queries.push(tUa);

            var titleToMatch = tUa ? tUa : tEn;
            var qIdx = 0;
            var runQuery = function() {
                if (qIdx >= queries.length) return callback([]);
                var q = queries[qIdx++];
                
                if (!q || q.trim().length < 2) return runQuery();
                
                var searchUrl = site.base + site.search + encodeURIComponent(q);
                
                network.req(searchUrl, function(html) {
                    var doc = parseHTML(html); // Використовуємо parseHTML
                    var links =[];
                    
                    doc.find(site.selector).slice(0, 10).each(function() {
                        var it = $(this);
                        var lnk = it.find(site.linkSelector).first();
                        if (!lnk.length && it.is('a')) lnk = it;
                        var href = lnk.attr('href');
                        if (href && links.indexOf(href) === -1) {
                            if (href.indexOf('http') !== 0) href = site.base + (href.indexOf('/') === 0 ? '' : '/') + href;
                            links.push(href);
                        }
                    });

                    if (links.length === 0) return runQuery();

                    var lIdx = 0;
                    var checkLink = function() {
                        if (lIdx >= links.length) return runQuery();
                        
                        var targetUrl = links[lIdx++];

                        network.req(targetUrl, function(page) {
                            var headMatch = page.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
                            var pageTitle = '';
                            if (headMatch) {
                                var tMatch = headMatch[1].match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                                if (tMatch) pageTitle = tMatch[1];
                            } else {
                                var tMatch = page.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                                if (tMatch) pageTitle = tMatch[1];
                            }
                            
                            if (!finder.areTitlesSimilar(titleToMatch, pageTitle)) return checkLink();

                            var titleLower = pageTitle.toLowerCase();
                            
                            var isYearValid = false;
                            if (year) {
                                var titleYears = pageTitle.match(/\b(19\d{2}|20\d{2})\b/g);
                                if (titleYears && titleYears.length > 0) {
                                    if (titleYears.indexOf(year.toString()) !== -1) {
                                        isYearValid = true;
                                    }
                                } else {
                                    var strictYearRegex = new RegExp('(?:рік|год|year|випуск)[\\s\\S]{0,50}?\\b' + year + '\\b|<a[^>]+href="[^"]*(?:\\/year\\/|\\/god\\/|year=)[^"]*"[^>]*>\\s*' + year + '\\s*<\\/a>', 'i');
                                    if (strictYearRegex.test(page)) {
                                        isYearValid = true;
                                    }
                                }
                            } else { 
                                isYearValid = true; 
                            }

                            if (!isYearValid) return checkLink();

                            var isTypeValid = false;
                            var tvPattern = /(серіал|сезон|серія|серії|дорама|епізод)/i;

                            if (isTv) {
                                if (tvPattern.test(titleLower)) isTypeValid = true;
                            } else {
                                if (!tvPattern.test(titleLower)) isTypeValid = true;
                            }

                            if (isTypeValid) {
                                var comments = parser.parse(page, site.name, site.commentsSelector);
                                return callback(comments);
                            } else {
                                return checkLink(); 
                            }
                        }, function() { checkLink(); });
                    };
                    checkLink();
                }, function() { runQuery(); });
            };
            runQuery();
        }
    };

    // --- 5. Компонент Картки Коментаря ---
    class UaCommentItem {
        constructor(data) {
            this.data = data;
            this.html = null;
        }

        create() {
            var _this = this;
            var root = $('<div class="ua-comment-card selector"></div>');
            var topMeta = $('<div class="ua-comment-meta"></div>');
            var textNode = $('<div class="ua-comment-text"></div>');
            var bottomMeta = $('<div class="ua-comment-footer"></div>');

            var sourceIcon = '';
            var reviewBadge = '';
            if (this.data.source === 'UaKino') {
                sourceIcon = '<img src="https://yarikrazor-star.github.io/lmp/uak.png" class="ua-source-icon">';
            } else if (this.data.source === 'UAFlix') {
                sourceIcon = '<img src="https://yarikrazor-star.github.io/lmp/uaf.png" class="ua-source-icon">';
            } else if (this.data.source === 'UASerials') {
                sourceIcon = '<img src="https://upload.wikimedia.org/wikipedia/commons/d/d4/Clapperboard_-_The_Noun_Project.svg" class="ua-source-icon" style="filter: brightness(0) invert(1);">';
            } else if (this.data.source === 'KinoBaza') {
                sourceIcon = '<img src="https://kinobaza.com.ua/assets/img/kinobazav4.svg" class="ua-source-icon">';
                if (this.data.isReview) {
                    reviewBadge = '<span style="background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-left: 8px; border: 1px solid rgba(255, 193, 7, 0.5); white-space: nowrap; flex-shrink: 0;">Рецензія</span>';
                }
            }

            topMeta.append('<div class="ua-chip author">' + sourceIcon + '<span class="author-name">' + this.data.author + '</span>' + reviewBadge + '</div>');
            textNode.html(safeText(this.data.text));
            bottomMeta.append('<div class="ua-chip read-more" style="display: none;">Читати повністю</div>');

            root.append(topMeta).append(textNode).append(bottomMeta);

            root.on('hover:focus', function() {
                centerCard(root);
            });

            root.on('hover:enter', function() {
                if (!root.hasClass('can-open')) return; 
                UaCommentNotify.show(_this.data);
            });

            this.html = root;
            return this;
        }
    }

    // --- 6. Менеджер Коментарів ---
    function InlineComments() {
        var fetchedComments =[];
        var observer = null;
        var currentStatus = '';
        var isSearchFinished = false;

        this.init = function() {
            var _this = this;
            
            var style = document.createElement('style');
            style.innerHTML = `
                .ua-comments-root { width: 100%; max-width: 100vw; overflow: hidden; position: relative; margin-bottom: 5px; padding: 0px; z-index: 5; }
                .ua-comments-slider { display: flex; flex-wrap: nowrap; overflow-x: auto; padding: 10px 5px 0px 5px; gap: 20px; scrollbar-width: none; scroll-behavior: smooth; width: 100%; box-sizing: border-box; align-items: stretch; } /* align-items: stretch для однакової висоти */
                .ua-comments-slider::-webkit-scrollbar { display: none; }
                
                .ua-status-card { width: 98%; background: rgba(0,0,0,0.5); border-radius: 14px; padding: 15px; box-sizing: border-box; text-align: center; color: #fff; font-size: 1.2em; margin: 0 auto; transition: background 0.3s ease; }
                .ua-status-card.focus { border-color: #fff; }
                
                .ua-comment-card { 
                    flex: 0 0 40ch; /* Ширина 40 символів */
                    width: 40ch; 
                    max-width: 80vw; 
                    border-radius: 14px; 
                    border: 3px solid rgba(255, 255, 255, 0.2); /* Товстіша рамка */
                    background: rgba(0, 0, 0, 0.5); 
                    padding: 15px; /* Зменшений padding для кращого контролю розміру */
                    box-sizing: border-box; 
                    display: flex; 
                    flex-direction: column; 
                    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; 
                    flex-shrink: 0; 
                }
                .ua-comment-card.focus { 
                    border-color: #fff; /* Біла рамка при фокусі */
                    transform: translateY(-4px); 
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(255, 255, 255, 0.4); /* Додано світіння */
                    color: #fff; 
                }
                
                .ua-comment-meta { display: flex; justify-content: flex-start; align-items: center; margin-bottom: 15px; gap: 10px; flex-wrap: nowrap; width: 100%; overflow: hidden; }
                .ua-chip { background: rgba(0,0,0,0.3); padding: 5px 12px; border-radius: 8px; font-size: 0.85em; color: #ccc; display: flex; align-items: center; gap: 8px; flex-shrink: 0; max-width: 100%; box-sizing: border-box; }
                
                .ua-chip.author { color: #fff; font-weight: bold; background: rgba(255,255,255,0.05); flex-shrink: 1; min-width: 0; }
                .ua-source-icon { width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0; }
                .author-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; flex-shrink: 1; min-width: 0; }
                
                .ua-comment-text { 
                    font-size: 1.15em; 
                    line-height: 1.45; 
                    color: #ddd; 
                    display: -webkit-box; 
                    -webkit-line-clamp: 3; /* Фіксована висота тексту - 3 рядки */
                    -webkit-box-orient: vertical; 
                    overflow: hidden; 
                    margin-bottom: 10px; /* Відступ до футера */
                    height: calc(1.45em * 3); /* Явна висота для однакових карток */
                }
                .ua-comment-card.focus .ua-comment-text { color: #fff; }
                
                .ua-comment-footer { margin-top: auto; display: flex; justify-content: flex-end; }
                .ua-chip.read-more { background: rgba(255,255,255,0.08); font-size: 0.8em; }
                .ua-comment-card.focus .ua-chip.read-more { background: rgba(255,255,255,0.2); color: #fff; font-weight: bold; }
                
                /* СТИЛІ ДЛЯ ПОВІДОМЛЕННЯ (ЗАМІСТЬ ВІКНА) */
                .ua-comment-notify {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 90vw;
                    max-width: 1000px;
                    max-height: 90vh; /* ЗБІЛЬШЕНА МАКСИМАЛЬНА ВИСОТА */
                    background: #333333;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                    padding: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    color: #eee;
                    opacity: 0;
                    animation: ua-noty-fadein 0.2s forwards;
                }
                @keyframes ua-noty-fadein {
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                }
                .ua-comment-notify-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 12px;
                    font-weight: bold;
                    font-size: 1.1em;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 10px;
                }
                .ua-comment-notify-text {
                    overflow: hidden;
                    line-height: 1.45;
                    white-space: pre-wrap;
                    font-size: 1.3em;
                    overflow-y: auto;
                    scrollbar-width: none;
                }
                .ua-comment-notify-text::-webkit-scrollbar { display: none; }
                
                @media (orientation: portrait), (max-width: 768px) {
                    .ua-comment-card { flex: 0 0 85vw !important; width: 85vw !important; }
                    .ua-comment-text { -webkit-line-clamp: 3; height: calc(1.45em * 3); }
                    .ua-comment-notify { width: 95vw; bottom: 15px; max-height: 90vh; } /* ЗБІЛЬШЕНА МАКСИМАЛЬНА ВИСОТА */
                }
            `;
            document.head.appendChild(style);

            Lampa.Listener.follow('full', function(e) {
                if (e.type === 'complite') { _this.destroy(); _this.fetch(e.data.movie); }
                else if (e.type === 'destroy') { _this.destroy(); }
            });
        };

        this.refreshScroll = function() {
            var mainScroll = $('.scroll').data('iscroll');
            if (mainScroll) mainScroll.refresh();
        };

        this.destroy = function() {
            UaCommentNotify.hide();
            fetchedComments =[];
            isSearchFinished = false;
            currentStatus = '';
            if (observer) { observer.disconnect(); observer = null; }
            $('.ua-comments-root').remove();
        };
        
        this.fetch = function(movie) {
            var _this = this;
            var releaseDateStr = movie.release_date || movie.first_air_date || '';
            if (!releaseDateStr) {
                currentStatus = 'Рік виходу не вказано, пошук коментарів неможливий.';
                isSearchFinished = true;
                _this.inject();
                return;
            }

            var releaseDate = new Date(releaseDateStr);
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            if (releaseDate > today) {
                currentStatus = 'Реліз ще не відбувся, коментарів поки що немає.';
                isSearchFinished = true;
                _this.inject();
                return;
            }

            var data = { ua:[], fl:[], us:[], kb:[] };
            var done = 0;
            var totalSources = 4; 
            
            isSearchFinished = false;
            currentStatus = 'Пошук коментарів UaKino, UAFlix, UASerials та KinoBaza...';
            _this.startObserver(); 
            
            var finish = function() {
                done++;
                if (done >= totalSources) {
                    var all =[];
                    
                    var kbReviews = data.kb.filter(function(c) { return c.isReview; });
                    var kbComments = data.kb.filter(function(c) { return !c.isReview; });
                    
                    all = all.concat(kbReviews);
                    
                    var max = Math.max(data.ua.length, data.fl.length, data.us.length, kbComments.length);
                    for (var i = 0; i < max; i++) {
                        if (data.ua[i]) all.push(data.ua[i]);
                        if (data.fl[i]) all.push(data.fl[i]);
                        if (data.us[i]) all.push(data.us[i]);
                        if (kbComments[i]) all.push(kbComments[i]);
                    }
                    
                    fetchedComments = all;
                    isSearchFinished = true;

                    if (all.length === 0) currentStatus = 'Коментарі не знайдено';
                    _this.inject(); 
                }
            };

            finder.search({ 
                name: 'UaKino', base: 'https://uakino.best', search: '/index.php?do=search&subaction=search&story=', 
                selector: 'div.movie-item, .shortstory', linkSelector: 'a.movie-title, a.full-movie, .poster > a', commentsSelector: '.comments'
            }, movie, function(res) { data.ua = res; finish(); });

            var flixCompleted = false;
            var flixTimeout = setTimeout(function() { if (!flixCompleted) { flixCompleted = true; data.fl =[]; finish(); } }, 15000); 

            finder.search({ 
                name: 'UAFlix', base: 'https://uafix.net', search: '/search.html?do=search&subaction=search&story=', 
                selector: '.video-item, .sres-wrap, article.shortstory', linkSelector: 'a', commentsSelector: '#dle-comments-list'
            }, movie, function(res) { if (!flixCompleted) { clearTimeout(flixTimeout); flixCompleted = true; data.fl = res; finish(); } });

            var usCompleted = false;
            var usTimeout = setTimeout(function() { if (!usCompleted) { usCompleted = true; data.us =[]; finish(); } }, 15000); 

            finder.search({ 
                name: 'UASerials', base: 'https://uaserials.com', search: '/index.php?do=search&subaction=search&story=', 
                selector: '.short-item, .movie-item, .shortstory', linkSelector: 'a.short-title, a.movie-title, .short-img, a', commentsSelector: '#dle-comments-list'
            }, movie, function(res) { if (!usCompleted) { clearTimeout(usTimeout); usCompleted = true; data.us = res; finish(); } });

            var kbCompleted = false;
            var kbTimeout = setTimeout(function() { 
                if (!kbCompleted) { kbCompleted = true; data.kb =[]; finish(); } 
            }, 15000); 

            if (movie.imdb_id) {
                var kbSearchUrl = 'https://kinobaza.com.ua/search?q=' + encodeURIComponent(movie.imdb_id);
                network.req(kbSearchUrl, function(html) {
                    if (kbCompleted) return;
                    
                    var doc = parseHTML(html); // Використовуємо parseHTML
                    var processKb = function(pageDoc) {
                        var kbList =[];
                        
                        var cleanText = function(str) {
                            return str.replace(/[^\S\r\n]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
                        };

                        pageDoc.find('div[id^="review_container_"],[itemprop="review"]').each(function() {
                            var el = $(this);
                            var authorEl = el.find('[itemprop="name"]').first();
                            if (!authorEl.length) authorEl = el.find('a.text-reset.fw-bold[href*="/@"], a[href*="/user"], b, strong').first();
                            var author = authorEl.text().trim() || 'Критик';
                            
                            var bodyEl = el.find('[itemprop="reviewBody"]').first();
                            if (!bodyEl.length) bodyEl = el.find('.content, .review-text').first(); 
                            
                            if (bodyEl.length) {
                                var cloneBody = bodyEl.clone();
                                cloneBody.find('br').replaceWith('\n');
                                cloneBody.find('p').each(function() { $(this).append('\n\n'); });
                                cloneBody.find('script, style, iframe').remove(); // Додано iframe
                                var text = cleanText(cloneBody.text());
                                
                                if (text && text.length > 5) {
                                    kbList.push({ author: author, source: 'KinoBaza', text: text, isReview: true });
                                }
                            }
                        });
                        
                        pageDoc.find('div[id^="comment_"]').each(function() {
                            var el = $(this);
                            var authorEl = el.find('a.text-reset.fw-bold').first();
                            if (!authorEl.length) authorEl = el.find('a[href*="/@"], .name, b, strong').first();
                            var author = authorEl.text().trim() || 'Глядач';
                            
                            var bodyEl = el.find('.js-comment-body').first();
                            if (!bodyEl.length) bodyEl = el.find('.comment-text, .content').first(); 
                            
                            if (bodyEl.length) {
                                var cloneBody = bodyEl.clone();
                                cloneBody.find('br').replaceWith('\n');
                                cloneBody.find('p').each(function() { $(this).append('\n'); });
                                cloneBody.find('script, style, iframe').remove(); // Додано iframe
                                var text = cleanText(cloneBody.text());
                                
                                if (text && text.length > 5) {
                                    kbList.push({ author: author, source: 'KinoBaza', text: text, isReview: false });
                                }
                            }
                        });
                        
                        data.kb = kbList;
                        clearTimeout(kbTimeout);
                        kbCompleted = true;
                        finish();
                    };

                    if (doc.find('div[id^="review_container_"]').length === 0 && doc.find('div[id^="comment_"]').length === 0) {
                        var firstLink = doc.find('a[href^="/titles/"]').first().attr('href');
                        if (firstLink) {
                            var fullUrl = firstLink.indexOf('http') === 0 ? firstLink : 'https://kinobaza.com.ua' + firstLink;
                            network.req(fullUrl, function(pageHtml) {
                                if (kbCompleted) return;
                                processKb(parseHTML(pageHtml)); // Використовуємо parseHTML
                            }, function() {
                                if (!kbCompleted) { clearTimeout(kbTimeout); kbCompleted = true; data.kb =[]; finish(); }
                            });
                            return;
                        }
                    }
                    processKb(doc);
                }, function() {
                    if (!kbCompleted) { clearTimeout(kbTimeout); kbCompleted = true; data.kb =[]; finish(); }
                });
            } else {
                clearTimeout(kbTimeout);
                kbCompleted = true;
                data.kb =[];
                finish();
            }
        };

        this.startObserver = function() {
            var _this = this;
            _this.inject(); 
            observer = new MutationObserver(function(mutations) {
                var shouldInject = false;
                for (var i = 0; i < mutations.length; i++) {
                    if (mutations[i].addedNodes.length && $(mutations[i].target).closest('.ua-comments-root').length === 0) {
                        shouldInject = true; break;
                    }
                }
                if (shouldInject) _this.inject();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        };

        this.inject = function() {
            var _this = this;
            var focusedRemoved = false;
            
            $('.items-line').each(function() {
                var el = $(this);
                var title = el.find('.items-line__title').text().trim();
                var hasAddBtn = el.find('.full-review-add').length > 0;
                
                if (title === 'Коментарі' || hasAddBtn) {
                    if (el.find('.focus').length > 0 || el.hasClass('focus')) focusedRemoved = true;
                    el.remove();
                }
            });

            if ($('.ua-comments-slider').length && fetchedComments.length > 0) return;

            var targetBlock = null;
            $('.full-descr__details').each(function() {
                if ($(this).find('.full-descr__info, .full--budget, .full--countries').length > 0) targetBlock = $(this);
            });
            if (!targetBlock || !targetBlock.length) return; 

            var root = $('.ua-comments-root');
            if (!root.length) {
                root = $('<div class="ua-comments-root items-line"></div>');
                targetBlock.before(root);
            }

            if (!isSearchFinished || (isSearchFinished && fetchedComments.length === 0)) {
                var statusCard = root.find('.ua-status-card');
                if (!statusCard.length) {
                    statusCard = $('<div class="ua-status-card selector"></div>');
                    root.html(statusCard);
                    _this.refreshScroll(); 
                }
                if (statusCard.text() !== currentStatus) statusCard.text(currentStatus);
                return;
            }

            if (isSearchFinished && fetchedComments.length > 0) {
                var isStatusCardFocused = root.find('.ua-status-card').hasClass('focus');
                var currentFocus = $('.focus').last();

                root.empty(); 
                var slider = $('<div class="ua-comments-slider"></div>');

                fetchedComments.forEach(function(comment) {
                    var item = new UaCommentItem(comment);
                    slider.append(item.create().html);
                });

                root.append(slider);
                _this.refreshScroll(); 

                setTimeout(function() {
                    slider.find('.ua-comment-card').each(function() {
                        var cardEl = $(this);
                        var textNode = cardEl.find('.ua-comment-text')[0];
                        // Перевіряємо, чи текст обрізаний, щоб показати "Читати повністю"
                        if (textNode && textNode.scrollHeight > textNode.clientHeight + 3) { 
                            cardEl.find('.ua-chip.read-more').css('display', 'flex');
                            cardEl.addClass('can-open');
                        }
                    });
                }, 300);

                if ((isStatusCardFocused || focusedRemoved) && slider.find('.ua-comment-card').length) {
                    Lampa.Controller.focus(slider.find('.ua-comment-card').first()[0]);
                } else if (currentFocus.length && currentFocus[0] !== document.body) {
                    Lampa.Controller.focus(currentFocus[0]);
                }
            }
        };
    }

    if (window.Lampa) {
        new InlineComments().init();
    }
})();