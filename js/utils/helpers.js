// js/utils/helpers.js
// Utility helpers for debouncing, event listeners, and UI utilities

// Debounce function to limit frequent executions (e.g. typing)
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Generate unique ID with prefix
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Safely attach modal click-outside to close
export function setupModalClickOutside(modalElement, onClose) {
    if (!modalElement) return;
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
            if (typeof onClose === 'function') {
                onClose();
            } else {
                modalElement.style.display = 'none';
            }
        }
    });
}
