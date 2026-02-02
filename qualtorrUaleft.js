(function () {
    'use strict';

    // --- ПОЛІФІЛИ ДЛЯ ТЕЛЕВІЗОРІВ (Tizen, WebOS, Android) ---
    if (typeof Promise === 'undefined') {
        window.Promise = function(exec) {
            var handlers = [];
            this.then = function(f) { handlers.push(f); return this; };
            exec(function(res) {
                setTimeout(function() {
                    handlers.forEach(function(h) { h(res); });
                }, 1);
            });
        };
    }

    if (typeof AbortController === 'undefined') {
        window.AbortController = function () {
            this.signal = {
                aborted: false,
                addEventListener: function (event, callback) {
                    if (event === 'abort') this._onabort = callback;
                }
            };
            this.abort = function () {
                this.signal.aborted = true;
                if (typeof this.signal._onabort === 'function') this.signal._onabort();
            };
        };
    }

    // --- КОНФІГУРАЦІЯ ---
    var JACRED_PROTOCOL = 'http://';
    var JACRED_URL = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz';
    
    var PROXY_LIST = [
        'http://well-informed-normal-function.anvil.app/_/api/jackett_proxy?u=',
        'http://my-finder.kozak-bohdan.workers.dev/?url=',
        'http://api.allorigins.win/raw?url=',
        'http://cors.bwa.workers.dev/'
    ];
    var PROXY_TIMEOUT = 3000;

    var ICON_UA = 'https://yarikrazor-star.github.io/lmp/ua.svg';
    var ICON_NONE = 'https://yarikrazor-star.github.io/lmp/dontknow.svg';
    var ICON_STREAM = 'https://yarikrazor-star.github.io/lmp/stream.svg';

    // --- СТИЛІ ---
    var style = document.createElement('style');
    style.textContent = [
        '.surs_quality_row {',
        '    width: 100% !important;',
        '    display: block !important;',
        '    position: relative !important;',
        '    clear: both !important;',
        '    margin: 0.4em 0 !important;',
        '    padding: 0 !important;',
        '    float: none !important;',
        '    text-align: left !important;',
        '}',
        '.surs_quality_box {',
        '    display: inline-flex !important;',
        '    align-items: center !important;',
        '    background: rgba(255, 255, 255, 0.08);',
        '    padding: 4px 10px !important;',
        '    border-radius: 6px !important;',
        '    border: 1px solid rgba(255, 255, 255, 0.1);',
        '    font-size: 1.2em;',
        '    line-height: 1;',
        '}',
        '.surs_quality_box img { vertical-align: middle; }',
        '.surs_quality_box .icon-main { width: 1.6em; height: 1.1em; margin-right: 8px; object-fit: contain; }',
        '.surs_quality_box .icon-stream { width: 1.2em; height: 1.2em; margin: 0 8px 0 12px; opacity: 0.8; }',
        '.surs_quality_box .quality-item { display: flex; align-items: center; white-space: nowrap; }',
        '.surs_quality_box .seeds_info { margin-left: 5px; font-size: 0.8em; color: #2ecc71 !important; }',
        '.surs_quality_box .pop-tag { text-transform: uppercase; font-size: 0.9em; font-weight: 500; }',
        '.surs_quality_box .ua_not_found { opacity: 0.4; display: flex; align-items: center; }',
        '.surs_quality_box .icon-none { width: 1.4em; height: 1.4em; }'
    ].join('\n');
    document.head.appendChild(style);

    // --- ЛОГІКА ---

    function parseQuality(text) {
        if (!text) return 0;
        var t = text.toLowerCase();
        if (/\b(ts|tc|telesync|camrip|cam|hdtc|dvdscr)\b/.test(t)) return -1;
        if (/\b(2160p|4k|uhd|ultra hd)\b/.test(t)) return 2160;
        if (/\b(1080p|fhd|full hd|1080i|bdremux|remux)\b/.test(t)) return 1080;
        if (/\b(720p|hd|720i)\b/.test(t)) return 720;
        if (/\b(bdrip|brrip|bluray|blu-ray)\b/.test(t)) return 1079;
        if (/\b(dvdrip|dvd|dvdr|dvd9|dvd5)\b/.test(t)) return 481;
        if (/\b(480p|360p|sd|hdtv|webrip|web-dl|rip|mkv|avi)\b/.test(t)) return 480;
        return 0;
    }

    function extractReleaseType(title) {
        if (!title) return "";
        var t = title.toLowerCase();
        var types = [];
        if (/\b(bdremux|remux)\b/.test(t)) types.push("Remux");
        else if (/\b(bluray|blu-ray)\b/.test(t)) types.push("BluRay");
        else if (/\b(bdrip|brrip)\b/.test(t)) types.push("BDRip");
        else if (/\b(web-dl|webdl)\b/.test(t)) types.push("WEB-DL");
        else if (/\b(webrip)\b/.test(t)) types.push("WEBRip");
        else if (/\b(hdtv)\b/.test(t)) types.push("HDTV");
        else if (/\b(dvdrip)\b/.test(t)) types.push("DVDRip");

        if (/\b(hevc|x265|h265)\b/.test(t)) types.push("HEVC");
        else if (/\b(avc|x264|h264)\b/.test(t)) types.push("AVC");

        var res = t.match(/\b(2160p|1080p|720p|4k)\b/i);
        if (res) types.push(res[0].toUpperCase());

        return types.length > 0 ? types.join(" ") : "Rip";
    }

    function getQualityMeta(qVal) {
        if (qVal === -1) return { text: 'CAM', css: 'q_cam_text' };
        if (qVal >= 2160) return { text: '4K', css: 'q_4k_text' };
        if (qVal >= 1080) return { text: '1080p', css: 'q_1080_text' };
        if (qVal === 1079) return { text: 'BD', css: 'q_1080_text' };
        if (qVal >= 720) return { text: '720p', css: 'q_720_text' };
        if (qVal === 481) return { text: 'DVD', css: 'q_sd_text' };
        if (qVal > 0) return { text: 'SD', css: 'q_sd_text' };
        return { text: '??', css: 'q_sd_text' };
    }

    function fastFetch(url) {
        return new Promise(function(resolve, reject) {
            var proxyIdx = -1; 
            function tryReq() {
                var currentUrl = (proxyIdx === -1) ? url : PROXY_LIST[proxyIdx] + encodeURIComponent(url);
                var controller = new AbortController();
                var tid = setTimeout(function() { controller.abort(); }, PROXY_TIMEOUT);

                fetch(currentUrl, { signal: controller.signal })
                    .then(function(r) { return r.text(); })
                    .then(function(d) {
                        clearTimeout(tid);
                        resolve(d);
                    })
                    .catch(function(e) {
                        clearTimeout(tid);
                        proxyIdx++;
                        if (proxyIdx < PROXY_LIST.length) tryReq();
                        else reject(e);
                    });
            }
            tryReq();
        });
    }

    function runSearch(movie, callback) {
        var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
        var tUkr = movie.title || movie.name;
        var tEng = movie.original_title || movie.original_name;

        if (!tUkr || !year) return callback(null);

        var queries = [];
        if (tUkr) queries.push(tUkr);
        if (tEng && tEng !== tUkr) queries.push(tEng);

        var promises = queries.map(function(q) {
            var u = JACRED_PROTOCOL + JACRED_URL + '/api/v1.0/torrents?search=' + encodeURIComponent(q) + '&year=' + year;
            return fastFetch(u).catch(function() { return "[]"; });
        });

        Promise.all(promises).then(function(results) {
            var all = [];
            results.forEach(function(r) {
                try {
                    var j = JSON.parse(r);
                    if (Array.isArray(j)) all = all.concat(j);
                } catch(e) {}
            });

            if (all.length === 0) return callback({ hasUa: false });

            var uaRx = /(ukr|ua|ukrainian|укр|україн|toloka|mazepa|hurtom|uafilm|бабай|гуртом)/i;
            var yearRx = new RegExp('(^|\\D)' + year + '(\\D|$|\\s)');

            var filtered = all.filter(function(i) {
                var t = (i.title || "").toLowerCase();
                return uaRx.test(t + (i.details || "")) && yearRx.test(t);
            });

            if (filtered.length > 0) {
                var best = filtered.slice().sort(function(a, b) {
                    var qA = parseQuality(a.title), qB = parseQuality(b.title);
                    if (qB !== qA) return qB - qA;
                    return (parseInt(b.seeders || 0)) - (parseInt(a.seeders || 0));
                })[0];

                var pop = filtered.slice().sort(function(a, b) {
                    return (parseInt(b.seeders || b.seeds || 0)) - (parseInt(a.seeders || a.seeds || 0));
                })[0];

                callback({
                    best: { val: parseQuality(best.title), seeds: (best.seeders || best.seeds || 0) },
                    pop: { 
                        fullText: extractReleaseType(pop.title), 
                        seeds: (pop.seeders || pop.seeds || 0),
                        val: parseQuality(pop.title)
                    },
                    hasUa: true
                });
            } else {
                callback({ hasUa: false });
            }
        }).catch(function() { callback({ hasUa: false }); });
    }

    // Допоміжна функція для вставки елемента у правильне місце
    function injectToUI(targetRow, render) {
        var slogan = $('.full-start__slogan', render);
        var ratings = $('.full-start-new__rate-line', render);

        if (slogan.length) {
            slogan.after(targetRow);
        } else if (ratings.length) {
            ratings.before(targetRow);
        } else {
            $('.full-start__info', render).prepend(targetRow);
        }
    }

    function renderUI(data, render) {
        if (!render) return;
        $('.surs_quality_row', render).remove();

        var row = $('<div class="surs_quality_row"></div>');
        var box = $('<div class="surs_quality_box"></div>');

        if (!data || !data.hasUa) {
            box.html('<div class="ua_not_found"><img src="' + ICON_NONE + '" class="icon-none"></div>');
            row.append(box);
            injectToUI(row, render);
            return;
        }

        var html = '<img src="' + ICON_UA + '" class="icon-main">';
        var bestMeta = getQualityMeta(data.best.val);
        html += '<div class="quality-item"><span class="' + bestMeta.css + '">' + bestMeta.text + '</span>';
        if (data.best.seeds > 0) html += '<span class="seeds_info">(' + data.best.seeds + ')</span>';
        html += '</div>';

        html += '<img src="' + ICON_STREAM + '" class="icon-stream">';

        var popMeta = getQualityMeta(data.pop.val);
        html += '<div class="quality-item"><span class="pop-tag ' + popMeta.css + '">' + data.pop.fullText + '</span>';
        if (data.pop.seeds > 0) html += '<span class="seeds_info">(' + data.pop.seeds + ')</span>';
        html += '</div>';

        box.html(html);
        row.append(box);
        injectToUI(row, render);
    }

    function process(movie, render) {
        if (!movie) return;
        $('.surs_quality_row', render).remove();
        
        var ldRow = $('<div class="surs_quality_row"><div class="surs_quality_box" style="opacity:0.5">Пошук UA...</div></div>');
        injectToUI(ldRow, render);

        runSearch(movie, function(res) {
            ldRow.remove();
            renderUI(res, render);
        });
    }

    function init() {
        if (window.sursQualityUA_V6) return;
        window.sursQualityUA_V6 = true;

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                process(e.data.movie, e.object.activity.render());
            }
        });
    }

    if (window.Lampa) {
        init();
    } else {
        $(document).on('lampa:ready', init);
        var wait = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Listener) {
                clearInterval(wait);
                init();
            }
        }, 100);
    }
})();