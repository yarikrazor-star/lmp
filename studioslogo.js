(function () {
  'use strict';

  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h50'; 

  function getStudioLogos(movie) {
    var html = '';
    if (movie && movie.production_companies) {
      movie.production_companies.slice(0, 3).forEach(function(co) {
        // Додаємо клас 'selector' для роботи пульта
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
 
    var details = $('.full-start-new__details');
    if (details.length) {
        var cont = $('.quality-badges-container');
        if (!cont.length) { 
            cont = $('<div class="quality-badges-container"></div>'); 
            details.after(cont); 
        }
        
        cont.find('.studio-logo').remove();
        
        var nodes = $(getStudioLogos(e.data.movie));

        // Обробка натискання (Enter на пульті або клік мишкою)
        nodes.on('hover:enter', function() {
            var id = $(this).data('id');
            var name = $(this).data('name');
            
            if (id) {
                Lampa.Activity.push({
                    url: 'movie', // Вказуємо тип контенту для фільтрації
                    id: id,
                    title: name,
                    component: 'company',
                    source: 'tmdb',
                    page: 1
                });
            }
        });

        cont.prepend(nodes);

        // Оновлюємо навігацію, щоб Lampa "побачила" нові селектори
        Lampa.Controller.enabled().render().find('.selector').unbind('hover:focus').on('hover:focus', function(){
            Lampa.Controller.focus(Lampa.Controller.enabled().render().find('.selector'));
        });
    }
  });

  var style = '<style>\
    .quality-badges-container { \
        display: flex !important; \
        align-items: center !important; \
        flex-wrap: wrap !important; \
        gap: 15px !important; \
        margin: 10px 0 !important; \
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
    }\
    /* Стиль фокусу для пульта */\
    .studio-logo.focus { \
        background: #fff !important; \
        border-color: #fff !important; \
        transform: scale(1.1) !important; \
    }\
    .studio-logo.focus .studio-logo-text { \
        color: #000 !important; \
        text-shadow: none !important; \
    }\
    .studio-logo.focus img { \
        filter: brightness(0) !important; /* Робимо логотип чорним на білому фоні при фокусі */\
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
  
  if (!$('style:contains(".studio-logo")').length) {
    $('body').append(style);
  }

})();