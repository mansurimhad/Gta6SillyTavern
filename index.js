import { mountGame } from './game.js';
import { HEROES } from './sprite-art.js';

const settings = document.querySelector('#extensions_settings');
if (settings && !document.querySelector('#neon-bay-launch')) {
    const launch = document.createElement('button');
    launch.id = 'neon-bay-launch';
    launch.className = 'menu_button';
    launch.type = 'button';
    launch.textContent = 'Играть в Силли Сити';
    settings.prepend(launch);

    launch.addEventListener('click', () => {
        if (document.querySelector('.neon-bay-dialog')) return;
        const dialog = document.createElement('dialog');
        dialog.className = 'neon-bay-dialog';
        dialog.setAttribute('aria-label', 'Силли Сити');
        dialog.innerHTML = `
            <header class="nb-header">
                <div><h1>СИЛЛИ <em>СИТИ</em></h1></div>
                <div class="nb-window-actions"><button class="nb-options-toggle" type="button">Настройки</button>
                <button class="nb-close" type="button">Закрыть <span aria-hidden="true">×</span></button></div>
            </header>
            <section class="nb-stage" aria-label="Игровое поле">
                <canvas class="nb-city" width="1344" height="756" tabindex="0" aria-label="Улицы Силли Сити"></canvas>
                <div class="nb-hud" hidden>
                    <div class="nb-stats">
                        <strong class="nb-hero"></strong>
                        <span class="nb-status"></span>
                        <progress class="nb-health" max="100" value="100" aria-label="Здоровье"></progress>
                        <progress class="nb-armor" max="100" value="0" aria-label="Броня"></progress>
                        <span class="nb-money"></span>
                        <span class="nb-wanted" aria-label="Розыск: 0 из 5">☆☆☆☆☆</span>
                        <progress class="nb-restraint" max="100" value="0" aria-label="Задержание" hidden></progress>
                    </div>
                    <canvas class="nb-map" width="172" height="172" aria-label="Мини-карта"></canvas>
                </div>
                <div class="nb-prompt" hidden></div>
                <section class="nb-atlas" aria-label="Карта города" hidden>
                    <div><h2>Карта города</h2><span><button data-zoom="-1" type="button" aria-label="Уменьшить">−</button>
                    <button data-zoom="1" type="button" aria-label="Увеличить">+</button> <button class="nb-atlas-back" type="button">Назад</button></span></div>
                    <canvas width="525" height="525" aria-label="Районы, службы и места с оружием"></canvas>
                    <small>◆ Полиция · + Больница · ▲ Пожарная часть</small>
                </section>
                <section class="nb-arsenal" aria-label="Колесо оружия" hidden><h2>Оружие</h2><div></div></section>
                <section class="nb-jail" aria-label="Камера полицейского участка" hidden>
                    <div><h2>Под арестом</h2><p>До освобождения <strong>60 с</strong></p></div>
                </section>
                <section class="nb-selection">
                    <h2>Выбери героя</h2>
                    <div class="nb-heroes">
                        ${HEROES.map((hero, index) => `
                            <button type="button" data-hero="${index}">
                                <canvas width="200" height="224" aria-hidden="true"></canvas>
                                <strong>${hero.name}</strong>
                            </button>`).join('')}
                    </div>
                </section>
            </section>
            <fieldset class="nb-options" hidden>
                <legend>Настройки игры</legend>
                <label>Графика <select class="nb-quality"><option value="auto">Авто</option><option value="low">Низкая</option><option value="medium">Средняя</option><option value="high">Высокая</option></select></label>
                <label>Громкость <input class="nb-volume" type="range" min="0" max="100" value="35"></label>
                <label><input class="nb-blood" type="checkbox" checked> Следы крови</label>
            </fieldset>
            <div class="nb-touch" hidden aria-label="Сенсорное управление">
                <button class="nb-stick" type="button" aria-label="Джойстик"><i></i></button>
                <div class="nb-touch-actions">
                    <button type="button" data-action="run">Бег / газ</button>
                    <button type="button" data-action="brake">Тормоз</button>
                    <button type="button" data-action="fire">Огонь</button>
                    <button type="button" data-action="punch">Удар</button>
                    <button type="button" data-action="interact">Действие</button>
                    <button type="button" data-action="weapon">Оружие</button>
                    <button type="button" data-action="reload">Зарядить</button>
                    <button type="button" data-action="map">Карта</button>
                </div>
            </div>
            <footer class="nb-footer">
                <span><kbd>WASD</kbd> <b>ходьба</b> <kbd>Shift</kbd> <b>бег</b></span>
                <span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <b>оружие</b> <kbd>F</kbd> <b>удар</b></span>
                <span><kbd>ЛКМ</kbd> <b>атака</b> <kbd>E</kbd> <b>действие</b></span>
                <button class="nb-map-toggle" type="button" aria-expanded="false" hidden>Карта · M</button>
                <button class="nb-weapon-toggle" type="button" hidden>Оружие · Q</button>
                <button class="nb-switch" type="button" hidden>Сменить героя</button>
            </footer>`;

        document.body.append(dialog);
        let dispose;
        try {
            dispose = mountGame(dialog);
        } catch (error) {
            dialog.remove();
            launch.textContent = 'Повторить запуск Силли Сити';
            console.error('[Silly City] Не удалось открыть игру', error);
            return;
        }
        dialog.querySelector('.nb-close').onclick = () => dialog.close();
        dialog.addEventListener('close', () => {
            dispose();
            dialog.remove();
            launch.focus();
        }, { once: true });
        dialog.showModal();
        (dialog.querySelector('.nb-selection').hidden
            ? dialog.querySelector('.nb-city')
            : dialog.querySelector('[data-hero]:not(:disabled)')).focus();
    });
}
