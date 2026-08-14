// js/database/database.js
// Core Database Manager: Multi-user profiles, scoped storage, legacy data migration, and event subscriptions

const USERS_KEY = 'myplanner_users_list';
const ACTIVE_USER_KEY = 'myplanner_active_user_id';
const MIGRATION_DONE_KEY = 'myplanner_legacy_migration_completed_v1';

const DEFAULT_USER = {
    id: 'user_default',
    name: 'Personal',
    avatar: '👤',
    color: '#00a8ff',
    createdAt: Date.now(),
    isDefault: true
};

const userChangeListeners = new Set();

// ----------------- USER MANAGEMENT -----------------

export function getUsers() {
    const raw = localStorage.getItem(USERS_KEY);

    // Completely new device / first launch
    if (!raw) {
        const initial = [{
            ...DEFAULT_USER,
            createdAt: Date.now()
        }];

        localStorage.setItem(USERS_KEY, JSON.stringify(initial));
        localStorage.setItem(ACTIVE_USER_KEY, DEFAULT_USER.id);

        // Initialize empty storage for the default profile
        setUserItem('schedule_events', [], DEFAULT_USER.id);
        setUserItem('schedule_todos', [], DEFAULT_USER.id);
        setUserItem('habits_data', [], DEFAULT_USER.id);
        setUserItem('sleep_data', {}, DEFAULT_USER.id);
        setUserItem('journal_entries', {}, DEFAULT_USER.id);

        return initial;
    }

    try {
        const list = JSON.parse(raw);

        if (Array.isArray(list) && list.length > 0) {
            return list;
        }

        // Corrupted/empty user list
        const initial = [{
            ...DEFAULT_USER,
            createdAt: Date.now()
        }];

        localStorage.setItem(USERS_KEY, JSON.stringify(initial));
        localStorage.setItem(ACTIVE_USER_KEY, DEFAULT_USER.id);

        setUserItem('schedule_events', [], DEFAULT_USER.id);
        setUserItem('schedule_todos', [], DEFAULT_USER.id);
        setUserItem('habits_data', [], DEFAULT_USER.id);
        setUserItem('sleep_data', {}, DEFAULT_USER.id);
        setUserItem('journal_entries', {}, DEFAULT_USER.id);

        return initial;

    } catch {
        const initial = [{
            ...DEFAULT_USER,
            createdAt: Date.now()
        }];

        localStorage.setItem(USERS_KEY, JSON.stringify(initial));
        localStorage.setItem(ACTIVE_USER_KEY, DEFAULT_USER.id);

        setUserItem('schedule_events', [], DEFAULT_USER.id);
        setUserItem('schedule_todos', [], DEFAULT_USER.id);
        setUserItem('habits_data', [], DEFAULT_USER.id);
        setUserItem('sleep_data', {}, DEFAULT_USER.id);
        setUserItem('journal_entries', {}, DEFAULT_USER.id);

        return initial;
    }
}

export function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function initializeUserStorage(userId) {
    setUserItem('schedule_events', [], userId);
    setUserItem('schedule_todos', [], userId);
    setUserItem('habits_data', [], userId);
    setUserItem('sleep_data', {}, userId);
    setUserItem('journal_entries', {}, userId);
}

export function getActiveUserId() {
    let id = localStorage.getItem(ACTIVE_USER_KEY);
    const users = getUsers();
    if (!id || !users.some(u => u.id === id)) {
        id = users[0].id;
        localStorage.setItem(ACTIVE_USER_KEY, id);
    }
    return id;
}

export function getActiveUser() {
    const users = getUsers();
    const activeId = getActiveUserId();
    return users.find(u => u.id === activeId) || users[0];
}

export function setActiveUser(userId) {
    const users = getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return false;

    localStorage.setItem(ACTIVE_USER_KEY, userId);
    notifyUserChange(target);
    return true;
}

export function createUser({ name, avatar, color }) {
    const users = getUsers();
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const newUser = {
        id: newUserId,
        name: name.trim() || 'New Profile',
        avatar: avatar || '✨',
        color: color || '#ff9f43',
        createdAt: Date.now(),
        isDefault: false
    };

    users.push(newUser);
    saveUsers(users);

    // CRITICAL: Initialize empty storage buckets for this specific user ID 
    // so they don't inherit default sample data or another user's content.
    setUserItem('schedule_events', [], newUserId);
    setUserItem('schedule_todos', [], newUserId);
    setUserItem('habits_data', [], newUserId);
    setUserItem('sleep_data', {}, newUserId);
    setUserItem('journal_entries', {}, newUserId);

    return newUser;
}
export function updateUser(userId, data) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
        users[idx] = { ...users[idx], ...data };
        saveUsers(users);
        if (userId === getActiveUserId()) {
            notifyUserChange(users[idx]);
        }
        return users[idx];
    }
    return null;
}

