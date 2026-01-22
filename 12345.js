(function () {
    'use strict';

    function mySettingsPlugin() {
        
        this.init = function () {
            // Чекаємо на готовність додатка
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    addSettingsItem();
                }
            });
        };

        function addSettingsItem() {
            // 1. Додаємо назву нового розділу в параметри (зліва в налаштуваннях)
            Lampa.Settings.add({
                title: 'Тест',
                type: 'button', // Тип елемента в списку налаштувань
                icon: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
                name: 'my_test_section' // Унікальний ідентифікатор
            });

            // 2. Описуємо, що буде всередині при натисканні на цей пункт
            Lampa.Listener.follow('settings', function (e) {
                if (e.type == 'open' && e.name == 'my_test_section') {
                    renderMyTestPage(e.body);
                }
            });
        }

        function renderMyTestPage(body) {
            // body — це контейнер правої панелі налаштувань
            var html = $('<div class="settings-list"></div>');
            
            // Створюємо елемент з текстом "привіт"
            var item = $(`
                <div class="settings-list__item selector">
                    <div class="settings-list__title">Повідомлення</div>
                    <div class="settings-list__descr">привіт</div>
                </div>
            `);

            html.append(item);
            body.append(html);

            // Оновлюємо навігацію, щоб Lampa "бачила" нові елементи для пульта
            Lampa.Controller.add('settings_my_test', {
                toggle: function () {
                    Lampa.Controller.collectionSet(body);
                    Lampa.Controller.navigate();
                },
                back: function () {
                    Lampa.Settings.main(); // Повернення до головних налаштувань
                }
            });

            Lampa.Controller.toggle('settings_my_test');
        }
    }

    // Реєстрація
    if (window.appready) {
        mySettingsPlugin().init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') mySettingsPlugin().init();
        });
    }
})();
