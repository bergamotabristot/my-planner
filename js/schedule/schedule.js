// js/schedule/schedule.js
// Main Schedule Controller: Coordinates Day, Week, Month views, top navigation, and Event Creation modal

import { renderDayView } from './day.js';
import { renderWeekView } from './week.js';
import { renderMonthView } from './month.js';
import { 
    saveEvent, 
    deleteEvent, 
    formatDateKey, 
    CATEGORIES, 
    clearCompletedToDosForDate 
} from '../database/tasks.js';
import { subscribeUserChange } from '../database/database.js';
import { openGlobalMenu } from '../settings/settings.js';

let currentView = 'day'; // 'day' | 'week' | 'month'
let currentDate = new Date();
let selectedCategory = 'all';
let isInitialized = false;

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function initSchedule() {
    const scheduleView = document.getElementById('schedule-view');
    if (!scheduleView) return;

    renderScheduleLayout(scheduleView);
    setupEventModal();
    setupOptionsMenu();
    updateView();

    if (!isInitialized) {
        subscribeUserChange(() => {
            updateView();
        });
        isInitialized = true;
    }
}

export function resetScheduleToCurrent() {
    currentDate = new Date();
    updateView();
}

function renderScheduleLayout(container) {
    container.innerHTML = `
        <div class="schedule-top-nav">
            <div class="schedule-view-switcher">
                <button class="schedule-tab-btn ${currentView === 'day' ? 'active' : ''}" data-view="day">Day</button>
                <button class="schedule-tab-btn ${currentView === 'week' ? 'active' : ''}" data-view="week">Week</button>
                <button class="schedule-tab-btn ${currentView === 'month' ? 'active' : ''}" data-view="month">Month</button>
            </div>
            <button id="scheduleOptionsBtn" class="schedule-options-btn" title="More Options">•••</button>
        </div>

        <div class="schedule-date-nav">
            <button id="schedulePrevDateBtn" class="schedule-nav-arrow">&lt;</button>
            <span id="scheduleDateLabel" class="schedule-date-label"></span>
            <button id="scheduleNextDateBtn" class="schedule-nav-arrow">&gt;</button>
        </div>

        <!-- Subviews Containers -->
        <div id="scheduleSubViewContainer" class="schedule-subview-container"></div>

        <!-- Options Popup Menu -->
        <div id="scheduleOptionsMenu" class="schedule-dropdown-menu" style="display: none;">
            <button class="schedule-dropdown-item" id="optJumpToday">Go to Today</button>
            <button class="schedule-dropdown-item" id="optClearCompleted">Clear Completed Tasks</button>
            <button class="schedule-dropdown-item" id="optNewEvent">+ New Event</button>
        </div>

        <!-- Event Creation / Edit Modal -->
        <div id="scheduleEventModal" class="schedule-modal-overlay" style="display: none;">
            <div class="schedule-modal-content event-modal">
                <div class="schedule-modal-body">
                    <input type="text" id="eventTitleInput" class="event-title-input" placeholder="Name..." autofocus />

                    <!-- Start and Finish Time -->
                    <div class="event-time-row">
                        <div class="time-field">
                            <label>start</label>
                            <input type="time" id="eventStartTimeInput" class="time-box" value="07:30" />
                        </div>
                        <div class="time-field">
                            <label>finish</label>
                            <input type="time" id="eventEndTimeInput" class="time-box" value="08:30" />
                        </div>
                    </div>

                    <!-- Category Selector -->
                    <div class="event-field-group">
                        <label class="field-label">Category</label>
                        <div id="eventCategoryPills" class="category-pills-row">
                            ${CATEGORIES.filter(c => c.id !== 'all').map(c => `
                                <button type="button" class="category-pill-opt" data-cat="${c.id}" style="--cat-color: ${c.color}">
                                    ${c.name}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Repeat Settings (matching wireframe diagram) -->
                    <div class="event-field-group">
                        <div class="repeat-header-row">
                            <label class="field-label">Repeat</label>
                            <button type="button" id="eventRepeatTriggerBtn" class="repeat-summary-btn">never ▼</button>
                        </div>

                        <div id="eventRepeatOptionsCard" class="repeat-options-card" style="display: none;">
                            <div class="repeat-days-grid" id="repeatDaysGrid">
                                <button type="button" class="repeat-day-btn" data-day="1">Monday</button>
                                <button type="button" class="repeat-day-btn" data-day="2">Tuesday</button>
                                <button type="button" class="repeat-day-btn" data-day="3">Wednesday</button>
                                <button type="button" class="repeat-day-btn" data-day="4">Thursday</button>
                                <button type="button" class="repeat-day-btn" data-day="5">Friday</button>
                                <button type="button" class="repeat-day-btn" data-day="6">Saturday</button>
                                <button type="button" class="repeat-day-btn" data-day="0">Sunday</button>
                            </div>

                            <div class="repeat-duration-row">
                                <span>For...</span>
                                <div class="stepper-box">
                                    <input type="number" id="repeatWeeksCountInput" min="1" max="52" value="3" class="weeks-input" />
                                    <span>weeks</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="event-modal-footer">
                    <button type="button" id="deleteEventModalBtn" class="modal-delete-btn" style="display: none;">Delete</button>
                    <div class="modal-actions-right">
                        <button type="button" id="cancelEventModalBtn" class="modal-action-btn cancel-btn">✕</button>
                        <button type="button" id="saveEventModalBtn" class="modal-action-btn confirm-btn">✓</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // View tab clicks
    const tabBtns = container.querySelectorAll('.schedule-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.getAttribute('data-view');
            updateView();
        });
    });

    // Date arrow clicks
    const prevBtn = container.querySelector('#schedulePrevDateBtn');
    const nextBtn = container.querySelector('#scheduleNextDateBtn');

    prevBtn.addEventListener('click', () => shiftDate(-1));
    nextBtn.addEventListener('click', () => shiftDate(1));

    // Listen to custom child events
    container.addEventListener('categorychange', (e) => {
        selectedCategory = e.detail.category;
        updateView();
    });

    container.addEventListener('todoupdated', () => {
        updateView();
    });
}

