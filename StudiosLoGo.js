(function () {
  'use strict';

  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h50'; 

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
        /* Світло-сіра напівпрозора підкладка */ \
        background: rgba(220, 220, 220, 0.8) !important; \
        /* Біла рамка */ \
        border: 1px solid #ffffff !important; \
        padding: 4px 10px !important; \
        border-radius: 4px !important; \
        box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important; \
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
  </style>';
  
  if (!$('style:contains(".studio-logo")').length) {
    $('body').append(style);
  }

})();
