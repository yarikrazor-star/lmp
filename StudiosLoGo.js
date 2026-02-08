(function () {
  'use strict';

  // ЗМІНА 1: Використовуємо w500 замість h30.
  // Це завантажить логотип у кращій якості та дозволить йому бути "довгим".
  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h50'; 

  /**
   * Генерує HTML-код для логотипів студій виробництва
   * @param {Object} movie - Об'єкт фільму з даними TMDB
   */
  function getStudioLogos(movie) {
    var html = '';
    if (movie && movie.production_companies) {
      movie.production_companies.forEach(function(co) {
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

  // ЗМІНА 2: Оновлені стилі для горизонтальних лого
  var style = '<style>\
    .quality-badges-container { \
        display: flex; \
        align-items: center; \
        flex-wrap: wrap; \
        gap: 15px; \
        margin: 10px 0; \
        min-height: 2em; \
    }\
    .studio-logo { \
        /* Прибираємо фіксовану висоту контейнера, дозволяємо адаптивність */ \
        display: flex; \
        align-items: center; \
        opacity: 0; \
        transform: translateY(8px); \
        animation: studio_in 0.4s ease forwards; \
    }\
    @keyframes studio_in { \
        to { opacity: 1; transform: translateY(0); } \
    }\
    .studio-logo img { \
        /* Обмежуємо висоту, але дозволяємо ширині бути "auto" */ \
        max-height: 1.5em; \
        width: auto; \
        max-width: 150px; /* Обмеження ширини, щоб дуже довгі лого не ламали верстку */ \
        object-fit: contain; \
        filter: brightness(0) invert(1); \
    }\
  </style>';
  
  if (!$('style:contains(".studio-logo")').length) {
    $('body').append(style);
  }

})();
