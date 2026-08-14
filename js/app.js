import { runLegacyDataMigration } from './database/database.js';
import { initJournal, scrollToToday } from './journal/journal.js';
import { initHabits, resetHabitsToCurrent } from './habits/habits.js';
import { initSchedule, resetScheduleToCurrent } from './schedule/schedule.js';
import { initSettings } from './settings/settings.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Run database migration for existing user data if any
    runLegacyDataMigration();

    // 2. Navigation bar switching logic
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const views = document.querySelectorAll('.app-container .view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');

            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));

            item.classList.add('active');
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.add('active');
            }

            // Se o usuário clicou no botão do Journal na barra inferior, rola para "Today"
            if (targetId === 'journal' || targetId === 'journal-view' || item.textContent.toLowerCase().includes('journal')) {
                scrollToToday();
            }

            // Se o usuário clicou no Schedule, reseta para data atual e renderiza
            if (targetId === 'schedule' || targetId === 'schedule-view' || item.textContent.toLowerCase().includes('schedule')) {
                resetScheduleToCurrent();
            }

            // Se o usuário clicou no Habits, inicializa/renderiza a tabela corretamente
            if (targetId === 'habits' || targetId === 'habits-view' || item.textContent.toLowerCase().includes('habits')) {
                resetHabitsToCurrent();
            }
        });
    });

    // 3. Initialize feature modules & settings
    initJournal();
    initHabits();
    initSchedule();
    initSettings();

    // 4. Register Service Worker for offline PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('PWA Service Worker registered:', reg.scope))
                .catch(err => console.log('Service Worker registration failed:', err));
        });
    }
});
