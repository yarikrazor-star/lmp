(function () {
  'use strict';

  var icons = {
    ua: 'https://yarikrazor-star.github.io/lmp/ua.svg',
    none: 'https://yarikrazor-star.github.io/lmp/dontknow.svg',
    top: 'https://yarikrazor-star.github.io/lmp/stream.svg',
    seeds: 'https://yarikrazor-star.github.io/lmp/upload.svg',
    audio: 'https://yarikrazor-star.github.io/lmp/zvuk.svg'
  };

  var resultsCache = {};

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

      var hasUkr = ukrPattern.test(title);
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

    var block = $('<div class="qb-unified-block"></div>');
    if (!data.ukr) {
      block.append('<div class="quality-badge"><img src="'+icons.none+'" class="qb-prefix-icon"><span class="qb-text">UA не знайдено</span></div>');
    } else {
      var items = [
        {i: icons.ua, t: data.bestRes},
        {i: icons.top, t: data.popRes},
        {i: icons.seeds, t: data.popSeeds}
      ];
      if (data.tech.audio) items.push({i: icons.audio, t: data.tech.audio});
      if (data.tech.dv) items.push({i: null, t: 'Dolby Vision'});
      if (data.tech.hdr) items.push({i: null, t: 'HDR'});
      
      items.forEach(function(it) {
        var icon = it.i ? '<img src="'+it.i+'" class="qb-prefix-icon">' : '';
        block.append('<div class="quality-badge">' + icon + '<span class="qb-text">' + it.t + '</span></div>');
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
          }, function() { /* помилка ігнорується для запобігання вильоту */ });
        }
      }
    });
  }

  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complite') return;
    var details = $('.full-start-new__details');
    if (details.length) {
        var cont = $('.quality-badges-container');
        if (!cont.length) { cont = $('<div class="quality-badges-container"></div>'); details.after(cont); }
        Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(res) {
            if (res && res.Results) render(cont, getBestAndPopular(res.Results, e.data.movie), false);
        }, function() { /* помилка ігнорується */ });
    }
  });

  setInterval(processCards, 2000);

  $('body').append('<style>\
    .quality-badges-container { margin-top: 0.4em; margin-bottom: 1.2em; }\
    .qb-unified-block { display: flex; flex-wrap: wrap; gap: 0.6em; align-items: center; }\
    .quality-badge { \
      display: flex; \
      align-items: center; \
      gap: 0.4em; \
      color: #fff; \
      padding: 0.25em 0.6em; \
      background: rgba(255, 255, 255, 0.08); \
      border: 1px solid rgba(255, 255, 255, 0.7); \
      border-radius: 0.3em; \
      white-space: nowrap; \
    }\
    .qb-text { font-size: 1.1em; font-weight: bold; text-shadow: 0 0.1em 0.2em rgba(0,0,0,0.8); }\
    .qb-prefix-icon { height: 1.1em; width: auto; display: block; }\
    /* Стилі для карток залишаємо компактними */\
    .card .qb-unified-block { \
      position: absolute; \
      top: 0.4em; \
      left: 0.4em; \
      z-index: 10; \
      flex-direction: column; \
      align-items: flex-start; \
      gap: 0.2em; \
    }\
    .card .quality-badge { \
      padding: 0.1em 0.3em; \
      background: rgba(0, 0, 0, 0.65); \
      border: 1px solid rgba(255, 255, 255, 0.5); \
      border-radius: 0.2em; \
    }\
    .card .qb-text { font-size: 0.8em; }\
    .card .qb-prefix-icon { height: 0.8em; }\
  </style>');
})();
