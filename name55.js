(function () {
  "use strict";

  function startPlugin() {
    var CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    var titleCache = Lampa.Storage.get("title_cache_uk_bold") || {};

    function showTitles(card) {
      var uk = "";
      var now = Date.now();
      var cache = titleCache[card.id];

      if (cache && now - cache.timestamp < CACHE_TTL) {
        uk = cache.uk;
      }

      if (!uk) {
        var type = card.first_air_date ? "tv" : "movie";
        Lampa.Api.sources.tmdb.get(type + "/" + card.id + "?append_to_response=translations", {}, function (data) {
          var tr = data.translations ? data.translations.translations : [];
          
          var found = tr.find(function (t) {
            return t.iso_3166_1 === "UA" || t.iso_639_1 === "uk";
          });

          uk = found ? (found.data.title || found.data.name) : "";

          if (!uk && card.alternative_titles) {
            var alt = card.alternative_titles.titles || card.alternative_titles.results || [];
            var altUk = alt.find(function (t) { return t.iso_3166_1 === "UA"; });
            if (altUk) uk = altUk.title;
          }

          if (uk) {
            titleCache[card.id] = { uk: uk, timestamp: now };
            Lampa.Storage.set("title_cache_uk_bold", titleCache);
            renderTitle(uk);
          }
        }, function (e) {
          console.error("Title Plugin Error:", e);
        });
      } else {
        renderTitle(uk);
      }
    }

    function renderTitle(title) {
      var render = Lampa.Activity.active().activity.render();
      if (!render) return;

      $(".plugin-uk-title", render).remove();

      // Налаштування стилю: font-size (розмір) та font-weight (жирність)
      var html = '<div class="plugin-uk-title" style="margin-top: 10px; margin-bottom: 15px; text-align: left; width: 100%;">' +
                    '<div style="font-size: 1.6em; font-weight: bold; color: #fff; line-height: 1.2;">' +
                        title +
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