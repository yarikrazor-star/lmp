(function () {
  'use strict';

  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h50'; 

  function getStudioLogos(movie) {
    var html = '';
    if (movie && movie.production_companies) {
      movie.production_companies.slice(0, 3).forEach(function(co) {
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

  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complite') return;

    // Додаємо невелику затримку, щоб не заважати іншим плагінам
    setTimeout(function() {
        var details = $('.full-start-new__details');
        
        // Перевіряємо, чи ми вже не додали логотипи, щоб уникнути дублювання
        if (details.length && !details.parent().find('#lampa-studio-logos').length) {
            
            var cont = $('<div id="lampa-studio-logos" class="quality-badges-container"></div>');
            
            // Вставляємо контейнер після деталей
            details.after(cont);
            
            var logosHtml = getStudioLogos(e.data.movie);
            if (!logosHtml) return;

            var nodes = $(logosHtml);

            // Обробка натискання
            nodes.on('hover:enter', function() {
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

            cont.append(nodes);

            // Оновлюємо контролер навігації (важливо для пульта)
            if (Lampa.Controller.enabled().name === 'full_start') {
                Lampa.Controller.add('full_start', {
                    toggle: function() {
                        Lampa.Controller.context('full_start');
                    }
                });
            }
        }
    }, 100); // Таймаут 100 мс
  });

  var style = '<style>\
    #lampa-studio-logos { \
        display: flex !important; \
        align-items: center !important; \
        flex-wrap: wrap !important; \
        gap: 15px !important; \
        margin: 10px 0 !important; \
        width: 100%; \
    }\
    .studio-logo { \
        display: flex !important; \
        align-items: center !important; \
        justify-content: center !important; \
        opacity: 0; \
        transform: translateY(8px); \
        animation: studio_in 0.4s ease forwards; \
        background: rgba(128, 128, 128, 0.2) !important; \
        padding: 4px 10px !important; \
        min-height: 1.5em !important; \
        border-radius: 4px; \
        transition: all 0.2s ease; \
        border: 2px solid transparent !important; \
        cursor: pointer; \
    }\
    .studio-logo.focus { \
        background: #fff !important; \
        border-color: #fff !important; \
        transform: scale(1.1) !important; \
    }\
    .studio-logo.focus .studio-logo-text { \
        color: #000 !important; \
    }\
    .studio-logo.focus img { \
        filter: brightness(0) !important; \
    }\
    @keyframes studio_in { \
        to { opacity: 1; transform: translateY(0); } \
    }\
    .studio-logo img { \
        max-height: 1.5em !important; \
        width: auto !important; \
        max-width: 150px !important; \
        object-fit: contain !important; \
        display: block !important; \
    }\
    .studio-logo-text { \
        color: #fff !important; \
        font-weight: bold !important; \
        font-size: 0.7em !important; \
        white-space: nowrap !important; \
    }\
  </style>';
  
  if (!$('style#studio-logos-style').length) {
    $('body').append($(style).attr('id', 'studio-logos-style'));
  }

})();
