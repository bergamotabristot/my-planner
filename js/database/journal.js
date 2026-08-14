// js/database/journal.js
// User-scoped repository for Journal entries

import { getUserItem, setUserItem } from './database.js';

const JOURNAL_COLLECTION = 'journal_entries';

export function getAllJournalEntries() {
    return getUserItem(JOURNAL_COLLECTION, {}) || {};
}

export function getJournalEntry(dateKey) {
    const all = getAllJournalEntries();
    return all[dateKey] || '';
}

export function saveJournalEntry(dateKey, content) {
    const all = getAllJournalEntries();
    if (!content || content.trim() === '') {
        delete all[dateKey];
    } else {
        all[dateKey] = content;
    }
    setUserItem(JOURNAL_COLLECTION, all);
}

export function hasJournalEntry(dateKey) {
    const all = getAllJournalEntries();
    return Boolean(all[dateKey] && all[dateKey].trim() !== '');
}

export function getDatesWithEntriesForMonth(year, month) {
    const all = getAllJournalEntries();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const result = new Set();
    Object.keys(all).forEach(key => {
        if (key.startsWith(prefix) && all[key] && all[key].trim() !== '') {
            const day = parseInt(key.split('-')[2]);
            result.add(day);
        }
    });
    return result;
}