function shiftDate(direction) {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + direction);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    }
    updateView();
}

function updateDateLabel() {
    const label = document.getElementById('scheduleDateLabel');
    if (!label) return;

    if (currentView === 'day') {
        const d = String(currentDate.getDate()).padStart(2, '0');
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        label.textContent = `${d}/${m}`;
    } else if (currentView === 'week') {
        const start = new Date(currentDate);
        const dayOfWeek = start.getDay();
        const diffToMonday = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start.setDate(diffToMonday);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const startDay = String(start.getDate()).padStart(2, '0');
        const endDay = String(end.getDate()).padStart(2, '0');
        const endMonth = String(end.getMonth() + 1).padStart(2, '0');

        label.textContent = `${startDay}-${endDay}/${endMonth}`;
    } else if (currentView === 'month') {
        const monthName = MONTH_NAMES[currentDate.getMonth()];
        const year = currentDate.getFullYear();
        const currentYear = new Date().getFullYear();
        label.textContent = (year === currentYear) ? monthName : `${monthName} ${year}`;
    }
}

function updateView() {
    updateDateLabel();

    const subviewContainer = document.getElementById('scheduleSubViewContainer');
    if (!subviewContainer) return;

    if (currentView === 'day') {
        renderDayView(
            subviewContainer, 
            currentDate, 
            selectedCategory, 
            (targetDate) => openEventModal(null, targetDate),
            (eventObj) => openEventModal(eventObj, currentDate)
        );
    } else if (currentView === 'week') {
        renderWeekView(
            subviewContainer, 
            currentDate, 
            (selectedDate) => {
                currentDate = selectedDate;
                currentView = 'day';
                const dayTab = document.querySelector('.schedule-tab-btn[data-view="day"]');
                if (dayTab) {
                    document.querySelectorAll('.schedule-tab-btn').forEach(b => b.classList.remove('active'));
                    dayTab.classList.add('active');
                }
                updateView();
            },
            (targetDate) => openEventModal(null, targetDate)
        );
    } else if (currentView === 'month') {
        renderMonthView(
            subviewContainer, 
            currentDate, 
            (selectedDate) => {
                currentDate = selectedDate;
                currentView = 'day';
                const dayTab = document.querySelector('.schedule-tab-btn[data-view="day"]');
                if (dayTab) {
                    document.querySelectorAll('.schedule-tab-btn').forEach(b => b.classList.remove('active'));
                    dayTab.classList.add('active');
                }
                updateView();
            },
            (targetDate) => openEventModal(null, targetDate)
        );
    }
}

// ---------------- OPTIONS MENU ----------------
function setupOptionsMenu() {
    const btn = document.getElementById('scheduleOptionsBtn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openGlobalMenu('menu');
    });
}

// ---------------- EVENT MODAL LOGIC ----------------
let editingEventId = null;
let modalSelectedCategory = 'personal';
let modalRepeatType = 'never';
let modalRepeatDays = [1, 2, 3, 4, 5]; // Default weekdays
let modalEventDate = new Date();

