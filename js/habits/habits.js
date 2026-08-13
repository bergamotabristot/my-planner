let resetHabitsFn = null;
let currentMode = 'week';
let currentDate = new Date();

export function initHabits() {
    const dropdownBtn = document.getElementById('habitsDropdownBtn');
    const dropdownMenu = document.getElementById('habitsDropdownMenu');
    const options = document.querySelectorAll('.habits-option');
    const subViews = document.querySelectorAll('.habits-sub-view');
    const clickableText = dropdownBtn.querySelector('.clickable-text');
    const dateDisplay = document.getElementById('habitsDateDisplay');
    const prevBtn = document.getElementById('habitsPrevBtn');
    const nextBtn = document.getElementById('habitsNextBtn');

    function resetToCurrent() {
        currentDate = new Date();
        updateDateDisplay();
    }

    resetHabitsFn = resetToCurrent;

    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu.style.display === 'flex';
        dropdownMenu.style.display = isOpen ? 'none' : 'flex';
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            const targetId = option.getAttribute('data-target');
            currentMode = option.textContent.trim().toLowerCase();

            clickableText.textContent = option.textContent;
            dropdownMenu.style.display = 'none';

            subViews.forEach(view => {
                view.style.display = (view.id === targetId) ? 'block' : 'none';
            });

            updateDateDisplay();
            
            if (currentMode === 'week' && typeof window.renderHabitsTable === 'function') {
                window.renderHabitsTable();
            } else if (currentMode === 'month' && typeof window.renderHabitsMonthView === 'function') {
                window.renderHabitsMonthView();
            } else if (currentMode === 'year' && typeof window.renderHabitsYearView === 'function') {
                window.renderHabitsYearView();
            }
        });
    });

    if (prevBtn) prevBtn.addEventListener('click', () => { shiftDate(-1); });
    if (nextBtn) nextBtn.addEventListener('click', () => { shiftDate(1); });

    window.addEventListener('click', () => {
        if (dropdownMenu) dropdownMenu.style.display = 'none';
    });

    function shiftDate(direction) {
        if (currentMode === 'week') {
            currentDate.setDate(currentDate.getDate() + (direction * 7));
            
            // Load the new week's sleep data
            if (typeof window.loadSleepDataForCurrentWeek === 'function') {
                window.loadSleepDataForCurrentWeek();
            }
        } else if (currentMode === 'month') {
            currentDate.setMonth(currentDate.getMonth() + direction);
        } else if (currentMode === 'year') {
            currentDate.setFullYear(currentDate.getFullYear() + direction);
        }
        updateDateDisplay();
        
        if (currentMode === 'week') {
            if (typeof window.renderHabitsTable === 'function') {
                window.renderHabitsTable();
            }
            if (typeof window.renderSleepChart === 'function') {
                window.renderSleepChart();
            }
        }
    }

    function updateDateDisplay() {
        if (currentMode === 'week') {
            const start = new Date(currentDate);
            const dayOfWeek = start.getDay();
            const diffToMonday = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            start.setDate(diffToMonday);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            dateDisplay.textContent = `${formatDateShort(start)}-${formatDate(end)}`;
            if (typeof window.renderHabitsTable === 'function') {
                window.renderHabitsTable();
            }
        } else if (currentMode === 'month') {
            const optionsMonth = { month: 'long', year: 'numeric' };
            dateDisplay.textContent = currentDate.toLocaleDateString('en-US', optionsMonth);
            if (typeof window.renderHabitsMonthView === 'function') {
                window.renderHabitsMonthView();
            }
        } else if (currentMode === 'year') {
            dateDisplay.textContent = currentDate.getFullYear();
            if (typeof window.renderHabitsYearView === 'function') {
                window.renderHabitsYearView();
            }
        }
    }

    function formatDate(d) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    }

    function formatDateShort(d) {
        return String(d.getDate()).padStart(2, '0');
    }

    updateDateDisplay();
}

