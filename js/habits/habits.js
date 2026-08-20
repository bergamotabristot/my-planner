// js/habits/habits.js
// Complete Habits & Sleep Tracker: Improved Year View with large 2-row squares, Interactive Sleep Drag Slider & Upgraded Modal

import { 
    getHabits, 
    saveHabits, 
    addHabit, 
    updateHabit, 
    deleteHabit, 
    getHabitDayStatus, 
    setHabitDayStatus, 
    getSleepDataForWeek, 
    saveSleepDataForWeek 
} from '../database/habits.js';
import { subscribeUserChange } from '../database/database.js';
import { openGlobalMenu } from '../settings/settings.js';
import { 
    getStartOfWeek, 
    getWeekKey, 
    formatDateKey, 
    formatDateShort, 
    formatDateFull, 
    formatWeekRangeLabel, 
    DAYS_FULL, 
    DAYS_SHORT,
    MONTH_NAMES, 
    MONTH_NAMES_SHORT 
} from '../utils/dates.js';

let currentMode = 'week'; // 'week' | 'month' | 'year'
let currentDate = new Date();
let selectedYearHabitIndex = 0;
let isInitialized = false;

// Sleep state
let sleepData = [];
let modalSleepIndex = null;
let modalSelectedRating = 4;
let modalSelectedHours = 7.5;
let isDraggingSleep = false;
let activeDragIndex = null;

// Habit edit modal state
let editingHabitId = null;
let modalSkipDays = [];

const QUALITY_LABELS = {
    1: 'Poor (1★)',
    2: 'Fair (2★)',
    3: 'Good (3★)',
    4: 'Great (4★)',
    5: 'Excellent (5★)'
};

export function initHabits() {
    const dropdownBtn = document.getElementById('habitsDropdownBtn');
    const dropdownMenu = document.getElementById('habitsDropdownMenu');
    const options = document.querySelectorAll('.habits-option');
    const subViews = document.querySelectorAll('.habits-sub-view');
    const clickableText = dropdownBtn ? dropdownBtn.querySelector('.clickable-text') : null;
    const prevBtn = document.getElementById('habitsPrevBtn');
    const nextBtn = document.getElementById('habitsNextBtn');
    const optionsBtn = document.getElementById('habitsOptionsBtn');

    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = dropdownMenu.style.display === 'flex';
            dropdownMenu.style.display = isOpen ? 'none' : 'flex';
        };
    }

    if (optionsBtn) {
        optionsBtn.onclick = () => {
            openGlobalMenu('menu');
        };
    }

    options.forEach(option => {
        option.onclick = () => {
            const targetId = option.getAttribute('data-target');
            
            // Fixed mode mapping to prevent string mismatch issues
            if (targetId === 'habits-week') currentMode = 'week';
            else if (targetId === 'habits-month') currentMode = 'month';
            else if (targetId === 'habits-year') currentMode = 'year';

            if (clickableText) clickableText.textContent = option.textContent;
            if (dropdownMenu) dropdownMenu.style.display = 'none';

            subViews.forEach(view => {
                view.style.display = (view.id === targetId) ? 'block' : 'none';
            });

            updateDateDisplay();
            renderActiveSubView();
        };
    });

    if (prevBtn) prevBtn.onclick = () => shiftDate(-1);
    if (nextBtn) nextBtn.onclick = () => shiftDate(1);

    document.addEventListener('click', (e) => {
        if (dropdownMenu && !dropdownBtn?.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });

    setupSleepModal();
    setupSleepChartInteractivity();
    setupHabitModal();

    if (!isInitialized) {
        subscribeUserChange(() => {
            resetHabitsToCurrent();
        });
        isInitialized = true;
    }

    resetHabitsToCurrent();
}

export function resetHabitsToCurrent() {
    currentDate = new Date();
    loadSleepData();
    updateDateDisplay();
    renderActiveSubView();
}

function shiftDate(direction) {
    if (currentMode === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
        loadSleepData();
    } else if (currentMode === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    } else if (currentMode === 'year') {
        currentDate.setFullYear(currentDate.getFullYear() + direction);
    }
    updateDateDisplay();
    renderActiveSubView();
}

function updateDateDisplay() {
    const dateDisplay = document.getElementById('habitsDateDisplay');
    if (!dateDisplay) return;

    if (currentMode === 'week') {
        dateDisplay.textContent = formatWeekRangeLabel(currentDate);
    } else if (currentMode === 'month') {
        const monthName = MONTH_NAMES[currentDate.getMonth()];
        const year = currentDate.getFullYear();
        dateDisplay.textContent = `${monthName.toLowerCase()} ${year}`;
    } else if (currentMode === 'year') {
        dateDisplay.textContent = currentDate.getFullYear();
    }
}

