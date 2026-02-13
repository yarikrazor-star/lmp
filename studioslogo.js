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

                // Додаємо клас selector для підтримки пультом
                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' +
                    content +
                    '</div>';
            });
        }
        return html;
    }

    Lampa.Listener.follow('full', function (e) {
        // Слухаємо 'complete' або 'complite' (залежно від версії)
        if (e.type === 'complite' || e.type === 'complete') {
            
            // Використовуємо рекурсивну перевірку замість одного setTimeout
            var attempts = 0;
            var injectInterval = setInterval(function () {
                attempts++;
                var render = e.object.activity.render();
                var rateContainer = $('.full-start__rate, .rate--kp, .rate--imdb, .rate--tmdb', render).first().parent();

                if (rateContainer.length) {
                    clearInterval(injectInterval);
                    
                    if ($('.rate--studio', rateContainer).length > 0) return;

                    var logosHtml = getStudioLogos(e.data.movie);
                    if (!logosHtml) return;

                    var $logos = $(logosHtml);
                    rateContainer.prepend($logos);

                    // 1. Обробка кліку
                    $logos.on('hover:enter', function () {
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

                    // 2. ВАЖЛИВО: Оновлюємо навігацію Lampa
                    // Це змушує контролер "побачити" нові кнопки .selector
                    if (Lampa.Controller.enabled().name === 'full_start') {
                        Lampa.Controller.enable('full_start');
                    }

                } else if (attempts > 50) {
                    clearInterval(injectInterval);
                }
            }, 100);
        }
    });

    var style = '<style id="studio-logos-style">\
        .rate--studio.studio-logo { \
            display: inline-flex !important; \
            align-items: center; \
            vertical-align: middle; \
            margin-right: 10px; \
            padding: 4px 8px !important; \
            background: rgba(255, 255, 255, 0.15) !important; \
            border-radius: 6px; \
            transition: all 0.2s ease; \
            height: 1.8em; \
            cursor: pointer; \
        }\
        .rate--studio.studio-logo.focus { \
            background: rgba(255, 255, 255, 0.45) !important; \
            transform: scale(1.1); \
            border: 1px solid #fff; \
        }\
        .rate--studio.studio-logo img { \
            max-height: 1.8em !important; \
            max-width: 80px; \
            object-fit: contain; \
        }\
        .studio-logo-text { \
            font-size: 1em; \
            font-weight: bold; \
            color: #fff !important; \
        }\
    </style>';

    if (!$('#studio-logos-style').length) {
        $('body').append(style);
    }

})();

