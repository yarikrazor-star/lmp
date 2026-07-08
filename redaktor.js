(function() {
    'use strict';

    // ==========================================
    // СТИЛІ РЕДАКТОРА (З АДАПТАЦІЄЮ ПІД МОБІЛЬНІ)
    // ==========================================
    $('head').append('<style>' +
        '.cache-editor-module { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 10px; box-sizing: border-box; }' +
        '.cache-editor-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; padding: 10px 10px 50px 10px; width: 100%; box-sizing: border-box; }' + 
        '.cache-card { background: rgba(255,255,255,0.08); border-radius: 12px; height: 160px; padding: 15px; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 3px solid transparent; transition: transform 0.2s; cursor: pointer; overflow: hidden; box-sizing: border-box; }' +
        '.cache-card.focus { background: #fff !important; transform: scale(1.08); z-index: 2; position: relative; border-color: #fff; box-shadow: 0 10px 20px rgba(0,0,0,0.4); }' +
        '.cache-card.focus .cc-title, .cache-card.focus .cc-desc { color: #000 !important; }' +
        '.cc-title { font-weight: bold; font-size: 1.15em; margin-bottom: 10px; color: #fff; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }' +
        '.cc-desc { font-size: 0.9em; color: #aaa; width: 100%; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-align: center; word-break: break-word; }' +
        '@media (max-width: 768px), (orientation: portrait) { ' +
            '.cache-editor-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px; padding: 10px 10px 50px 10px; } ' +
            '.cache-card { height: 130px; padding: 10px; } ' +
            '.cc-title { font-size: 1em; margin-bottom: 5px; } ' +
            '.cc-desc { font-size: 0.8em; -webkit-line-clamp: 2; } ' +
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
            
            // Запобіжник для уникнення надлишкових спрацьовувань
            var action_busy = false;

            this.create = function() {
                this.buildData();
                html.append(scroll.render());
                return this.render();
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
                } else if (object.level === 'keys') {
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
                
                if (!hasItems) {
                    grid.append('<div style="grid-column: 1 / -1; padding: 3em; text-align: center; font-size: 1.5em;">Список порожній</div>');
                }
                
                scroll.append(grid);
            };

            this.addCard = function(title, rawId, desc, type) {
                var safeDesc = typeof desc === 'string' && desc.length > 90 ? desc.substring(0, 90) + '...' : desc;
                
                var card = $('<div class="cache-card selector"></div>');
                card.attr('data-id', rawId); 
                
                var tDiv = $('<div class="cc-title"></div>').text(title);
                var dDiv = $('<div class="cc-desc"></div>').text(safeDesc);
                card.append(tDiv, dDiv);

                card.on('hover:focus', function() { 
                    object.last_focus = rawId; 
                    scroll.update(card);
                });

                // Використовуємо лише hover:enter, щоб уникнути фантомних кліків
                card.on('hover:enter', function(e) {
                    if (action_busy) return;
                    action_busy = true;
                    setTimeout(function() { action_busy = false; }, 1000);

                    if (type === 'group') {
                        Lampa.Activity.push({ url: '', title: 'Група: ' + rawId, component: 'cache_editor_grid', level: 'keys', prefix: rawId });
                    } else if (type === 'key') {
                        // Керування контролерами передано виключно ядру Lampa
                        Lampa.Input.edit({ 
                            title: 'Редагування: ' + rawId, 
                            value: localStorage.getItem(rawId) || '', 
                            free: true, 
                            nosave: true 
                        }, function(nv) {
                            if (nv !== undefined && nv !== null) {
                                localStorage.setItem(rawId, nv);
                                dDiv.text(nv.length > 90 ? nv.substring(0, 90) + '...' : nv);
                                Lampa.Noty.show('Збережено');
                            }
                        });
                    }
                });

                card.on('hover:long contextmenu', function(e) {
                    if (e.type === 'contextmenu') { e.preventDefault(); e.stopPropagation(); }
                    
                    if (action_busy) return;
                    action_busy = true;
                    setTimeout(function() { action_busy = false; }, 1000);
                    
                    Lampa.Select.show({
                        title: 'Видалити ' + rawId + '?', nomark: true,
                        items:[ { title: 'Так', action: true, selected: true }, { title: 'Скасувати' } ],
                        onSelect: function(a) {
                            if (a.action) {
                                if (type === 'group') {
                                    var toDel = [];
                                    for (var i=0; i<localStorage.length; i++) {
                                        var k = localStorage.key(i);
                                        if (k && (k.split('_')[0] === rawId || k === rawId)) toDel.push(k);
                                    }
                                    toDel.forEach(function(k) { localStorage.removeItem(k); });
                                    Lampa.Noty.show('Групу ' + rawId + ' видалено');
                                } else {
                                    localStorage.removeItem(rawId);
                                    Lampa.Noty.show('Запис видалено');
                                }
                                
                                var nextFocus = card.next('.selector')[0] || card.prev('.selector')[0];
                                card.remove(); 
                                
                                if (grid.find('.selector').length > 0) {
                                    if (nextFocus) {
                                        object.last_focus = $(nextFocus).attr('data-id'); 
                                    }
                                    Lampa.Controller.toggle('content');
                                    if (nextFocus) Lampa.Controller.collectionFocus(nextFocus, scroll.render());
                                } else {
                                    Lampa.Activity.backward(); 
                                }
                            } else {
                                Lampa.Controller.toggle('content');
                            }
                        },
                        onBack: function() { 
                            Lampa.Controller.toggle('content');
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

                        if (!target && elements.length) {
                            target = elements.eq(0)[0];
                        }

                        Lampa.Controller.collectionFocus(target || false, scroll.render());
                    },
                    left: function() { 
                        if (window.Navigator && window.Navigator.canmove('left')) window.Navigator.move('left'); 
                        else Lampa.Controller.toggle('menu');
                    },
                    right: function() { 
                        if (window.Navigator && window.Navigator.canmove('right')) window.Navigator.move('right'); 
                    },
                    up: function() { 
                        if (window.Navigator && window.Navigator.canmove('up')) window.Navigator.move('up'); 
                        else Lampa.Controller.toggle('head');
                    },
                    down: function() { 
                        if (window.Navigator && window.Navigator.canmove('down')) window.Navigator.move('down'); 
                    },
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
    // ІНІЦІАЛІЗАЦІЯ ПЛАГІНУ
    // ==========================================
    function initPlugin() {
        window.lampac_cache_editor_plugin = true;
        
        initCacheEditorActivity();

        Lampa.SettingsApi.addComponent({
            component: 'local_cache_editor_menu',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
            name: 'Редактор Кешу'
        });

        Lampa.SettingsApi.addParam({ 
            component: 'local_cache_editor_menu', 
            param: { type: 'button' }, 
            field: { name: '🛠 Відкрити редактор локального кешу' }, 
            onChange: function() { 
                Lampa.Activity.push({ url: '', title: 'Редактор Кешу', component: 'cache_editor_grid', level: 'groups' });
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
