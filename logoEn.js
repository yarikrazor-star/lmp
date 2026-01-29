(function () {
    "use strict";

    var DISABLE_CACHE = false;

    function startPlugin() {
        // Перевірка чи доступне ядро Lampa
        if (typeof Lampa === 'undefined') {
            console.log('Logo Plugin: Lampa is not defined, retrying...');
            setTimeout(startPlugin, 500);
            return;
        }

        var TARGET_WIDTH = "7em";
        var PADDING_TOP_EM = 0;
        var PADDING_BOTTOM_EM = 0.2;

        window.logoplugin = true;

        function getCacheKey(type, id) {
            // Ключ тепер фіксований під EN/Original та w500
            return "logo_cache_w500_en_orig_v2_" + type + "_" + id;
        }

        function applyFinalStyles(img, container, has_tagline, text_height) {
            if (container) {
                container.style.height = "";
                container.style.overflow = "";
                container.style.display = "";
                container.style.transition = "none";
            }

            img.style.marginTop = "0";
            img.style.marginLeft = "0";
            img.style.paddingTop = PADDING_TOP_EM + "em";

            var pb = PADDING_BOTTOM_EM;
            if (window.innerWidth < 768 && has_tagline) pb = 0.5;
            img.style.paddingBottom = pb + "em";

            var custom_h = Lampa.Storage.get("logo_custom_height", "0");
            var use_text_height = Lampa.Storage.get("logo_use_text_height", false);
            var val_h = parseInt(custom_h);

            img.style.maxWidth = "600px";
            
            if (val_h > 0) {
                img.style.height = val_h + "px";
                img.style.width = "auto";
            } else if (use_text_height && text_height) {
                img.style.height = text_height + "px";
                img.style.width = "auto";
            } else {
                if (window.innerWidth < 768) {
                    img.style.width = "100%";
                    img.style.height = "auto";
                } else {
                    img.style.width = TARGET_WIDTH;
                    img.style.height = "auto";
                }
            }

            img.style.maxHeight = "none";
            img.style.boxSizing = "border-box";
            img.style.display = "block";
            img.style.objectFit = "contain";
            img.style.objectPosition = "left bottom";
            img.style.opacity = "1";
        }

        Lampa.Listener.follow("full", function (e) {
            if (e.type == "complite" && Lampa.Storage.get("logo_glav") != "1") {
                var data = e.data.movie;
                var type = data.name ? "tv" : "movie";

                var render = e.object.activity.render();
                var title_elem = render.find(".full-start-new__title");
                var head_elem = render.find(".full-start-new__head");
                var details_elem = render.find(".full-start-new__details");
                
                if (!title_elem.length) return;

                var dom_title = title_elem[0];
                var size = "w500"; 
                var cache_key = getCacheKey(type, data.id);

                if (head_elem.length && details_elem.length && !details_elem.find(".logo-moved-head").length) {
                    var content = head_elem.html();
                    if (content) {
                        details_elem.append($('<span class="full-start-new__split logo-moved-separator">●</span>'));
                        details_elem.append($('<span class="logo-moved-head">' + content + "</span>"));
                        head_elem.css({ display: "none" });
                    }
                }

                function displayLogo(img_url, save_to_cache) {
                    if (save_to_cache && !DISABLE_CACHE) Lampa.Storage.set(cache_key, img_url);
                    
                    var img = new Image();
                    img.onload = function() {
                        var sth = dom_title ? dom_title.getBoundingClientRect().height : 0;
                        applyFinalStyles(img, null, false, sth);
                        title_elem.empty().append(img);
                    };
                    img.src = img_url;
                }

                var cached_url = Lampa.Storage.get(cache_key);
                if (!DISABLE_CACHE && cached_url && cached_url !== "none") {
                    displayLogo(cached_url, false);
                    return;
                }

                if (data.id) {
                    // Запитуємо англійську та нейтральну (оригінальну) мови
                    var url = Lampa.TMDB.api(type + "/" + data.id + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=en,null");
                    $.get(url, function (data_api) {
                        var final_logo = null;
                        if (data_api.logos && data_api.logos.length > 0) {
                            // 1. Шукаємо англійську
                            // 2. Якщо немає - шукаємо null (оригінал/без мови)
                            // 3. Якщо немає - беремо перший будь-який
                            var found = data_api.logos.find(function(l) { return l.iso_639_1 == "en"; }) ||
                                        data_api.logos.find(function(l) { return l.iso_639_1 == null; }) ||
                                        data_api.logos[0];
                            final_logo = found.file_path;
                        }
                        if (final_logo) {
                            var img_url = Lampa.TMDB.image("/t/p/" + size + final_logo.replace(".svg", ".png"));
                            displayLogo(img_url, true);
                        } else {
                            if (!DISABLE_CACHE) Lampa.Storage.set(cache_key, "none");
                        }
                    }).fail(function() {
                        console.log("Logo Plugin: API request failed");
                    });
                }
            }
        });
    }

    function initSettings() {
        if (typeof Lampa === 'undefined' || !Lampa.SettingsApi) {
            setTimeout(initSettings, 500);
            return;
        }

        var LOGO_COMPONENT = "logo_settings_nested";

        function getHeightValues() {
            var v = { "0": "Вимкнено" };
            for (var i = 40; i <= 250; i += 10) {
                v[i.toString()] = i + "px";
            }
            return v;
        }

        Lampa.Settings.listener.follow("open", function (e) {
            if (e.name == "main") {
                var render = Lampa.Settings.main().render();
                if (!render.find('[data-component="' + LOGO_COMPONENT + '"]').length) {
                    Lampa.SettingsApi.addComponent({ component: LOGO_COMPONENT, name: "Логотипи" });
                }
                Lampa.Settings.main().update();
                render.find('[data-component="' + LOGO_COMPONENT + '"]').addClass("hide");
            }
        });

        Lampa.SettingsApi.addParam({
            component: "interface",
            param: { name: "logo_settings_entry", type: "static" },
            field: { name: "Логотипи", description: "Налаштування відображення логотипів (EN/Original)" },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create(LOGO_COMPONENT);
                    Lampa.Controller.enabled().controller.back = function () { Lampa.Settings.create("interface"); };
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: LOGO_COMPONENT,
            param: { name: "logo_back_to_int", type: "static" },
            field: { name: "Назад", description: "Повернутися до інтерфейсу" },
            onRender: function (item) {
                item.on("hover:enter", function () { Lampa.Settings.create("interface"); });
            }
        });

        Lampa.SettingsApi.addParam({
            component: LOGO_COMPONENT,
            param: {
                name: "logo_custom_height",
                type: "select",
                values: getHeightValues(),
                default: "0"
            },
            field: { name: "Примусова висота", description: "Фіксована висота (макс ширина 600px)" }
        });

        Lampa.SettingsApi.addParam({
            component: LOGO_COMPONENT,
            param: { name: "logo_glav", type: "select", values: { 1: "Вимкнено", 0: "Увімкнено" }, default: "0" },
            field: { name: "Заміна тексту", description: "Замінювати заголовок на логотип" }
        });

        Lampa.SettingsApi.addParam({
            component: LOGO_COMPONENT,
            param: { name: "logo_clear_cache", type: "button" },
            field: { name: "Очистити кеш", description: "Оновити всі логотипи" },
            onChange: function () { 
                for(var k in localStorage) if(k.indexOf('logo_cache')>-1) localStorage.removeItem(k);
                window.location.reload(); 
            }
        });
    }

    if (!window.logoplugin) {
        startPlugin();
        initSettings();
    }
})();