export function deleteUser(userId) {
    let users = getUsers();
    if (users.length <= 1) return false; // Prevent deleting last remaining user

    // Clear all scoped storage for this user
    const prefix = `myplanner_${userId}_`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    users = users.filter(u => u.id !== userId);
    saveUsers(users);

    if (getActiveUserId() === userId) {
        setActiveUser(users[0].id);
    }
    return true;
}

// ----------------- SCOPED STORAGE HELPERS -----------------

export function getUserStorageKey(collectionKey, userId = null) {
    const uid = userId || getActiveUserId();
    return `myplanner_${uid}_${collectionKey}`;
}

export function getUserItem(collectionKey, defaultValue = null, userId = null) {
    const key = getUserStorageKey(collectionKey, userId);
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

export function setUserItem(collectionKey, value, userId = null) {
    const key = getUserStorageKey(collectionKey, userId);
    if (value === undefined || value === null) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

// ----------------- CHANGE SUBSCRIPTION -----------------

export function subscribeUserChange(listener) {
    userChangeListeners.add(listener);
    return () => userChangeListeners.delete(listener);
}

function notifyUserChange(user) {
    userChangeListeners.forEach(listener => {
        try {
            listener(user);
        } catch (err) {
            console.error('Error in user change listener:', err);
        }
    });
}

// ----------------- AUTO-MIGRATION OF LEGACY DATA -----------------

export function runLegacyDataMigration() {
    if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

    try {
        const defaultUid = DEFAULT_USER.id;

        // 1. Migrate Journal (keys like 'journal_YYYY-MM-DD')
        const journalEntries = getUserItem('journal_entries', {}, defaultUid) || {};
        const legacyJournalKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('journal_') && k.length >= 18) {
                const dateKey = k.replace('journal_', '');
                const content = localStorage.getItem(k);
                if (content) {
                    journalEntries[dateKey] = content;
                    legacyJournalKeys.push(k);
                }
            }
        }
        if (Object.keys(journalEntries).length > 0) {
            setUserItem('journal_entries', journalEntries, defaultUid);
        }

        // 2. Migrate Habits data ('habitsData')
        const legacyHabits = localStorage.getItem('habitsData');
        if (legacyHabits) {
            try {
                const parsed = JSON.parse(legacyHabits);
                setUserItem('habits_data', parsed, defaultUid);
            } catch (e) { /* ignore */ }
        }

        // 3. Migrate Sleep data ('allSleepData')
        const legacySleep = localStorage.getItem('allSleepData');
        if (legacySleep) {
            try {
                const parsed = JSON.parse(legacySleep);
                setUserItem('sleep_data', parsed, defaultUid);
            } catch (e) { /* ignore */ }
        }

        // 4. Migrate Schedule Events ('my_planner_schedule_events')
        const legacyEvents = localStorage.getItem('my_planner_schedule_events');
        if (legacyEvents) {
            try {
                const parsed = JSON.parse(legacyEvents);
                setUserItem('schedule_events', parsed, defaultUid);
            } catch (e) { /* ignore */ }
        }

        // 5. Migrate Schedule ToDos ('my_planner_schedule_todos')
        const legacyTodos = localStorage.getItem('my_planner_schedule_todos');
        if (legacyTodos) {
            try {
                const parsed = JSON.parse(legacyTodos);
                setUserItem('schedule_todos', parsed, defaultUid);
            } catch (e) { /* ignore */ }
        }

        localStorage.setItem(MIGRATION_DONE_KEY, 'true');
        console.log('Legacy data migration completed successfully.');
    } catch (err) {
        console.error('Error migrating legacy data:', err);
    }
}

// ----------------- BACKUP EXPORT & IMPORT -----------------

export function exportAllDataForActiveUser() {
    const uid = getActiveUserId();
    const user = getActiveUser();
    const exportObj = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        user,
        journal: getUserItem('journal_entries', {}, uid),
        habits: getUserItem('habits_data', [], uid),
        sleep: getUserItem('sleep_data', {}, uid),
        events: getUserItem('schedule_events', [], uid),
        todos: getUserItem('schedule_todos', [], uid)
    };
    return JSON.stringify(exportObj, null, 2);
}

export function importDataForActiveUser(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        const uid = getActiveUserId();

        if (data.journal) setUserItem('journal_entries', data.journal, uid);
        if (data.habits) setUserItem('habits_data', data.habits, uid);
        if (data.sleep) setUserItem('sleep_data', data.sleep, uid);
        if (data.events) setUserItem('schedule_events', data.events, uid);
        if (data.todos) setUserItem('schedule_todos', data.todos, uid);

        notifyUserChange(getActiveUser());
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
