(function () {
  'use strict';

  // ЗМІНА 1: Використовуємо h50 для кращої якості.
  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h50'; 

  /**
   * Генерує HTML-код для логотипів студій виробництва (макс. 3)
   * @param {Object} movie - Об'єкт фільму з даними TMDB
   */
  function getStudioLogos(movie) {
    var html = '';
    if (movie && movie.production_companies) {
      movie.production_companies.slice(0, 3).forEach(function(co) {
        if (co.logo_path) {
          html += '<div class="quality-badge studio-logo">' +
                  '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '">' +
                  '</div>';
        }
      });
    }
    return html;
  }

  // Слухач відкриття картки фільму
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
        
        var studioHtml = getStudioLogos(e.data.movie);
        cont.prepend(studioHtml);
    }
  });

  // Оновлені стилі з примусовим пріоритетом (!important)
  var style = '<style>\
    .quality-badges-container { \
        display: flex !important; \
        align-items: center !important; \
        flex-wrap: wrap !important; \
        gap: 15px !important; \
        margin: 10px 0 !important; \
        min-height: 2em !important; \
    }\
    .studio-logo { \
        display: flex !important; \
        align-items: center !important; \
        opacity: 0; \
        transform: translateY(8px); \
        animation: studio_in 0.4s ease forwards; \
        /* Примусовий фон та рамка, що ігнорують теми */ \
        background: rgba(255, 255, 255, 0.1) !important; \
        border: 1px solid rgba(255, 255, 255, 0.3) !important; \
        padding: 4px 8px !important; \
        border-radius: 4px !important; \
    }\
    @keyframes studio_in { \
        to { opacity: 1; transform: translateY(0); } \
    }\
    .studio-logo img { \
        max-height: 1.5em !important; \
        width: auto !important; \
        max-width: 150px !important; \
        object-fit: contain !important; \
        filter: none !important; /* Гарантує відсутність інверсії кольору */ \
    }\
  </style>';
  
  if (!$('style:contains(".studio-logo")').length) {
    $('body').append(style);
  }

})();
