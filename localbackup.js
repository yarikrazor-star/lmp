(function() {
    'use strict';

    // === БАЗОВІ НАЛАШТУВАННЯ ===
    var backup_keys =[
        'favorite', 'online_view', 'online_last_balanser', 
        'online_watched_last', 'torrents_view', 'torrents_filter_data'
    ];

    var fileNames = {
        plugins: 'lampa_plugins.json',
        data: 'lampa_history.json',
        tc: 'lampa_timecodes.json',
        backup: 'lampa_full_backup.json'
    };

    // === ГЛОБАЛЬНІ ФУНКЦІЇ ===
    function reloadApp(message) {
        Lampa.Noty.show(message + ' - Перезавантаження (3 сек)');
        setTimeout(function() { window.location.reload(); }, 3000);
    }

    function confirmAction(callback) {
        setTimeout(function() {
            Lampa.Select.show({
                title: Lampa.Lang.translate('sure') || 'Ви впевнені?', nomark: true,
                items:[ 
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

    // === ФУНКЦІЇ РОБОТИ З ФАЙЛАМИ ТА БУФЕРОМ (КРОСПЛАТФОРМЕННІ) ===
    function fallbackDownload(blob, filename, jsonStr) {
        var url;
        try { url = window.URL.createObjectURL(blob); } 
        catch(e) { url = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr); }
        
        var a = document.createElement('a');
        a.style.display = 'none';
        a.href = url; 
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a); 
        a.click(); 
        
        setTimeout(function() {
            document.body.removeChild(a);
            if (url.indexOf('blob:') === 0) window.URL.revokeObjectURL(url);
        }, 2000);
        Lampa.Noty.show('Запит на збереження відправлено');
    }

    function downloadLocalFile(dataObj, filename) {
        try {
            var jsonStr = JSON.stringify(dataObj, null, 2);
            var blob = new Blob([jsonStr], { type: 'application/json' });
            
            // Використання Native Share (ідеально для Android/iOS смартфонів)
            if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, {type: 'application/json'})] })) {
                navigator.share({
                    files: [new File([blob], filename, {type: 'application/json'})],
                    title: filename
                }).catch(function() { fallbackDownload(blob, filename, jsonStr); });
            } else {
                fallbackDownload(blob, filename, jsonStr);
            }
        } catch (e) {
            Lampa.Noty.show('Помилка формування файлу');
        }
    }

    function uploadLocalFile(callback) {
        var input = document.createElement('input');
        input.type = 'file'; 
        input.accept = '.json,application/json,text/plain';
        input.style.display = 'none';
        
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(evt) {
                try { callback(JSON.parse(evt.target.result)); } 
                catch (err) { Lampa.Noty.show('Помилка формату файлу (не JSON)!'); }
            };
            reader.readAsText(file);
        };
        document.body.appendChild(input);
        input.click();
        setTimeout(function() { document.body.removeChild(input); }, 5000);
    }

    function copyToClipboard(text) {
        var fallback = function() {
            var textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed"; textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.focus(); textArea.select();
            try {
                if (document.execCommand('copy')) Lampa.Noty.show('Скопійовано в буфер обміну');
                else Lampa.Noty.show('Помилка копіювання (Обмеження ОС)');
            } catch (err) { Lampa.Noty.show('Помилка копіювання'); }
            document.body.removeChild(textArea);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function() {
                Lampa.Noty.show('Скопійовано в буфер обміну');
            }).catch(fallback);
        } else { fallback(); }
    }

    function fetchJSON(url, onSuccess) {
        var req;
        if (window.Lampa && Lampa.Reguest) req = new Lampa.Reguest();
        else if (window.Lampa && Lampa.Network) req = new Lampa.Network();
        
        if (req) {
            req.silent(url, function(data) { onSuccess(data); }, function() { Lampa.Noty.show('Помилка мережі (CORS або файл відсутній)'); }, false, {dataType: 'text'});
        } else {
            $.ajax({
                url: url, type: 'GET', dataType: 'text',
                success: function(data) { onSuccess(data); },
                error: function() { Lampa.Noty.show('Помилка завантаження'); }
            });
        }
    }

    // === ЛОГІКА ДАНИХ (БЕЗ ЗМІН ФОРМАТУ) ===
    var BackupModules = {
        plugins: {
            exportData: function() { return JSON.parse(localStorage.getItem('plugins') || '[]'); },
            importData: function(data) {
                localStorage.setItem('plugins', JSON.stringify(data));
                reloadApp('Файл плагінів завантажено');
            }
        },
        data: {
            exportData: function() {
                var exportData = {};
                backup_keys.forEach(function(k) { exportData[k] = Lampa.Storage.get(k); });
                return exportData;
            },
            importData: function(data) {
                for (var k in data) {
                    if (backup_keys.indexOf(k) !== -1) { Lampa.Storage.set(k, data[k], true); }
                }
                reloadApp('Файл Історії/Обраного застосовано');
            }
        },
        tc: {
            getStorageKey: function() { return (typeof Lampa.Timeline.filename === 'function') ? Lampa.Timeline.filename() : 'file_view'; },
            exportData: function() { return Lampa.Storage.get(this.getStorageKey(), {}); },
            importData: function(data) {
                var local = Lampa.Storage.get(this.getStorageKey(), {});
                for (var hash in data) {
                    if (data[hash] && data[hash].percent !== undefined) { local[hash] = data[hash]; }
                }
                Lampa.Storage.set(this.getStorageKey(), local, true); 
                reloadApp('Файл таймкодів імпортовано');
            }
        },
        backup: {
            exportData: function() {
                var backupData = {};
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i); 
                    backupData[k] = localStorage.getItem(k);
                }
                return backupData;
            },
            importData: function(data) {
                var keysCount = 0;
                for (var i in data) { try { localStorage.setItem(i, data[i]); keysCount++; } catch (err) {} }
                reloadApp('Локальний бекап відновлено (' + keysCount + ' ключів)');
            }
        }
    };

    // === ОБРОБНИКИ ДІЙ ===
    function handleAction(action, moduleKey) {
        if (action === 'exp_file') {
            downloadLocalFile(BackupModules[moduleKey].exportData(), fileNames[moduleKey]);
        } 
        else if (action === 'exp_copy') {
            Lampa.Noty.show('Підготовка даних...');
            setTimeout(function() { copyToClipboard(JSON.stringify(BackupModules[moduleKey].exportData(), null, 2)); }, 200);
        } 
        else if (action === 'imp_file') {
            uploadLocalFile(function(data) {
                confirmAction(function() { BackupModules[moduleKey].importData(data); });
            });
        } 
        else if (action === 'imp_url') {
            Lampa.Input.edit({
                title: 'Пряме посилання (Pastebin / GitHub Gist)',
                value: '', free: true, nosave: true
            }, function(new_value) {
                if (new_value && new_value.trim().indexOf('http') === 0) {
                    Lampa.Noty.show('Завантаження...');
                    fetchJSON(new_value.trim(), function(data) {
                        var parsed = data;
                        if (typeof data === 'string') {
                            try { parsed = JSON.parse(data); } 
                            catch (e) { return Lampa.Noty.show('Помилка: За посиланням не JSON формат'); }
                        }
                        confirmAction(function() { BackupModules[moduleKey].importData(parsed); });
                    });
                } else { Lampa.Noty.show('Невірне посилання'); }
            });
        } 
        else if (action === 'imp_text') {
            Lampa.Input.edit({
                title: 'Вставте скопійований JSON текст',
                value: '', free: true, nosave: true
            }, function(new_value) {
                if (new_value && new_value.trim().length > 0) {
                    try {
                        var parsed = JSON.parse(new_value.trim());
                        confirmAction(function() { BackupModules[moduleKey].importData(parsed); });
                    } catch(e) { Lampa.Noty.show('Помилка формату JSON'); }
                }
            });
        }
    }

    // === ІНІЦІАЛІЗАЦІЯ ІНТЕРФЕЙСУ ===
    function openSubMenu(moduleKey, titleText) {
        var items =[
            { title: '💾 Зберегти: У файл (на пристрій)', id: 'exp_file' },
            { title: '📋 Зберегти: Скопіювати текст', id: 'exp_copy' },
            { title: '📂 Відновити: Вибрати файл', id: 'imp_file' },
            { title: '🌐 Відновити: За посиланням (URL)', id: 'imp_url' },
            { title: '📝 Відновити: Вставити текст', id: 'imp_text' }
        ];

        Lampa.Select.show({
            title: titleText,
            items: items,
            onSelect: function(a) {
                Lampa.Controller.toggle('settings_component');
                setTimeout(function() { handleAction(a.id, moduleKey); }, 150); // Затримка для закриття меню
            },
            onBack: function() { Lampa.Controller.toggle('settings_component'); }
        });
    }

    function initPlugin() {
        window.lampa_local_backup_plugin = true;

        Lampa.SettingsApi.addComponent({
            component: 'local_backup_menu',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
            name: 'Локальний Бекап'
        });

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
        if (window.Lampa && window.Lampa.SettingsApi && window.Lampa.Storage && window.Lampa.Timeline && window.Lampa.Input) {
            clearInterval(checkTimer);
            if (!window.lampa_local_backup_plugin) initPlugin();
        }
    }, 500);

})();