function renderActiveSubView() {
    if (currentMode === 'week') {
        renderHabitsTable();
        renderSleepChart();
    } else if (currentMode === 'month') {
        renderHabitsMonthView();
    } else if (currentMode === 'year') {
        renderHabitsYearView();
    }
}

// ----------------- WEEK HABITS TABLE WITH TODAY COLUMN HIGHLIGHT -----------------

function getWeekDayDate(baseDate, dayIndex) {
    const start = getStartOfWeek(baseDate);
    const d = new Date(start);
    d.setDate(start.getDate() + dayIndex);
    return d;
}

export function renderHabitsTable() {
    const tableBody = document.getElementById('habitsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const habits = getHabits();
    const now = new Date();

    const currentWeekKey = getWeekKey(currentDate);
    const liveWeekKey = getWeekKey(now);

    let todayDayIndex = -1;

    if (currentWeekKey === liveWeekKey) {
        const jsDay = now.getDay();
        todayDayIndex = (jsDay === 0 ? 6 : jsDay - 1);
    } else {
        const startTarget = getStartOfWeek(currentDate);
        const startLive = getStartOfWeek(now);

        // Future week
        if (startTarget > startLive) {
            todayDayIndex = -1;
        } 
        // Past week
        else {
            todayDayIndex = 6;
        }
    }

    // Set today column highlight
    const headers = document.querySelectorAll('.habits-table thead th');

    headers.forEach((th, idx) => {
        const dayIdx = idx - 1;

        if (dayIdx >= 0 && dayIdx < 7) {
            th.classList.toggle(
                'today-col-header',
                dayIdx === todayDayIndex
            );
        }
    });

    habits.forEach((habit) => {
        const tr = document.createElement('tr');

        // Habit name
        const nameTd = document.createElement('td');
        nameTd.className = 'habit-name-cell';

        const nameLabel = document.createElement('span');
        nameLabel.className = 'habit-name-label';
        nameLabel.textContent = habit.name || 'New Habit...';
        nameLabel.title = 'Click to edit habit and skip rules';

        nameLabel.addEventListener('click', () => {
            openHabitModal(habit);
        });

        nameTd.appendChild(nameLabel);
        tr.appendChild(nameTd);

        let completedCount = 0;
        let totalTracked = 0;

        // Monday → Sunday
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {

            const targetDate = getWeekDayDate(currentDate, dayIndex);

            const y = targetDate.getFullYear();
            const m = targetDate.getMonth();
            const d = targetDate.getDate();

            const jsDay = targetDate.getDay();

            const isToday =
                currentWeekKey === liveWeekKey &&
                dayIndex === todayDayIndex;

            const isFuture = targetDate > now;

            const isSkippedDay =
                habit.skipDays &&
                habit.skipDays.includes(jsDay);

            const status =
                getHabitDayStatus(habit, y, m, d);

            const dayTd = document.createElement('td');

            dayTd.className =
                `habit-cell ${dayIndex === todayDayIndex ? 'today-col-cell' : ''}`;

            /*
             * ============================================================
             * STATE LOGIC
             *
             * ✓ = completed
             * - = past/present and not completed
             * · = skipped by habit rule
             * empty = future
             * ============================================================
             */

            if (isSkippedDay && !status) {

                // Skipped by habit rule
                dayTd.textContent = '·';
                dayTd.classList.add('skipped');

            } else if (status === true) {

                // Completed
                dayTd.textContent = '✓';
                dayTd.classList.add('checked');

                completedCount++;
                totalTracked++;

            } else if (isFuture) {

                // Future → empty
                dayTd.textContent = '';
                dayTd.classList.add('unchecked');

            } else {

                // Past/today and not completed → dash
                dayTd.textContent = '-';
                dayTd.classList.add('dash');

                totalTracked++;
            }

            /*
             * ============================================================
             * CLICK
             *
             * Empty/future → ✓
             * ✓ → -
             * - → ✓
             *
             * Skipped days remain controlled by skip rules.
             * ============================================================
             */

            dayTd.addEventListener('click', () => {

                if (!habit.name.trim()) return;

                // Don't allow future days to be manually marked
                if (isFuture) return;

                let nextStatus;

                if (status === true) {
                    // Done → missed
                    nextStatus = 'dash';

                } else {
                    // Missed/unmarked → done
                    nextStatus = true;
                }

                setHabitDayStatus(
                    habit.id,
                    y,
                    m,
                    d,
                    nextStatus
                );

                renderHabitsTable();
            });

            tr.appendChild(dayTd);
        }

        // Score
        const scoreTd = document.createElement('td');
        scoreTd.className = 'habit-score-cell';

        scoreTd.textContent = habit.name.trim()
            ? `${completedCount}/${totalTracked}`
            : '';

        tr.appendChild(scoreTd);

        tableBody.appendChild(tr);
    });

    // Add Habit row
    const addRow = document.createElement('tr');
    addRow.className = 'add-habit-row';

    const addTd = document.createElement('td');
    addTd.colSpan = 9;
    addTd.style.textAlign = 'left';
    addTd.style.padding = '8px 10px';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-habit-trigger-btn';
    addBtn.innerHTML = '+ Add Habit';

    addBtn.onclick = () => openHabitModal(null);

    addTd.appendChild(addBtn);
    addRow.appendChild(addTd);
    tableBody.appendChild(addRow);
}

// ----------------- HABIT MODAL -----------------

function setupHabitModal() {
    let modal = document.getElementById('habitFormModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'habitFormModal';
        modal.className = 'schedule-modal-overlay';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="habit-modal-content">
                <input type="text" id="habitModalNameInput" class="habit-modal-title-input" placeholder="Habit Name (e.g. Drink Water)..." />

                <!-- Skip Rule Selector matching wireframe -->
                <div class="habit-skip-row">
                    <span class="skip-label">skip:</span>
                    <button type="button" id="habitSkipTriggerBtn" class="skip-trigger-btn">none ▼</button>
                </div>

                <!-- Skip Days Accordion (Monday to Sunday) -->
                <div id="habitSkipOptionsCard" class="skip-options-card" style="display: none;">
                    <div class="skip-days-grid" id="habitSkipDaysGrid">
                        <button type="button" class="skip-day-btn" data-day="1">Monday</button>
                        <button type="button" class="skip-day-btn" data-day="2">Tuesday</button>
                        <button type="button" class="skip-day-btn" data-day="3">Wednesday</button>
                        <button type="button" class="skip-day-btn" data-day="4">Thursday</button>
                        <button type="button" class="skip-day-btn" data-day="5">Friday</button>
                        <button type="button" class="skip-day-btn" data-day="6">Saturday</button>
                        <button type="button" class="skip-day-btn" data-day="0">Sunday</button>
                    </div>
                </div>

                <div class="habit-modal-footer">
                    <button type="button" id="deleteHabitModalBtn" class="modal-delete-btn" style="display: none;">Delete</button>
                    <div class="habit-modal-actions-right">
                        <button type="button" id="cancelHabitModalBtn" class="habit-btn-cancel">Cancel</button>
                        <button type="button" id="saveHabitModalBtn" class="habit-btn-done">Done</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        const cancelBtn = modal.querySelector('#cancelHabitModalBtn');
        const saveBtn = modal.querySelector('#saveHabitModalBtn');
        const deleteBtn = modal.querySelector('#deleteHabitModalBtn');
        const skipTriggerBtn = modal.querySelector('#habitSkipTriggerBtn');
        const skipCard = modal.querySelector('#habitSkipOptionsCard');

        if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = 'none'; };

        if (skipTriggerBtn && skipCard) {
            skipTriggerBtn.onclick = () => {
                const isOpen = skipCard.style.display === 'block';
                skipCard.style.display = isOpen ? 'none' : 'block';
            };
        }

        modal.querySelectorAll('.skip-day-btn').forEach(btn => {
            btn.onclick = () => {
                const dayNum = parseInt(btn.getAttribute('data-day'));
                if (modalSkipDays.includes(dayNum)) {
                    modalSkipDays = modalSkipDays.filter(d => d !== dayNum);
                    btn.classList.remove('selected');
                } else {
                    modalSkipDays.push(dayNum);
                    btn.classList.add('selected');
                }
                updateSkipTriggerLabel();
            };
        });

        if (deleteBtn) {
            deleteBtn.onclick = () => {
                if (editingHabitId) {
                    deleteHabit(editingHabitId);
                    modal.style.display = 'none';
                    renderActiveSubView();
                }
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => {
                const nameInput = modal.querySelector('#habitModalNameInput');
                const name = nameInput.value.trim();
                if (!name) return;

                if (editingHabitId) {
                    updateHabit(editingHabitId, { name, skipDays: modalSkipDays });
                } else {
                    addHabit(name, modalSkipDays);
                }

                modal.style.display = 'none';
                renderActiveSubView();
            };
        }
    }
}

function updateSkipTriggerLabel() {
    const trigger = document.getElementById('habitSkipTriggerBtn');
    if (!trigger) return;

    if (modalSkipDays.length === 0) {
        trigger.textContent = 'none ▼';
    } else if (modalSkipDays.length === 2 && modalSkipDays.includes(0) && modalSkipDays.includes(6)) {
        trigger.textContent = 'weekends ▼';
    } else {
        const names = modalSkipDays.map(d => DAYS_SHORT[d === 0 ? 6 : d - 1]).join(', ');
        trigger.textContent = `${names} ▼`;
    }
}

function openHabitModal(habit = null) {
    const modal = document.getElementById('habitFormModal');
    if (!modal) setupHabitModal();

    const nameInput = document.getElementById('habitModalNameInput');
    const deleteBtn = document.getElementById('deleteHabitModalBtn');
    const skipCard = document.getElementById('habitSkipOptionsCard');
    const dayBtns = modal.querySelectorAll('.skip-day-btn');

    skipCard.style.display = 'none';

    if (habit) {
        editingHabitId = habit.id;
        nameInput.value = habit.name;
        modalSkipDays = Array.isArray(habit.skipDays) ? [...habit.skipDays] : [];
        deleteBtn.style.display = 'block';
    } else {
        editingHabitId = null;
        nameInput.value = '';
        modalSkipDays = [];
        deleteBtn.style.display = 'none';
    }

    dayBtns.forEach(btn => {
        const d = parseInt(btn.getAttribute('data-day'));
        btn.classList.toggle('selected', modalSkipDays.includes(d));
    });

    updateSkipTriggerLabel();
    document.getElementById('habitFormModal').style.display = 'flex';
    setTimeout(() => nameInput.focus(), 100);
}

// ----------------- MONTH VIEW -----------------

export function renderHabitsMonthView() {
    const container = document.getElementById('habitsMonthContainer');
    if (!container) return;
    container.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const habits = getHabits().filter(h => h.name.trim() !== '');

    habits.forEach((habit) => {
        const card = document.createElement('div');
        card.className = 'habit-month-card';

        const title = document.createElement('h4');
        title.textContent = habit.name;
        title.onclick = () => openHabitModal(habit);
        card.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'habit-month-grid';

        for (let d = 1; d <= daysInMonth; d++) {
            const targetDate = new Date(year, month, d);
            const jsDay = targetDate.getDay();
            const isSkippedDay = habit.skipDays && habit.skipDays.includes(jsDay);

            // Omit rendering completely if it's a skip day
            if (isSkippedDay) {
                continue;
            }

            const isFuture = targetDate > today;
            const status = getHabitDayStatus(habit, year, month, d);

            const box = document.createElement('div');
            box.className = 'habit-year-day-box';
            
            if (isFuture) {
                box.textContent = '';
                box.classList.add('unchecked');
            } else if (status === true) {
                box.textContent = '✓';
                box.classList.add('checked');
            } else {
                box.textContent = '-';
                box.classList.add('dash'); // Past/present uncompleted days show as dash
            }

            box.addEventListener('click', () => {
                if (isFuture) return;

                let nextStatus;
                if (status === true) {
                    nextStatus = 'dash';
                } else {
                    nextStatus = true;
                }

                setHabitDayStatus(habit.id, year, month, d, nextStatus);
                renderHabitsMonthView();
            });

            grid.appendChild(box);
        }

        card.appendChild(grid);
        container.appendChild(card);
    });

    const addCard = document.createElement('div');
    addCard.className = 'habit-month-card add-card';
    addCard.innerHTML = `<button type="button" class="add-habit-card-btn">+ New Habit</button>`;
    addCard.onclick = () => openHabitModal(null);
    container.appendChild(addCard);
}

// ----------------- YEAR VIEW (2 Stacked Rows per Month with Large Tappable Squares) -----------------

export function renderHabitsYearView() {
    const container = document.getElementById('habits-year');
    if (!container) return;
    container.innerHTML = '';

    const year = currentDate.getFullYear();
    const today = new Date();
    const validHabits = getHabits().filter(h => h.name.trim() !== '');
    
    if (validHabits.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 40px;"><button class="btn-primary" id="yearAddHabitBtn">+ Create First Habit</button></div>';
        container.querySelector('#yearAddHabitBtn')?.addEventListener('click', () => openHabitModal(null));
        return;
    }

    if (selectedYearHabitIndex >= validHabits.length) {
        selectedYearHabitIndex = 0;
    }
    const habit = validHabits[selectedYearHabitIndex];

    let totalYearCompleted = 0;
    let totalYearDays = 0;

    MONTH_NAMES_SHORT.forEach((_, monthIdx) => {
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const targetDate = new Date(year, monthIdx, d);
            if (targetDate > today) continue;

            const jsDay = targetDate.getDay();
            const isSkippedDay = habit.skipDays && habit.skipDays.includes(jsDay);
            if (isSkippedDay) continue; // Exclude skip days from totals

            totalYearDays++;
            const status = getHabitDayStatus(habit, year, monthIdx, d);
            if (status === true) {
                totalYearCompleted++;
            }
        }
    });

    const percent = totalYearDays > 0 ? Math.round((totalYearCompleted / totalYearDays) * 100) : 0;

    const summaryEl = document.createElement('div');
    summaryEl.className = 'habit-year-summary';
    summaryEl.innerHTML = `<div>${totalYearCompleted}/${totalYearDays}</div><div style="font-size: 1rem; color: #888;">${percent}%</div>`;
    container.appendChild(summaryEl);

    const navHeader = document.createElement('div');
    navHeader.className = 'habit-year-nav-header';
    navHeader.style.position = 'relative';

    const prevHabitBtn = document.createElement('button');
    prevHabitBtn.className = 'habit-year-arrow';
    prevHabitBtn.textContent = '<';
    prevHabitBtn.onclick = () => {
        selectedYearHabitIndex = (selectedYearHabitIndex - 1 + validHabits.length) % validHabits.length;
        renderHabitsYearView();
    };

    const habitTitleSpan = document.createElement('span');
    habitTitleSpan.className = 'habit-year-title-select';
    habitTitleSpan.textContent = habit.name;
    habitTitleSpan.title = 'Click to switch habit';

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'habit-year-dropdown-popup';
    dropdownMenu.style.display = 'none';

    validHabits.forEach((h, idx) => {
        const opt = document.createElement('div');
        opt.className = `habit-year-dropdown-opt ${idx === selectedYearHabitIndex ? 'selected' : ''}`;
        opt.textContent = h.name;
        opt.onclick = (e) => {
            e.stopPropagation();
            selectedYearHabitIndex = idx;
            dropdownMenu.style.display = 'none';
            renderHabitsYearView();
        };
        dropdownMenu.appendChild(opt);
    });

    habitTitleSpan.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu.style.display === 'flex';
        dropdownMenu.style.display = isOpen ? 'none' : 'flex';
    };

    document.addEventListener('click', (e) => {
        if (dropdownMenu && !navHeader.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });

    const nextHabitBtn = document.createElement('button');
    nextHabitBtn.className = 'habit-year-arrow';
    nextHabitBtn.textContent = '>';
    nextHabitBtn.onclick = () => {
        selectedYearHabitIndex = (selectedYearHabitIndex + 1) % validHabits.length;
        renderHabitsYearView();
    };

    navHeader.appendChild(prevHabitBtn);
    navHeader.appendChild(habitTitleSpan);
    navHeader.appendChild(dropdownMenu);
    navHeader.appendChild(nextHabitBtn);
    container.appendChild(navHeader);

    MONTH_NAMES_SHORT.forEach((mName, monthIdx) => {
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        let monthCompletedCount = 0;
        let monthTrackedDays = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const targetDate = new Date(year, monthIdx, d);
            if (targetDate > today) continue;

            const jsDay = targetDate.getDay();
            const isSkippedDay = habit.skipDays && habit.skipDays.includes(jsDay);
            if (isSkippedDay) continue;

            monthTrackedDays++;
            const status = getHabitDayStatus(habit, year, monthIdx, d);
            if (status === true) {
                monthCompletedCount++;
            }
        }

        const row = document.createElement('div');
        row.className = 'habit-year-row';

        const label = document.createElement('span');
        label.className = 'habit-year-month-label';
        label.textContent = mName;
        row.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'habit-year-month-grid';

        for (let d = 1; d <= daysInMonth; d++) {
            const targetDate = new Date(year, monthIdx, d);
            const jsDay = targetDate.getDay();
            const isSkippedDay = habit.skipDays && habit.skipDays.includes(jsDay);

            // Completely omit rendering skip days
            if (isSkippedDay) {
                continue;
            }

            const isFuture = targetDate > today;
            const status = getHabitDayStatus(habit, year, monthIdx, d);

            const box = document.createElement('div');
            box.className = 'habit-year-day-box';
            box.title = `${mName} ${d}`;
            
            if (isFuture) {
                box.textContent = '';
                box.classList.add('unchecked');
            } else if (status === true) {
                box.classList.add('checked');
                box.textContent = '✓';
            } else {
                box.classList.add('dash');
                box.textContent = '-';
            }

            box.onclick = () => {
                if (isFuture) return;

                let nextStatus;
                if (status === true) {
                    nextStatus = 'dash';
                } else {
                    nextStatus = true;
                }

                setHabitDayStatus(habit.id, year, monthIdx, d, nextStatus);
                renderHabitsYearView();
            };

            grid.appendChild(box);
        }
        row.appendChild(grid);

        const stats = document.createElement('span');
        stats.className = 'habit-year-month-stats';
        const monthPercent = monthTrackedDays > 0 ? Math.round((monthCompletedCount / monthTrackedDays) * 100) : 0;
        stats.textContent = `${monthCompletedCount}/${monthTrackedDays}\n${monthPercent}%`;
        row.appendChild(stats);

        container.appendChild(row);
    });
} 

