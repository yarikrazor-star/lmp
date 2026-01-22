(function () {
    'use strict';

    function myPlugin() {
        this.name = 'Мій Перший Плагін';

        // Функція ініціалізації
        this.init = function () {
            console.log('My Plugin: ініціалізовано');
            
            // Додаємо пункт у головне меню
            Lampa.Component.add('my_component', MyComponent); // Реєструємо компонент
            
            // Додаємо кнопку в меню
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    var menu_item = {
                        title: 'Мій Плагін',
                        icon: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>',
                        component: 'my_component'
                    };
                    
                    Lampa.Menu.add(menu_item);
                }
            });
        };

        // Логіка того, що відбувається при відкритті пункту меню
        function MyComponent(object) {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({mask: true, over: true});
            var items = [];
            var html = $('<div></div>');

            this.create = function () {
                var _this = this;
                
                // Створюємо простий текст на екрані
                var title = $('<div class="category-full__title">Привіт, це мій плагін!</div>');
                html.append(title);
                
                scroll.append(html);
                return scroll.render();
            };

            this.pause = function () {};
            this.active = function () {};
            this.render = function () {
                return this.create();
            };
            this.destroy = function () {
                network.clear();
                scroll.destroy();
                html.remove();
            };
        }
    }

    // Реєстрація плагіна в Lampa
    if (window.appready) {
        myPlugin().init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') myPlugin().init();
        });
    }
})();
