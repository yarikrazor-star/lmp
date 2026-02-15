(function () {
  "use strict";

  function startPlugin() {
    var CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    // Оновлено кеш до v3 для застосування нових стилів та назв
    var titleCache = Lampa.Storage.get("title_cache_uk_v3") || {};

    var countryNames = {
      'us': 'США', 'usa': 'США', 'gb': 'Велика Британія', 'uk': 'Велика Британія',
      'ua': 'Україна', 'ca': 'Канада', 'hk': 'Гонконг', 'fr': 'Франція',
      'de': 'Німеччина', 'it': 'Італія', 'es': 'Іспанія', 'jp': 'Японія',
      'kr': 'Південна Корея', 'cn': 'Китай', 'pl': 'Польща', 'au': 'Австралія',
      'ie': 'Ірландія', 'be': 'Бельгія', 'dk': 'Данія', 'no': 'Норвегія',
      'se': 'Швеція', 'fi': 'Фінляндія', 'tr': 'Туреччина', 'in': 'Індія',
      'br': 'Бразилія', 'mx': 'Мексика', 'nl': 'Нідерланди', 'at': 'Австрія',
      'ch': 'Швейцарія', 'cz': 'Чехія', 'hu': 'Угорщина', 'nz': 'Нова Зеландія',
      'za': 'ПАР', 'il': 'Ізраїль', 'th': 'Таїланд', 'tw': 'Тайвань', 
      'ru': 'Країна-агресор', 'pt': 'Португалія', 'gr': 'Греція', 'be': 'Бельгія',
      'is': 'Ісландія', 'ie': 'Ірландія', 'ro': 'Румунія', 'bg': 'Болгарія',
      'ar': 'Аргентина', 'cl': 'Чилі', 'co': 'Колумбія', 'pe': 'Перу',
      'id': 'Індонезія', 'my': 'Малайзія', 'ph': 'Філіппіни', 'sg': 'Сінгапур',
      'vn': 'В\'єтнам', 'ae': 'ОАЕ', 'sa': 'Саудівська Аравія', 'eg': 'Єгипет'
    };

    function getCountryUA(iso) {
      if (!iso) return '';
      var code = iso.toLowerCase().trim();
      return countryNames[code] || Lampa.Lang.translate(code) || iso;
    }

    function showTitles(card) {
      var cachedData = titleCache[card.id];
      var now = Date.now();

      if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
        renderTitle(cachedData.uk, cachedData.year, cachedData.country);
      } else {
        var type = card.first_air_date ? "tv" : "movie";
        
        Lampa.Api.sources.tmdb.get(type + "/" + card.id + "?append_to_response=translations", {}, function (data) {
          var tr = data.translations ? data.translations.translations : [];
          var found = tr.find(function (t) {
            return t.iso_3166_1 === "UA" || t.iso_639_1 === "uk";
          });
          var ukTitle = found ? (found.data.title || found.data.name) : (card.title || card.name);

          var dateStr = data.release_date || data.first_air_date || "";
          var year = dateStr ? dateStr.split("-")[0] : "";

          var countryList = [];
          var prodCountries = data.production_countries || [];
          
          prodCountries.forEach(function(c) {
            var nameUA = getCountryUA(c.iso_3166_1);
            if (nameUA) countryList.push(nameUA);
          });

          var countryString = countryList.join(" / ");

          titleCache[card.id] = { 
            uk: ukTitle, 
            year: year, 
            country: countryString, 
            timestamp: now 
          };
          Lampa.Storage.set("title_cache_uk_v3", titleCache);

          renderTitle(ukTitle, year, countryString);
        }, function (e) {
          console.error("Title Plugin Error:", e);
        });
      }
    }

    function renderTitle(title, year, country) {
      var render = Lampa.Activity.active().activity.render();
      if (!render) return;

      $(".plugin-uk-title", render).remove();

      var details = [];
      if (year) details.push(year);
      if (country) details.push(country);
      
      var secondaryInfo = details.length > 0 ? ' • ' + details.join(' • ') : '';

      // Назва фільму залишається 1.5em (або без змін), а рік/країна — 1em
      var html = '<div class="plugin-uk-title" style="margin-top: 5px; margin-bottom: 5px; text-align: left; width: 100%;">' +
                    '<div style="line-height: 1.4; font-weight: bold;">' +
                        '<span style="font-size: 1.5em; color: #fff;">' + title + '</span>' + 
                        '<span style="font-size: 1em; color: #fff; opacity: 0.6; margin-left: 8px;">' + secondaryInfo + '</span>' +
                    '</div>' +
                 '</div>';

      $(".full-start-new__title", render).after(html);
    }

    if (!window.uk_title_plugin_loaded) {
      window.uk_title_plugin_loaded = true;
      Lampa.Listener.follow("full", function (e) {
        if (e.type === "complite" && e.data.movie) {
          showTitles(e.data.movie);
        }
      });
    }
  }

  if (window.appready) {
    startPlugin();
  } else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready") startPlugin();
    });
  }

})();
