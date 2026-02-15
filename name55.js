(function () {
    "use strict";

    function startPlugin() {
        var CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
        var titleCache = Lampa.Storage.get("title_cache_hybrid_v3") || {};

        // 1. Створення компонента налаштувань
        var SETTINGS_COMPONENT = "hybrid_title_settings";

        Lampa.Settings.listener.follow("open", function (e) {
            if (e.name == "main") {
                var render = Lampa.Settings.main().render();
                if (render.find('[data-component="' + SETTINGS_COMPONENT + '"]').length == 0) {
                    Lampa.SettingsApi.addComponent({
                        component: SETTINGS_COMPONENT,
                        name: "Додаткова назва"
                    });
                }
                Lampa.Settings.main().update();
                render.find('[data-component="' + SETTINGS_COMPONENT + '"]').addClass("hide");
            }
        });

        // Додаємо пункт у меню "Інтерфейс"
        Lampa.SettingsApi.addParam({
            component: "interface",
            param: { name: "hybrid_title_entry", type: "static" },
            field: { name: "Додаткова назва", description: "Налаштування відображення назви, року та країни" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create(SETTINGS_COMPONENT);
                    Lampa.Controller.enabled().controller.back = function () {
                        Lampa.Settings.create("interface");
                    };
                });
            }
        });

        // Кнопка "Назад" всередині меню
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: { name: "hybrid_title_back", type: "static" },
            field: { name: "Назад", description: "Повернутися до налаштувань інтерфейсу" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create("interface");
                });
            }
        });

        // Параметр: Режим відображення
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: "hybrid_title_mode",
                type: "select",
                values: {
                    'smart': 'Залежно від лого',
                    'always_ua': 'Завжди українська'
                },
                default: 'smart'
            },
            field: { name: "Режим відображення", description: "Визначає, яку назву показувати поруч із логотипом" }
        });

        // Параметр: Розмір назви
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: "hybrid_title_size",
                type: "select",
                values: {
                    'xs': 'Дуже мала',
                    's': 'Мала',
                    'm': 'Нормальна (стандарт)',
                    'l': 'Велика',
                    'xl': 'Дуже велика',
                    'xxl': 'Максимальна',
                    'giant': 'Гігантська'
                },
                default: 'm'
            },
            field: { name: "Розмір назви", description: "Назва буде пропорційно більшою за рік та країну" }
        });

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
            'ru': 'Країна-агресор', 'pt': 'Португалія', 'gr': 'Греція',
            'is': 'Ісландія', 'ro': 'Румунія', 'bg': 'Болгарія',
            'ar': 'Аргентина', 'cl': 'Чилі', 'co': 'Колумбія', 'pe': 'Перу',
            'id': 'Індонезія', 'my': 'Малайзія', 'ph': 'Філіппіни', 'sg': 'Сінгапур',
            'vn': 'В\'єтнам', 'ae': 'ОАЕ', 'sa': 'Саудівська Аравія', 'eg': 'Єгипет'
        };

        function getCountryUA(iso) {
            if (!iso) return '';
            var code = iso.toLowerCase().trim();
            return countryNames[code] || Lampa.Lang.translate(code) || iso;
        }

        function checkLogoAndRender(card) {
            var cached = titleCache[card.id];
            var now = Date.now();

            if (cached && (now - cached.timestamp < CACHE_TTL)) {
                renderTitle(cached.ukTitle, cached.enTitle, cached.hasLogo, cached.year, cached.country);
                return;
            }

            var type = card.first_air_date ? "tv" : "movie";
            var tmdb_api = "https://api.themoviedb.org/3/" + type + "/" + card.id;
            var key = Lampa.TMDB.key();
            var url = tmdb_api + "?api_key=" + key + "&append_to_response=translations,images&include_image_language=uk,en,null";

            $.getJSON(url, function (data) {
                var hasUkrainianLogo = false;
                if (data.images && data.images.logos) {
                    hasUkrainianLogo = data.images.logos.some(function (l) {
                        return l.iso_639_1 === "uk";
                    });
                }

                // Захист від undefined: беремо оригінальну назву з картки або з даних API
                var originalName = data.original_title || data.original_name || card.original_title || card.original_name || "";
                var enTitle = data.title || data.name || originalName;
                var ukTitle = enTitle;

                if (data.translations && data.translations.translations) {
                    var translation = data.translations.translations.find(function (t) {
                        return t.iso_3166_1 === "UA" || t.iso_639_1 === "uk";
                    });
                    if (translation) {
                        ukTitle = translation.data.title || translation.data.name || enTitle;
                    }
                }

                var dateStr = data.release_date || data.first_air_date || "";
                var year = dateStr ? dateStr.split("-")[0] : "";
                var countryList = (data.production_countries || []).map(function (c) {
                    return getCountryUA(c.iso_3166_1);
                });
                var countryString = countryList.join(" / ");

                titleCache[card.id] = {
                    ukTitle: ukTitle || "",
                    enTitle: enTitle || "",
                    hasLogo: hasUkrainianLogo,
                    year: year || "",
                    country: countryString || "",
                    timestamp: now
                };
                Lampa.Storage.set("title_cache_hybrid_v3", titleCache);

                renderTitle(ukTitle, enTitle, hasUkrainianLogo, year, countryString);
            }).fail(function() {
                // Якщо запит не вдався, показуємо хоча б те, що є в об'єкті картки
                var fallbackTitle = card.title || card.name || card.original_title || "";
                renderTitle(fallbackTitle, fallbackTitle, false, "", "");
            });
        }

        function renderTitle(ukTitle, enTitle, hasLogo, year, country) {
            var render = Lampa.Activity.active().activity.render();
            if (!render) return;

            $(".plugin-hybrid-title", render).remove();

            var mode = Lampa.Storage.get('hybrid_title_mode', 'smart');
            var sizeKey = Lampa.Storage.get('hybrid_title_size', 'm');

            var displayTitle = (mode === 'smart' && hasLogo) ? enTitle : ukTitle;
            
            // Фінальна перевірка, щоб ні в якому разі не вивести "undefined" як текст
            if (!displayTitle || displayTitle === "undefined") displayTitle = "";

            var sizes = {
                'xs':    { title: '1.0em', info: '0.8em' },
                's':     { title: '1.2em', info: '0.9em' },
                'm':     { title: '1.4em', info: '1.0em' },
                'l':     { title: '1.7em', info: '1.1em' },
                'xl':    { title: '2.0em', info: '1.2em' },
                'xxl':   { title: '2.4em', info: '1.3em' },
                'giant': { title: '3.0em', info: '1.5em' }
            };

            var currentSize = sizes[sizeKey] || sizes['m'];

            var details = [];
            if (year && year !== "undefined") details.push(year);
            if (country && country !== "undefined") details.push(country);
            var secondaryInfo = details.length > 0 ? ' • ' + details.join(' • ') : '';

            var html = '<div class="plugin-hybrid-title" style="margin-top: 5px; margin-bottom: 5px; text-align: left; width: 100%; position: relative; z-index: 10;">' +
                '<div style="line-height: 1.2; font-weight: bold; display: flex; align-items: baseline; flex-wrap: wrap;">' +
                    '<span style="font-size: ' + currentSize.title + '; color: #fff; opacity: 0.8;">' + displayTitle + '</span>' + 
                    '<span style="font-size: ' + currentSize.info + '; color: #fff; opacity: 0.5; margin-left: 3px;">' + secondaryInfo + '</span>' +
                '</div>' +
           '</div>';

// Використовуємо .after(), щоб він став одразу під оригінальним заголовком
var target = $(".full-start-new__title", render);
if(!target.length) target = $(".full-start__title", render);
target.after(html);
        }

        if (!window.hybrid_title_plugin_loaded) {
            window.hybrid_title_plugin_loaded = true;
            Lampa.Listener.follow("full", function (e) {
                if (e.type === "complite" && e.data.movie) {
                    checkLogoAndRender(e.data.movie);
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
