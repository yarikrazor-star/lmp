(function() {
    'use strict';

    // === БАЗОВІ НАЛАШТУВАННЯ ===
    var backup_keys = [
        'favorite', 'online_view', 'online_last_balanser', 
        'online_watched_last', 'torrents_view', 'torrents_filter_data'
    ];

    // === ГЛОБАЛЬНІ ФУНКЦІЇ ===
    function reloadApp(message) {
        Lampa.Noty.show(message + ' - Перезавантаження (3 сек)');
        setTimeout(function() { window.location.reload(); }, 3000);
    }

    function downloadLocalFile(dataObj, filename) {
        try {
            var blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Lampa.Noty.show('Файл успішно збережено');
        } catch (e) {
            Lampa.Noty.show('Помилка експорту у файл');
        }
    }

    function uploadLocalFile(callback) {
        var input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(evt) {
                try { callback(JSON.parse(evt.target.result)); } 
                catch (err) { Lampa.Noty.show('Помилка формату файлу!'); }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function confirmAction(callback) {
        setTimeout(function() {
            Lampa.Select.show({
                title: Lampa.Lang.translate('sure') || 'Ви впевнені?', nomark: true,
                items: [ 
                    { title: Lampa.Lang.translate('confirm') || 'Підтвердити', action: true, selected: true }, 
                    { title: Lampa.Lang.translate('cancel') || 'Відміна' } 
                ],
                onSelect: function(a) { 
                    Lampa.Controller.toggle('settings_component'); 
                    if (a.action) callback(); 
                },
                onBack: function() { 
                    Lampa.Controller.toggle('settings_component'); 
                }
            });
        }, 50); 
    }

    // === МОДУЛІ БЕКАПУ ===
    var BackupModules = {
        // 1. Плагіни
        plugins: {
            fileExport: function() { 
                downloadLocalFile(JSON.parse(localStorage.getItem('plugins') || '[]'), 'lampa_plugins.json'); 
            },
            fileImport: function() {
                uploadLocalFile(function(data) {
                    localStorage.setItem('plugins', JSON.stringify(data));
                    reloadApp('Файл плагінів завантажено');
                });
            }
        },
        
        // 2. Історія та Обране
        data: {
            fileExport: function() {
                var exportData = {};
                backup_keys.forEach(function(k) { exportData[k] = Lampa.Storage.get(k); });
                downloadLocalFile(exportData, 'lampa_history.json');
            },
            fileImport: function() {
                uploadLocalFile(function(data) {
                    for (var k in data) {
                        if (backup_keys.indexOf(k) !== -1) { Lampa.Storage.set(k, data[k], true); }
                    }
                    reloadApp('Файл Історії/Обраного застосовано');
                });
            }
        },

        // 3. Таймкоди
        tc: {
            getStorageKey: function() { return (typeof Lampa.Timeline.filename === 'function') ? Lampa.Timeline.filename() : 'file_view'; },
            fileExport: function() { 
                downloadLocalFile(Lampa.Storage.get(this.getStorageKey(), {}), 'lampa_timecodes.json'); 
            },
            fileImport: function() {
                var self = this;
                uploadLocalFile(function(data) {
                    var local = Lampa.Storage.get(self.getStorageKey(), {});
                    for (var hash in data) {
                        if (data[hash] && data[hash].percent !== undefined) { local[hash] = data[hash]; }
                    }
                    Lampa.Storage.set(self.getStorageKey(), local, true); 
                    reloadApp('Файл таймкодів імпортовано');
                });
            }
        },

        // 4. Повний бекап всього LocalStorage
        backup: {
            fileExport: function() {
                var backupData = {};
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i); 
                    backupData[k] = localStorage.getItem(k);
                }
                downloadLocalFile(backupData, 'lampa_full_backup.json');
            },
            fileImport: function() {
                uploadLocalFile(function(data) {
                    var keysCount = 0;
                    for (var i in data) { try { localStorage.setItem(i, data[i]); keysCount++; } catch (err) {} }
                    reloadApp('Локальний бекап відновлено (' + keysCount + ' ключів)');
                });
            }
        }
    };


    // === ІНІЦІАЛІЗАЦІЯ ІНТЕРФЕЙСУ ===
    function openSubMenu(moduleKey, titleText) {
        var items = [
            { title: '💾 Зберегти у файл (Експорт)', id: 'exp' },
            { title: '📂 Завантажити з файлу (Імпорт)', id: 'imp' }
        ];

        Lampa.Select.show({
            title: titleText,
            items: items,
            onSelect: function(a) {
                if (a.id == 'exp') {
                    BackupModules[moduleKey].fileExport();
                    Lampa.Controller.toggle('settings_component');
                } else if (a.id == 'imp') {
                    confirmAction(function() { BackupModules[moduleKey].fileImport(); });
                }
            },
            onBack: function() { Lampa.Controller.toggle('settings_component'); }
        });
    }

    function initPlugin() {
        window.lampa_local_backup_plugin = true;

        // ГОЛОВНЕ МЕНЮ У НАЛАШТУВАННЯХ
        Lampa.SettingsApi.addComponent({
            component: 'local_backup_menu',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
            name: 'Локальний Бекап'
        });

        // КНОПКИ (ПІДМЕНЮ)
        Lampa.SettingsApi.addParam({
            component: 'local_backup_menu', param: { type: 'button' },
            field: { name: '🧩 Плагіни' },
            onChange: function() { openSubMenu('plugins', 'Плагіни'); }
        });
        Lampa.SettingsApi.addParam({
            component: 'local_backup_menu', param: { type: 'button' },
            field: { name: '⭐ Обране / Історія' },
            onChange: function() { openSubMenu('data', 'Обране та Історія'); }
        });
        Lampa.SettingsApi.addParam({
            component: 'local_backup_menu', param: { type: 'button' },
            field: { name: '⏱ Таймкоди' },
            onChange: function() { openSubMenu('tc', 'Таймкоди'); }
        });
        Lampa.SettingsApi.addParam({
            component: 'local_backup_menu', param: { type: 'button' },
            field: { name: '📦 Повний Бекап (Усі налаштування)' },
            onChange: function() { openSubMenu('backup', 'Повний Бекап'); }
        });
    }

    // Чекаємо готовності системи перед ініціалізацією
    var checkTimer = setInterval(function() {
        if (window.Lampa && window.Lampa.SettingsApi && window.Lampa.Storage && window.Lampa.Timeline) {
            clearInterval(checkTimer);
            if (!window.lampa_local_backup_plugin) initPlugin();
        }
    }, 500);

})();