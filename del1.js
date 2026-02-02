(function () {
    'use strict';

    function NoSloganPlugin() {
        // Додаємо стилі в HEAD для миттєвого приховання без очікування JS
        var style = document.createElement('style');
        style.innerHTML = `
            /* Радикальне приховування слогану за класом */
            .full-start__tagline, 
            [class*="tagline"],
            .full-start__description + div:not([class]) {
                display: none !important;
                height: 0px !important;
                min-height: 0px !important;
                margin: 0px !important;
                padding: 0px !important;
                font-size: 0px !important;
                line-height: 0 !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important; /* Виводимо з потоку, щоб не займав місце */
                z-index: -1;
            }

            /* Коригуємо відступи назви та деталей, щоб прибрати порожнечу */
            .full-start__title {
                margin-bottom: 5px !important;
            }
            .full-start__details {
                margin-top: 0px !important;
                margin-bottom: 10px !important;
            }
        `;
        document.head.appendChild(style);

        // Функція "чистки" DOM при зміні екранів
        this.cleaner = function() {
            var full = document.querySelector('.full-start');
            if (full) {
                // Шукаємо текстові вузли, які можуть бути слоганами без класів
                var nodes = full.querySelectorAll('div, span, p');
                nodes.forEach(function(node) {
                    // Якщо текст короткий, знаходиться між деталями та описом — це слоган
                    if (node.innerText && node.innerText.length > 3 && node.innerText.length < 150) {
                        var prev = node.previousElementSibling;
                        var next = node.nextElementSibling;
                        if (prev && prev.classList.contains('full-start__details')) {
                             node.style.display = 'none';
                             node.setAttribute('data-slogan-hidden', 'true');
                        }
                    }
                });
            }
        };

        // Підключаємось до подій Lampa
        this.init = function() {
            var self = this;
            
            // Стежимо за відкриттям картки через системний Listener
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite' || e.type === 'ready') {
                    // Виконуємо чистку кілька разів з мікро-затримкою для надійності
                    self.cleaner();
                    setTimeout(self.cleaner, 50);
                    setTimeout(self.cleaner, 200);
                }
            });

            // Додатково стежимо за змінами через MutationObserver (для надійності на Android TV)
            var observer = new MutationObserver(function() {
                self.cleaner();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        };
    }

    // Реєстрація та запуск
    if (window.appready) {
        new NoSloganPlugin().init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                new NoSloganPlugin().init();
            }
        });
    }
})();