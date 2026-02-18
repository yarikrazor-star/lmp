(function () {
    'use strict';

    var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h100';
    // Кеш тільки в оперативній пам'яті
    var runtimeLogoCache = {}; 
    var SETTINGS_COMPONENT = "studio_logo_settings";
    var STYLE_ID = "studio-logos-combined-style";

    // --- ЛОГІКА НАЛАШТУВАНЬ ---
    function initSettings() {
        // 1. Створення компонента налаштувань
        Lampa.Settings.listener.follow("open", function (e) {
            if (e.name == "main") {
                var render = Lampa.Settings.main().render();
                if (render.find('[data-component="' + SETTINGS_COMPONENT + '"]').length == 0) {
                    Lampa.SettingsApi.addComponent({
                        component: SETTINGS_COMPONENT,
                        name: "Лого студій"
                    });
                }
                Lampa.Settings.main().update();
                render.find('[data-component="' + SETTINGS_COMPONENT + '"]').addClass("hide");
            }
        });

        // 2. Пункт у меню "Інтерфейс"
        Lampa.SettingsApi.addParam({
            component: "interface",
            param: { name: "studio_logo_entry", type: "static" },
            field: { name: "Лого студій", description: "Налаштування відображення логотипів виробничих компаній" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create(SETTINGS_COMPONENT);
                    Lampa.Controller.enabled().controller.back = function () {
                        Lampa.Settings.create("interface");
                    };
                });
            }
        });

        // 3. Кнопка "Назад" всередині меню
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: { name: "studio_logo_back", type: "static" },
            field: { name: "Назад", description: "Повернутися до налаштувань інтерфейсу" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create("interface");
                });
            }
        });

        // 4. Параметр: Підложка (Background)
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: "studio_logo_bg",
                type: "trigger",
                default: true
            },
            field: { name: "Підложка", description: "Напівпрозорий фон за логотипом" },
            onChange: function (value) {
                Lampa.Storage.set("studio_logo_bg", value);
                updateStyles(); // Оновлюємо стилі миттєво
            }
        });

        // 5. Параметр: Розмір лого (Size)
        var sizes = {};
        var sizeSteps = ['0.5', '0.7', '0.9', '1.1', '1.3', '1.5', '1.7', '1.9', '2.1', '2.5'];
        sizeSteps.forEach(function(s) {
            sizes[s] = s + 'em';
        });

        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: "studio_logo_size",
                type: "select",
                values: sizes,
                default: '1.3'
            },
            field: { name: "Розмір лого", description: "Висота логотипа відносно тексту" },
            onChange: function (value) {
                Lampa.Storage.set("studio_logo_size", value);
                updateStyles(); // Оновлюємо стилі миттєво
            }
        });
    }

    // --- ГЕНЕРАЦІЯ СТИЛІВ ---
    function updateStyles() {
        var showBg = Lampa.Storage.get("studio_logo_bg", true);
        var sizeEm = Lampa.Storage.get("studio_logo_size", '1.3');

        // Логіка фону
        var bgCSS = showBg 
            ? 'background: rgba(255,255,255,0.08) !important; border: 1px solid transparent;' 
            : 'background: transparent !important; border: none !important; padding: 0 !important;';
        
        // Логіка відступів (Padding та Margin)
        // Якщо фон увімкнено: стандартний padding, без додаткових відступів знизу.
        // Якщо фон вимкнено: прибираємо padding, додаємо відступ справа (для розділення) і ЗНИЗУ 0.2em.
        var layoutCSS = showBg 
            ? 'padding: 5px 12px !important;' 
            : 'padding: 5px 0px !important; margin-right: 20px !important; margin-bottom: 0.2em !important;';

        var css = 
            '.rate--studio.studio-logo { align-items: center; vertical-align: middle; ' + layoutCSS + bgCSS + ' border-radius: 8px; transition: all 0.2s ease; height: auto; cursor: pointer; }' +
            '.rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; border: 1px solid #fff; transform: scale(1.05); }' +
            // Розмір логотипа
            '.rate--studio.studio-logo img { height: ' + sizeEm + 'em !important; max-width: 200px; width: auto; object-fit: contain; filter: brightness(1) invert(0); transition: filter 0.3s ease; }' +
            '.studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; white-space: nowrap; }';

        var styleEl = $('#' + STYLE_ID);
        if (styleEl.length) {
            styleEl.html(css);
        } else {
            $('body').append('<style id="' + STYLE_ID + '">' + css + '</style>');
        }
    }

    // --- ЛОГІКА ОБРОБКИ ЛОГОТИПІВ ---

    function analyzeLogoColor(img) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;

            if (canvas.width === 0 || canvas.height === 0) return;

            ctx.drawImage(img, 0, 0);

            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var data = imageData.data;
            var r, g, b, alpha, brightness;
            var darkPixels = 0;
            var totalPixels = 0;

            for (var i = 0; i < data.length; i += 4) {
                r = data[i];
                g = data[i + 1];
                b = data[i + 2];
                alpha = data[i + 3];

                if (alpha < 10) continue;

                totalPixels++;

                brightness = (r * 299 + g * 587 + b * 114) / 1000;

                if (brightness < 50) {
                    darkPixels++;
                }
            }

            if (totalPixels > 0) {
                var darkRatio = (darkPixels / totalPixels) * 100;
                // Поріг 65% для інверсії
                if (darkRatio > 65) {
                    img.style.filter = 'brightness(0) invert(1)';
                }
            }
        } catch (e) {
            console.error('StudioLogo: Error analyzing image color', e);
        }
    }

    function getStudioLogosHtml(movie) {
        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path
                    ? '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '" crossorigin="anonymous" class="studio-img-check">'
                    : '<span class="studio-logo-text">' + co.name + '</span>';

                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '" style="display: inline-flex; margin-right: 15px; vertical-align: middle;">' +
                    content +
                    '</div>';
            });
        }
        return html;
    }

    function renderCombinedTitle(title, movie) {
        var render = Lampa.Activity.active().activity.render();
        if (!render) return;

        $(".plugin-uk-title-combined", render).remove();

        var logosHtml = getStudioLogosHtml(movie);
        if (!logosHtml) return;

        var html = '<div class="plugin-uk-title-combined" style="margin-top: 10px; margin-bottom: 5px; text-align: left; width: 100%; display: flex; flex-direction: column; align-items: flex-start;">' +
                '<div class="studio-logos-container" style="display: flex; align-items: center; flex-wrap: wrap;">' + logosHtml + '</div>' +
            '</div>';

        var hybridTitle = $(".plugin-hybrid-title", render);
        var target;

        if (hybridTitle.length) {
            target = hybridTitle;
        } else {
            target = $(".full-start-new__title", render);
            if (!target.length) target = $(".full-start__title", render);
        }
        
        target.after(html);

        $('.studio-img-check', render).each(function() {
            var img = this;
            var runAnalysis = function() {
                analyzeLogoColor(img);
            };

            if (img.complete) {
                runAnalysis();
            } else {
                img.onload = runAnalysis;
                img.onerror = function() {
                    $(this).css('display', 'block'); 
                };
            }
        });

        $('.rate--studio', render).on('hover:enter', function () {
            var id = $(this).data('id');
            var name = $(this).data('name');
            if (id) {
                Lampa.Activity.push({
                    url: 'movie',
                    id: id,
                    title: name,
                    component: 'company',
                    source: 'tmdb',
                    page: 1
                });
            }
        });

        setTimeout(function() {
            var current = Lampa.Controller.enabled();
            if (current && (current.name === 'full_start' || current.name === 'full_descr')) {
                current.collection = render.find('.selector');
            }
        }, 100);
    }

    function startPlugin() {
        // Ініціалізуємо налаштування та стилі
        initSettings();
        updateStyles();

        Lampa.Listener.follow('full', function (e) {
            if ((e.type === 'complite' || e.type === 'complete') && e.data.movie) {
                var card = e.data.movie;
                var cachedData = runtimeLogoCache[card.id];

                if (cachedData) {
                    renderCombinedTitle(cachedData.uk_title, cachedData.full_data);
                } else {
                    var type = card.first_air_date ? "tv" : "movie";
                    Lampa.Api.sources.tmdb.get(type + "/" + card.id + "?append_to_response=translations", {}, function (data) {
                        var tr = data.translations ? data.translations.translations : [];
                        var found = tr.find(function (t) {
                            return t.iso_3166_1 === "UA" || t.iso_639_1 === "uk";
                        });

                        var uk = found ? (found.data.title || found.data.name) : (card.title || card.name);
                        
                        runtimeLogoCache[card.id] = { 
                            uk_title: uk, 
                            full_data: data 
                        };

                        renderCombinedTitle(uk, data);
                    }, function() {
                        renderCombinedTitle(card.title || card.name, card);
                    });
                }
            }
        });
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") startPlugin(); });
})();
