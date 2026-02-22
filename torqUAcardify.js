(function () {
  'use strict';

  var COMPONENT_NAME = 'uator_settings';
  var STORAGE_PREFIX = 'uator_';

  var icons = {
    ua: 'https://yarikrazor-star.github.io/lmp/ua.svg',
    none: 'https://yarikrazor-star.github.io/lmp/dontknow.svg',
    top: 'https://yarikrazor-star.github.io/lmp/stream.svg',
    seeds: 'https://yarikrazor-star.github.io/lmp/upload.svg',
    audio: 'https://yarikrazor-star.github.io/lmp/zvuk.svg',
    dv: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Dolby_Vision_2021_logo.svg',
    hdr: 'https://yarikrazor-star.github.io/lmp/hdr.svg'
  };

  var resultsCache = {};

  function getSetting(name, def) {
    return Lampa.Storage.get(STORAGE_PREFIX + name, def);
  }

  function getResolutionLabel(width) {
    var w = parseInt(width || 0);
    if (w >= 3800) return '4K';
    if (w >= 2500) return '2K';
    if (w >= 1900) return 'FHD';
    if (w >= 1200) return 'HD';
    return 'SD';
  }

  function getBestAndPopular(results, movie) {
    if (!results || !Array.isArray(results)) return { ukr: false };
    
    var ukrPattern = /(ukr|ua|ukrainian|українськ|укр|[^a-z]uk[^a-z])/i;
    var ukrResults = [];
    var movieYear = parseInt(movie.release_date || movie.first_air_date || movie.year || 0);

    results.forEach(function(item) {
      var title = (item.Title || '').toLowerCase();
      
      if (movieYear > 0) {
        var yearMatch = title.match(/\b(19|20)\d{2}\b/g);
        if (yearMatch) {
          var correctYear = yearMatch.some(function(y) { return Math.abs(parseInt(y) - movieYear) <= 1; });
          if (!correctYear) return;
        }
      }

      var titleClean = title.replace(/(укр[а-яієґї]*|ukr[a-z]*|ua|ukrainian)[\s\.\,\_\-\|]*(sub|суб)[a-zа-яієґї]*/ig, '')
                            .replace(/(sub|суб)[a-zа-яієґї]*[\s\.\,\_\-\|]*(укр[а-яієґї]*|ukr[a-z]*|ua|ukrainian)/ig, '');

      var hasUkr = ukrPattern.test(titleClean);

      if (!hasUkr && item.ffprobe && Array.isArray(item.ffprobe)) {
        hasUkr = item.ffprobe.some(function(s) {
          if (s.codec_type !== 'audio') return false;
          var l = (s.tags && s.tags.language ? s.tags.language : '').toLowerCase();
          var t = (s.tags && s.tags.title ? s.tags.title : '').toLowerCase();
          return l.indexOf('uk') === 0 || ukrPattern.test(t);
        });
      }

      if (hasUkr) {
        var width = 0;
        if (item.ffprobe) {
          item.ffprobe.forEach(function(s) {
            if (s.codec_type === 'video' && s.width) width = Math.max(width, parseInt(s.width));
          });
        }
        if (width === 0) {
          if (/2160|4k/i.test(title)) width = 3840;
          else if (/1080|fhd/i.test(title)) width = 1920;
          else if (/720|hd/i.test(title)) width = 1280;
          else width = 720;
        }
        item.detectedWidth = width;
        item.seedersCount = parseInt(item.Seeders || 0);
        ukrResults.push(item);
      }
    });

    if (ukrResults.length === 0) return { ukr: false };

    var best = ukrResults.reduce(function(p, c) { return (p.detectedWidth > c.detectedWidth) ? p : c; });
    var popular = ukrResults.reduce(function(p, c) { return (p.seedersCount > c.seedersCount) ? p : c; });
    
    var tech = { hdr: false, dv: false, audio: null };
    var maxChannels = 0;

    ukrResults.forEach(function(item) {
      if (item.ffprobe) {
        item.ffprobe.forEach(function(s) {
          if (s.codec_type === 'audio' && s.channels) {
            maxChannels = Math.max(maxChannels, parseInt(s.channels));
          }
        });
      }
      var t = item.Title.toLowerCase();
      if (t.match(/7\.1|8ch/)) maxChannels = Math.max(maxChannels, 8);
      else if (t.match(/5\.1|6ch/)) maxChannels = Math.max(maxChannels, 6);
      else if (t.match(/2\.0/)) maxChannels = Math.max(maxChannels, 2);
    });

    if (maxChannels > 0) {
      tech.audio = (maxChannels >= 8) ? '7.1' : (maxChannels >= 6) ? '5.1' : (maxChannels >= 4) ? '4.0' : '2.0';
    }

    if (best.ffprobe) {
      best.ffprobe.forEach(function(s) {
        if (s.codec_type === 'video') {
          var side = JSON.stringify(s.side_data_list || []);
          if (/vision|dovi/i.test(side)) tech.dv = true;
          if (s.color_transfer === 'smpte2084') tech.hdr = true;
        }
      });
    }
    var bTitle = best.Title.toLowerCase();
    if (!tech.dv && /vision|dovi/i.test(bTitle)) tech.dv = true;
    if (!tech.hdr && /hdr/i.test(bTitle)) tech.hdr = true;

    return { 
      ukr: true, 
      bestRes: getResolutionLabel(best.detectedWidth),
      popRes: getResolutionLabel(popular.detectedWidth),
      popSeeds: popular.seedersCount, 
      tech: tech 
    };
  }

  function render(container, data, isCard) {
    container.find('.qb-unified-block').remove();
    if (!data) return;

    var size = getSetting('rating_size', '0.8em');
    var saturation = getSetting('saturation', '100%');
    
    var block = $('<div class="qb-unified-block" style="font-size: '+size+'"></div>');
    
    if (!data.ukr) {
        var iconHtml = (saturation === '0%') ? '<span class="qb-text-icon">UA</span>' : '<img src="'+icons.none+'" class="qb-prefix-icon" style="filter: saturate('+saturation+')">';
        block.append('<div class="quality-badge qb-not-found">' + iconHtml + '<span class="qb-text">немає</span></div>');
    } else {
      var items = [
        {i: icons.ua, t: data.bestRes, type: 'ua'},
        {i: icons.top, t: data.popRes},
        {i: icons.seeds, t: data.popSeeds}
      ];
      if (data.tech.audio) items.push({i: icons.audio, t: data.tech.audio});
      if (data.tech.dv) items.push({i: icons.dv, t: '', type: 'dv'});
      if (data.tech.hdr) items.push({i: icons.hdr, t: '', type: 'hdr'});
      
      items.forEach(function(it) {
        var iconHtml = '';
        if (it.i) {
            var style = 'filter: saturate('+saturation+');';
            
            if (it.type === 'ua' && saturation === '0%') {
                iconHtml = '<span class="qb-text-icon">UA</span>';
            } else {
                if (it.type === 'dv') {
                    style = 'filter: brightness(0) invert(1);';
                } else if (it.type === 'hdr') {
                    style = 'filter: grayscale(1);';
                }
                iconHtml = '<img src="'+it.i+'" class="qb-prefix-icon" style="'+style+'">';
            }
        }
        var textHtml = it.t ? '<span class="qb-text">' + it.t + '</span>' : '';
        block.append('<div class="quality-badge">' + iconHtml + textHtml + '</div>');
      });
    }
    container.append(block);
  }

  function processCards() {
    $('.card:not(.qb-processed)').each(function() {
      var card = $(this);
      var movie = card.data('item');
      if (movie && movie.id) {
        card.addClass('qb-processed');
        var key = movie.id + '_' + (movie.title || movie.name);
        if (resultsCache[key] && resultsCache[key].ukr) {
          render(card.find('.card__view'), resultsCache[key], true);
        } else {
          Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
            if (res && res.Results) {
              var data = getBestAndPopular(res.Results, movie);
              if (data.ukr) { resultsCache[key] = data; render(card.find('.card__view'), data, true); }
            }
          }, function() { });
        }
      }
    });
  }

  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complite' && e.type !== 'complete') return;
    
    var renderTarget = e.object.activity.render();
    var isPortrait = window.innerHeight > window.innerWidth;
    
    var cont = $('.quality-badges-container', renderTarget);
    if (!cont.length) { 
        cont = $('<div class="quality-badges-container"></div>'); 
        
        if (isPortrait) {
            var title = $('.full-start-new__title, .full-start__title', renderTarget);
            title.after(cont);
        } else {
            var rateLine = $('.full-start-new__rate-line, .full-start__rate-line', renderTarget);
            if (rateLine.length) rateLine.append(cont);
            else $('.full-start__info', renderTarget).append(cont);
        }
    }

    Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(res) {
        if (res && res.Results) render(cont, getBestAndPopular(res.Results, e.data.movie), false);
    }, function() { });
  });

  setInterval(processCards, 2000);

  function setupSettings() {
    Lampa.SettingsApi.addComponent({ component: COMPONENT_NAME, name: 'Uator' });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: { name: "uator_entry_btn", type: "static" },
        field: { name: "Uator", description: "Налаштування відображення UA контенту" },
        onRender: function (item) { item.on("hover:enter", function () { Lampa.Settings.create(COMPONENT_NAME); }); }
    });

    Lampa.SettingsApi.addParam({
        component: COMPONENT_NAME,
        param: { name: "uator_back", type: "static" },
        field: { name: "Назад", description: "До інтерфейсу" },
        onRender: function (item) { item.on("hover:enter", function () { Lampa.Settings.create("interface"); }); }
    });

    Lampa.SettingsApi.addParam({
        component: COMPONENT_NAME,
        param: { 
            name: STORAGE_PREFIX + 'saturation', 
            type: 'select', 
            values: { '100%': '100% (Стандарт)', '75%': '75%', '50%': '50%', '25%': '25%', '0%': '0% (Ч/Б)' }, 
            default: '100%' 
        },
        field: { name: 'Насиченість', description: 'Рівень кольоровості іконок' }
    });

    Lampa.SettingsApi.addParam({
        component: COMPONENT_NAME,
        param: { 
            name: STORAGE_PREFIX + 'rating_size', 
            type: 'select', 
            values: { '0.5em': 'XS', '0.8em': 'S', '1.1em': 'M', '1.5em': 'L', '2.0em': 'XL' }, 
            default: '0.8em' 
        },
        field: { name: 'Розмір значків', description: 'Розмір елементів на картці та в описі' }
    });
  }

  if (window.Lampa) setupSettings();

  $('body').append('<style>\
    /* Хак для приховування дублювання у головному списку налаштувань */\
    div[data-component="' + COMPONENT_NAME + '"] { display: none !important; }\
    \
    .quality-badges-container { \
        display: flex; \
        align-items: center; \
    }\
    .qb-unified-block { \
        display: flex; \
        flex-wrap: nowrap; \
        align-items: center; \
        gap: 0.45em; \
    }\
    @media screen and (orientation: portrait) { \
        .quality-badges-container { \
            width: 100%; \
            justify-content: center; \
            display: block !important; \
            margin: 10px 0; \
            clear: both; \
        } \
        .qb-unified-block { \
            flex-wrap: wrap; \
            justify-content: center; \
            width: 100%; \
        } \
    }\
    .quality-badge { \
      display: inline-flex; \
      align-items: center; \
      gap: 0.35em; \
      color: #fff; \
      white-space: nowrap; \
      flex-shrink: 0; \
      height: 1.1em; \
    }\
    .qb-text { font-weight: bold; line-height: 1.1em; height: 1.1em; display: flex; align-items: center; }\
    .qb-prefix-icon { \
        height: 1.1em !important; \
        width: auto; \
        display: block; \
        object-fit: contain; \
        margin: 0; \
    }\
    .qb-text-icon { \
        height: 1.1em !important; \
        line-height: 1.1em !important; \
        font-size: 0.85em !important; \
        font-weight: 900; \
        display: inline-flex; \
        align-items: center; \
        justify-content: center; \
        background: #fff; \
        color: #000; \
        padding: 0 0.25em; \
        border-radius: 2px; \
        box-sizing: border-box; \
        vertical-align: top; \
    }\
    .qb-not-found { opacity: 0.6; }\
    \
    .card .qb-unified-block { \
      position: absolute; \
      top: 0.5rem; \
      left: 0.5rem; \
      z-index: 10; \
      flex-direction: column; \
      align-items: flex-start; \
      gap: 0.2rem; \
      font-size: 0.7em !important; \
    }\
    .card .quality-badge { \
      background: rgba(0, 0, 0, 0.6); \
      padding: 2px 4px; \
      border-radius: 4px; \
      height: 1em; \
    }\
    .card .qb-prefix-icon, .card .qb-text-icon { height: 1em !important; }\
    .card .qb-text { height: 1em; line-height: 1em; }\
  </style>');

})();
