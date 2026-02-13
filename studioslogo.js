(function () {
    'use strict';

    var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h50';
    var CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    var titleCache = Lampa.Storage.get("title_cache_uk_bold") || {};

    function getStudioLogosHtml(movie) {
        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path
                    ? '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '">'
                    : '<span class="studio-logo-text">' + co.name + '</span>';

                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '" style="display: inline-flex; margin-right: 15px; vertical-align: middle;">' +
                    content +
                    '</div>';
            });
        }
        return html;
    }

    function renderCombinedTitle(title, movie) {
        var render = Lampa.Activity.active().activity.render();
        if (!render) return;

        $(".plugin-uk-title-combined", render).remove();

        var logosHtml = getStudioLogosHtml(movie);

        var html = '<div class="plugin-uk-title-combined" style="margin-top: 10px; margin-bottom: 15px; text-align: left; width: 100%; display: flex; flex-direction: column; align-items: flex-start;">' +
                        '<div style="font-size: 1.6em; font-weight: bold; color: #fff; line-height: 1.1;">' + title + '</div>' +
                        '<div class="studio-logos-container" style="display: flex; align-items: center; margin-top: 8px;">' + logosHtml + '</div>' +
                    '</div>';

        var target = $(".full-start-new__title", render);
        if(!target.length) target = $(".full-start__title", render);
        
        target.after(html);

        $('.rate--studio', render).on('hover:enter', function () {
            var id = $(this).data('id');
            var name = $(this).data('name');
            if (id) {
                Lampa.Activity.push({
                    url: 'movie',
                    id: id,
                    title: name,
                    component: 'company',
                    source: 'tmdb',
                    page: 1
                });
            }
        });

        setTimeout(function() {
            var current = Lampa.Controller.enabled();
            if (current && current.name === 'full_start') {
                current.collection = render.find('.selector');
            }
        }, 10);
    }

    function startPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if ((e.type === 'complite' || e.type === 'complete') && e.data.movie) {
                var card = e.data.movie;
                var now = Date.now();
                var cache = titleCache[card.id];

                if (cache && now - cache.timestamp < CACHE_TTL) {
                    renderCombinedTitle(cache.uk, card);
                } else {
                    var type = card.first_air_date ? "tv" : "movie";
                    Lampa.Api.sources.tmdb.get(type + "/" + card.id + "?append_to_response=translations", {}, function (data) {
                        var tr = data.translations ? data.translations.translations : [];
                        var found = tr.find(function (t) {
                            return t.iso_3166_1 === "UA" || t.iso_639_1 === "uk";
                        });

                        var uk = found ? (found.data.title || found.data.name) : (card.title || card.name);
                        titleCache[card.id] = { uk: uk, timestamp: now };
                        Lampa.Storage.set("title_cache_uk_bold", titleCache);
                        renderCombinedTitle(uk, card);
                    }, function() {
                        renderCombinedTitle(card.title || card.name, card);
                    });
                }
            }
        });
    }

    var style = '<style id="studio-logos-combined-style">' +
        '.rate--studio.studio-logo { align-items: center; vertical-align: middle; padding: 4px 10px !important; background: rgba(255,255,255,0.1) !important; border-radius: 8px; transition: all 0.2s ease; height: 1.8em; cursor: pointer; border: 1px solid transparent; }' +
        '.rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; border: 1px solid #fff; transform: scale(1.05); }' +
        '.rate--studio.studio-logo img { max-height: 1.2em !important; max-width: 90px; object-fit: contain; }' +
        '.studio-logo-text { font-size: 0.75em; font-weight: bold; color: #fff !important; }' +
    '</style>';

    if (!$('#studio-logos-combined-style').length) {
        $('body').append(style);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") startPlugin(); });
})();