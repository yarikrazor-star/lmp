(function () {
    "use strict";

    var DISABLE_CACHE = false;

    function startPlugin() {
        var TARGET_WIDTH = "7em";
        var PADDING_TOP_EM = 0;
        var PADDING_BOTTOM_EM = 0;

        window.logoplugin_smart = true;

        // Функція аналізу яскравості для перетворення чорного лого в біле
        function analyzeAndInvert(img) {
            try {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                
                if (canvas.width === 0 || canvas.height === 0) return;
                
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                var data = imageData.data;
                var darkPixels = 0;
                var totalPixels = 0;

                for (var i = 0; i < data.length; i += 4) {
                    var alpha = data[i + 3];
                    if (alpha < 10) continue; // Ігноруємо прозорі пікселі

                    totalPixels++;
                    var r = data[i];
                    var g = data[i + 1];
                    var b = data[i + 2];
                    
                    // Формула яскравості (Luminance)
                    var brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    if (brightness < 120) darkPixels++; // Поріг темного пікселя
                }

                // Якщо 80% і більше пікселів темні — інвертуємо в білий
                if (totalPixels > 0 && (darkPixels / totalPixels) >= 0.85) {
                    img.style.filter += " brightness(0) invert(1)";
                }
            } catch (e) {
                console.log('LogoPlugin: CORS error or canvas failed', e);
            }
        }

        function getCacheKey(type, id, lang) {
            return "logo_cache_v2_" + type + "_" + id + "_" + lang;
        }

        function applyFinalStyles(img, container, text_height) {
            if (container) {
                container.style.height = "";
                container.style.margin = "0";
                container.style.padding = "0";
                container.style.overflow = "";
                container.style.display = "";
                container.style.transition = "none";
                container.style.boxSizing = "";
                container.style.opacity = "1";
                
                // Вирівнювання контейнера для вертикального екрана
                if (window.innerHeight > window.innerWidth) {
                    container.style.textAlign = "center";
                } else {
                    container.style.textAlign = "left";
                }
            }

            img.style.marginTop = "0";
            img.style.marginBottom = "0";
            img.style.paddingTop = PADDING_TOP_EM + "em";
            img.style.paddingBottom = PADDING_BOTTOM_EM + "em";
            
            var use_text_height = Lampa.Storage.get("logo_use_text_height", false);

            if (use_text_height && text_height) {
                img.style.height = text_height + "px";
                img.style.width = "auto";
                img.style.maxWidth = "100%";
                img.style.maxHeight = "none";
            } else {
                if (window.innerWidth < 768) {
                    img.style.width = "100%";
                    img.style.height = "auto";
                    img.style.maxWidth = "100%";
                    img.style.maxHeight = "none";
                } else {
                    img.style.width = TARGET_WIDTH;
                    img.style.height = "auto";
                    img.style.maxHeight = "none";
                    img.style.maxWidth = "100%";
                }
            }

            img.style.boxSizing = "border-box";
            img.style.display = "block";
            img.style.objectFit = "contain";
            
            // ЛОГІКА ВИРІВНЮВАННЯ ЛОГОТИПА
            if (window.innerHeight > window.innerWidth) {
                img.style.objectPosition = "center";
                img.style.marginLeft = "auto";
                img.style.marginRight = "auto";
            } else {
                img.style.objectPosition = "left bottom";
                img.style.marginLeft = "0";
                img.style.marginRight = "0";
            }

            img.style.opacity = "1";
            img.style.transition = "none";
            
            // Тінь + Насиченість
            var saturation = Lampa.Storage.get("logo_saturation", "1");
            img.style.filter = "drop-shadow(3px 3px 3px rgba(0, 0, 0, 0.5)) saturate(" + saturation + ")";
        }

        Lampa.Listener.follow("full", function (e) {
            if (e.type == "complite") {
                var data = e.data.movie;
                var type = data.name ? "tv" : "movie";

                var title_elem = e.object.activity.render().find(".full-start-new__title");
                var head_elem = e.object.activity.render().find(".full-start-new__head");
                var details_elem = e.object.activity.render().find(".full-start-new__details");
                var dom_title = title_elem[0];

                // Автоматичне вирівнювання тексту назви, якщо лого ще не завантажилось або вимкнено
                if (window.innerHeight > window.innerWidth) {
                    title_elem.css("text-align", "center");
                } else {
                    title_elem.css("text-align", "left");
                }

                if (Lampa.Storage.get("logo_glav") == "1") return;

                var user_lang = Lampa.Storage.get("logo_lang", "");
                var target_lang = user_lang ? user_lang : Lampa.Storage.get("language");
                var size = Lampa.Storage.get("logo_size", "original");

                var cache_key = getCacheKey(type, data.id, target_lang);

                // Переміщення інформації (дати, рейтингу) в деталі
                if (head_elem.length && details_elem.length && details_elem.find(".logo-moved-head").length === 0) {
                    var content = head_elem.html();
                    if (content) {
                        head_elem.hide();
                        if (details_elem.children().length > 0) details_elem.append('<span class="full-start-new__split logo-moved-separator">●</span>');
                        details_elem.append('<span class="logo-moved-head">' + content + "</span>");
                    }
                }

                function startLogoAnimation(img_url, save_to_cache) {
                    if (save_to_cache && !DISABLE_CACHE) Lampa.Storage.set(cache_key, img_url);
                    
                    var img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = img_url;

                    var start_text_height = dom_title ? dom_title.getBoundingClientRect().height : 0;
                    
                    img.onload = function () {
                        applyFinalStyles(img, dom_title, start_text_height);
                        analyzeAndInvert(img); 
                        title_elem.empty().append(img);
                        title_elem.css({ opacity: "1", transition: "none" });
                    };
                    img.onerror = function () {
                        if (!DISABLE_CACHE) Lampa.Storage.set(cache_key, "none");
                        title_elem.css({ opacity: "1" });
                    };
                }

                var cached_url = Lampa.Storage.get(cache_key);
                if (!DISABLE_CACHE && cached_url && cached_url !== "none") {
                    startLogoAnimation(cached_url, false);
                    return;
                }

                if (data.id) {
                    var url = Lampa.TMDB.api(type + "/" + data.id + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=" + target_lang + ",en,null");
                    $.get(url, function (data_api) {
                        var final_logo = null;
                        if (data_api.logos && data_api.logos.length > 0) {
                            var found = data_api.logos.find(function(l) { return l.iso_639_1 == target_lang; }) || 
                                        data_api.logos.find(function(l) { return l.iso_639_1 == "en"; });
                            if (found) final_logo = found.file_path;
                        }

                        if (final_logo) {
                            var img_url = Lampa.TMDB.image("/t/p/" + size + final_logo.replace(".svg", ".png"));
                            startLogoAnimation(img_url, true);
                        } else {
                            if (!DISABLE_CACHE) Lampa.Storage.set(cache_key, "none");
                        }
                    });
                }
            }
        });
    }

    // --- НАЛАШТУВАННЯ ---
    var LOGO_COMPONENT = "logo_smart_settings";
    
    Lampa.Settings.listener.follow("open", function (e) {
        if (e.name == "main") {
            var render = Lampa.Settings.main().render();
            if (render.find('[data-component="' + LOGO_COMPONENT + '"]').length == 0) {
                Lampa.SettingsApi.addComponent({ component: LOGO_COMPONENT, name: "Лого (Smart)" });
            }
            Lampa.Settings.main().update();
            render.find('[data-component="' + LOGO_COMPONENT + '"]').addClass("hide");
        }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: { name: "logo_settings_entry", type: "static" },
        field: { name: "Лого (Smart)", description: "Налаштування логотипів з авто-білим кольором" },
        onRender: function (item) {
            item.on("hover:enter", function () {
                Lampa.Settings.create(LOGO_COMPONENT);
                Lampa.Controller.enabled().controller.back = function () { Lampa.Settings.create("interface"); };
            });
        }
    });

    Lampa.SettingsApi.addParam({
        component: LOGO_COMPONENT,
        param: { name: "logo_back", type: "static" },
        field: { name: "Назад", description: "Повернутися до налаштувань" },
        onRender: function (item) {
            item.on("hover:enter", function () { Lampa.Settings.create("interface"); });
        }
    });

    Lampa.SettingsApi.addParam({
        component: LOGO_COMPONENT,
        param: { name: "logo_glav", type: "select", values: { 1: "Показати назву", 0: "Показати лого" }, default: "0" },
        field: { name: "Логотипи замість назв", description: "Замінює текстову назву графічним логотипом" }
    });

    Lampa.SettingsApi.addParam({
        component: LOGO_COMPONENT,
        param: {
            name: "logo_lang",
            type: "select",
            values: { "": "Як у Lampa", en: "English", uk: "Українська" },
            default: ""
        },
        field: { name: "Мова логотипа", description: "Пріорітет мови" }
    });

    Lampa.SettingsApi.addParam({
        component: LOGO_COMPONENT,
        param: { 
            name: "logo_size", 
            type: "select", 
            values: { w300: "w300", w500: "w500", w780: "w780", original: "Оригінал" }, 
            default: "original" 
        },
        field: { name: "Якість (Розмір)", description: "Роздільна здатність файлу зображення" }
    });

    // Пункт "Насиченість"
    Lampa.SettingsApi.addParam({
        component: LOGO_COMPONENT,
        param: { 
            name: "logo_saturation", 
            type: "select", 
            values: { "1": "100%", "0.75": "75%", "0.5": "50%", "0.25": "25%", "0": "0% (Ч/Б)" }, 
            default: "1" 
        },
        field: { name: "Насиченість", description: "Рівень насиченості кольорів логотипа" }
    });

    Lampa.SettingsApi.addParam({
        component: LOGO_COMPONENT,
        param: { name: "logo_use_text_height", type: "trigger", default: false },
        field: { name: "Лого по висоті тексту", description: "Масштабувати логотип під розмір шрифту" }
    });

    Lampa.SettingsApi.addParam({
        component: LOGO_COMPONENT,
        param: { name: "logo_clear_cache", type: "button" },
        field: { name: "Скинути кеш лого", description: "Очистити посилання та завантажити заново" },
        onChange: function () {
            Lampa.Select.show({
                title: "Скинути кеш?",
                items: [{ title: "Так", confirm: true }, { title: "Ні" }],
                onSelect: function (a) {
                    if (a.confirm) {
                        for (var i = 0; i < localStorage.length; i++) {
                            var key = localStorage.key(i);
                            if (key && key.indexOf("logo_cache_v2_") !== -1) {
                                localStorage.removeItem(key);
                                i--;
                            }
                        }
                        window.location.reload();
                    }
                }
            });
        }
    });

    if (!window.logoplugin_smart) startPlugin();
})();
