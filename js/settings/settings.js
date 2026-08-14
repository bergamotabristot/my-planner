// js/settings/settings.js
// Complete Settings, Account, and Help flow matching the master wireframe diagram

import { 
    getUsers, 
    getActiveUser, 
    setActiveUser, 
    createUser, 
    updateUser, 
    deleteUser, 
    exportAllDataForActiveUser, 
    importDataForActiveUser, 
    subscribeUserChange 
} from '../database/database.js';

const THEME_STORAGE_KEY = 'myplanner_app_theme';
const FIRST_DAY_KEY = 'myplanner_first_day_of_week';

const AVATAR_OPTIONS = ['👤', '💼', '🎓', '🌿', '🎯', '✨', '🚀', '💡', '🏠', '🎨'];
const COLOR_OPTIONS = ['#00a8ff', '#ff9f43', '#2ed573', '#a55eea', '#ff6b81', '#feca57', '#54a0ff'];

let currentSettingsScreen = 'menu'; // 'menu' | 'settings' | 'account' | 'help'

// Initialize theme immediately
export function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

export function initSettings() {
    initTheme();
    setupSettingsModalStructure();
    createSettingsButton();
    updateHeaderUserBadge();

    subscribeUserChange(() => {
        updateHeaderUserBadge();
        if (currentSettingsScreen === 'account') {
            renderAccountScreen();
        }
    });
}


function updateHeaderUserBadge() {
    const badgeBtn = document.getElementById('headerUserBadgeBtn');
    if (!badgeBtn) return;

    const user = getActiveUser();
    badgeBtn.innerHTML = `
        <span class="badge-avatar">${user.avatar || '👤'}</span>
        <span class="badge-name">${user.name || 'User'}</span>
    `;
    badgeBtn.style.borderColor = user.color || '#00a8ff';
}

