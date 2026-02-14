(function () {
  "use strict";

  function startPlugin() {
    var CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    var titleCache = Lampa.Storage.get("title_cache_uk_final") || {};

    function showTitles(card) {
      var cachedData = titleCache[card.id];
      var now = Date.now();

      if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
        renderTitle(cachedData.uk, cachedData.year, cachedData.country);
      } else {
        var type = card.first_air_date ? "tv" : "movie";
        
        Lampa.Api.sources.tmdb.get(type + "/" + card.id + "?append_to_response=translations", {}, function (data) {
          // 1. Назва
          var tr = data.translations ? data.translations.translations : [];
          var found = tr.find(function (t) {
            return t.iso_3166_1 === "UA" || t.iso_639_1 === "uk";
          });
          var ukTitle = found ? (found.data.title || found.data.name) : (card.title || card.name);

          // 2. Рік
          var dateStr = data.release_date || data.first_air_date || "";
          var year = dateStr ? dateStr.split("-")[0] : "";

          // 3. Країни (перекладаємо коди через внутрішній сервіс Lampa)
          var countryList = [];
          var prodCountries = data.production_countries || [];
          
          prodCountries.forEach(function(c) {
            // Використовуємо внутрішній словник Lampa для назв країн
            var name = Lampa.Lang.translate(c.iso_3166_1.toLowerCase()) || c.name;
            // Якщо Lampa повернула код замість назви, спробуємо форматувати
            if (name === c.iso_3166_1.toLowerCase()) name = c.iso_3166_1;
            countryList.push(name);
          });

          var countryString = countryList.join(" / ");

          titleCache[card.id] = { 
            uk: ukTitle, 
            year: year, 
            country: countryString, 
            timestamp: now 
          };
          Lampa.Storage.set("title_cache_uk_final", titleCache);

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

      var html = '<div class="plugin-uk-title" style="margin-top: 5px; margin-bottom: 5px; text-align: left; width: 100%;">' +
                    '<div style="font-size: 1.5em; color: #fff; line-height: 1.4; font-weight: bold;">' +
                        title + '<span style="opacity: 0.6; font-weight: bold;">' + secondaryInfo + '</span>' +
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