//SLEEP TRACKER -----------------

function loadSleepData() {
    const weekKey = getWeekKey(currentDate);
    sleepData = getSleepDataForWeek(weekKey);
}

function saveSleep() {
    const weekKey = getWeekKey(currentDate);
    saveSleepDataForWeek(weekKey, sleepData);
}

export function renderSleepChart() {
    const sleepBarsGrid = document.getElementById('sleepBarsGrid');
    const sleepChartContainer = document.getElementById('sleepChartContainer');
    const sleepAvgEl = document.getElementById('sleepAvg');
    const sleepMedianEl = document.getElementById('sleepMedian');

    if (!sleepBarsGrid || !sleepChartContainer) return;
    sleepBarsGrid.innerHTML = '';

    const now = new Date();
    const currentWeekKey = getWeekKey(currentDate);
    const liveWeekKey = getWeekKey(now);

    let todayIndex = -1;
    if (currentWeekKey === liveWeekKey) {
        const jsDay = now.getDay();
        todayIndex = jsDay === 0 ? 6 : jsDay - 1;
    } else {
        const startTarget = getStartOfWeek(currentDate);
        const startLive = getStartOfWeek(now);
        todayIndex = startTarget > startLive ? -1 : 6;
    }

    // Left Y Axis (Time)
    let leftAxis = sleepChartContainer.querySelector('.sleep-y-axis.left-axis');
    if (!leftAxis) {
        leftAxis = document.createElement('div');
        leftAxis.className = 'sleep-y-axis left-axis';
        sleepChartContainer.insertBefore(leftAxis, sleepBarsGrid);
    }
    leftAxis.innerHTML = `<span>10+</span><span>9</span><span>8</span><span>7</span><span>6</span><span>5-</span>`;

    // Right Y Axis (Quality)
    if (!sleepChartContainer.querySelector('.sleep-y-axis.right-axis')) {
        const rightAxis = document.createElement('div');
        rightAxis.className = 'sleep-y-axis right-axis';
        rightAxis.innerHTML = `<span>5★</span><span>4★</span><span>3★</span><span>2★</span><span>1★</span>`;
        sleepChartContainer.appendChild(rightAxis);

        const timeLabel = document.createElement('div');
        timeLabel.className = 'sleep-axis-label time';
        timeLabel.textContent = 'TIME';
        sleepChartContainer.appendChild(timeLabel);

        const qualityLabel = document.createElement('div');
        qualityLabel.className = 'sleep-axis-label quality';
        qualityLabel.textContent = 'Quality';
        sleepChartContainer.appendChild(qualityLabel);
    }

    // SVG Line Layer
    let svg = sleepChartContainer.querySelector('.sleep-line-svg');
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "sleep-line-svg");
        sleepChartContainer.insertBefore(svg, sleepBarsGrid);
    }

    const containerWidth = sleepBarsGrid.clientWidth || 300;
    const containerHeight = sleepBarsGrid.clientHeight || 150;

    svg.setAttribute("viewBox", `0 0 ${containerWidth} ${containerHeight}`);

    // Statistics
    let validHours = sleepData.map(d => d.hours).filter(h => h > 0);
    if (validHours.length > 0 && sleepAvgEl && sleepMedianEl) {
        let avg = validHours.reduce((a, b) => a + b, 0) / validHours.length;
        sleepAvgEl.textContent = `${avg.toFixed(1).replace('.', ',')} hours`;

        let sorted = [...validHours].sort((a, b) => a - b);
        let mid = Math.floor(sorted.length / 2);
        let median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        sleepMedianEl.textContent = `${median.toFixed(1).replace('.', ',')} hours`;
    } else if (sleepAvgEl && sleepMedianEl) {
        sleepAvgEl.textContent = '0 hours';
        sleepMedianEl.textContent = '0 hours';
    }

    let pathD = '';
    let isNewLine = true;
    const colWidth = containerWidth / 7;
    let svgContent = '';

    sleepData.forEach((data, index) => {
        const col = document.createElement('div');
        col.className = 'sleep-day-col';
        col.dataset.index = index;

        const isToday = (index === todayIndex);
        const isPastOrToday = index <= todayIndex;

        // Quality Yellow Bar
        const bar = document.createElement('div');
        bar.className = 'sleep-bar';

        let qualityHeight = data.quality > 0 ? (data.quality / 5) * 100 : 0;
        bar.style.height = `${qualityHeight}%`;
        if (data.quality === 0) bar.style.border = 'none';

        col.appendChild(bar);

        let hasHoursData = data.hours > 0 || isToday;

        if (hasHoursData && isPastOrToday) {
            let effectiveHours = Math.max(5, Math.min(data.hours || 7.5, 10));
            let timeHeightPercent = (effectiveHours - 5) / 5;

            const xCoord = (index * colWidth) + (colWidth / 2);
            const yCoord = containerHeight - (timeHeightPercent * containerHeight);

            if (isNewLine) {
                pathD += `M ${xCoord.toFixed(1)} ${yCoord.toFixed(1)} `;
                isNewLine = false;
            } else {
                pathD += `L ${xCoord.toFixed(1)} ${yCoord.toFixed(1)} `;
            }

            let circleClass = isToday ? 'sleep-active-handle-svg' : 'sleep-time-dot-svg';
            let circleRadius = isToday ? 7 : 5;
            svgContent += `<circle cx="${xCoord.toFixed(1)}" cy="${yCoord.toFixed(1)}" r="${circleRadius}" class="${circleClass}" fill="#00bfff" stroke="#ffffff" stroke-width="2" />`;

            // Active slider line for visual feedback
            const sliderLine = document.createElement('div');
            sliderLine.className = 'sleep-active-slider';
            col.appendChild(sliderLine);
        } else {
            if (index > todayIndex) isNewLine = true;
        }

        if (!isToday && data.hours === 0) {
            col.style.opacity = '0.6';
        }

        // Tap column to open modal
        if (isPastOrToday) {
            col.style.cursor = 'pointer';
            col.onclick = () => {
                if (isDraggingSleep) return;
                openSleepModal(index);
            };
        }

        const label = document.createElement('span');
        label.className = 'sleep-day-label';
        label.textContent = DAYS_FULL[index][0];
        col.appendChild(label);

        sleepBarsGrid.appendChild(col);
    });

    svg.innerHTML = `
        <path d="${pathD}" class="sleep-line" vector-effect="non-scaling-stroke" />
        ${svgContent}
    `;
}