export function resetHabitsToCurrent() {
    if (typeof resetHabitsFn === 'function') {
        resetHabitsFn();
    }

    const tableBody = document.getElementById('habitsTableBody');
    const tableWrapper = tableBody ? tableBody.closest('.table-container') || tableBody.parentElement : null;

    if (tableWrapper) {
        tableWrapper.style.maxHeight = '200px';
        tableWrapper.style.overflowY = 'auto';
        tableWrapper.style.display = 'block';
    }

    let savedHabits = localStorage.getItem('habitsData');
    let habitsData = savedHabits ? JSON.parse(savedHabits) : [
        { name: 'Drink Water', days: [true, true, false, true, false, false, false] },
        { name: 'Read > 10min', days: [true, true, true, true, false, false, false] },
        { name: 'Gym', days: [true, true, 'dash', true, false, false, false] }
    ];

    let selectedYearHabitIndex = 0;

    // DOM Selectors
    const sleepBarsGrid = document.getElementById('sleepBarsGrid');
    const sleepChartContainer = document.getElementById('sleepChartContainer');
    const sleepAvgEl = document.getElementById('sleepAvg');
    const sleepMedianEl = document.getElementById('sleepMedian');

    const sleepPromptModal = document.getElementById('sleepPromptModal');
    const sleepStarPicker = document.getElementById('sleepStarPicker');
    const promptHoursText = document.getElementById('promptHoursText');
    const confirmSleepBtn = document.getElementById('confirmSleepBtn');
    const cancelSleepBtn = document.getElementById('cancelSleepBtn');

    // --- DECLARED EARLY TO FIX REFERENCE ERROR ---
    const daysFullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // ----------------------------------------------

    function saveHabits() {
        localStorage.setItem('habitsData', JSON.stringify(habitsData));
        if (typeof window.renderHabitsMonthView === 'function') window.renderHabitsMonthView();
        if (typeof window.renderHabitsYearView === 'function') window.renderHabitsYearView();
        if (typeof window.renderHabitsTable === 'function') window.renderHabitsTable();
    }

    function getWeekDayDate(baseDate, dayIndex) {
        const d = new Date(baseDate);
        const dayOfWeek = d.getDay();
        const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        d.setDate(diffToMonday + dayIndex);
        return d;
    }

    function syncWeekToMonthRecord(habit, weekBaseDate) {
        if (!habit.monthData) habit.monthData = {};
        habit.days.forEach((status, dayIndex) => {
            const targetDate = getWeekDayDate(weekBaseDate, dayIndex);
            const y = targetDate.getFullYear();
            const m = targetDate.getMonth();
            const d = targetDate.getDate();

            const monthKey = `${y}-${m}`;
            if (!habit.monthData[monthKey]) {
                habit.monthData[monthKey] = {};
            }
            if (status === true || status === 'dash') {
                habit.monthData[monthKey][d] = status;
            } else {
                delete habit.monthData[monthKey][d];
            }
        });
    }

    function syncMonthToWeekRecord(habit, year, month, day) {
        const targetDate = new Date(year, month, day);
        const start = new Date(currentDate);
        const dayOfWeek = start.getDay();
        const diffToMonday = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start.setDate(diffToMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        if (targetDate >= start && targetDate <= end) {
            let dayIndex = targetDate.getDay();
            dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
            const monthKey = `${year}-${month}`;
            const status = habit.monthData?.[monthKey]?.[day];
            habit.days[dayIndex] = status ? status : false;
        }
    }

    function renderHabitsTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        habitsData.forEach((habit, habitIndex) => {
            habit.days = [];
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const targetDate = getWeekDayDate(currentDate, dayIndex);
                const y = targetDate.getFullYear();
                const m = targetDate.getMonth();
                const d = targetDate.getDate();
                const monthKey = `${y}-${m}`;
                const status = habit.monthData?.[monthKey]?.[d];
                habit.days.push(status ? status : false);
            }

            const tr = document.createElement('tr');

            const nameTd = document.createElement('td');
            nameTd.className = 'habit-name-cell';
            
            const inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.value = habit.name;
            inputField.placeholder = 'New Habit...';
            inputField.className = 'habit-name-input';
            inputField.style.background = 'transparent';
            inputField.style.border = 'none';
            inputField.style.color = 'inherit';
            inputField.style.width = '100%';

            inputField.addEventListener('input', (e) => {
                habit.name = e.target.value;
            });

            inputField.addEventListener('blur', () => {
                saveHabits();
                if (habitIndex === habitsData.length - 1 && habit.name.trim() !== '') {
                    habitsData.push({ name: '', days: [false, false, false, false, false, false, false] });
                    saveHabits();
                    renderHabitsTable();
                }
            });

            nameTd.appendChild(inputField);
            tr.appendChild(nameTd);

            let completedCount = 0;
            let totalTracked = 0;

            habit.days.forEach((status, dayIndex) => {
                const dayTd = document.createElement('td');
                dayTd.className = 'habit-cell';

                if (status === true) {
                    dayTd.textContent = '✓';
                    dayTd.classList.add('checked');
                    completedCount++;
                    totalTracked++;
                } else if (status === false) {
                    dayTd.textContent = '';
                    dayTd.classList.add('unchecked');
                } else if (status === 'dash') {
                    dayTd.textContent = '-';
                    dayTd.classList.add('dash');
                    totalTracked++;
                }

                dayTd.addEventListener('click', () => {
                    if (!habit.name.trim()) return;
                    if (habit.days[dayIndex] === false) {
                        habit.days[dayIndex] = true;
                    } else if (habit.days[dayIndex] === true) {
                        habit.days[dayIndex] = 'dash';
                    } else {
                        habit.days[dayIndex] = false;
                    }
                    syncWeekToMonthRecord(habit, currentDate);
                    saveHabits();
                    renderHabitsTable();
                });

                tr.appendChild(dayTd);
            });

            const scoreTd = document.createElement('td');
            scoreTd.className = 'habit-score-cell';
            scoreTd.textContent = habit.name.trim() ? `${completedCount}/${totalTracked}` : '';
            tr.appendChild(scoreTd);

            tableBody.appendChild(tr);
        });

        if (habitsData.length === 0 || habitsData[habitsData.length - 1].name.trim() !== '') {
            habitsData.push({ name: '', days: [false, false, false, false, false, false, false] });
            saveHabits();
        }
    }

    window.renderHabitsTable = renderHabitsTable;
    renderHabitsTable();

    function renderHabitsMonthView() {
        const container = document.getElementById('habitsMonthContainer');
        if (!container) return;
        container.innerHTML = '';

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        habitsData.forEach((habit) => {
            if (!habit.name.trim()) return;

            const card = document.createElement('div');
            card.className = 'habit-month-card';

            const title = document.createElement('h4');
            title.textContent = habit.name;
            card.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'habit-month-grid';

            if (!habit.monthData) habit.monthData = {};
            const monthKey = `${year}-${month}`;
            if (!habit.monthData[monthKey]) {
                habit.monthData[monthKey] = {};
            }
            const monthRecord = habit.monthData[monthKey];

            for (let d = 1; d <= daysInMonth; d++) {
                const box = document.createElement('div');
                box.className = 'habit-year-day-box';
                const status = monthRecord[d];
                if (status === true) {
                    box.classList.add('checked');
                    box.textContent = '✓';
                } else if (status === 'dash') {
                    box.classList.add('dash');
                    box.textContent = '-';
                }

                box.addEventListener('click', () => {
                    if (monthRecord[d] === true) {
                        monthRecord[d] = 'dash';
                    } else if (monthRecord[d] === 'dash') {
                        delete monthRecord[d];
                    } else {
                        monthRecord[d] = true;
                    }
                    syncMonthToWeekRecord(habit, year, month, d);
                    saveHabits();
                    renderHabitsYearView();
                    renderHabitsMonthView();
                    renderHabitsTable();
                });

                grid.appendChild(box);
            }

            card.appendChild(grid);
            container.appendChild(card);
        });
    }

    window.renderHabitsMonthView = renderHabitsMonthView;
    renderHabitsMonthView();

    function renderHabitsYearView() {
        const container = document.getElementById('habits-year');
        if (!container) return;
        container.innerHTML = '';

        const year = currentDate.getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const validHabits = habitsData.filter(h => h.name.trim() !== '');
        if (validHabits.length === 0) return;

        if (selectedYearHabitIndex >= validHabits.length) {
            selectedYearHabitIndex = 0;
        }
        const habit = validHabits[selectedYearHabitIndex];

        const summaryEl = document.createElement('div');
        summaryEl.className = 'habit-year-summary';

        if (!habit.monthData) habit.monthData = {};

        let totalYearCompleted = 0;
        let totalYearDays = 0;

        monthNames.forEach((_, monthIdx) => {
            const monthKey = `${year}-${monthIdx}`;
            if (!habit.monthData[monthKey]) {
                habit.monthData[monthKey] = {};
            }
            const monthRecord = habit.monthData[monthKey];
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

            for (let d = 1; d <= daysInMonth; d++) {
                totalYearDays++;
                if (monthRecord[d] === true || monthRecord[d] === 'dash') {
                    totalYearCompleted++;
                }
            }
        });

        const percent = totalYearDays > 0 ? Math.round((totalYearCompleted / totalYearDays) * 100) : 0;
        summaryEl.innerHTML = `<div>${totalYearCompleted}/${totalYearDays}</div><div>${percent}%</div>`;
        container.appendChild(summaryEl);

        const navHeader = document.createElement('div');
        navHeader.className = 'habit-year-nav-header';

        const prevHabitBtn = document.createElement('button');
        prevHabitBtn.className = 'habit-year-arrow';
        prevHabitBtn.textContent = '<';
        prevHabitBtn.addEventListener('click', () => {
            selectedYearHabitIndex = (selectedYearHabitIndex - 1 + validHabits.length) % validHabits.length;
            renderHabitsYearView();
        });

        const habitTitleSpan = document.createElement('span');
        habitTitleSpan.className = 'habit-year-title-select';
        habitTitleSpan.textContent = habit.name;

        const yearDropdown = document.createElement('div');
        yearDropdown.className = 'habit-year-dropdown-menu';
        yearDropdown.style.display = 'none';

        validHabits.forEach((h, idx) => {
            const opt = document.createElement('div');
            opt.className = 'habit-year-dropdown-item';
            opt.textContent = h.name;
            if (idx === selectedYearHabitIndex) opt.classList.add('selected');
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedYearHabitIndex = idx;
                yearDropdown.style.display = 'none';
                renderHabitsYearView();
            });
            yearDropdown.appendChild(opt);
        });

        habitTitleSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = yearDropdown.style.display === 'block';
            yearDropdown.style.display = isOpen ? 'none' : 'block';
        });

        window.addEventListener('click', () => {
            if (yearDropdown) yearDropdown.style.display = 'none';
        });

        const nextHabitBtn = document.createElement('button');
        nextHabitBtn.className = 'habit-year-arrow';
        nextHabitBtn.textContent = '>';
        nextHabitBtn.addEventListener('click', () => {
            selectedYearHabitIndex = (selectedYearHabitIndex + 1) % validHabits.length;
            renderHabitsYearView();
        });

        navHeader.appendChild(prevHabitBtn);
        navHeader.appendChild(habitTitleSpan);
        navHeader.appendChild(yearDropdown);
        navHeader.appendChild(nextHabitBtn);
        container.appendChild(navHeader);

        monthNames.forEach((mName, monthIdx) => {
            const monthKey = `${year}-${monthIdx}`;
            if (!habit.monthData[monthKey]) {
                habit.monthData[monthKey] = {};
            }
            const monthRecord = habit.monthData[monthKey];
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

            let completedCount = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                if (monthRecord[d] === true || monthRecord[d] === 'dash') {
                    completedCount++;
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
                const box = document.createElement('div');
                box.className = 'habit-year-day-box';
                const status = monthRecord[d];
                if (status === true) {
                    box.classList.add('checked');
                    box.textContent = '✓';
                } else if (status === 'dash') {
                    box.classList.add('dash');
                    box.textContent = '-';
                }

                box.addEventListener('click', () => {
                    if (monthRecord[d] === true) {
                        monthRecord[d] = 'dash';
                    } else if (monthRecord[d] === 'dash') {
                        delete monthRecord[d];
                    } else {
                        monthRecord[d] = true;
                    }
                    syncMonthToWeekRecord(habit, year, monthIdx, d);
                    saveHabits();
                    renderHabitsYearView();
                    renderHabitsMonthView();
                    renderHabitsTable();
                });

                grid.appendChild(box);
            }
            row.appendChild(grid);

            const stats = document.createElement('span');
            stats.className = 'habit-year-month-stats';
            const monthPercent = daysInMonth > 0 ? Math.round((completedCount / daysInMonth) * 100) : 0;
            stats.textContent = `${completedCount}/${daysInMonth} - ${monthPercent}%`;
            row.appendChild(stats);

            container.appendChild(row);
        });
    }

    window.renderHabitsYearView = renderHabitsYearView;
    renderHabitsYearView();

    // Sleep Data with Weekly Storage Logic
    function getWeekKey(dateObj) {
        const d = new Date(dateObj);
        const dayOfWeek = d.getDay();
        const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        d.setDate(diffToMonday);
        return d.toISOString().split('T')[0];
    }

    let sleepData = [];

    function loadSleepDataForCurrentWeek() {
        const weekKey = getWeekKey(currentDate);
        const allSleepData = JSON.parse(localStorage.getItem('allSleepData') || '{}');
        sleepData = allSleepData[weekKey] || [
            { hours: 0, quality: 0 },
            { hours: 0, quality: 0 },
            { hours: 0, quality: 0 },
            { hours: 0, quality: 0 },
            { hours: 0, quality: 0 },
            { hours: 0, quality: 0 },
            { hours: 0, quality: 0 }
        ];
        if (typeof renderSleepChart === 'function') {
            renderSleepChart();
        }
    }

    window.loadSleepDataForCurrentWeek = loadSleepDataForCurrentWeek;
    loadSleepDataForCurrentWeek();

    function saveSleep() {
        const currentWeekKey = getWeekKey(currentDate);
        const allData = JSON.parse(localStorage.getItem('allSleepData') || '{}');
        allData[currentWeekKey] = sleepData;
        localStorage.setItem('allSleepData', JSON.stringify(allData));
    }

    let activeSleepIndex = null;
    let pendingHours = 0;
    let selectedQuality = 4;
    let isDragging = false;

    function renderSleepChart() {
        if (!sleepBarsGrid || !sleepChartContainer) return;
        sleepBarsGrid.innerHTML = '';

        // Dynamically compute todayIndex relative to the currently viewed week rather than the live system date
        const now = new Date();
        const currentWeekKey = getWeekKey(currentDate);
        const liveWeekKey = getWeekKey(now);
        
        let todayIndex = -1;
        if (currentWeekKey === liveWeekKey) {
            const jsDay = now.getDay();
            todayIndex = jsDay === 0 ? 6 : jsDay - 1;
        } else {
            const targetStart = getWeekDayDate(currentDate, 0);
            targetStart.setHours(0,0,0,0);
            const liveStart = new Date(now);
            const liveDayOfWeek = liveStart.getDay();
            const liveDiffToMonday = liveStart.getDate() - liveDayOfWeek + (liveDayOfWeek === 0 ? -6 : 1);
            liveStart.setDate(liveDiffToMonday);
            liveStart.setHours(0,0,0,0);

            if (targetStart > liveStart) {
                todayIndex = -1; // Future week
            } else {
                todayIndex = 6; // Past week (all days editable/active)
            }
        }

        let leftAxis = sleepChartContainer.querySelector('.sleep-y-axis.left-axis');
        if (!leftAxis) {
            leftAxis = document.createElement('div');
            leftAxis.className = 'sleep-y-axis left-axis';
            sleepChartContainer.insertBefore(leftAxis, sleepBarsGrid);
        }
        leftAxis.innerHTML = `<span>10+</span><span>9</span><span>8</span><span>7</span><span>6</span><span>5-</span>`;

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

        let svg = sleepChartContainer.querySelector('.sleep-line-svg');
        if (!svg) {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", "sleep-line-svg");
            sleepChartContainer.insertBefore(svg, sleepBarsGrid);
        }

        const containerWidth = sleepBarsGrid.clientWidth || 300;
        const containerHeight = sleepBarsGrid.clientHeight || 160;
        
        svg.setAttribute("viewBox", `0 0 ${containerWidth} ${containerHeight}`);
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");

        let validHours = sleepData.map(d => d.hours).filter(h => h > 0);
        if (validHours.length > 0) {
            let avg = validHours.reduce((a, b) => a + b, 0) / validHours.length;
            sleepAvgEl.textContent = `${avg.toFixed(1).replace('.', ',')} hours`;

            let sorted = [...validHours].sort((a, b) => a - b);
            let mid = Math.floor(sorted.length / 2);
            let median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            sleepMedianEl.textContent = `${median.toFixed(1).replace('.', ',')} hours`;
        } else {
            sleepAvgEl.textContent = `0 hours`;
            sleepMedianEl.textContent = `0 hours`;
        }

        let pathD = "";
        let isNewLine = true;
        const colWidth = containerWidth / 7;
        let svgContent = "";

        sleepData.forEach((data, index) => {
            const col = document.createElement('div');
            col.className = 'sleep-day-col';
            col.dataset.index = index;

            const isToday = (index === todayIndex);
            let isPastOrToday = index <= todayIndex;

            if (isPastOrToday) {
                col.style.cursor = 'pointer';
            }

            const bar = document.createElement('div');
            bar.className = 'sleep-bar';

            let qualityHeight = data.quality > 0 ? (data.quality / 5) * 100 : 0;
            bar.style.height = `${qualityHeight}%`;

            if (data.quality === 0) bar.style.border = 'none';

            col.appendChild(bar);

            let hasHoursData = data.hours > 0 || isToday;

            if (hasHoursData && isPastOrToday) {
                let effectiveHours = Math.max(5, Math.min(data.hours || 7, 10));
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
                let circleRadius = isToday ? 6 : 4;
                svgContent += `<circle cx="${xCoord.toFixed(1)}" cy="${yCoord.toFixed(1)}" r="${circleRadius}" class="${circleClass}" fill="#00bfff" stroke="#ffffff" stroke-width="1.5" />`;

                if (isToday) {
                    const sliderLine = document.createElement('div');
                    sliderLine.className = 'sleep-active-slider';
                    col.appendChild(sliderLine);
                }
            } else {
                if (index > todayIndex) {
                    isNewLine = true;
                }
            }

            if (!isToday && data.hours === 0) {
                col.style.opacity = '0.6';
            }

            const label = document.createElement('span');
            label.className = 'sleep-day-label';
            label.textContent = daysFullNames[index][0];

            col.appendChild(label);
            sleepBarsGrid.appendChild(col);
        });

        svg.innerHTML = `
            <path d="${pathD}" class="sleep-line" vector-effect="non-scaling-stroke" />
            ${svgContent}
        `;
    }

    window.renderSleepChart = renderSleepChart;

    function onPointerDown(e) {
        const col = e.target.closest('.sleep-day-col');
        if (!col) return;

        const index = parseInt(col.dataset.index);
        
        const now = new Date();
        const currentWeekKey = getWeekKey(currentDate);
        const liveWeekKey = getWeekKey(now);
        let activeTodayIndex = (currentWeekKey === liveWeekKey) ? (now.getDay() === 0 ? 6 : now.getDay() - 1) : (getWeekDayDate(currentDate, 0) > now ? -1 : 6);

        if (index > activeTodayIndex) return;

        isDragging = true;
        activeSleepIndex = index;

        if (e.target.setPointerCapture) {
            e.target.setPointerCapture(e.pointerId);
        }

        updateHeight(e);
        e.preventDefault();
    }

    function onPointerMove(e) {
        if (!isDragging || activeSleepIndex === null) return;
        updateHeight(e);
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;

        if (e.target.releasePointerCapture && e.pointerId !== undefined) {
            try {
                e.target.releasePointerCapture(e.pointerId);
            } catch (err) {
                // Ignore if capture was already released
            }
        }

        const currentActiveIndex = activeSleepIndex;

        if (currentActiveIndex !== null) {
            pendingHours = sleepData[currentActiveIndex].hours > 0 ? sleepData[currentActiveIndex].hours : 7;
            selectedQuality = sleepData[currentActiveIndex].quality > 0 ? sleepData[currentActiveIndex].quality : 4;
            updateStarPickerUI();
            promptHoursText.textContent = `Set sleep for ${daysFullNames[currentActiveIndex]}`;
            sleepPromptModal.style.display = 'flex';
        }
    }

    function updateHeight(e) {
        const rect = sleepChartContainer.getBoundingClientRect();
        const clientY = e.clientY;
        const containerHeight = rect.height > 0 ? rect.height : 160;

        let offsetY = rect.bottom - clientY;
        let percentage = Math.max(0, Math.min(offsetY / containerHeight, 1));

        let calculatedHours = 5 + (percentage * 5);
        calculatedHours = Math.round(calculatedHours * 2) / 2;
        pendingHours = Math.max(5, Math.min(calculatedHours, 10));

        sleepData[activeSleepIndex].hours = pendingHours;
        renderSleepChart();
    }

    sleepChartContainer.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    function updateStarPickerUI() {
        const stars = sleepStarPicker.querySelectorAll('span');
        stars.forEach(star => {
            let r = parseInt(star.getAttribute('data-rating'));
            if (r <= selectedQuality) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    sleepStarProviderSelection:
    sleepStarPicker.querySelectorAll('span').forEach(star => {
        star.addEventListener('click', (e) => {
            selectedQuality = parseInt(e.target.getAttribute('data-rating'));
            updateStarPickerUI();
        });
    });

    confirmSleepBtn.addEventListener('click', () => {
        if (activeSleepIndex !== null) {
            sleepData[activeSleepIndex].hours = pendingHours;
            sleepData[activeSleepIndex].quality = selectedQuality;
            saveSleep();
            renderSleepChart();
        }
        sleepPromptModal.style.display = 'none';
        activeSleepIndex = null;
    });

    cancelSleepBtn.addEventListener('click', () => {
        loadSleepDataForCurrentWeek();
        sleepPromptModal.style.display = 'none';
        activeSleepIndex = null;
    });

    renderSleepChart();
}