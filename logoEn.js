(function () {
	"use strict";

	var DISABLE_CACHE = false;

	function startPlugin() {
		var SAFE_DELAY = 0;
		var FADE_OUT_TEXT = 0;
		var MORPH_HEIGHT = 0;
		var FADE_IN_IMG = 0;

		var TARGET_WIDTH = "7em";

		var PADDING_TOP_EM = 0;
		var PADDING_BOTTOM_EM = 0;

		window.logoplugin = true;

		function animateHeight(element, start, end, duration, callback) {
			if (callback) callback();
		}

		function animateOpacity(element, start, end, duration, callback) {
			if (callback) callback();
		}

		function getCacheKey(type, id, lang) {
			return "logo_cache_width_based_v1_" + type + "_" + id + "_" + lang;
		}

		function applyFinalStyles(img, container, has_tagline, text_height) {
			if (container) {
				container.style.height = "";
				container.style.margin = "0";
				container.style.padding = "0";
				container.style.overflow = "";
				container.style.display = "";
				container.style.transition = "none";
				container.style.boxSizing = "";
				container.style.opacity = "1";
			}

			img.style.marginTop = "0";
			img.style.marginLeft = "0";
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
			img.style.objectPosition = "left bottom";
			img.style.opacity = "1";
			img.style.transition = "none";
			
			// Змінено: сіра тінь (rgba(0,0,0,0.5)), зміщення 3px вправо та 3px вниз, розмиття 3px
			img.style.filter = "drop-shadow(3px 3px 3px rgba(0, 0, 0, 0.5))";
		}

		Lampa.Listener.follow("full", function (e) {
			if (e.type == "complite" && Lampa.Storage.get("logo_glav") != "1") {
				var data = e.data.movie;
				var type = data.name ? "tv" : "movie";

				var title_elem = e.object.activity.render().find(".full-start-new__title");
				var head_elem = e.object.activity.render().find(".full-start-new__head");
				var details_elem = e.object.activity.render().find(".full-start-new__details");
				var tagline_elem = e.object.activity.render().find(".full-start-new__tagline");
				var has_tagline = tagline_elem.length > 0 && tagline_elem.text().trim() !== "";
				var dom_title = title_elem[0];

				var user_lang = Lampa.Storage.get("logo_lang", "");
				var target_lang = user_lang ? user_lang : Lampa.Storage.get("language");
				var size = Lampa.Storage.get("logo_size", "original");

				var cache_key = getCacheKey(type, data.id, target_lang);

				function moveHeadToDetails() {
					if (!head_elem.length || !details_elem.length) return;
					if (details_elem.find(".logo-moved-head").length > 0) return;

					var content = head_elem.html();
					if (!content) return;
					var new_item = $('<span class="logo-moved-head">' + content + "</span>");
					var separator = $('<span class="full-start-new__split logo-moved-separator">●</span>');
					
					head_elem.css({ display: "none" });
					if (details_elem.children().length > 0) details_elem.append(separator);
					details_elem.append(new_item);
				}

				moveHeadToDetails();

				function startLogoAnimation(img_url, save_to_cache) {
					if (save_to_cache && !DISABLE_CACHE) Lampa.Storage.set(cache_key, img_url);
					var img = new Image();
					img.src = img_url;
					var start_text_height = 0;
					if (dom_title) start_text_height = dom_title.getBoundingClientRect().height;
					applyFinalStyles(img, null, has_tagline, start_text_height);
					
					img.onload = function () {
						title_elem.empty().append(img);
						title_elem.css({ opacity: "1", transition: "none", margin: "0", padding: "0" });
						applyFinalStyles(img, dom_title, has_tagline, start_text_height);
					};
					img.onerror = function () {
						if (!DISABLE_CACHE) Lampa.Storage.set(cache_key, "none");
						title_elem.css({ opacity: "1", transition: "none" });
					};
				}

				var cached_url = Lampa.Storage.get(cache_key);
				if (!DISABLE_CACHE && cached_url && cached_url !== "none") {
					var img_cache = new Image();
					img_cache.src = cached_url;
					if (img_cache.complete) {
						applyFinalStyles(img_cache, null, has_tagline, 0);
						title_elem.empty().append(img_cache).css({ opacity: "1", transition: "none" });
						return;
					} else {
						startLogoAnimation(cached_url, false);
						return;
					}
				}

				if (data.id != "") {
					var url = Lampa.TMDB.api(type + "/" + data.id + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=" + target_lang + ",en,null");
					$.get(url, function (data_api) {
						var final_logo = null;
						if (data_api.logos && data_api.logos.length > 0) {
							for (var i = 0; i < data_api.logos.length; i++) {
								if (data_api.logos[i].iso_639_1 == target_lang) {
									final_logo = data_api.logos[i].file_path;
									break;
								}
							}
							if (!final_logo) {
								for (var j = 0; j < data_api.logos.length; j++) {
									if (data_api.logos[j].iso_639_1 == "en") {
										final_logo = data_api.logos[j].file_path;
										break;
									}
								}
							}
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

	var LOGO_COMPONENT = "logo_settings_nested";
	
	Lampa.Settings.listener.follow("open", function (e) {
		if (e.name == "main") {
			var render = Lampa.Settings.main().render();
			if (render.find('[data-component="' + LOGO_COMPONENT + '"]').length == 0) {
				Lampa.SettingsApi.addComponent({ component: LOGO_COMPONENT, name: "Лого" });
			}
			Lampa.Settings.main().update();
			render.find('[data-component="' + LOGO_COMPONENT + '"]').addClass("hide");
		}
	});

	Lampa.SettingsApi.addParam({
		component: "interface",
		param: { name: "logo_settings_entry", type: "static" },
		field: { name: "Лого", description: "Настройки лого" },
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
		field: { name: "Назад", description: "Назад" },
		onRender: function (item) {
			item.on("hover:enter", function () { Lampa.Settings.create("interface"); });
		}
	});

	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: { name: "logo_glav", type: "select", values: { 1: "Показати", 0: "Приховати" }, default: "0" },
		field: { name: "Логотипи замість назв", description: "Показує лого замість назви" }
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
		param: { name: "logo_size", type: "select", values: { w300: "w300", w500: "w500", w780: "w780", original: "Оригінал" }, default: "original" },
		field: { name: "Розмір лого", description: "Розширення лого" }
	});

	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: { name: "logo_use_text_height", type: "trigger", default: false },
		field: { name: "Лого по висоті тексту", description: "Розмір рівний висоті текста" }
	});

	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: { name: "logo_clear_cache", type: "button" },
		field: { name: "Скинути кеш лого", description: "Натисніть для очистки" },
		onChange: function () {
			Lampa.Select.show({
				title: "Скинути лого?",
				items: [{ title: "Так", confirm: true }, { title: "Ні" }],
				onSelect: function (a) {
					if (a.confirm) {
						for (var i = 0; i < localStorage.length; i++) {
							var key = localStorage.key(i);
							if (key && key.indexOf("logo_cache_width_based_v1_") !== -1) {
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

	if (!window.logoplugin) startPlugin();
})();
