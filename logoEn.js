(function () {
	"use strict";

	var DISABLE_CACHE = false;

	function startPlugin() {
		// Змінено на 0 для миттєвого відображення
		var SAFE_DELAY = 0;
		var FADE_OUT_TEXT = 0;
		var MORPH_HEIGHT = 0;
		var FADE_IN_IMG = 0;

		var TARGET_WIDTH = "7em";

		var PADDING_TOP_EM = 0;
		var PADDING_BOTTOM_EM = 0.1;

		window.logoplugin = true;

		// Функції анімації залишені для сумісності, але не використовуються
		function animateHeight(element, start, end, duration, callback) {
			if (callback) callback(); // Миттєве виконання
		}

		function animateOpacity(element, start, end, duration, callback) {
			if (callback) callback(); // Миттєве виконання
		}

		function getCacheKey(type, id, lang) {
			return "logo_cache_width_based_v1_" + type + "_" + id + "_" + lang;
		}

		function applyFinalStyles(img, container, has_tagline, text_height) {
			if (container) {
				container.style.height = "";
				container.style.overflow = "";
				container.style.display = "";
				container.style.transition = "none";
				container.style.boxSizing = "";
				container.style.opacity = "1";
			}

			img.style.marginTop = "0";
			img.style.marginLeft = "0";

			img.style.paddingTop = PADDING_TOP_EM + "em";

			var pb = PADDING_BOTTOM_EM;
			if (window.innerWidth < 768 && has_tagline) pb = 0.2;
			img.style.paddingBottom = pb + "em";

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
		}

		Lampa.Listener.follow("full", function (e) {
			if (e.type == "complite" && Lampa.Storage.get("logo_glav") != "1") {
				var data = e.data.movie;
				var type = data.name ? "tv" : "movie";

				var title_elem = e.object.activity
					.render()
					.find(".full-start-new__title");
				var head_elem = e.object.activity
					.render()
					.find(".full-start-new__head");
				var details_elem = e.object.activity
					.render()
					.find(".full-start-new__details");
				var tagline_elem = e.object.activity
					.render()
					.find(".full-start-new__tagline");
				var has_tagline =
					tagline_elem.length > 0 && tagline_elem.text().trim() !== "";
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

					var new_item = $(
						'<span class="logo-moved-head">' + content + "</span>"
					);
					var separator = $(
						'<span class="full-start-new__split logo-moved-separator">●</span>'
					);

					head_elem.css({ opacity: "0", transition: "none" });
					if (details_elem.children().length > 0)
						details_elem.append(separator);
					details_elem.append(new_item);
				}

				moveHeadToDetails();

				function startLogoAnimation(img_url, save_to_cache) {
					if (save_to_cache && !DISABLE_CACHE)
						Lampa.Storage.set(cache_key, img_url);

					var img = new Image();
					img.src = img_url;

					var start_text_height = 0;
					if (dom_title)
						start_text_height = dom_title.getBoundingClientRect().height;

					// Відразу готуємо стиль, щоб уникнути стрибків
					applyFinalStyles(img, null, has_tagline, start_text_height);
					
					// Цей блок змінено для миттєвого відображення без анімації
					img.onload = function () {
						if (dom_title)
							start_text_height = dom_title.getBoundingClientRect().height;

						// Миттєва заміна контенту
						title_elem.empty();
						title_elem.append(img);
						title_elem.css({ opacity: "1", transition: "none" });

						if (dom_title) {
							dom_title.style.height = "auto";
							dom_title.style.transition = "none";
							dom_title.style.display = "block";
						}

						// Фінальне застосування стилів
						applyFinalStyles(
							img,
							dom_title,
							has_tagline,
							start_text_height
						);
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
						var start_text_height = 0;
						if (dom_title)
							start_text_height = dom_title.getBoundingClientRect().height;
						applyFinalStyles(img_cache, null, has_tagline, start_text_height);
						title_elem.empty().append(img_cache);
						title_elem.css({ opacity: "1", transition: "none" });
						return;
					} else {
						startLogoAnimation(cached_url, false);
						return;
					}
				}

				title_elem.css({ opacity: "1", transition: "none" });

				if (data.id != "") {
					var start_text_height = 0;
					requestAnimationFrame(function () {
						if (dom_title)
							start_text_height = dom_title.getBoundingClientRect().height;
					});

					var url = Lampa.TMDB.api(
						type +
							"/" +
							data.id +
							"/images?api_key=" +
							Lampa.TMDB.key() +
							"&include_image_language=" +
							target_lang +
							",en,null"
					);

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
							if (!final_logo) final_logo = data_api.logos[0].file_path;
						}

						if (final_logo) {
							var img_url = Lampa.TMDB.image(
								"/t/p/" + size + final_logo.replace(".svg", ".png")
							);
							startLogoAnimation(img_url, true);
						} else {
							if (!DISABLE_CACHE) Lampa.Storage.set(cache_key, "none");
						}
					}).fail(function () {});
				}
			}
		});
	}

	var LOGO_COMPONENT = "logo_settings_nested";

	Lampa.Settings.listener.follow("open", function (e) {
		if (e.name == "main") {
			var render = Lampa.Settings.main().render();
			if (
				render.find('[data-component="' + LOGO_COMPONENT + '"]').length == 0
			) {
				Lampa.SettingsApi.addComponent({
					component: LOGO_COMPONENT,
					name: "Логотипы"
				});
			}
			Lampa.Settings.main().update();
			render.find('[data-component="' + LOGO_COMPONENT + '"]').addClass("hide");
		}
	});

	Lampa.SettingsApi.addParam({
		component: "interface",
		param: { name: "logo_settings_entry", type: "static" },
		field: { name: "Логотипы", description: "Настройки отображения логотипов" },
		onRender: function (item) {
			item.on("hover:enter", function () {
				Lampa.Settings.create(LOGO_COMPONENT);
				Lampa.Controller.enabled().controller.back = function () {
					Lampa.Settings.create("interface");
				};
			});
		}
	});

	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: { name: "logo_back_to_int", type: "static" },
		field: { name: "Назад", description: "Вернуться в настройки интерфейса" },
		onRender: function (item) {
			item.on("hover:enter", function () {
				Lampa.Settings.create("interface");
			});
		}
	});

	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: {
			name: "logo_glav",
			type: "select",
			values: { 1: "Скрыть", 0: "Отображать" },
			default: "0"
		},
		field: {
			name: "Логотипы вместо названий",
			description: "Отображает логотипы фильмов вместо текста"
		}
	});
	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: {
			name: "logo_lang",
			type: "select",
			values: {
				"": "Как в Lampa",
				ru: "Русский",
				en: "English",
				uk: "Українська",
				be: "Беларуская",
				kz: "Қазақша",
				pt: "Português",
				es: "Español",
				fr: "Français",
				de: "Deutsch",
				it: "Italiano"
			},
			default: ""
		},
		field: {
			name: "Язык логотипа",
			description: "Приоритетный язык для поиска логотипа"
		}
	});
	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: {
			name: "logo_size",
			type: "select",
			values: {
				w300: "w300",
				w500: "w500",
				w780: "w780",
				original: "Оригинал"
			},
			default: "original"
		},
		field: {
			name: "Размер логотипа",
			description: "Разрешение загружаемого изображения"
		}
	});
	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: {
			name: "logo_animation_type",
			type: "select",
			values: { js: "JavaScript", css: "CSS" },
			default: "css"
		},
		field: {
			name: "Тип анимации логотипов",
			description: "Способ анимации логотипов"
		}
	});
	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: { name: "logo_use_text_height", type: "trigger", default: false },
		field: {
			name: "Логотип по высоте текста",
			description: "Размер логотипа равен высоте текста"
		}
	});

	Lampa.SettingsApi.addParam({
		component: LOGO_COMPONENT,
		param: { name: "logo_clear_cache", type: "button" },
		field: {
			name: "Сбросить кеш логотипов",
			description: "Нажмите для очистки кеша изображений"
		},
		onChange: function () {
			Lampa.Select.show({
				title: "Сбросить кеш?",
				items: [{ title: "Да", confirm: true }, { title: "Нет" }],
				onSelect: function (a) {
					if (a.confirm) {
						var keys = [];
						for (var i = 0; i < localStorage.length; i++) {
							var key = localStorage.key(i);
							if (key.indexOf("logo_cache_width_based_v1_") !== -1) {
								keys.push(key);
							}
						}
						keys.forEach(function (key) {
							localStorage.removeItem(key);
						});
						window.location.reload();
					} else {
						Lampa.Controller.toggle("settings_component");
					}
				},
				onBack: function () {
					Lampa.Controller.toggle("settings_component");
				}
			});
		}
	});

	if (!window.logoplugin) startPlugin();
})();

