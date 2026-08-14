// js/schedule/month.js
// Month View: 7-column calendar grid, past day crosses, colored event badges, and Day Detail note modal

import { getEventsForDate, getToDosForDate, saveToDo, deleteToDo, toggleToDoComplete } from '../database/tasks.js';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Monday start matching planner

export function renderMonthView(container, currentDate, onSelectDay, onOpenEventModal) {
    container.innerHTML = '';

    const monthWrapper = document.createElement('div');
    monthWrapper.className = 'schedule-month-wrapper';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // First day of month (0 = Sun, 1 = Mon... -> convert to 0 = Mon, 6 = Sun)
    const firstDayJs = new Date(year, month, 1).getDay();
    const firstDayOffset = (firstDayJs === 0 ? 6 : firstDayJs - 1);

    // Days in previous month for leading padding
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Calendar table / grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'schedule-month-grid';

    // Day of week headers
    WEEKDAY_SHORT.forEach(dayName => {
        const headerCell = document.createElement('div');
        headerCell.className = 'schedule-month-header-cell';
        headerCell.textContent = dayName;
        calendarGrid.appendChild(headerCell);
    });

    // 1. Leading days from previous month
    for (let i = firstDayOffset - 1; i >= 0; i--) {
        const dayNum = prevMonthDays - i;
        const cell = document.createElement('div');
        cell.className = 'schedule-month-cell other-month';
        
        const numLabel = document.createElement('span');
        numLabel.className = 'schedule-month-day-num';
        numLabel.textContent = dayNum;
        cell.appendChild(numLabel);

        calendarGrid.appendChild(cell);
    }

    // 2. Days of the current month
    for (let d = 1; d <= daysInMonth; d++) {
        const cellDate = new Date(year, month, d);
        cellDate.setHours(0, 0, 0, 0);

        const isToday = (cellDate.getTime() === today.getTime());
        const isPast = (cellDate.getTime() < today.getTime());

        const cell = document.createElement('div');
        cell.className = `schedule-month-cell ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}`;
        cell.dataset.day = d;

        // Day Number
        const numLabel = document.createElement('span');
        numLabel.className = 'schedule-month-day-num';
        numLabel.textContent = d;
        cell.appendChild(numLabel);

        // Past day red 'X' indicator (matching wireframe)
        if (isPast) {
            const crossMark = document.createElement('span');
            crossMark.className = 'schedule-month-cross';
            crossMark.textContent = '✕';
            cell.appendChild(crossMark);
        }

        // Events list inside cell
        const events = getEventsForDate(cellDate);
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'schedule-month-events';

        events.slice(0, 3).forEach(evt => {
            const evtBadge = document.createElement('div');
            evtBadge.className = 'schedule-month-event-item';
            evtBadge.textContent = evt.title;
            evtBadge.style.color = evt.color || '#ff9f43';
            evtBadge.title = `${evt.title} (${evt.startTime} - ${evt.endTime})`;
            eventsContainer.appendChild(evtBadge);
        });

        if (events.length > 3) {
            const moreBadge = document.createElement('div');
            moreBadge.className = 'schedule-month-event-more';
            moreBadge.textContent = `+${events.length - 3} more`;
            eventsContainer.appendChild(moreBadge);
        }

        cell.appendChild(eventsContainer);

        // Clicking a day opens the Day Detail Sheet / Popup (as shown in wireframe)
        cell.addEventListener('click', () => {
            openDayDetailModal(cellDate, onSelectDay, onOpenEventModal);
        });

        calendarGrid.appendChild(cell);
    }

    // 3. Trailing days to fill last week row
    const totalCellsSoFar = firstDayOffset + daysInMonth;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let d = 1; d <= remainingCells; d++) {
        const cell = document.createElement('div');
        cell.className = 'schedule-month-cell other-month';
        
        const numLabel = document.createElement('span');
        numLabel.className = 'schedule-month-day-num';
        numLabel.textContent = d;
        cell.appendChild(numLabel);

        calendarGrid.appendChild(cell);
    }

    monthWrapper.appendChild(calendarGrid);
    container.appendChild(monthWrapper);
}