// ----------------- INTERACTIVE TOUCH / POINTER DRAGGING ON CHART -----------------

let dragStartHours = 0; // Store original hours so Cancel can revert

function setupSleepChartInteractivity() {
    const chart = document.getElementById('sleepChartContainer');
    const grid = document.getElementById('sleepBarsGrid');

    if (!chart || !grid) return;

    let pointerDown = false;
    let startY = 0;
    let startX = 0;
    let activeIndex = null;
    let didDrag = false;

    function getColumnIndex(clientX) {
        const rect = grid.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const colWidth = rect.width / 7;
        const index = Math.floor(relativeX / colWidth);

        if (index < 0 || index >= 7) {
            return null;
        }
        return index;
    }

    function getHoursFromY(clientY) {
        const rect = grid.getBoundingClientRect();
        const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
        const percent = 1 - (relativeY / rect.height);
        let hours = 5 + (percent * 5);
        hours = Math.round(hours * 2) / 2;
        return Math.max(5, Math.min(10, hours));
    }

    function updateDraggedHours(clientY) {
        if (activeIndex === null) return;
        const hours = getHoursFromY(clientY);

        if (!sleepData[activeIndex]) {
            sleepData[activeIndex] = { hours: hours, quality: 0 };
        } else {
            sleepData[activeIndex].hours = hours;
        }

        renderSleepChart();
    }

    function handlePointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const index = getColumnIndex(e.clientX);
        if (index === null) return;

        const now = new Date();
        const currentWeekKey = getWeekKey(currentDate);
        const liveWeekKey = getWeekKey(now);

        let todayIndex = -1;
        if (currentWeekKey === liveWeekKey) {
            const jsDay = now.getDay();
            todayIndex = jsDay === 0 ? 6 : jsDay - 1;
        } else {
            const startTarget = getStartOfWeek(currentDate);
            const startLive = getStartOfWeek(now);
            todayIndex = startTarget > startLive ? -1 : 6;
        }

        if (index > todayIndex) return;

        pointerDown = true;
        didDrag = false;
        activeIndex = index;
        startX = e.clientX;
        startY = e.clientY;
        dragStartHours = sleepData[index]?.hours || 0;

        chart.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    }

    function handlePointerMove(e) {
        if (!pointerDown || activeIndex === null) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!didDrag && Math.sqrt(dx * dx + dy * dy) > 6) {
            didDrag = true;
            isDraggingSleep = true;
        }

        if (!didDrag) return;
        e.preventDefault();
        updateDraggedHours(e.clientY);
    }

    function handlePointerUp(e) {
        if (!pointerDown) return;
        pointerDown = false;

        const index = activeIndex;
        activeIndex = null;
        chart.releasePointerCapture?.(e.pointerId);

        if (didDrag && index !== null) {
            isDraggingSleep = true;
            openSleepQualityPopup(index);
            setTimeout(() => {
                isDraggingSleep = false;
            }, 300);
        } else {
            isDraggingSleep = false;
        }
        didDrag = false;
    }

    function handlePointerCancel(e) {
        pointerDown = false;
        activeIndex = null;
        didDrag = false;
        isDraggingSleep = false;
        chart.releasePointerCapture?.(e.pointerId);
    }

    chart.addEventListener('pointerdown', handlePointerDown);
    chart.addEventListener('pointermove', handlePointerMove);
    chart.addEventListener('pointerup', handlePointerUp);
    chart.addEventListener('pointercancel', handlePointerCancel);
}