function setupSettingsModalStructure() {
    let modal = document.getElementById('globalSettingsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'globalSettingsModal';
        modal.className = 'settings-modal-overlay';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="settings-modal-content" id="settingsModalContent">
                <!-- Dynamically populated by renderCurrentScreen() -->
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

export function openGlobalMenu(screen = 'menu') {
    const modal = document.getElementById('globalSettingsModal');
    if (!modal) setupSettingsModalStructure();
    
    currentSettingsScreen = screen;
    renderCurrentScreen();
    document.getElementById('globalSettingsModal').style.display = 'flex';
}

function renderCurrentScreen() {
    const container = document.getElementById('settingsModalContent');
    if (!container) return;

    if (currentSettingsScreen === 'menu') {
        renderMainMenu(container);
    } else if (currentSettingsScreen === 'settings') {
        renderSettingsScreen(container);
    } else if (currentSettingsScreen === 'account') {
        renderAccountScreen(container);
    } else if (currentSettingsScreen === 'help') {
        renderHelpScreen(container);
    }
}

// ----------------- 1. MAIN MENU (Settings / Account / Help) -----------------
function renderMainMenu(container) {
    container.innerHTML = `
        <div class="settings-modal-header" style="justify-content: flex-end; border-bottom: none; padding-bottom: 0;">
            <button id="closeGlobalMenuBtn" class="settings-close-btn">&times;</button>
        </div>
        <div class="menu-flow-list">
            <button type="button" class="menu-flow-item" id="menuOptSettings">
                <span class="menu-item-text">Settings</span>
                <span class="menu-item-arrow">›</span>
            </button>
            <button type="button" class="menu-flow-item" id="menuOptAccount">
                <span class="menu-item-text">Account</span>
                <span class="menu-item-arrow">›</span>
            </button>
            <button type="button" class="menu-flow-item" id="menuOptHelp">
                <span class="menu-item-text">Help</span>
                <span class="menu-item-arrow">›</span>
            </button>
        </div>
    `;

    container.querySelector('#closeGlobalMenuBtn').onclick = () => {
        document.getElementById('globalSettingsModal').style.display = 'none';
    };

    container.querySelector('#menuOptSettings').onclick = () => {
        currentSettingsScreen = 'settings';
        renderCurrentScreen();
    };

    container.querySelector('#menuOptAccount').onclick = () => {
        currentSettingsScreen = 'account';
        renderCurrentScreen();
    };

    container.querySelector('#menuOptHelp').onclick = () => {
        currentSettingsScreen = 'help';
        renderCurrentScreen();
    };
}

// ----------------- 2. SETTINGS SUBMENU (Theme, Preferences, Backup) -----------------
function renderSettingsScreen(container) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = currentTheme === 'dark';
    const firstDay = localStorage.getItem(FIRST_DAY_KEY) || 'monday';

    container.innerHTML = `
        <div class="settings-sub-header">
            <button id="backToMenuBtn" class="settings-back-btn" title="Back">←</button>
            <h3>Settings</h3>
            <button id="closeSettingsSubBtn" class="settings-close-btn">&times;</button>
        </div>

        <div class="settings-modal-body">
            <!-- Theme Toggle Switch -->
            <div class="settings-pref-row">
                <div class="pref-label-group">
                    <span class="pref-title">Theme</span>
                    <span class="pref-desc">${isDark ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <div class="theme-toggle-wrapper">
                    <span class="theme-icon sun">☀️</span>
                    <label class="switch">
                        <input type="checkbox" id="themeSwitchCheckbox" ${isDark ? 'checked' : ''} />
                        <span class="slider round"></span>
                    </label>
                    <span class="theme-icon moon">🌙</span>
                </div>
            </div>

            <!-- First Day of Week -->
            <div class="settings-pref-row">
                <div class="pref-label-group">
                    <span class="pref-title">First Day of Week</span>
                    <span class="pref-desc">${firstDay === 'monday' ? 'Monday' : 'Sunday'}</span>
                </div>
                <button type="button" id="toggleFirstDayBtn" class="btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;">
                    ${firstDay === 'monday' ? 'Monday' : 'Sunday'}
                </button>
            </div>

            <!-- Backup & Restore -->
            <div class="settings-section" style="margin-top: 14px;">
                <h4>Backup & Restore</h4>
                <div class="backup-actions-row">
                    <button type="button" id="exportDataBtn" class="btn-backup">📥 Export Data (JSON)</button>
                    <label class="btn-backup" for="importDataFile">
                        📤 Import Data
                        <input type="file" id="importDataFile" accept=".json" style="display: none;" />
                    </label>
                </div>
                <div id="importStatusMsg" class="import-status-msg" style="display: none;"></div>
            </div>
        </div>
    `;

    // Navigation
    container.querySelector('#backToMenuBtn').onclick = () => {
        currentSettingsScreen = 'menu';
        renderCurrentScreen();
    };

    container.querySelector('#closeSettingsSubBtn').onclick = () => {
        document.getElementById('globalSettingsModal').style.display = 'none';
    };

    // Theme toggle
    const themeCheckbox = container.querySelector('#themeSwitchCheckbox');
    if (themeCheckbox) {
        themeCheckbox.onchange = () => {
            const newTheme = themeCheckbox.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem(THEME_STORAGE_KEY, newTheme);
            renderSettingsScreen(container);
        };
    }

    // First day toggle
    const toggleFirstDayBtn = container.querySelector('#toggleFirstDayBtn');
    if (toggleFirstDayBtn) {
        toggleFirstDayBtn.onclick = () => {
            const current = localStorage.getItem(FIRST_DAY_KEY) || 'monday';
            const next = current === 'monday' ? 'sunday' : 'monday';
            localStorage.setItem(FIRST_DAY_KEY, next);
            renderSettingsScreen(container);
        };
    }

    // Export
    const exportBtn = container.querySelector('#exportDataBtn');
    if (exportBtn) {
        exportBtn.onclick = () => {
            const json = exportAllDataForActiveUser();
            const user = getActiveUser();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my-planner-${user.name.toLowerCase().replace(/\s+/g, '-')}-backup.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    }

    // Import
    const fileInput = container.querySelector('#importDataFile');
    const statusMsg = container.querySelector('#importStatusMsg');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const res = importDataForActiveUser(evt.target.result);
                if (statusMsg) {
                    statusMsg.style.display = 'block';
                    if (res.success) {
                        statusMsg.textContent = '✓ Data imported successfully!';
                        statusMsg.style.color = '#2ed573';
                    } else {
                        statusMsg.textContent = `✕ Import failed: ${res.error}`;
                        statusMsg.style.color = '#ff4757';
                    }
                    setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
                }
            };
            reader.readAsText(file);
            fileInput.value = '';
        };
    }
}

