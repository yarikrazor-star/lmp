(function () {
  'use strict';

  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h30'; 

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
        // Використовуємо той самий контейнер, що і torrentqualityUa
        var cont = $('.quality-badges-container');
        if (!cont.length) { 
            cont = $('<div class="quality-badges-container"></div>'); 
            details.after(cont); 
        }
        
        // Видаляємо старі логотипи, якщо вони були, щоб не дублювати при перемиканні
        cont.find('.studio-logo').remove();
        
        // Отримуємо логотипи студій та додаємо В ПОЧАТОК контейнера (prepend)
        // або в кінець (append), залежно від того, де ви хочете їх бачити
        var studioHtml = getStudioLogos(e.data.movie);
        cont.prepend(studioHtml);
    }
  });

  // Стилі, адаптовані для спільного контейнера
  var style = '<style>\
    .quality-badges-container { \
        display: flex; \
        align-items: center; \
        flex-wrap: wrap; \
        gap: 12px; \
        margin: 8px 0; \
        min-height: 2em; \
    }\
    .studio-logo { \
        height: 1.6em; \
        opacity: 0; \
        transform: translateY(8px); \
        animation: studio_in 0.4s ease forwards; \
        display: flex; \
        align-items: center; \
    }\
    @keyframes studio_in { \
        to { opacity: 0.9; transform: translateY(0); } \
    }\
    .studio-logo img { \
        height: 100%; \
        width: auto; \
        filter: brightness(0) invert(1); \
    }\
  </style>';
  
  // Додаємо стилі, якщо вони ще не додані
  if (!$('style:contains(".studio-logo")').length) {
    $('body').append(style);
  }

})();