// ----------------- SLEEP QUALITY STAR POPUP -----------------

function setupSleepModal() {
    const modal = document.getElementById('sleepPromptModal');
    if (!modal) return;

    const stars = modal.querySelectorAll('#sleepStarPicker span');
    const confirmBtn = document.getElementById('confirmSleepBtn');
    const cancelBtn = document.getElementById('cancelSleepBtn');

    stars.forEach(star => {
        star.onclick = () => {
            modalSelectedRating = parseInt(star.getAttribute('data-rating'));
            updateStarVisuals();
        };
    });

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            if (modalSleepIndex !== null) {
                if (!sleepData[modalSleepIndex]) {
                    sleepData[modalSleepIndex] = { hours: 0, quality: 0 };
                }
                sleepData[modalSleepIndex].hours = dragStartHours;
                renderSleepChart();
            }
            modal.style.display = 'none';
            modalSleepIndex = null;
        };
    }

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            if (modalSleepIndex !== null) {
                if (!sleepData[modalSleepIndex]) {
                    sleepData[modalSleepIndex] = { hours: 0, quality: 0 };
                }
                sleepData[modalSleepIndex].quality = modalSelectedRating;
                saveSleep();
                renderSleepChart();
            }
            modal.style.display = 'none';
            modalSleepIndex = null;
        };
    }

    modal.onclick = (e) => {
        if (e.target === modal) {
            if (modalSleepIndex !== null) {
                sleepData[modalSleepIndex].hours = dragStartHours;
                renderSleepChart();
            }
            modal.style.display = 'none';
        }
    };
}

