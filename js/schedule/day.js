// js/schedule/day.js
// Day View: Hourly timeline schedule (24 Hours), event block layout, and to-do section

import { 
    getEventsForDate, 
    getToDosForDate, 
    saveToDo, 
    toggleToDoComplete, 
    deleteToDo, 
    CATEGORIES 
} from '../database/tasks.js';

const START_HOUR = 0;
const END_HOUR = 23;
const HOUR_HEIGHT = 50; // pixels per hour

export function renderDayView(container, currentDate, selectedCategory, onOpenEventModal, onEditEvent) {
    container.innerHTML = '';

    const dayViewWrapper = document.createElement('div');
    dayViewWrapper.className = 'schedule-day-wrapper';

    // 1. Timeline Section
    const timelineSection = document.createElement('div');
    timelineSection.className = 'schedule-timeline-container';

    const timelineHoursCol = document.createElement('div');
    timelineHoursCol.className = 'schedule-hours-col';

    const timelineGridCol = document.createElement('div');
    timelineGridCol.className = 'schedule-grid-col';

    // Create hour slots (00:00 to 23:00)
    for (let h = START_HOUR; h <= END_HOUR; h++) {
        const hourLabel = document.createElement('div');
        hourLabel.className = 'schedule-hour-label';
        hourLabel.textContent = `${String(h).padStart(2, '0')}:00`;
        timelineHoursCol.appendChild(hourLabel);

        const gridLine = document.createElement('div');
        gridLine.className = 'schedule-grid-line';
        gridLine.dataset.hour = h;
        timelineGridCol.appendChild(gridLine);
    }

    // Render Events onto the grid
    let events = getEventsForDate(currentDate);
    if (selectedCategory && selectedCategory !== 'all') {
        events = events.filter(e => e.category === selectedCategory);
    }

    const eventsLayer = document.createElement('div');
    eventsLayer.className = 'schedule-events-layer';

    // Calculate layout & overlap columns
    const positionedEvents = computeEventPositions(events);

    positionedEvents.forEach(({ event, top, height, leftPercent, widthPercent }) => {
        const eventEl = document.createElement('div');
        eventEl.className = 'schedule-event-block';
        eventEl.style.top = `${top}px`;
        eventEl.style.height = `${Math.max(height, 28)}px`;
        eventEl.style.left = `${leftPercent}%`;
        eventEl.style.width = `${widthPercent}%`;
        eventEl.style.borderColor = event.color || '#ff9f43';
        eventEl.style.backgroundColor = `${event.color || '#ff9f43'}1a`;

        const titleEl = document.createElement('div');
        titleEl.className = 'schedule-event-title';
        titleEl.textContent = event.title;
        titleEl.style.color = event.color || '#fff';

        const timeEl = document.createElement('div');
        timeEl.className = 'schedule-event-time';
        timeEl.textContent = `${event.startTime} - ${event.endTime}`;

        eventEl.appendChild(titleEl);
        eventEl.appendChild(timeEl);

        // Click to edit
        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof onEditEvent === 'function') {
                onEditEvent(event);
            }
        });

        eventsLayer.appendChild(eventEl);
    });

    timelineGridCol.appendChild(eventsLayer);
    timelineSection.appendChild(timelineHoursCol);
    timelineSection.appendChild(timelineGridCol);
    dayViewWrapper.appendChild(timelineSection);

    // 2. Middle Action Bar: [+] Add Button only
    const middleBar = document.createElement('div');
    middleBar.className = 'schedule-middle-bar';

    const addBtn = document.createElement('button');
    addBtn.className = 'schedule-add-btn';
    addBtn.innerHTML = '+';
    addBtn.title = 'Add Event or Task';
    addBtn.addEventListener('click', () => {
        if (typeof onOpenEventModal === 'function') {
            onOpenEventModal(currentDate);
        }
    });

    middleBar.appendChild(addBtn);
    dayViewWrapper.appendChild(middleBar);

    // 3. To-Do Section
    const todoSection = document.createElement('div');
    todoSection.className = 'schedule-todo-section';

    const todoHeader = document.createElement('h3');
    todoHeader.className = 'schedule-todo-header';
    todoHeader.textContent = 'to-do';
    todoSection.appendChild(todoHeader);

    const todoListContainer = document.createElement('div');
    todoListContainer.className = 'schedule-todo-list';

    const todos = getToDosForDate(currentDate);

    todos.forEach((todo) => {
        const row = createTodoRow(todo, currentDate, container);
        todoListContainer.appendChild(row);
    });

    // New item placeholder row at bottom
    const newRow = createNewTodoRow(currentDate, container);
    todoListContainer.appendChild(newRow);

    todoSection.appendChild(todoListContainer);
    dayViewWrapper.appendChild(todoSection);

    container.appendChild(dayViewWrapper);
}

