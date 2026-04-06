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
        }, 150); 
    }

    // === НАДІЙНІ МЕРЕЖЕВІ ТА ФАЙЛОВІ ФУНКЦІЇ ===
    function fetchJSON(url, onSuccess) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) { onSuccess(xhr.responseText); } 
                else { Lampa.Noty.show('Помилка мережі. Перевірте посилання.'); }
            }
        };
        xhr.onerror = function() { Lampa.Noty.show('Помилка завантаження (CORS або файл відсутній)'); };
        xhr.send();
    }

    function downloadLocalFile(dataObj, filename) {
        try {
            var jsonStr = JSON.stringify(dataObj, null, 2);
            var blob = new Blob([jsonStr], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 3000);
            Lampa.Noty.show('Запит на збереження файлу...');
        } catch (e) {
            Lampa.Noty.show('Помилка формування файлу');
        }
    }

    function copyText(dataObj) {
        try {
            var text = JSON.stringify(dataObj, null, 2);
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(function() { Lampa.Noty.show('Скопійовано в буфер обміну!'); })
                .catch(function() { fallbackCopyText(text); });
            } else { fallbackCopyText(text); }
        } catch (e) { Lampa.Noty.show('Помилка форматування даних'); }
    }

    function fallbackCopyText(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus(); textArea.select();
        try {
            if (document.execCommand('copy')) Lampa.Noty.show('Скопійовано в буфер обміну!');
            else Lampa.Noty.show('Система забороняє копіювання');
        } catch (err) { Lampa.Noty.show('Помилка копіювання'); }
        document.body.removeChild(textArea);
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
            reader.onload = function(evt) { callback(evt.target.result); };
            reader.readAsText(file);
        };
        document.body.appendChild(input);
        
        setTimeout(function() {
            input.click();
            setTimeout(function() { document.body.removeChild(input); }, 5000);
        }, 100);
    }

    // === ДАНІ ТА ЛОГІКА (100% СУМІСНІСТЬ) ===
    function getBackupModules() {
        return {
            plugins: {
                exportData: function() { try { return JSON.parse(localStorage.getItem('plugins') || '[]'); } catch(e) { return[]; } },
                importData: function(data) { localStorage.setItem('plugins', JSON.stringify(data)); reloadApp('Плагіни завантажено'); }
            },
            data: {
                exportData: function() {
                    var exportData = {};
                    backup_keys.forEach(function(k) { exportData[k] = Lampa.Storage.get(k); });
                    return exportData;
                },
                importData: function(data) {
                    for (var k in data) { if (backup_keys.indexOf(k) !== -1) { Lampa.Storage.set(k, data[k], true); } }
                    reloadApp('Історію та Обране застосовано');
                }
            },
            tc: {
                getStorageKey: function() { return (typeof Lampa.Timeline.filename === 'function') ? Lampa.Timeline.filename() : 'file_view'; },
                exportData: function() { return Lampa.Storage.get(this.getStorageKey(), {}); },
                importData: function(data) {
                    var local = Lampa.Storage.get(this.getStorageKey(), {});
                    for (var hash in data) { if (data[hash] && data[hash].percent !== undefined) { local[hash] = data[hash]; } }
                    Lampa.Storage.set(this.getStorageKey(), local, true); 
                    reloadApp('Таймкоди імпортовано');
                }
            },
            backup: {
                exportData: function() {
                    var backupData = {};
                    for (var i = 0; i < localStorage.length; i++) {
                        var k = localStorage.key(i); backupData[k] = localStorage.getItem(k);
                    }
                    return backupData;
                },
                importData: function(data) {
                    var keysCount = 0;
                    for (var i in data) { try { localStorage.setItem(i, data[i]); keysCount++; } catch (err) {} }
                    reloadApp('Повний бекап відновлено (' + keysCount + ' ключів)');
                }
            }
        };
    }

    // === ОБРОБКА ДІЙ ===
    function processImport(data, moduleKey) {
        var parsed = data;
        if (typeof data === 'string') {
            try { parsed = JSON.parse(data); } 
            catch (e) { return Lampa.Noty.show('Помилка: Невірний формат (має бути JSON)'); }
        }
        confirmAction(function() {
            var modules = getBackupModules();
            modules[moduleKey].importData(parsed);
        });
    }

    function handleAction(action, moduleKey) {
        var modules = getBackupModules();
        var dataObj = modules[moduleKey].exportData();
        
        if (action === 'exp_file') {
            downloadLocalFile(dataObj, fileNames[moduleKey]);
        } 
        else if (action === 'exp_copy') {
            copyText(dataObj);
        } 
        else if (action === 'imp_file') {
            uploadLocalFile(function(data) { processImport(data, moduleKey); });
        } 
        else if (action === 'imp_url') {
            Lampa.Input.edit({
                title: 'Вставте посилання на файл (JSON/TXT)', value: '', free: true, nosave: true
            }, function(new_value) {
                if (new_value && new_value.trim().length > 5) {
                    Lampa.Noty.show('Завантаження...');
                    fetchJSON(new_value.trim(), function(data) { processImport(data, moduleKey); });
                }
            });
        } 
        else if (action === 'imp_text') {
            Lampa.Input.edit({
                title: 'Вставте скопійований текст JSON', value: '', free: true, nosave: true
            }, function(new_value) {
                if (new_value && new_value.trim().length > 5) { processImport(new_value.trim(), moduleKey); }
            });
        }
    }

    function openSubMenu(moduleKey, titleText) {
        var items =[
            { title: '💾 Зберегти: У файл', id: 'exp_file' },
            { title: '📋 Зберегти: Скопіювати текст', id: 'exp_copy' },
            { title: '📂 Відновити: З файлу', id: 'imp_file' },
            { title: '🌐 Відновити: За посиланням (URL)', id: 'imp_url' },
            { title: '📝 Відновити: Вставивши текст', id: 'imp_text' }
        ];

        Lampa.Select.show({
            title: titleText,
            items: items,
            onSelect: function(a) {
                Lampa.Controller.toggle('settings_component');
                setTimeout(function() { handleAction(a.id, moduleKey); }, 300); // Затримка, щоб меню закрилося без помилок
            },
            onBack: function() { Lampa.Controller.toggle('settings_component'); }
        });
    }

    // === ІНІЦІАЛІЗАЦІЯ ===
    function initPlugin() {
        window.lampa_local_backup_plugin = true;

        Lampa.SettingsApi.addComponent({
            component: 'local_backup_menu',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
            name: 'Локальний Бекап'
        });

        var options =[
            { name: '🧩 Плагіни', key: 'plugins', title: 'Плагіни' },
            { name: '⭐ Обране / Історія', key: 'data', title: 'Обране та Історія' },
            { name: '⏱ Таймкоди', key: 'tc', title: 'Таймкоди' },
            { name: '📦 Повний Бекап (Усі налаштування)', key: 'backup', title: 'Повний Бекап' }
        ];

        options.forEach(function(opt) {
            Lampa.SettingsApi.addParam({
                component: 'local_backup_menu', param: { type: 'button' }, field: { name: opt.name },
                onChange: function() { openSubMenu(opt.key, opt.title); }
            });
        });
    }

    var checkTimer = setInterval(function() {
        if (window.Lampa && window.Lampa.SettingsApi && window.Lampa.Storage && window.Lampa.Timeline && window.Lampa.Input) {
            clearInterval(checkTimer);
            if (!window.lampa_local_backup_plugin) initPlugin();
        }
    }, 500);

})();
