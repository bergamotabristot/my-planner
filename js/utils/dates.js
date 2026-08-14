// js/utils/dates.js
// Shared date utilities, formatting, and DST-safe calculations

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DAYS_FULL = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Format Date object to "YYYY-MM-DD"
export function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Parse "YYYY-MM-DD" to local midnight Date object
export function parseDateKey(dateStr) {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// Format date to "DD/MM"
export function formatDateShort(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
}

// Format date to "DD/MM/YYYY"
export function formatDateFull(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
}

// DST-safe difference in calendar days between two dates (date2 - date1)
export function getCalendarDayDiff(date1, date2) {
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

// Get the Monday of the week for a given date
export function getStartOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 is Sun, 1 is Mon...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
}

// Get the week key formatted as "YYYY-MM-DD" (Monday date)
export function getWeekKey(date) {
    return formatDateKey(getStartOfWeek(date));
}

// Format week range e.g. "21-28/04"
export function formatWeekRangeLabel(date) {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startDay = String(start.getDate()).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');

    return `${startDay}-${endDay}/${endMonth}`;
}

// Check if two dates represent the same calendar day
export function isSameDay(date1, date2) {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}