// Convert "HH:MM" string to minutes from 00:00
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

// Computes top, height, and side-by-side positioning for overlapping events
function computeEventPositions(events) {
    if (!events || events.length === 0) return [];

    const startBaseMinutes = START_HOUR * 60;

    const parsedEvents = events.map(evt => {
        const startMin = timeToMinutes(evt.startTime);
        let endMin = timeToMinutes(evt.endTime);
        if (endMin <= startMin) endMin = startMin + 45; // Minimum 45min if invalid

        return {
            event: evt,
            startMin,
            endMin,
            top: Math.max(0, ((startMin - startBaseMinutes) / 60) * HOUR_HEIGHT),
            height: Math.max(26, ((endMin - startMin) / 60) * HOUR_HEIGHT)
        };
    }).sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

    // Simple overlapping columns grouping
    const columns = [];

    parsedEvents.forEach(item => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const hasOverlap = col.some(existing => (
                item.startMin < existing.endMin && item.endMin > existing.startMin
            ));
            if (!hasOverlap) {
                col.push(item);
                item.colIndex = i;
                placed = true;
                break;
            }
        }
        if (!placed) {
            item.colIndex = columns.length;
            columns.push([item]);
        }
    });

    return parsedEvents.map(item => {
        const overlappingInRow = parsedEvents.filter(other => (
            item.startMin < other.endMin && item.endMin > other.startMin
        ));
        const activeCols = Math.max(...overlappingInRow.map(o => (o.colIndex || 0))) + 1;
        const widthPercent = (100 / activeCols) - 2;
        const leftPercent = (item.colIndex || 0) * (100 / activeCols);

        return {
            event: item.event,
            top: item.top,
            height: item.height,
            leftPercent,
            widthPercent
        };
    });
}

function createTodoRow(todo, currentDate, container) {
    const row = document.createElement('div');
    row.className = `schedule-todo-row ${todo.completed ? 'completed' : ''}`;
    row.dataset.id = todo.id;

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'schedule-todo-input';
    textInput.value = todo.text;
    textInput.placeholder = 'Task description...';

    textInput.addEventListener('blur', () => {
        if (textInput.value.trim() !== todo.text) {
            if (textInput.value.trim() === '') {
                deleteToDo(todo.id);
                row.remove();
            } else {
                todo.text = textInput.value.trim();
                saveToDo(todo);
            }
        }
    });

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            textInput.blur();
        }
    });

    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = `schedule-todo-checkbox ${todo.completed ? 'checked' : ''}`;
    checkbox.innerHTML = todo.completed ? '✓' : '';

    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = toggleToDoComplete(todo.id);
        if (updated) {
            row.classList.toggle('completed', updated.completed);
            checkbox.classList.toggle('checked', updated.completed);
            checkbox.innerHTML = updated.completed ? '✓' : '';
        }
    });

    row.appendChild(textInput);
    row.appendChild(checkbox);
    return row;
}

function createNewTodoRow(currentDate, container) {
    const row = document.createElement('div');
    row.className = 'schedule-todo-row new-row';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'schedule-todo-input';
    textInput.placeholder = '...';

    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = 'schedule-todo-checkbox disabled';

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && textInput.value.trim()) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            saveToDo({
                date: dateStr,
                text: textInput.value.trim(),
                completed: false,
                category: 'personal'
            });
            textInput.value = '';
            container.dispatchEvent(new CustomEvent('todoupdated', { bubbles: true }));
        }
    });

    textInput.addEventListener('blur', () => {
        if (textInput.value.trim()) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            saveToDo({
                date: dateStr,
                text: textInput.value.trim(),
                completed: false,
                category: 'personal'
            });
            textInput.value = '';
            container.dispatchEvent(new CustomEvent('todoupdated', { bubbles: true }));
        }
    });

    row.appendChild(textInput);
    row.appendChild(checkbox);
    return row;
}