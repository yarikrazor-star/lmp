(function () {
    'use strict';

    function init() {
        // Додаємо розділ у налаштування
        Lampa.Settings.add({
            title: 'Тест',
            type: 'open',
            icon: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>',
            name: 'my_test'
        });

        // Описуємо логіку наповнення
        Lampa.Settings.bind('my_test', function (container, name) {
            // Створюємо елемент
            var item = $(`
                <div class="settings-list">
                    <div class="settings-list__item selector" data-focusable="true">
                        <div class="settings-list__title">Повідомлення</div>
                        <div class="settings-list__descr">привіт</div>
                    </div>
                </div>
            `);

            // Додаємо в контейнер налаштувань
            container.append(item);

            // Подія при натисканні (опціонально)
            item.on('hover:enter', function () {
                Lampa.Noty.show('Ви натиснули на "привіт"');
            });
        });
    }

    // Реєстрація плагіна
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') init();
        });
    }

})();
