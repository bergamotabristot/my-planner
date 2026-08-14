// js/database/habits.js
// User-scoped repository for Habits and Sleep tracking

import { getUserItem, setUserItem } from './database.js';

const HABITS_COLLECTION = 'habits_data';
const SLEEP_COLLECTION = 'sleep_data';

function getDefaultHabits() {
    return [
        { id: 'h1', name: 'Drink Water', skipDays: [], monthData: {} },
        { id: 'h2', name: 'Read > 10min', skipDays: [], monthData: {} },
        { id: 'h3', name: 'Gym', skipDays: [0, 6], monthData: {} } // Skips weekends
    ];
}

// ----------------- HABITS -----------------

export function getHabits() {
    const raw = getUserItem(HABITS_COLLECTION, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
        const initial = getDefaultHabits();
        setUserItem(HABITS_COLLECTION, initial);
        return initial;
    }
    // Normalize structure
    return raw.map((h, index) => {
        return {
            id: h.id || `h_${index}_${Date.now()}`,
            name: h.name || '',
            skipDays: Array.isArray(h.skipDays) ? h.skipDays : [],
            monthData: h.monthData || {}
        };
    });
}

export function saveHabits(habits) {
    setUserItem(HABITS_COLLECTION, habits);
}

export function addHabit(name = '', skipDays = []) {
    const habits = getHabits();
    const newHabit = {
        id: `h_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: name.trim(),
        skipDays: Array.isArray(skipDays) ? skipDays : [],
        monthData: {}
    };
    habits.push(newHabit);
    saveHabits(habits);
    return newHabit;
}

export function updateHabit(habitId, updates) {
    const habits = getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
        if (updates.name !== undefined) habit.name = updates.name.trim();
        if (updates.skipDays !== undefined) habit.skipDays = updates.skipDays;
        saveHabits(habits);
    }
    return habit;
}

export function deleteHabit(habitId) {
    let habits = getHabits();
    habits = habits.filter(h => h.id !== habitId);
    saveHabits(habits);
    return habits;
}

export function getHabitDayStatus(habit, year, month, day) {
    const monthKey = `${year}-${month}`;
    return habit.monthData?.[monthKey]?.[day] || false;
}

export function setHabitDayStatus(habitId, year, month, day, status) {
    const habits = getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!habit.monthData) habit.monthData = {};
    const monthKey = `${year}-${month}`;
    if (!habit.monthData[monthKey]) {
        habit.monthData[monthKey] = {};
    }

    if (status === true || status === 'dash') {
        habit.monthData[monthKey][day] = status;
    } else {
        delete habit.monthData[monthKey][day];
    }

    saveHabits(habits);
    return habit;
}

// ----------------- SLEEP -----------------

function getDefaultWeekSleep() {
    return [
        { hours: 0, quality: 0 },
        { hours: 0, quality: 0 },
        { hours: 0, quality: 0 },
        { hours: 0, quality: 0 },
        { hours: 0, quality: 0 },
        { hours: 0, quality: 0 },
        { hours: 0, quality: 0 }
    ];
}

export function getAllSleepData() {
    return getUserItem(SLEEP_COLLECTION, {}) || {};
}

export function getSleepDataForWeek(weekKey) {
    const all = getAllSleepData();
    const week = all[weekKey];
    if (Array.isArray(week) && week.length === 7) {
        return week;
    }
    return getDefaultWeekSleep();
}

export function saveSleepDataForWeek(weekKey, weekData) {
    const all = getAllSleepData();
    all[weekKey] = weekData;
    setUserItem(SLEEP_COLLECTION, all);
}
