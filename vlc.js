(function () {
    'use strict';

    function startPlugin() {
        window.plugin_vlc_ipad_ready = true;

        // Стан плагіна
        var lastHandledTime = 0;
        var lastHandledUrl = '';
        var savedPlaylist = null;
        var currentData = null;

        /**
         * Очищення тексту від HTML тегів (сумісно з iOS 9)
         */
        function cleanText(str) {
            if (!str) return '';
            return String(str).replace(/<[^>]*>/g, '').trim();
        }

        /**
         * Перетворення URL для TorrServer (&preload -> &play)
         */
        function normalizeStreamUrl(url) {
            if (!url) return '';
            var streamUrl = String(url);
            if (window.Lampa && Lampa.Torserver && typeof Lampa.Torserver.toPlayUrl === 'function') {
                return Lampa.Torserver.toPlayUrl(streamUrl);
            }
            return streamUrl.replace('&preload', '&play');
        }

        /**
         * Отримання посилання на M3U плейлист TorrServer за хешем
         */
        function getTorrServerM3u(data) {
            if (!data || !data.torrent_hash) return null;
            var ip = '';
            if (window.Lampa && Lampa.Torserver && typeof Lampa.Torserver.ip === 'function') {
                ip = Lampa.Torserver.ip();
            } else if (window.Lampa && Lampa.Storage) {
                ip = Lampa.Storage.get('torrserver_url');
            }
            if (!ip) return null;
            if (ip.indexOf('http') !== 0) ip = 'http://' + ip;
            ip = ip.replace(/\/+$/, '');
            return ip + '/playlist.m3u?link=' + encodeURIComponent(data.torrent_hash);
        }

        /**
         * Формування URL для запуску VLC на iOS
         */
        function buildVlcUrl(mediaUrl, subUrl) {
            var scheme = (window.Lampa && Lampa.Storage && Lampa.Storage.field('vlc_ipad_scheme')) || 'vlc-x-callback';
            var encodedMedia = encodeURIComponent(mediaUrl);

            if (scheme === 'vlc') {
                // Прямий протокол vlc://
                return 'vlc://' + mediaUrl;
            } else {
                // Офіційний надійний протокол vlc-x-callback://
                var vlcUrl = 'vlc-x-callback://x-callback-url/stream?url=' + encodedMedia;
                if (subUrl) {
                    vlcUrl += '&sub=' + encodeURIComponent(subUrl);
                }
                return vlcUrl;
            }
        }

        /**
         * Отримання субтитрів з об'єкта даних
         */
        function extractSubtitleUrl(data) {
            if (!data) return '';
            if (data.subtitles && data.subtitles.length) {
                for (var i = 0; i < data.subtitles.length; i++) {
                    if (data.subtitles[i] && data.subtitles[i].url) {
                        return data.subtitles[i].url;
                    }
                }
            }
            return '';
        }

        /**
         * Виклик зовнішнього плеєра VLC
         */
        function launchVlc(mediaUrl, subUrl, title) {
            if (!mediaUrl) {
                if (window.Lampa && Lampa.Noty) {
                    Lampa.Noty.show('Помилка: відсутнє посилання для відтворення');
                }
                return;
            }

            var normalizedUrl = normalizeStreamUrl(mediaUrl);
            var vlcUrl = buildVlcUrl(normalizedUrl, subUrl);

            if (window.Lampa && Lampa.Noty) {
                var displayTitle = title ? cleanText(title) : 'відео';
                Lampa.Noty.show('Відкриваємо у VLC: ' + displayTitle, { time: 4000 });
            }

            // Повідомляємо Lampa про запуск зовнішнього плеєра
            if (window.Lampa && Lampa.Player && Lampa.Player.listener) {
                Lampa.Player.listener.send('external', currentData || {});
            }

            // Запуск протоколу для iOS Safari (викличе системний діалог "Відкрити у VLC?")
            window.location.href = vlcUrl;
        }

        /**
         * Позначка перегляду в історії та таймлайні Lampa
         */
        function markAsWatched(data) {
            if (!data) return;
            var addHistory = !window.Lampa || !Lampa.Storage || Lampa.Storage.field('vlc_ipad_history') !== false;

            if (addHistory) {
                if (data.movie && window.Lampa && Lampa.Favorite) {
                    Lampa.Favorite.add('history', data.movie, 100);
                }
                if (data.timeline && typeof data.timeline.handler === 'function') {
                    data.timeline.handler(100, 100, 100);
                }
            }
        }

        /**
         * Генерація файлу M3U плейлиста для експорту на iPad
         */
        function exportM3uPlaylist(playlist, title) {
            if (!playlist || !playlist.length) return;

            var lines = ['#EXTM3U'];
            for (var i = 0; i < playlist.length; i++) {
                var item = playlist[i];
                if (!item) continue;

                var itemUrl = typeof item.url === 'string' ? item.url : '';
                if (!itemUrl && typeof item.url === 'function') {
                    continue;
                }

                if (itemUrl) {
                    itemUrl = normalizeStreamUrl(itemUrl);
                    var itemTitle = item.title ? cleanText(item.title) : 'Серія ' + (i + 1);
                    lines.push('#EXTINF:-1,' + itemTitle);
                    lines.push(itemUrl);
                }
            }

            var m3uContent = lines.join('\n');
            var safeFileName = (title ? cleanText(title).replace(/[^a-zA-Z0-9А-Яа-яіІїЇєЄґҐ_\-]/g, '_') : 'playlist') + '.m3u';

            try {
                var blob = new Blob([m3uContent], { type: 'application/x-mpegurl;charset=utf-8' });
                var blobUrl = URL.createObjectURL(blob);

                var a = document.createElement('a');
                a.href = blobUrl;
                a.download = safeFileName;
                document.body.appendChild(a);
                a.click();

                setTimeout(function () {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                }, 1000);

                if (window.Lampa && Lampa.Noty) {
                    Lampa.Noty.show('M3U плейлист сформовано. Відкрийте його у VLC.');
                }
            } catch (e) {
                window.location.href = 'data:application/x-mpegurl;charset=utf-8,' + encodeURIComponent(m3uContent);
            }
        }

        /**
         * Відображення діалогового вікна вибору дій з плейлистом
         */
        function showPlaylistMenu(data, playlist) {
            var items = [];
            var mainTitle = data.title ? cleanText(data.title) : 'Відео';
            var currentSub = extractSubtitleUrl(data);
            var torrServerM3u = getTorrServerM3u(data);

            // 1. Грати поточну вибрану серію/відео
            items.push({
                title: '▶ Грати у VLC (обране): ' + mainTitle,
                action: function () {
                    launchVlc(data.url, currentSub, mainTitle);
                }
            });

            // 2. Якщо є прямий M3U від TorrServer для всього торрента
            if (torrServerM3u) {
                items.push({
                    title: '📂 Відкрити весь торрент-плейлист у VLC',
                    action: function () {
                        launchVlc(torrServerM3u, '', 'Весь плейлист: ' + mainTitle);
                    }
                });
            }

            // 3. Додаємо окремі серії з плейлиста, якщо їх декілька
            if (playlist && playlist.length > 1) {
                for (var i = 0; i < playlist.length; i++) {
                    (function (idx) {
                        var ep = playlist[idx];
                        if (!ep) return;
                        var epTitle = ep.title ? cleanText(ep.title) : 'Серія ' + (idx + 1);

                        items.push({
                            title: '🎬 ' + epTitle,
                            action: function () {
                                if (typeof ep.url === 'string') {
                                    launchVlc(ep.url, extractSubtitleUrl(ep) || currentSub, epTitle);
                                } else if (typeof ep.url === 'function') {
                                    if (window.Lampa && Lampa.Noty) {
                                        Lampa.Noty.show('Отримуємо посилання для серії...');
                                    }
                                    ep.url(function () {
                                        if (typeof ep.url === 'string') {
                                            launchVlc(ep.url, extractSubtitleUrl(ep) || currentSub, epTitle);
                                        }
                                    });
                                }
                            }
                        });
                    })(i);
                }

                // 4. Експорт файлу M3U
                items.push({
                    title: '📥 Завантажити M3U файл для VLC',
                    action: function () {
                        exportM3uPlaylist(playlist, mainTitle);
                    }
                });
            }

            // Відображення меню через Lampa.Select або Lampa.Modal
            if (window.Lampa && Lampa.Select) {
                Lampa.Select.show({
                    title: 'VLC Плеєр (iOS 9): ' + mainTitle,
                    items: items,
                    onSelect: function (selected) {
                        if (selected && typeof selected.action === 'function') {
                            selected.action();
                        }
                    },
                    onBack: function () {
                        if (window.Lampa && Lampa.Controller) {
                            Lampa.Controller.toggle('content');
                        }
                    }
                });
            } else {
                launchVlc(data.url, currentSub, mainTitle);
            }
        }

        /**
         * Основний обробник запиту на відтворення
         */
        function handlePlayRequest(data) {
            if (!data || !data.url) return;

            // Дебаунс від повторних спрацьовувань за 1 секунду
            var now = (Date.now ? Date.now() : new Date().getTime());
            if (data.url === lastHandledUrl && (now - lastHandledTime) < 1000) {
                return;
            }
            lastHandledTime = now;
            lastHandledUrl = data.url;
            currentData = data;

            // Позначаємо перегляд
            markAsWatched(data);

            // Збираємо плейлист
            var playlist = (data.playlist && data.playlist.length) ? data.playlist : savedPlaylist;
            var mode = (window.Lampa && Lampa.Storage && Lampa.Storage.field('vlc_ipad_mode')) || 'auto';
            var hasMultiEpisodes = playlist && playlist.length > 1;

            if (mode === 'menu' || (mode === 'ask_series' && hasMultiEpisodes)) {
                showPlaylistMenu(data, playlist);
            } else if (mode === 'torrserver' && data.torrent_hash) {
                var m3uUrl = getTorrServerM3u(data);
                if (m3uUrl) {
                    launchVlc(m3uUrl, '', 'Плейлист ' + (data.title ? cleanText(data.title) : ''));
                } else {
                    launchVlc(data.url, extractSubtitleUrl(data), data.title);
                }
            } else {
                // За замовчуванням: прямий запуск обраного відео у VLC
                launchVlc(data.url, extractSubtitleUrl(data), data.title);
            }
        }

        /**
         * Ініціалізація перехоплення плеєра Lampa
         */
        function initPlayerHook() {
            if (!window.Lampa || !Lampa.Player) return;

            // 1. Слухаємо подію 'create' плеєра та блокуємо вбудований плеєр
            if (Lampa.Player.listener && typeof Lampa.Player.listener.follow === 'function') {
                Lampa.Player.listener.follow('create', function (e) {
                    var enabled = !Lampa.Storage || Lampa.Storage.field('vlc_ipad_enabled') !== false;
                    if (!enabled) return;

                    // Блокуємо запуск внутрішнього плеєра
                    if (e && typeof e.abort === 'function') {
                        e.abort();
                    }

                    if (e && e.data) {
                        handlePlayRequest(e.data);
                    }
                });
            }

            // 2. Зберігаємо посилання на плейлист при його встановленні
            var originalPlaylist = Lampa.Player.playlist;
            Lampa.Player.playlist = function (list) {
                if (list && list.length) {
                    savedPlaylist = list;
                }
                if (typeof originalPlaylist === 'function') {
                    originalPlaylist.apply(this, arguments);
                }
            };

            // 3. Додаткове резервне перехоплення методу Lampa.Player.play
            var originalPlay = Lampa.Player.play;
            Lampa.Player.play = function (data) {
                var enabled = !Lampa.Storage || Lampa.Storage.field('vlc_ipad_enabled') !== false;
                if (enabled && data && data.url) {
                    handlePlayRequest(data);
                    return;
                }

                if (typeof originalPlay === 'function') {
                    originalPlay.apply(this, arguments);
                }
            };
        }

        /**
         * Додавання налаштувань плагіна у загальні налаштування Lampa
         */
        function initSettings() {
            if (!window.Lampa || !Lampa.SettingsApi) return;

            // Локалізація
            if (Lampa.Lang && typeof Lampa.Lang.add === 'function') {
                Lampa.Lang.add({
                    vlc_ipad_title: {
                        uk: 'VLC для iPad (iOS 9)',
                        ru: 'VLC для iPad (iOS 9)',
                        en: 'VLC for iPad (iOS 9)'
                    },
                    vlc_ipad_desc: {
                        uk: 'Перенаправлення відео та плейлиста у зовнішній VLC плеєр замість вбудованого',
                        ru: 'Перенаправление видео и плейлиста во внешний VLC плеер вместо встроенного',
                        en: 'Forward video and playlist to external VLC player instead of built-in'
                    },
                    vlc_ipad_enabled_title: {
                        uk: 'Активувати VLC перехоплення',
                        ru: 'Активировать VLC перехват',
                        en: 'Enable VLC interception'
                    },
                    vlc_ipad_enabled_desc: {
                        uk: 'Ігнорувати системні налаштування плеєра та завжди запускати VLC',
                        ru: 'Игнорировать системные настройки плеера и всегда запускать VLC',
                        en: 'Ignore system player settings and always launch VLC'
                    },
                    vlc_ipad_scheme_title: {
                        uk: 'Схема запуску VLC',
                        ru: 'Схема запуска VLC',
                        en: 'VLC URL Scheme'
                    },
                    vlc_ipad_scheme_desc: {
                        uk: 'Рекомендовано vlc-x-callback для стабільних потоків та субтитрів',
                        ru: 'Рекомендуется vlc-x-callback для стабильных потоков и субтитров',
                        en: 'vlc-x-callback is recommended for reliable streaming and subtitles'
                    },
                    vlc_ipad_mode_title: {
                        uk: 'Режим запуску плейлиста',
                        ru: 'Режим запуска плейлиста',
                        en: 'Playlist launch mode'
                    },
                    vlc_ipad_mode_desc: {
                        uk: 'Що робити при запуску фільму або серіалу',
                        ru: 'Что делать при запуске фильма или сериала',
                        en: 'What to do when launching a movie or series'
                    },
                    vlc_ipad_history_title: {
                        uk: 'Позначати в історії переглядів',
                        ru: 'Отмечать в истории просмотров',
                        en: 'Mark in watch history'
                    }
                });
            }

            var compId = 'vlc_ipad_settings';

            Lampa.SettingsApi.addComponent({
                component: compId,
                name: (Lampa.Lang && Lampa.Lang.translate('vlc_ipad_title')) || 'VLC iPad (iOS 9)',
                icon: '<svg height="44" viewBox="0 0 44 44" width="44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 4L12 36H32L22 4Z" stroke="white" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 26H29" stroke="orange" stroke-width="3"/><path d="M17 18H27" stroke="white" stroke-width="3"/><circle cx="22" cy="22" r="1.5" fill="orange"/><rect x="8" y="36" width="28" height="4" rx="2" fill="orange"/></svg>'
            });

            // Тумблер увімкнення
            Lampa.SettingsApi.addParam({
                component: compId,
                param: {
                    name: 'vlc_ipad_enabled',
                    type: 'trigger',
                    default: true
                },
                field: {
                    name: (Lampa.Lang && Lampa.Lang.translate('vlc_ipad_enabled_title')) || 'Активувати VLC перехоплення',
                    description: (Lampa.Lang && Lampa.Lang.translate('vlc_ipad_enabled_desc')) || 'Ігнорувати плеєр з налаштувань веб версії'
                }
            });

            // Вибір протоколу
            Lampa.SettingsApi.addParam({
                component: compId,
                param: {
                    name: 'vlc_ipad_scheme',
                    type: 'select',
                    values: {
                        'vlc-x-callback': 'vlc-x-callback:// (Рекомендовано)',
                        'vlc': 'vlc:// (Класичний)'
                    },
                    default: 'vlc-x-callback'
                },
                field: {
                    name: (Lampa.Lang && Lampa.Lang.translate('vlc_ipad_scheme_title')) || 'Схема виклику VLC',
                    description: (Lampa.Lang && Lampa.Lang.translate('vlc_ipad_scheme_desc')) || 'Протокол взаємодії з додатком VLC'
                }
            });

            // Поведінка з плейлистом
            Lampa.SettingsApi.addParam({
                component: compId,
                param: {
                    name: 'vlc_ipad_mode',
                    type: 'select',
                    values: {
                        'auto': 'Прямий запуск (обрана серія)',
                        'ask_series': 'Меню плейлиста для серіалів',
                        'menu': 'Завжди показувати меню вибору дій',
                        'torrserver': 'Весь M3U торрента (TorrServer)'
                    },
                    default: 'auto'
                },
                field: {
                    name: (Lampa.Lang && Lampa.Lang.translate('vlc_ipad_mode_title')) || 'Режим відтворення',
                    description: (Lampa.Lang && Lampa.Lang.translate('vlc_ipad_mode_desc')) || 'Автоматично відкривати серію або показувати меню дій'
                }
            });

            // Запис в історію
            Lampa.SettingsApi.addParam({
                component: compId,
                param: {
                    name: 'vlc_ipad_history',
                    type: 'trigger',
                    default: true
                },
                field: {
                    name: (Lampa.Lang && Lampa.Lang.translate('vlc_ipad_history_title')) || 'Позначати в історії переглядів'
                }
            });
        }

        /**
         * Головна функція ініціалізації
         */
        function init() {
            initPlayerHook();
            initSettings();

            // Оповіщення при успішному завантаженні плагіна
            if (window.Lampa && Lampa.Noty) {
                Lampa.Noty.show('VLC iPad (iOS 9) плагін активовано', { time: 3000 });
            }
        }

        // Запуск після готовності застосунку Lampa
        if (window.appready) {
            init();
        } else if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') init();
            });
        } else {
            setTimeout(init, 1000);
        }
    }

    if (!window.plugin_vlc_ipad_ready) {
        startPlugin();
    }
})();
