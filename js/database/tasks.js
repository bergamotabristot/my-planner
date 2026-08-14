// js/database/tasks.js
// Storage and logic for user-scoped Schedule events, recurrence, and to-do items

import { getUserItem, setUserItem } from './database.js';
import { formatDateKey, parseDateKey } from '../utils/dates.js';

export { formatDateKey, parseDateKey };

const EVENTS_COLLECTION = 'schedule_events';
const TODOS_COLLECTION = 'schedule_todos';

// Preset categories and their theme colors matching the wireframe
export const CATEGORIES = [
    { id: 'all', name: 'All', color: '#ffffff' },
    { id: 'personal', name: 'Personal', color: '#ff9f43' },   // Orange
    { id: 'school', name: 'School', color: '#00a8ff' },       // Cyan / Blue
    { id: 'work', name: 'Work', color: '#a55eea' },           // Purple
    { id: 'health', name: 'Health', color: '#2ed573' },       // Green
    { id: 'special', name: 'Special', color: '#ff6b81' },     // Pink / Red
];

// Initial default sample data matching the mockup wireframe
function getInitialSampleEvents() {
    const today = new Date();
    const todayStr = formatDateKey(today);
    
    const d7 = new Date(today.getFullYear(), today.getMonth(), 7);
    const d14 = new Date(today.getFullYear(), today.getMonth(), 14);
    const d23 = new Date(today.getFullYear(), today.getMonth(), 23);

    return [
        {
            id: 'evt-1',
            title: 'School',
            date: todayStr,
            startTime: '07:30',
            endTime: '13:10',
            category: 'school',
            color: '#00a8ff',
            repeat: {
                type: 'weekly',
                days: [1, 2, 3, 4, 5], // Mon to Fri
                weeksCount: 4,
                startDate: todayStr
            }
        },
        {
            id: 'evt-2',
            title: 'Lunch',
            date: todayStr,
            startTime: '09:45',
            endTime: '10:10',
            category: 'personal',
            color: '#ff9f43',
            repeat: {
                type: 'weekly',
                days: [1, 2, 3, 4, 5],
                weeksCount: 4,
                startDate: todayStr
            }
        },
        {
            id: 'evt-3',
            title: 'Lunch with Dro!',
            date: formatDateKey(d7),
            startTime: '12:30',
            endTime: '14:00',
            category: 'personal',
            color: '#ff9f43',
            repeat: { type: 'never' }
        },
        {
            id: 'evt-4',
            title: 'Mom birthday!',
            date: formatDateKey(d14),
            startTime: '09:00',
            endTime: '10:00',
            category: 'special',
            color: '#ff6b81',
            repeat: { type: 'never' }
        },
        {
            id: 'evt-5',
            title: 'Dentist',
            date: formatDateKey(d14),
            startTime: '12:00',
            endTime: '13:00',
            category: 'school',
            color: '#00a8ff',
            repeat: { type: 'never' }
        },
        {
            id: 'evt-6',
            title: 'Vacation start!',
            date: formatDateKey(d23),
            startTime: '08:00',
            endTime: '09:00',
            category: 'health',
            color: '#2ed573',
            repeat: { type: 'never' }
        }
    ];
}

function getInitialSampleTodos() {
    const today = new Date();
    const todayStr = formatDateKey(today);

    return [
        { id: 'todo-1', date: todayStr, text: 'Review biology notes', completed: true, category: 'school' },
        { id: 'todo-2', date: todayStr, text: 'Buy groceries for dinner', completed: false, category: 'personal' },
        { id: 'todo-3', date: todayStr, text: 'Finish math assignment #4', completed: false, category: 'school' },
        { id: 'todo-4', date: todayStr, text: 'Call dentist for follow-up', completed: false, category: 'health' }
    ];
}

// ----------------- EVENTS -----------------