function setupEventModal() {
    const modal = document.getElementById('scheduleEventModal');
    if (!modal) return;

    const cancelBtn = document.getElementById('cancelEventModalBtn');
    const saveBtn = document.getElementById('saveEventModalBtn');
    const deleteBtn = document.getElementById('deleteEventModalBtn');
    const repeatTriggerBtn = document.getElementById('eventRepeatTriggerBtn');
    const repeatCard = document.getElementById('eventRepeatOptionsCard');

    // Category pills selection
    const catPills = modal.querySelectorAll('.category-pill-opt');
    catPills.forEach(pill => {
        pill.addEventListener('click', () => {
            catPills.forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            modalSelectedCategory = pill.getAttribute('data-cat');
        });
    });

    // Repeat trigger accordion toggle
    repeatTriggerBtn.addEventListener('click', () => {
        const isOpen = repeatCard.style.display === 'block';
        repeatCard.style.display = isOpen ? 'none' : 'block';
        if (!isOpen && modalRepeatType === 'never') {
            modalRepeatType = 'weekly';
            updateRepeatTriggerLabel();
        }
    });

    // Day buttons in repeat card
    const dayBtns = modal.querySelectorAll('.repeat-day-btn');
    dayBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const dayNum = parseInt(btn.getAttribute('data-day'));
            if (modalRepeatDays.includes(dayNum)) {
                modalRepeatDays = modalRepeatDays.filter(d => d !== dayNum);
                btn.classList.remove('selected');
            } else {
                modalRepeatDays.push(dayNum);
                btn.classList.add('selected');
            }
            modalRepeatType = modalRepeatDays.length > 0 ? 'weekly' : 'never';
            updateRepeatTriggerLabel();
        });
    });

    // Cancel
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Delete
    deleteBtn.addEventListener('click', () => {
        if (editingEventId) {
            deleteEvent(editingEventId);
            modal.style.display = 'none';
            updateView();
        }
    });

    // Save
    saveBtn.addEventListener('click', () => {
        const titleInput = document.getElementById('eventTitleInput');
        const startInput = document.getElementById('eventStartTimeInput');
        const endInput = document.getElementById('eventEndTimeInput');
        const weeksInput = document.getElementById('repeatWeeksCountInput');

        const title = titleInput.value.trim() || 'New Event';
        const startTime = startInput.value || '08:00';
        const endTime = endInput.value || '09:00';
        const weeksCount = parseInt(weeksInput.value) || 3;

        const catObj = CATEGORIES.find(c => c.id === modalSelectedCategory) || CATEGORIES[1];
        const dateStr = formatDateKey(modalEventDate);

        const eventData = {
            id: editingEventId || undefined,
            title,
            date: dateStr,
            startTime,
            endTime,
            category: modalSelectedCategory,
            color: catObj.color,
            repeat: {
                type: modalRepeatType,
                days: modalRepeatDays,
                weeksCount: (modalRepeatType !== 'never' ? weeksCount : 0),
                startDate: dateStr
            }
        };

        saveEvent(eventData);
        modal.style.display = 'none';
        updateView();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function updateRepeatTriggerLabel() {
    const trigger = document.getElementById('eventRepeatTriggerBtn');
    if (!trigger) return;

    if (modalRepeatType === 'never' || modalRepeatDays.length === 0) {
        trigger.textContent = 'never ▼';
    } else {
        const selectedNames = modalRepeatDays.map(d => DAYS_SHORT[(d === 0 ? 6 : d - 1)]).join(', ');
        trigger.textContent = `${selectedNames} ▼`;
    }
}

export function openEventModal(existingEvent = null, targetDate = null) {
    const modal = document.getElementById('scheduleEventModal');
    if (!modal) return;

    modalEventDate = targetDate || currentDate;

    const titleInput = document.getElementById('eventTitleInput');
    const startInput = document.getElementById('eventStartTimeInput');
    const endInput = document.getElementById('eventEndTimeInput');
    const deleteBtn = document.getElementById('deleteEventModalBtn');
    const repeatCard = document.getElementById('eventRepeatOptionsCard');
    const weeksInput = document.getElementById('repeatWeeksCountInput');
    const catPills = modal.querySelectorAll('.category-pill-opt');
    const dayBtns = modal.querySelectorAll('.repeat-day-btn');

    repeatCard.style.display = 'none';

    if (existingEvent) {
        editingEventId = existingEvent.id;
        titleInput.value = existingEvent.title;
        startInput.value = existingEvent.startTime;
        endInput.value = existingEvent.endTime;
        modalSelectedCategory = existingEvent.category || 'personal';
        modalRepeatType = existingEvent.repeat?.type || 'never';
        modalRepeatDays = existingEvent.repeat?.days ? [...existingEvent.repeat.days] : [1, 2, 3, 4, 5];
        weeksInput.value = existingEvent.repeat?.weeksCount || 3;
        deleteBtn.style.display = 'block';
    } else {
        editingEventId = null;
        titleInput.value = '';
        startInput.value = '08:00';
        endInput.value = '09:00';
        modalSelectedCategory = selectedCategory !== 'all' ? selectedCategory : 'personal';
        modalRepeatType = 'never';
        modalRepeatDays = [1, 2, 3, 4, 5];
        weeksInput.value = 3;
        deleteBtn.style.display = 'none';
    }

    // Select category pill
    catPills.forEach(pill => {
        pill.classList.toggle('selected', pill.getAttribute('data-cat') === modalSelectedCategory);
    });

    // Select repeat day buttons
    dayBtns.forEach(btn => {
        const d = parseInt(btn.getAttribute('data-day'));
        btn.classList.toggle('selected', modalRepeatDays.includes(d) && modalRepeatType !== 'never');
    });

    updateRepeatTriggerLabel();
    modal.style.display = 'flex';
    setTimeout(() => titleInput.focus(), 100);
}