// Opens the Day Detail note modal (top right of wireframe with lined paper and tasks)
export function openDayDetailModal(targetDate, onSelectDay, onOpenEventModal) {
    let modalOverlay = document.getElementById('scheduleDayDetailModal');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'scheduleDayDetailModal';
        modalOverlay.className = 'schedule-modal-overlay';
        document.body.appendChild(modalOverlay);
    }

    const day = targetDate.getDate();
    const month = targetDate.getMonth() + 1;
    const dateFormatted = `${day}/${month}`;
    const fullDateFormatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${targetDate.getFullYear()}`;

    const events = getEventsForDate(targetDate);
    const todos = getToDosForDate(targetDate);

    modalOverlay.innerHTML = `
        <div class="schedule-day-detail-content">
            <div class="schedule-day-detail-header">
                <div class="schedule-detail-title-row">
                    <span class="schedule-detail-date-badge">${dateFormatted}</span>
                    <span class="schedule-detail-date-full">${fullDateFormatted}</span>
                </div>
                <div class="schedule-detail-actions">
                    <button id="detailJumpDayBtn" class="schedule-detail-jump-btn" title="Open in Day View">Timeline ↗</button>
                    <button id="closeDayDetailBtn" class="schedule-detail-close-btn">&times;</button>
                </div>
            </div>

            <!-- Lined Notes & Event List Container -->
            <div class="schedule-day-detail-body">
                <div class="schedule-detail-section-title">SCHEDULED EVENTS</div>
                <div id="detailEventsList" class="schedule-detail-events-list">
                    ${events.length === 0 ? '<div class="schedule-detail-empty">No events scheduled.</div>' : ''}
                </div>

                <div class="schedule-detail-section-title" style="margin-top: 18px;">TO-DO LIST</div>
                <div id="detailTodosList" class="schedule-detail-todos-list">
                    ${todos.length === 0 ? '<div class="schedule-detail-empty">No tasks for this day.</div>' : ''}
                </div>

                <!-- Add quick task row -->
                <div class="schedule-detail-new-task">
                    <input type="text" id="detailNewTaskInput" class="schedule-detail-input" placeholder="Add task or note..." />
                    <button type="button" id="detailAddEventBtn" class="schedule-detail-add-event-btn">+ Event</button>
                </div>
            </div>
        </div>
    `;

    modalOverlay.style.display = 'flex';

    // Populate events list
    const eventsList = modalOverlay.querySelector('#detailEventsList');
    if (events.length > 0) {
        eventsList.innerHTML = '';
        events.forEach(evt => {
            const item = document.createElement('div');
            item.className = 'schedule-detail-event-item';
            item.style.borderLeftColor = evt.color || '#ff9f43';

            const time = document.createElement('span');
            time.className = 'schedule-detail-event-time';
            time.textContent = `${evt.startTime} - ${evt.endTime}`;

            const title = document.createElement('span');
            title.className = 'schedule-detail-event-title';
            title.textContent = evt.title;
            title.style.color = evt.color || '#fff';

            item.appendChild(time);
            item.appendChild(title);
            eventsList.appendChild(item);
        });
    }

    // Populate todos list
    const todosList = modalOverlay.querySelector('#detailTodosList');
    if (todos.length > 0) {
        todosList.innerHTML = '';
        todos.forEach(todo => {
            const item = document.createElement('div');
            item.className = `schedule-detail-todo-item ${todo.completed ? 'completed' : ''}`;

            const checkbox = document.createElement('button');
            checkbox.type = 'button';
            checkbox.className = `schedule-todo-checkbox ${todo.completed ? 'checked' : ''}`;
            checkbox.innerHTML = todo.completed ? '✓' : '';

            const text = document.createElement('span');
            text.className = 'schedule-detail-todo-text';
            text.textContent = todo.text;

            checkbox.addEventListener('click', () => {
                const updated = toggleToDoComplete(todo.id);
                if (updated) {
                    item.classList.toggle('completed', updated.completed);
                    checkbox.classList.toggle('checked', updated.completed);
                    checkbox.innerHTML = updated.completed ? '✓' : '';
                }
            });

            item.appendChild(text);
            item.appendChild(checkbox);
            todosList.appendChild(item);
        });
    }

    // New task input handler
    const newTaskInput = modalOverlay.querySelector('#detailNewTaskInput');
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    
    newTaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && newTaskInput.value.trim()) {
            saveToDo({
                date: dateStr,
                text: newTaskInput.value.trim(),
                completed: false,
                category: 'personal'
            });
            openDayDetailModal(targetDate, onSelectDay, onOpenEventModal);
        }
    });

    // Add event button
    const addEventBtn = modalOverlay.querySelector('#detailAddEventBtn');
    addEventBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        if (typeof onOpenEventModal === 'function') {
            onOpenEventModal(targetDate);
        }
    });

    // Jump to timeline Day view button
    const jumpBtn = modalOverlay.querySelector('#detailJumpDayBtn');
    jumpBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        if (typeof onSelectDay === 'function') {
            onSelectDay(targetDate);
        }
    });

    // Close button
    const closeBtn = modalOverlay.querySelector('#closeDayDetailBtn');
    closeBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });

    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    };
}