export function getAllEvents() {
    const data = getUserItem(EVENTS_COLLECTION, null);
    if (!data || !Array.isArray(data)) {
        // Only load sample data for the default user profile
        const initial = (getActiveUserId() === 'user_default') ? getInitialSampleEvents() : [];
        setUserItem(EVENTS_COLLECTION, initial);
        return initial;
    }
    return data;
}

export function saveAllEvents(events) {
    setUserItem(EVENTS_COLLECTION, events);
}

export function doesEventOccurOnDate(event, targetDate) {
    const targetDateStr = formatDateKey(targetDate);
    
    if (event.repeat?.type === 'never' || !event.repeat?.type) {
        return event.date === targetDateStr;
    }

    if (event.repeat.type === 'daily') {
        const startDate = parseDateKey(event.repeat.startDate || event.date);
        startDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(targetDate);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate < startDate) return false;
        
        if (event.repeat.weeksCount && event.repeat.weeksCount > 0) {
            const maxDays = event.repeat.weeksCount * 7;
            const diffDays = Math.floor((checkDate - startDate) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays < maxDays;
        }
        return true;
    }

    if (event.repeat.type === 'weekly') {
        const startDate = parseDateKey(event.repeat.startDate || event.date);
        startDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(targetDate);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate < startDate) return false;

        const dayOfWeek = checkDate.getDay(); // 0 is Sunday, 1 is Mon...
        const repeatDays = event.repeat.days || [];
        if (!repeatDays.includes(dayOfWeek)) return false;

        if (event.repeat.weeksCount && event.repeat.weeksCount > 0) {
            const diffTime = checkDate.getTime() - startDate.getTime();
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            return diffWeeks >= 0 && diffWeeks < event.repeat.weeksCount;
        }
        return true;
    }

    return event.date === targetDateStr;
}

export function getEventsForDate(date) {
    const all = getAllEvents();
    return all.filter(evt => doesEventOccurOnDate(evt, date));
}

export function saveEvent(eventData) {
    const all = getAllEvents();
    if (eventData.id) {
        const index = all.findIndex(e => e.id === eventData.id);
        if (index >= 0) {
            all[index] = { ...all[index], ...eventData };
        } else {
            all.push(eventData);
        }
    } else {
        eventData.id = 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        all.push(eventData);
    }
    saveAllEvents(all);
    return eventData;
}

export function deleteEvent(id) {
    let all = getAllEvents();
    all = all.filter(e => e.id !== id);
    saveAllEvents(all);
}

// ----------------- TO-DO ITEMS -----------------

export function getAllToDos() {
    const data = getUserItem(TODOS_COLLECTION, null);
    if (!data || !Array.isArray(data)) {
        const initial = (getActiveUserId() === 'user_default') ? getInitialSampleTodos() : [];
        setUserItem(TODOS_COLLECTION, initial);
        return initial;
    }
    return data;
}

export function saveAllToDos(todos) {
    setUserItem(TODOS_COLLECTION, todos);
}

export function getToDosForDate(date) {
    const dateStr = formatDateKey(date);
    const all = getAllToDos();
    return all.filter(t => t.date === dateStr);
}

export function saveToDo(todoData) {
    const all = getAllToDos();
    if (todoData.id) {
        const index = all.findIndex(t => t.id === todoData.id);
        if (index >= 0) {
            all[index] = { ...all[index], ...todoData };
        } else {
            all.push(todoData);
        }
    } else {
        todoData.id = 'todo-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        all.push(todoData);
    }
    saveAllToDos(all);
    return todoData;
}

export function deleteToDo(id) {
    let all = getAllToDos();
    all = all.filter(t => t.id !== id);
    saveAllToDos(all);
}

export function toggleToDoComplete(id) {
    const all = getAllToDos();
    const todo = all.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveAllToDos(all);
    }
    return todo;
}

export function clearCompletedToDosForDate(date) {
    const dateStr = formatDateKey(date);
    let all = getAllToDos();
    all = all.filter(t => !(t.date === dateStr && t.completed));
    saveAllToDos(all);
}
