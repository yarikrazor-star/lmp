(function() {
    'use strict';

    // ==========================================
    // СТИЛІ РЕДАКТОРА (З АДАПТАЦІЄЮ ПІД МОБІЛЬНІ ТА БЕКДРОПИ)
    // ==========================================
    $('head').append('<style>' +
        '.cache-editor-module { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 10px; box-sizing: border-box; }' +
        '.cache-editor-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; padding: 10px 10px 50px 10px; width: 100%; box-sizing: border-box; }' + 
        '.cache-card { background: rgba(255,255,255,0.08); border-radius: 12px; height: 160px; padding: 15px; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 3px solid transparent; transition: transform 0.2s; cursor: pointer; overflow: hidden; box-sizing: border-box; position: relative; }' +
        '.cache-card.focus { background: #fff !important; transform: scale(1.08); z-index: 2; position: relative; border-color: #fff; box-shadow: 0 10px 20px rgba(0,0,0,0.4); }' +
        '.cache-card.focus .cc-title, .cache-card.focus .cc-subtitle, .cache-card.focus .cc-desc { color: #000 !important; text-shadow: none !important; }' +
        '.cc-title { font-weight: bold; font-size: 1.15em; margin-bottom: 5px; color: #fff; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; position: relative; z-index: 2; }' +
        '.cc-subtitle { font-size: 0.75em; color: #888; margin-bottom: 10px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; position: relative; z-index: 2; }' +
        '.cc-desc { font-size: 0.95em; font-weight: bold; color: #aaa; width: 100%; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-align: center; word-break: break-word; position: relative; z-index: 2; }' +
        '.cc-bg-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.95)); z-index: 1; }' +
        '.cache-card.has-bg .cc-title { text-shadow: 1px 1px 3px rgba(0,0,0,0.9); }' +
        '.cache-card.has-bg .cc-subtitle { color: #bbb; text-shadow: 1px 1px 2px rgba(0,0,0,0.9); }' +
        '.cache-card.has-bg .cc-desc { color: #ddd; text-shadow: 1px 1px 3px rgba(0,0,0,0.9); }' +
        '@media (max-width: 768px), (orientation: portrait) { ' +
            '.cache-editor-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px; padding: 10px 10px 50px 10px; } ' +
            '.cache-card { height: 130px; padding: 10px; } ' +
            '.cc-title { font-size: 1em; margin-bottom: 2px; } ' +
            '.cc-subtitle { font-size: 0.65em; margin-bottom: 5px; } ' +
            '.cc-desc { font-size: 0.85em; -webkit-line-clamp: 2; } ' +
        '}' +
    '</style>');

    // ==========================================
    // ЛОГІКА КОМПОНЕНТА РЕДАКТОРА
    // ==========================================
    function initCacheEditorActivity() {
        if (Lampa.Component.get('cache_editor_grid')) return;

        Lampa.Component.add('cache_editor_grid', function(object) {
            var self = this;
            var html = $('<div class="cache-editor-module"></div>');
            var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
            var grid = $('<div class="cache-editor-grid"></div>');
            
            var action_busy = false;

            this.create = function() {
                this.buildData();
                html.append(scroll.render());
                return this.render();
            };

            // Алгоритм хешування Lampa (Java String.hashCode)
            var localHash = function(str) {
                if (window.Lampa && window.Lampa.Utils && typeof window.Lampa.Utils.hash === 'function') {
                    return String(window.Lampa.Utils.hash(str));
                }
                str = String(str);
                var hash = 0;
                for (var i = 0; i < str.length; i++) {
                    var char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash |= 0; // Перетворення у 32-бітне ціле
                }
                return String(Math.abs(hash));
            };

            // ==========================================
            // ДЕШИФРУВАННЯ ТА ГЛИБОКИЙ ПОШУК МЕТАДАНИХ
            // ==========================================
            this.findMetaForHash = function(hash) {
                var hashStr = String(hash);
                // Дефолтні значення на випадок, якщо реліз взагалі видалено з пам'яті
                var meta = { title: 'Невідомий файл', bg: null, subtitle: 'Хеш: ' + hashStr };

                // 1. Збираємо всі унікальні картки фільмів/серіалів із локальної пам'яті
                var cards = [];
                var addCard = function(c) {
                    if (!c || typeof c !== 'object') return;
                    cards.push(c);
                    if (c.card) cards.push(c.card);
                    if (c.movie) cards.push(c.movie);
                };

                // Збираємо з Історії
                var hist = Lampa.Storage.get('history', []);
                if (Array.isArray(hist)) hist.forEach(addCard);

                // Збираємо з Обраного
                var fav = Lampa.Storage.get('favorite', {});
                for (var fKey in fav) {
                    if (Array.isArray(fav[fKey])) fav[fKey].forEach(addCard);
                }

                // Збираємо з Онлайн переглядів
                var ov = Lampa.Storage.get('online_view', {});
                for (var oKey in ov) { addCard(ov[oKey]); }

                // Збираємо з Торрентів
                var tv = Lampa.Storage.get('torrents_view', {});
                for (var tKey in tv) { addCard(tv[tKey]); }

                // Дедуплікація за Назвами та ID
                var uniqueCards = [];
                var seenKeys = {};
                cards.forEach(function(c) {
                    var uniqKey = (c.original_title || c.original_name || c.title || c.name || '') + '_' + (c.id || '');
                    if (uniqKey && !seenKeys[uniqKey]) {
                        seenKeys[uniqKey] = true;
                        uniqueCards.push(c);
                    }
                });

                // 2. Метод А: Спроба розпізнати хеш за формулами Lampa.Utils.hash() (Перебір варіантів)
                for (var i = 0; i < uniqueCards.length; i++) {
                    var card = uniqueCards[i];
                    
                    var origTitle = card.original_title || '';
                    var origName = card.original_name || card.original_title || '';
                    var localTitle = card.title || card.name || '';

                    // А. Перевірка Фільмів (по оригінальній та локальній назві)
                    var checkMovieTitle = function(t) {
                        if (!t) return false;
                        if (localHash(t) === hashStr) {
                            meta.title = card.title || card.name || t;
                            meta.subtitle = 'Фільм (ID: ' + (card.id || 'Невідомо') + ')';
                            var imgPath = card.backdrop_path || card.poster_path;
                            if (imgPath) meta.bg = imgPath.indexOf('http') === 0 ? imgPath : 'https://image.tmdb.org/t/p/w300' + imgPath;
                            return true;
                        }
                        return false;
                    };
                    if (checkMovieTitle(origTitle)) return meta;
                    if (checkMovieTitle(localTitle)) return meta;

                    // Б. Перевірка Серіалів (Загальний прогрес: 1 + серія + назва)
                    // Шукаємо по епізодах від 1 до 50
                    var checkSerialProgress = function(nameStr) {
                        if (!nameStr) return false;
                        for (var ep = 1; ep <= 50; ep++) {
                            var checkStr = [1, ep, nameStr].join('');
                            if (localHash(checkStr) === hashStr) {
                                meta.title = (card.title || card.name || nameStr) + ' (Серія ' + ep + ')';
                                meta.subtitle = 'Серіал (ID: ' + (card.id || 'Невідомо') + ')';
                                var imgPath = card.backdrop_path || card.poster_path;
                                if (imgPath) meta.bg = imgPath.indexOf('http') === 0 ? imgPath : 'https://image.tmdb.org/t/p/w300' + imgPath;
                                return true;
                            }
                        }
                        return false;
                    };
                    if (checkSerialProgress(origName)) return meta;
                    if (checkSerialProgress(localTitle)) return meta;

                    // В. Перевірка конкретних Епізодів серіалів (сезон + роздільник + серія + назва)
                    // Seasons 1-20, Episodes 1-60
                    var checkSerialEpisodes = function(nameStr) {
                        if (!nameStr) return false;
                        for (var s = 1; s <= 20; s++) {
                            var delimiter = s > 10 ? ':' : '';
                            for (var e = 1; e <= 60; e++) {
                                var checkStr = [s, delimiter, e, nameStr].join('');
                                if (localHash(checkStr) === hashStr) {
                                    meta.title = (card.title || card.name || nameStr) + ' (Сезон ' + s + ', Серія ' + e + ')';
                                    meta.subtitle = 'Серіал (ID: ' + (card.id || 'Невідомо') + ')';
                                    var imgPath = card.backdrop_path || card.poster_path;
                                    if (imgPath) meta.bg = imgPath.indexOf('http') === 0 ? imgPath : 'https://image.tmdb.org/t/p/w300' + imgPath;
                                    return true;
                                }
                            }
                        }
                        return false;
                    };
                    if (checkSerialEpisodes(origName)) return meta;
                    if (checkSerialEpisodes(localTitle)) return meta;
                }

                // 3. Метод Б: Агресивний текстовий пошук у localStorage (для нетипових плагінів та балансерів)
                for (var j = 0; j < localStorage.length; j++) {
                    var key = localStorage.key(j);
                    if (key === object.storage_key) continue;

                    var val = localStorage.getItem(key);
                    if (!val || val.indexOf(hashStr) === -1) continue;

                    try {
                        var parsed = JSON.parse(val);
                        if (typeof parsed === 'object' && parsed !== null) {
                            for (var mKey in parsed) {
                                var movie = parsed[mKey];
                                if (typeof movie === 'object' && movie !== null) {
                                    var movieStr = JSON.stringify(movie);
                                    if (movieStr.indexOf(hashStr) !== -1 || String(movie.id) === hashStr) {
                                        var title = movie.title || movie.name || movie.original_title || (movie.movie && (movie.movie.title || movie.movie.name));
                                        if (title) {
                                            meta.title = title;
                                            var source = key === 'online_view' ? 'Онлайн' : (key === 'torrents_view' ? 'Торрент' : (key === 'history' ? 'Історія' : 'Кеш'));
                                            meta.subtitle = source + ' (ID: ' + (movie.id || mKey) + ')';
                                            var imgPath = movie.backdrop_path || movie.poster_path || (movie.movie && movie.movie.backdrop_path);
                                            if (imgPath) {
                                                meta.bg = imgPath.indexOf('http') === 0 ? imgPath : 'https://image.tmdb.org/t/p/w300' + imgPath;
                                            }
                                            return meta;
                                        }
                                    }
                                }
                            }
                        }
                    } catch(e) {
                        if (hashStr.indexOf('http') === 0 && meta.title === 'Невідомий файл') {
                            try {
                                var parts = hashStr.split('/');
                                meta.title = decodeURIComponent(parts[parts.length - 1] || parts[parts.length - 2]);
                            } catch(err) {}
                        }
                    }
                }

                return meta;
            };

            this.buildData = function() {
                grid.empty();
                scroll.clear(); 
                
                if (typeof scroll.minus === 'function') scroll.minus();
                if (typeof scroll.reset === 'function') scroll.reset();
                var bodyEl = scroll.render().find('.scroll__body');
                if (bodyEl.length) bodyEl.css('transform', 'translate3d(0px, 0px, 0px)');

                var hasItems = false;
                
                if (object.level === 'groups') {
                    var groups = {};
                    for (var i = 0; i < localStorage.length; i++) {
                        var k = localStorage.key(i); if (!k) continue;
                        var p = k.split('_')[0] || k;
                        if (!groups[p]) groups[p] = 0; groups[p]++;
                    }
                    var keysArr = Object.keys(groups).sort();
                    keysArr.forEach(function(p) { self.addCard('📁 ' + p, p, groups[p] + ' записів', 'group'); hasItems = true; });
                } 
                else if (object.level === 'keys') {
                    var prefix = object.prefix;
                    for (var j = 0; j < localStorage.length; j++) {
                        var keyName = localStorage.key(j);
                        if (keyName && (keyName.split('_')[0] === prefix || keyName === prefix)) {
                            var val = localStorage.getItem(keyName) || '';
                            self.addCard('📄 ' + keyName, keyName, val, 'key');
                            hasItems = true;
                        }
                    }
                }
                // РІВЕНЬ: JSON-РЕДАКТОР (Таймкоди)
                else if (object.level === 'json') {
                    var rawJson = localStorage.getItem(object.storage_key);
                    var parsedObj = {};
                    try { parsedObj = JSON.parse(rawJson) || {}; } catch(e) {}
                    
                    var pKeys = Object.keys(parsedObj);
                    if (pKeys.length > 0) {
                        pKeys.forEach(function(k) {
                            var item = parsedObj[k];
                            
                            // Збираємо візуальні дані через розшифрування
                            var meta = self.findMetaForHash(k);
                            
                            var desc = JSON.stringify(item);
                            // Форматування часу
                            if (item && item.percent !== undefined) {
                                var m = Math.floor((item.time || 0) / 60);
                                var s = Math.floor((item.time || 0) % 60);
                                var md = Math.floor((item.duration || 0) / 60);
                                var sd = Math.floor((item.duration || 0) % 60);
                                desc = '⏳ ' + item.percent + '% ( ' + m + ':' + (s<10?'0':'')+s + ' / ' + md + ':' + (sd<10?'0':'')+sd + ' )';
                            }
                            
                            self.addCard(meta.title, k, desc, 'json_item', { bg: meta.bg, parentKey: object.storage_key, jsonObj: parsedObj, rawSubtitle: meta.subtitle });
                            hasItems = true;
                        });
                    }
                }
                
                if (!hasItems) {
                    if (object.level === 'keys') {
                        var emptyBtn = $('<div class="cache-card selector" style="grid-column: 1 / -1; height: 100px;"><div class="cc-title" style="font-size:1.3em;">➕ Створити перший запис</div></div>');
                        emptyBtn.on('hover:enter', function() { self.createNewKey(object.prefix); });
                        grid.append(emptyBtn);
                    } else {
                        grid.append('<div style="grid-column: 1 / -1; padding: 3em; text-align: center; font-size: 1.5em;">Список порожній</div>');
                    }
                }
                
                scroll.append(grid);
            };

            this.createNewGroup = function() {
                Lampa.Input.edit({ title: 'Префікс нової групи', value: '', free: true, nosave: true }, function(newPrefix) {
                    if (newPrefix && newPrefix.trim()) {
                        localStorage.setItem(newPrefix.trim() + '_new_record', 'новий запис');
                        self.buildData();
                    }
                    setTimeout(function() { Lampa.Controller.toggle('content'); }, 100);
                });
            };

            this.createNewKey = function(prefix) {
                Lampa.Input.edit({ title: 'Ключ (починайте з ' + prefix + '_):', value: prefix + '_', free: true, nosave: true }, function(newKey) {
                    if (newKey && newKey.trim()) {
                        setTimeout(function() {
                            Lampa.Input.edit({ title: 'Значення для ' + newKey.trim() + ':', value: '', free: true, nosave: true }, function(newVal) {
                                localStorage.setItem(newKey.trim(), newVal || '');
                                self.buildData();
                                setTimeout(function() { Lampa.Controller.toggle('content'); }, 100);
                            });
                        }, 300);
                    } else {
                        setTimeout(function() { Lampa.Controller.toggle('content'); }, 100);
                    }
                });
            };

            this.addCard = function(title, rawId, desc, type, extra) {
                var safeDesc = typeof desc === 'string' && desc.length > 90 ? desc.substring(0, 90) + '...' : desc;
                var card = $('<div class="cache-card selector"></div>');
                card.attr('data-id', rawId); 
                
                if (extra && extra.bg) {
                    card.addClass('has-bg');
                    card.css({ 'background-image': 'url(' + extra.bg + ')', 'background-size': 'cover', 'background-position': 'center' });
                    card.append('<div class="cc-bg-overlay"></div>');
                }

                var tDiv = $('<div class="cc-title"></div>').text(title);
                var subDiv = $('<div class="cc-subtitle"></div>').text(extra && extra.rawSubtitle ? extra.rawSubtitle : rawId);
                var dDiv = $('<div class="cc-desc"></div>').text(safeDesc);
                
                if (type === 'group') {
                    card.append(tDiv, dDiv);
                } else {
                    card.append(tDiv, subDiv, dDiv);
                }

                card.on('hover:focus', function() { 
                    object.last_focus = rawId; 
                    scroll.update(card);
                });

                card.on('hover:enter', function(e) {
                    if (action_busy) return;
                    action_busy = true; setTimeout(function() { action_busy = false; }, 1000);

                    if (type === 'group') {
                        Lampa.Activity.push({ url: '', title: 'Група: ' + rawId, component: 'cache_editor_grid', level: 'keys', prefix: rawId });
                    } else if (type === 'key' || type === 'json_item') {
                        var isJson = (type === 'json_item');
                        var oldVal = isJson ? JSON.stringify(extra.jsonObj[rawId], null, 2) : (localStorage.getItem(rawId) || '');
                        
                        Lampa.Input.edit({ title: 'Редагування (JSON):', value: oldVal, free: true, nosave: true }, function(nv) {
                            var checkVal = (nv === undefined || nv === null) ? '' : String(nv).trim();

                            if (checkVal === '' || nv === oldVal) {
                                Lampa.Noty.show('Скасовано (без змін)');
                            } else {
                                if (isJson) {
                                    try {
                                        extra.jsonObj[rawId] = JSON.parse(nv);
                                        localStorage.setItem(extra.parentKey, JSON.stringify(extra.jsonObj));
                                        Lampa.Noty.show('Збережено');
                                        self.buildData();
                                    } catch(err) { Lampa.Noty.show('Помилка: Невірний JSON формат'); }
                                } else {
                                    localStorage.setItem(rawId, nv);
                                    dDiv.text(nv.length > 90 ? nv.substring(0, 90) + '...' : nv);
                                    Lampa.Noty.show('Збережено');
                                }
                            }
                            setTimeout(function() {
                                Lampa.Controller.toggle('content');
                                if (card && card.length) Lampa.Controller.collectionFocus(card[0], scroll.render());
                            }, 200);
                        });
                    }
                });

                card.on('hover:long contextmenu', function(e) {
                    if (e.type === 'contextmenu') { e.preventDefault(); e.stopPropagation(); }
                    if (action_busy) return;
                    action_busy = true; setTimeout(function() { action_busy = false; }, 1000);
                    
                    var menuItems = [];
                    if (type === 'group') {
                        menuItems.push({ title: '🗑 Видалити групу', id: 'del' });
                        menuItems.push({ title: '➕ Створити нову групу', id: 'add' });
                    } else if (type === 'key') {
                        menuItems.push({ title: '🗑 Видалити запис', id: 'del' });
                        menuItems.push({ title: '➕ Створити новий запис', id: 'add' });
                    } else if (type === 'json_item') {
                        menuItems.push({ title: '🗑 Видалити таймкод', id: 'del' });
                    }
                    menuItems.push({ title: 'Скасувати', id: 'cancel' });

                    Lampa.Select.show({
                        title: 'Дія: ' + (type === 'group' ? rawId : 'Поточний запис'), nomark: true,
                        items: menuItems,
                        onSelect: function(a) {
                            if (a.id === 'del') {
                                if (type === 'group') {
                                    var toDel = [];
                                    for (var i=0; i<localStorage.length; i++) {
                                        var k = localStorage.key(i);
                                        if (k && (k.split('_')[0] === rawId || k === rawId)) toDel.push(k);
                                    }
                                    toDel.forEach(function(k) { localStorage.removeItem(k); });
                                    Lampa.Noty.show('Групу ' + rawId + ' видалено');
                                } else if (type === 'json_item') {
                                    delete extra.jsonObj[rawId];
                                    localStorage.setItem(extra.parentKey, JSON.stringify(extra.jsonObj));
                                    Lampa.Noty.show('Таймкод видалено');
                                } else {
                                    localStorage.removeItem(rawId);
                                    Lampa.Noty.show('Запис видалено');
                                }
                                
                                var nextFocus = card.next('.selector')[0] || card.prev('.selector')[0];
                                card.remove(); 
                                
                                if (grid.find('.selector').length > 0) {
                                    if (nextFocus) object.last_focus = $(nextFocus).attr('data-id'); 
                                    Lampa.Controller.toggle('content');
                                    if (nextFocus) Lampa.Controller.collectionFocus(nextFocus, scroll.render());
                                } else {
                                    self.buildData();
                                    Lampa.Controller.toggle('content');
                                    Lampa.Controller.collectionFocus(scroll.render().find('.selector').eq(0)[0], scroll.render());
                                }
                            } 
                            else if (a.id === 'add') {
                                if (type === 'group') self.createNewGroup();
                                if (type === 'key') self.createNewKey(object.prefix);
                            }
                            else {
                                Lampa.Controller.toggle('content');
                                if (card && card.length) Lampa.Controller.collectionFocus(card[0], scroll.render());
                            }
                        },
                        onBack: function() { 
                            Lampa.Controller.toggle('content');
                            if (card && card.length) Lampa.Controller.collectionFocus(card[0], scroll.render());
                        }
                    });
                });

                grid.append(card);
            };

            this.start = function() {
                Lampa.Controller.add('content', {
                    toggle: function() {
                        Lampa.Controller.collectionSet(scroll.render());
                        var elements = scroll.render().find('.selector');
                        var target = false;

                        if (object.last_focus) {
                            elements.each(function() {
                                if ($(this).attr('data-id') === object.last_focus) target = this;
                            });
                        }
                        if (!target && elements.length) target = elements.eq(0)[0];
                        Lampa.Controller.collectionFocus(target || false, scroll.render());
                    },
                    left: function() { 
                        if (window.Navigator && window.Navigator.canmove('left')) window.Navigator.move('left'); 
                        else Lampa.Controller.toggle('menu');
                    },
                    right: function() { if (window.Navigator && window.Navigator.canmove('right')) window.Navigator.move('right'); },
                    up: function() { 
                        if (window.Navigator && window.Navigator.canmove('up')) window.Navigator.move('up'); 
                        else Lampa.Controller.toggle('head');
                    },
                    down: function() { if (window.Navigator && window.Navigator.canmove('down')) window.Navigator.move('down'); },
                    back: function() { Lampa.Activity.backward(); }
                });
                Lampa.Controller.toggle('content');
            };

            this.pause = function() {};
            this.stop = function() {};
            this.render = function() { return html; }; 
            this.destroy = function() { scroll.destroy(); html.remove(); };
        });
    }

    // ==========================================
    // ІНІЦІАЛІЗАЦІЯ ПЛАГІНУ ТА МЕНЮ
    // ==========================================
    function initPlugin() {
        window.lampac_cache_editor_plugin = true;
        initCacheEditorActivity();

        Lampa.SettingsApi.addComponent({
            component: 'local_cache_editor_menu',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
            name: 'Редактор Кешу'
        });

        // 1. Оригінальний Редактор Локального Кешу
        Lampa.SettingsApi.addParam({ 
            component: 'local_cache_editor_menu', 
            param: { type: 'button' }, 
            field: { name: '🛠 Відкрити загальний редактор кешу' }, 
            onChange: function() { 
                Lampa.Activity.push({ url: '', title: 'Редактор Кешу', component: 'cache_editor_grid', level: 'groups' });
            }
        });
        
        // 2. Редактор Таймкодів
        Lampa.SettingsApi.addParam({ 
            component: 'local_cache_editor_menu', 
            param: { type: 'button' }, 
            field: { name: '⏱ Відкрити редактор Таймкодів' }, 
            onChange: function() { 
                var tcKey = (typeof Lampa.Timeline === 'object' && typeof Lampa.Timeline.filename === 'function') ? Lampa.Timeline.filename() : 'file_view';
                Lampa.Activity.push({ url: '', title: 'Редактор Таймкодів', component: 'cache_editor_grid', level: 'json', storage_key: tcKey });
            }
        });
    }

    var checkTimer = setInterval(function() {
        if (window.Lampa && window.Lampa.SettingsApi && typeof window.Lampa.Platform !== "undefined") {
            if (!window.lampac_cache_editor_plugin) initPlugin();
            clearInterval(checkTimer);
        }
    }, 500);

})();
