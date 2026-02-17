(function () {
    'use strict';

    function startUAAvailability() {
        var proxies = [
            'https://cors.lampa.stream/',
            'https://my-finder.kozak-bohdan.workers.dev/?url=',
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
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

        Lampa.Listener.follow('full', function (e) {
            if ((e.type === 'complite' || e.type === 'complete') && e.data && e.data.movie) {
                var movie = e.data.movie;
                var render = e.object.activity.render();
                var titleUa = movie.title || movie.name || '';
                var titleEn = movie.original_title || movie.original_name || '';
                var year = parseInt(movie.release_date || movie.first_air_date || '0');

                var config = [
                    {
                        id: 'uaflix',
                        title: 'UAFlix',
                        base: 'https://uaflix.net',
                        search: '/index.php?do=search&subaction=search&story=',
                        steps: [{ q: titleEn, checkYear: true }, { q: titleUa, checkYear: false }],
                        itemSelector: '.video-item, .sres-wrap, article.shortstory',
                        linkSelector: 'a'
                    },
                    {
                        id: 'uakino',
                        title: 'UaKino',
                        base: 'https://uakino.best',
                        search: '/index.php?do=search&subaction=search&story=',
                        steps: [{ q: titleEn + ' ' + (year || ''), checkYear: true }, { q: titleUa + ' ' + (year || ''), checkYear: true }],
                        itemSelector: 'div.movie-item, .shortstory',
                        linkSelector: 'a.movie-title, a.full-movie, .poster > a'
                    },
                    {
                        id: 'uatut',
                        title: 'UaTut',
                        base: 'https://uk.uatut.fun',
                        search: '/index.php?do=search&subaction=search&story=',
                        steps: [{ q: titleEn + ' ' + (year || ''), checkYear: true }],
                        itemSelector: 'div.poster.grid-item',
                        linkSelector: '.poster__desc h3 a'
                    }
                ];

                var rateLine = $('.full-start-new__rate-line', render);
                if (rateLine.length) {
                    var myCont = $('.ua-sites-container', rateLine);

                    if (!myCont.length) {
                        myCont = $('<div class="ua-sites-container" style="display: flex; position: absolute; right: 0; bottom: 100%; gap: 6px; margin-bottom: 8px; justify-content: flex-end;"></div>');
                        
                        var torqCont = $('.quality-badges-container', rateLine);
                        if (torqCont.length) {
                            torqCont.css('position', 'relative').append(myCont);
                        } else {
                            rateLine.css('position', 'relative').append(myCont);
                        }
                    }

                    config.forEach(function(site) {
                        var btn = $('<div class="ua-btn-item selector" style="display: none; cursor: pointer; height: 1.55em; align-items: center; padding: 0 8px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; position: relative;">' +
                            '<span style="color: #fff; font-weight: bold; font-size: 0.85em; white-space: nowrap; z-index: 3;">' + site.title + '</span>' +
                        '</div>');
                        
                        myCont.append(btn);

                        function performSearch(stepIdx) {
                            if (stepIdx >= site.steps.length) return;
                            var step = site.steps[stepIdx];
                            if (!step.q || step.q.trim().length < 2) return performSearch(stepIdx + 1);

                            var searchUrl = site.base + site.search + encodeURIComponent(step.q);

                            function tryProxy(proxyIdx) {
                                if (proxyIdx >= proxies.length) return performSearch(stepIdx + 1);

                                $.ajax({
                                    url: proxies[proxyIdx] + encodeURIComponent(searchUrl),
                                    method: 'GET',
                                    timeout: 10000,
                                    success: function(html) {
                                        try {
                                            if (!html || html.length < 200) return tryProxy(proxyIdx + 1);
                                            var cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
                                            var doc = $('<div>' + cleanHtml + '</div>');
                                            var items = doc.find(site.itemSelector).slice(0, 5);
                                            var foundUrl = '';

                                            items.each(function() {
                                                if (foundUrl) return;
                                                var item = $(this);
                                                var link = item.find(site.linkSelector).first();
                                                if (!link.length && item.is('a')) link = item;
                                                var itemHref = link.attr('href');
                                                var itemText = item.text();

                                                if (checkMatch(itemText, titleUa, titleEn) && itemHref) {
                                                    foundUrl = itemHref;
                                                    if (foundUrl.indexOf('http') !== 0) foundUrl = site.base + (foundUrl.indexOf('/') === 0 ? '' : '/') + foundUrl;
                                                }
                                            });

                                            if (foundUrl) {
                                                btn.css('display', 'flex').attr('data-url', foundUrl);
                                                btn.on('hover:enter click', function(ev) {
                                                    ev.preventDefault();
                                                    var url = $(this).attr('data-url');
                                                    if (url) window.open(url, '_blank');
                                                });
                                                
                                                var curr = Lampa.Controller.enabled();
                                                if (curr && (curr.name === 'full_start' || curr.name === 'full_descr')) {
                                                    Lampa.Controller.collectionSet(render.find('.selector'));
                                                }
                                            } else {
                                                performSearch(stepIdx + 1);
                                            }
                                        } catch (err) { tryProxy(proxyIdx + 1); }
                                    },
                                    error: function() { tryProxy(proxyIdx + 1); }
                                });
                            }
                            tryProxy(0);
                        }
                        performSearch(0);
                    });
                }
            }
        });
    }

    var style = '<style id="ua-sites-style">' +
        '.ua-btn-item { border: none !important; margin-left: 4px; }' +
        '.ua-btn-item::before { content: ""; position: absolute; inset: 0; border-radius: 8px; padding: 2px; ' +
        'background: linear-gradient(to bottom, #0057b7 50%, #ffd700 50%); ' +
        '-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); ' +
        '-webkit-mask-composite: xor; mask-composite: exclude; z-index: 2; pointer-events: none; }' +
        '.ua-btn-item.focus { background: rgba(255, 255, 255, 0.2) !important; transform: scale(1.05); }' +
        '.ua-btn-item.focus::after { content: ""; position: absolute; inset: -2px; border: 2px solid #fff; border-radius: 10px; z-index: 4; }' +
    '</style>';

    if (!$('#ua-sites-style').length) $('body').append(style);
    if (window.appready) startUAAvailability();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") startUAAvailability(); });
})();