function updateStarVisuals() {
    const stars = document.querySelectorAll('#sleepStarPicker span');
    stars.forEach(star => {
        const r = parseInt(star.getAttribute('data-rating'));
        star.classList.toggle('active', r <= modalSelectedRating);
    });
}

function openSleepQualityPopup(index) {
    const modal = document.getElementById('sleepPromptModal');
    const hoursText = document.getElementById('promptHoursText');
    if (!modal) return;

    modalSleepIndex = index;
    const current = sleepData[index] || { hours: 7.5, quality: 4 };
    modalSelectedRating = current.quality > 0 ? current.quality : 4;

    if (hoursText) {
        hoursText.textContent = `${DAYS_FULL[index]} · ${current.hours.toFixed(1)} hrs`;
    }

    updateStarVisuals();
    modal.style.display = 'flex';
}

function openSleepModal(index) {
    const modal = document.getElementById('sleepPromptModal');
    const hoursText = document.getElementById('promptHoursText');
    if (!modal) return;

    modalSleepIndex = index;
    const current = sleepData[index] || { hours: 0, quality: 0 };
    dragStartHours = current.hours;
    modalSelectedRating = current.quality > 0 ? current.quality : 4;

    if (hoursText) {
        const hrsLabel = current.hours > 0 ? `${current.hours.toFixed(1)} hrs` : 'Not set';
        hoursText.textContent = `${DAYS_FULL[index]} · ${hrsLabel}`;
    }

    updateStarVisuals();
    modal.style.display = 'flex';
}