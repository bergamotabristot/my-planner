// js/schedule/week.js
// Week View: 7-day grid (Monday to Sunday) with lined task/event summaries and active day highlight

import { getEventsForDate, getToDosForDate } from '../database/tasks.js';

const DAYS_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function renderWeekView(container, currentDate, onSelectDay, onOpenEventModal) {
    container.innerHTML = '';

    const weekWrapper = document.createElement('div');
    weekWrapper.className = 'schedule-week-wrapper';

    // Calculate Monday of the current week
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekGrid = document.createElement('div');
    weekGrid.className = 'schedule-week-grid';

    // Render 7 days: 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);

        const isToday = (dayDate.getTime() === today.getTime());
        const isCurrentSelected = (
            dayDate.getDate() === currentDate.getDate() &&
            dayDate.getMonth() === currentDate.getMonth() &&
            dayDate.getFullYear() === currentDate.getFullYear()
        );

        const dayCard = document.createElement('div');
        dayCard.className = `schedule-week-card ${isToday ? 'is-today' : ''} ${isCurrentSelected ? 'is-selected' : ''}`;
        
        // Header with day name
        const dayHeader = document.createElement('div');
        dayHeader.className = 'schedule-week-day-header';

        const dayTitle = document.createElement('span');
        dayTitle.className = `schedule-week-day-name ${isCurrentSelected || isToday ? 'highlighted-pill' : ''}`;
        dayTitle.textContent = DAYS_NAMES[i];

        const dayDateSub = document.createElement('span');
        dayDateSub.className = 'schedule-week-day-date';
        dayDateSub.textContent = `${String(dayDate.getDate()).padStart(2, '0')}/${String(dayDate.getMonth() + 1).padStart(2, '0')}`;

        dayHeader.appendChild(dayTitle);
        dayHeader.appendChild(dayDateSub);

        // Clicking the header navigates to that Day view
        dayHeader.addEventListener('click', () => {
            if (typeof onSelectDay === 'function') {
                onSelectDay(new Date(dayDate));
            }
        });

        // Content body with lined rows
        const dayContent = document.createElement('div');
        dayContent.className = 'schedule-week-day-content';

        const events = getEventsForDate(dayDate);
        const todos = getToDosForDate(dayDate);

        // Render events
        events.forEach(evt => {
            const row = document.createElement('div');
            row.className = 'schedule-week-event-line';
            row.style.borderLeftColor = evt.color || '#ff9f43';

            const timeSpan = document.createElement('span');
            timeSpan.className = 'schedule-week-event-time';
            timeSpan.textContent = evt.startTime;

            const titleSpan = document.createElement('span');
            titleSpan.className = 'schedule-week-event-title';
            titleSpan.textContent = evt.title;
            titleSpan.style.color = evt.color || '#fff';

            row.appendChild(timeSpan);
            row.appendChild(titleSpan);

            row.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof onSelectDay === 'function') {
                    onSelectDay(new Date(dayDate));
                }
            });

            dayContent.appendChild(row);
        });

        // Render todos (up to 3-4 to keep card balanced)
        todos.forEach(todo => {
            const row = document.createElement('div');
            row.className = `schedule-week-todo-line ${todo.completed ? 'completed' : ''}`;

            const checkSpan = document.createElement('span');
            checkSpan.className = 'schedule-week-todo-bullet';
            checkSpan.textContent = todo.completed ? '✓' : '•';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'schedule-week-todo-text';
            titleSpan.textContent = todo.text;

            row.appendChild(checkSpan);
            row.appendChild(titleSpan);

            dayContent.appendChild(row);
        });

        // If empty, render subtle blank lines matching wireframe
        const totalItems = events.length + todos.length;
        const emptyLinesNeeded = Math.max(0, 4 - totalItems);
        for (let l = 0; l < emptyLinesNeeded; l++) {
            const blankLine = document.createElement('div');
            blankLine.className = 'schedule-week-blank-line';
            dayContent.appendChild(blankLine);
        }

        // Quick add button on day card
        dayCard.addEventListener('click', () => {
            if (typeof onSelectDay === 'function') {
                onSelectDay(new Date(dayDate));
            }
        });

        dayCard.appendChild(dayHeader);
        dayCard.appendChild(dayContent);
        weekGrid.appendChild(dayCard);
    }

    weekWrapper.appendChild(weekGrid);
    container.appendChild(weekWrapper);
}