// ----------------- 3. ACCOUNT SUBMENU (Multi-User Profiles) -----------------
function renderAccountScreen(container) {
    if (!container) container = document.getElementById('settingsModalContent');
    if (!container) return;

    const user = getActiveUser();
    const users = getUsers();

    container.innerHTML = `
        <div class="settings-sub-header">
            <button id="backToMenuBtn" class="settings-back-btn" title="Back">←</button>
            <h3>Account Profiles</h3>
            <button id="closeAccountSubBtn" class="settings-close-btn">&times;</button>
        </div>

        <div class="settings-modal-body">
            <!-- Active Profile Card -->
            <div class="active-profile-card">
                <div class="profile-avatar-lg" style="border-color: ${user.color || '#00a8ff'}">${user.avatar || '👤'}</div>
                <div class="profile-info">
                    <div class="profile-title">${user.name}</div>
                    <div class="profile-subtitle">${user.isDefault ? 'Primary Profile' : 'Custom Profile'}</div>
                </div>
            </div>

            <!-- Profiles List Section -->
            <div class="settings-section">
                <div class="settings-section-header">
                    <h4>Switch Profile</h4>
                    <button id="toggleNewProfileFormBtn" class="new-profile-toggle-btn">+ New Profile</button>
                </div>
                <div id="settingsProfilesList" class="profiles-list"></div>
            </div>

            <!-- New Profile Form -->
            <div id="newProfileForm" class="new-profile-form" style="display: none;">
                <input type="text" id="newProfileNameInput" class="profile-input" placeholder="Profile name (e.g. Work, Study)..." />
                
                <div class="picker-label">Choose Avatar</div>
                <div class="avatar-picker-row" id="avatarPickerRow">
                    ${AVATAR_OPTIONS.map((a, i) => `
                        <button type="button" class="avatar-opt-btn ${i === 0 ? 'selected' : ''}" data-avatar="${a}">${a}</button>
                    `).join('')}
                </div>

                <div class="picker-label">Choose Color</div>
                <div class="color-picker-row" id="colorPickerRow">
                    ${COLOR_OPTIONS.map((c, i) => `
                        <button type="button" class="color-opt-btn ${i === 0 ? 'selected' : ''}" data-color="${c}" style="background-color: ${c}"></button>
                    `).join('')}
                </div>

                <div class="new-profile-actions">
                    <button type="button" id="cancelNewProfileBtn" class="btn-secondary">Cancel</button>
                    <button type="button" id="saveNewProfileBtn" class="btn-primary">Create Profile</button>
                </div>
            </div>
        </div>
    `;

    // Navigation
    container.querySelector('#backToMenuBtn').onclick = () => {
        currentSettingsScreen = 'menu';
        renderCurrentScreen();
    };

    container.querySelector('#closeAccountSubBtn').onclick = () => {
        document.getElementById('globalSettingsModal').style.display = 'none';
    };

    // Populate profiles
    const list = container.querySelector('#settingsProfilesList');
    users.forEach(u => {
        const item = document.createElement('div');
        const isActive = (u.id === user.id);
        item.className = `profile-list-item ${isActive ? 'active' : ''}`;

        item.innerHTML = `
            <div class="item-left">
                <span class="item-avatar" style="border-color: ${u.color || '#00a8ff'}">${u.avatar || '👤'}</span>
                <span class="item-name">${u.name}</span>
                ${isActive ? '<span class="item-badge">Active</span>' : ''}
            </div>
            <div class="item-actions">
                ${!isActive ? `<button type="button" class="btn-switch" data-id="${u.id}">Switch</button>` : ''}
                ${users.length > 1 && !u.isDefault ? `<button type="button" class="btn-delete" data-id="${u.id}" title="Delete profile">&times;</button>` : ''}
            </div>
        `;

        const switchBtn = item.querySelector('.btn-switch');
        if (switchBtn) {
            switchBtn.onclick = () => {
                setActiveUser(u.id);
                renderAccountScreen(container);
            };
        }

        const deleteBtn = item.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete profile "${u.name}" and all associated data?`)) {
                    deleteUser(u.id);
                    renderAccountScreen(container);
                }
            };
        }

        list.appendChild(item);
    });

    // Form logic
    const toggleFormBtn = container.querySelector('#toggleNewProfileFormBtn');
    const form = container.querySelector('#newProfileForm');
    const cancelFormBtn = container.querySelector('#cancelNewProfileBtn');
    const saveProfileBtn = container.querySelector('#saveNewProfileBtn');

    if (toggleFormBtn && form) {
        toggleFormBtn.onclick = () => {
            const isOpen = form.style.display === 'block';
            form.style.display = isOpen ? 'none' : 'block';
            toggleFormBtn.textContent = isOpen ? '+ New Profile' : 'Close';
        };
    }

    if (cancelFormBtn && form) {
        cancelFormBtn.onclick = () => {
            form.style.display = 'none';
            if (toggleFormBtn) toggleFormBtn.textContent = '+ New Profile';
        };
    }

    let selectedAvatar = AVATAR_OPTIONS[0];
    let selectedColor = COLOR_OPTIONS[0];

    container.querySelectorAll('.avatar-opt-btn').forEach(btn => {
        btn.onclick = () => {
            container.querySelectorAll('.avatar-opt-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAvatar = btn.getAttribute('data-avatar');
        };
    });

    container.querySelectorAll('.color-opt-btn').forEach(btn => {
        btn.onclick = () => {
            container.querySelectorAll('.color-opt-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedColor = btn.getAttribute('data-color');
        };
    });

    if (saveProfileBtn) {
        saveProfileBtn.onclick = () => {
            const nameInput = container.querySelector('#newProfileNameInput');
            const name = nameInput.value.trim();
            if (!name) return;

            const newUser = createUser({
                name,
                avatar: selectedAvatar,
                color: selectedColor
            });

            nameInput.value = '';
            form.style.display = 'none';
            setActiveUser(newUser.id);
            renderAccountScreen(container);
        };
    }
}

// ----------------- 4. HELP SUBMENU -----------------
function renderHelpScreen(container) {
    container.innerHTML = `
        <div class="settings-sub-header">
            <button id="backToMenuBtn" class="settings-back-btn" title="Back">←</button>
            <h3>Help & Guide</h3>
            <button id="closeHelpSubBtn" class="settings-close-btn">&times;</button>
        </div>

        <div class="settings-modal-body">
            <div class="help-section">
                <h4>📖 Journal</h4>
                <p>Scroll vertically to write entries for today or any past/future dates. Use the "Months" button to jump to any specific month instantly.</p>
            </div>

            <div class="help-section">
                <h4>📅 Schedule</h4>
                <p>Switch between <strong>Day</strong> timeline, <strong>Week</strong> overview, and <strong>Month</strong> calendar. Tap <strong>[+]</strong> to add time-blocked events with repeat rules or to-dos.</p>
            </div>

            <div class="help-section">
                <h4>🎯 Habits & Sleep</h4>
                <p>Track habits across <strong>This Week</strong>, <strong>This Month</strong>, and <strong>This Year</strong>. Tap cells to cycle between done (✓), paused (-), and unchecked. Drag sleep bars to track hours and quality.</p>
            </div>

            <div class="help-section">
                <h4>📱 iOS / Android PWA</h4>
                <p>Tap "Share" in Safari and select "Add to Home Screen" to install My Day as a native full-screen app.</p>
            </div>
        </div>
    `;

    container.querySelector('#backToMenuBtn').onclick = () => {
        currentSettingsScreen = 'menu';
        renderCurrentScreen();
    };

    container.querySelector('#closeHelpSubBtn').onclick = () => {
        document.getElementById('globalSettingsModal').style.display = 'none';
    };
}
