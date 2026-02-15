(function () {
    'use strict';

    var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h100';
    var CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    var titleCache = Lampa.Storage.get("title_cache_uk_bold") || {};

    function getStudioLogosHtml(movie) {
        var html = '';
        if (movie && movie.production_companies) {
            // Беремо перші 3 компанії для компактності
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

        // Видаляємо дублікати перед рендером
        $(".plugin-uk-title-combined", render).remove();

        var logosHtml = getStudioLogosHtml(movie);
        if (!logosHtml) return; // Якщо логотипів немає, нічого не малюємо

        var html = '<div class="plugin-uk-title-combined" style="margin-top: 10px; margin-bottom: 5px; text-align: left; width: 100%; display: flex; flex-direction: column; align-items: flex-start;">' +
                '<div class="studio-logos-container" style="display: flex; align-items: center; flex-wrap: wrap;">' + logosHtml + '</div>' +
            '</div>';

        // КЛЮЧОВА ЗМІНА: Пріоритет вставки під назву з name55.js
        var hybridTitle = $(".plugin-hybrid-title", render);
        var target;

        if (hybridTitle.length) {
            target = hybridTitle; // Ставимо під додаткову назву
        } else {
            target = $(".full-start-new__title", render);
            if (!target.length) target = $(".full-start__title", render);
        }
        
        target.after(html);

        // Обробка кліку по логотипу (перехід до компанії)
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

        // Оновлюємо контролер для навігації пультом
        setTimeout(function() {
            var current = Lampa.Controller.enabled();
            if (current && (current.name === 'full_start' || current.name === 'full_descr')) {
                current.collection = render.find('.selector');
            }
        }, 100);
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
                        renderCombinedTitle(uk, data); // Використовуємо повні дані з API для компаній
                    }, function() {
                        renderCombinedTitle(card.title || card.name, card);
                    });
                }
            }
        });
    }

    // Стилі для гарного вигляду логотипів та фокусу
    var style = '<style id="studio-logos-combined-style">' +
        '.rate--studio.studio-logo { align-items: center; vertical-align: middle; padding: 5px 12px !important; background: rgba(255,255,255,0.08) !important; border-radius: 8px; transition: all 0.2s ease; height: 35px; cursor: pointer; border: 1px solid transparent; }' +
        '.rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; border: 1px solid #fff; transform: scale(1.05); }' +
        '.rate--studio.studio-logo img { max-height: 22px !important; max-width: 100px; object-fit: contain; filter: brightness(1) invert(0); }' +
        '.studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; white-space: nowrap; }' +
    '</style>';

    if (!$('#studio-logos-combined-style').length) {
        $('body').append(style);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") startPlugin(); });
})();
