(function () {
    'use strict';

    var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h50';

    function getStudioLogos(movie) {
        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path
                    ? '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '">'
                    : '<span class="studio-logo-text">' + co.name + '</span>';

                html += '<div class="quality-badge studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' +
                    content +
                    '</div>';
            });
        }
        return html;
    }

    Lampa.Listener.follow('full', function (e) {
        if (e.type !== 'complite') return;

        setTimeout(function () {
            try {
                // Шукаємо місце для вставки
                var container = $('.full-start-new__details');
                if (!container.length) container = $('.full-start__details'); // запасний варіант для старих тем
                
                if (container.length) {
                    // Видаляємо старе, якщо воно є
                    $('#lampa-studio-logos').remove();

                    var logosHtml = getStudioLogos(e.data.movie);
                    if (!logosHtml) return;

                    var $logos = $('<div id="lampa-studio-logos" class="quality-badges-container">' + logosHtml + '</div>');

                    // Додаємо дію при натисканні
                    $logos.find('.studio-logo').on('hover:enter', function () {
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

                    // Вставляємо в DOM
                    container.after($logos);

                    // Оновлюємо навігацію
                    Lampa.Controller.enabled().render().find('.selector').off('hover:focus').on('hover:focus', function () {
                        Lampa.Controller.focus($(this));
                    });
                }
            } catch (err) {
                console.log('Studio Plugin Error:', err);
            }
        }, 150);
    });

    // Додаємо стилі окремим блоком
    var style = '<style id="studio-logos-style">\
        #lampa-studio-logos { display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 12px !important; margin: 15px 0 !important; width: 100%; }\
        .studio-logo { display: flex !important; align-items: center !important; justify-content: center !important; background: rgba(255, 255, 255, 0.1) !important; padding: 5px 12px !important; border-radius: 6px; transition: all 0.2s ease; border: 2px solid transparent !important; }\
        .studio-logo.focus { background: #fff !important; border-color: #fff !important; transform: scale(1.1); }\
        .studio-logo.focus img { filter: brightness(0) !important; }\
        .studio-logo.focus .studio-logo-text { color: #000 !important; }\
        .studio-logo img { max-height: 1.6em !important; max-width: 130px !important; object-fit: contain !important; }\
        .studio-logo-text { color: #fff; font-weight: bold; font-size: 0.8em; }\
    </style>';

    if (!$('#studio-logos-style').length) {
        $('body').append(style);
    }
})();