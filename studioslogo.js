(function () {
  'use strict';

  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h50'; 

  function getStudioLogos(movie) {
    var html = '';
    if (movie && movie.production_companies) {
      movie.production_companies.slice(0, 3).forEach(function(co) {
        if (co.logo_path) {
          // Якщо є логотип - виводимо картинку
          html += '<div class="quality-badge studio-logo">' +
                  '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '">' +
                  '</div>';
        } else {
          // Якщо логотипа немає - виводимо текст з назвою
          html += '<div class="quality-badge studio-logo">' +
                  '<span class="studio-logo-text">' + co.name + '</span>' +
                  '</div>';
        }
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
        
        var studioHtml = getStudioLogos(e.data.movie);
        cont.prepend(studioHtml);
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
        background: rgba(128, 128, 128, 0.5) !important; \
        border: 1px solid rgba(255, 255, 255, 1) !important; \
        padding: 4px 10px !important; \
        border-radius: 4px !important; \
        min-height: 1.5em !important; \
    }\
    @keyframes studio_in { \
        to { opacity: 1; transform: translateY(0); } \
    }\
    .studio-logo img { \
        max-height: 1.5em !important; \
        width: auto !important; \
        max-width: 150px !important; \
        object-fit: contain !important; \
        filter: none !important; \
        display: block !important; \
    }\
    .studio-logo-text { \
        color: #fff !important; \
        font-weight: bold !important; \
        font-size: 0.7em !important; \
        text-shadow: 1px 1px 2px #000, 0 0 1em #000 !important; \
        white-space: nowrap !important; \
    }\
  </style>';
  
  if (!$('style:contains(".studio-logo")').length) {
    $('body').append(style);
  }

})();
