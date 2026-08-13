import { initJournal, scrollToToday } from './journal/journal.js';
import { initHabits, resetHabitsToCurrent } from './habits/habits.js';

document.addEventListener('DOMContentLoaded', () => {
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

            // Se o usuário clicou no Habits, inicializa/renderiza a tabela corretamente
            if (targetId === 'habits' || targetId === 'habits-view' || item.textContent.toLowerCase().includes('habits')) {
                resetHabitsToCurrent();
            }
        });
    });

    initJournal();
    initHabits();
    resetHabitsToCurrent();
});