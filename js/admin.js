// --- СТАН ---
const DAYS_MAP = {
    monday: 'Понеділок',
    tuesday: 'Вівторок',
    wednesday: 'Середа',
    thursday: 'Четвер',
    friday: 'П\'ятниця'
};
const DAYS_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

let isAuthenticated = false;
let currentSettings = {
    className: '',
    schoolName: '',
    editorPassword: '',
    defaultSchedule: null
};

let adminSaveTimeout = null;

// --- ВЕРСІОНУВАННЯ КЕШУ ---
const APP_VERSION = '2.0.0';

function checkAndClearAdminLegacyCache() {
    const currentVersion = localStorage.getItem('diary_app_version');
    if (currentVersion !== APP_VERSION) {
        console.log('🔄 Очищення застарілого кешу в адмін-панелі...');
        localStorage.removeItem('diary_schedule');
        localStorage.removeItem('diary_homework');
        localStorage.removeItem('diary_settings');
        localStorage.removeItem('diary_announcements');
        localStorage.setItem('diary_app_version', APP_VERSION);
    }
}

// --- ІНІЦІАЛІЗАЦІЯ ---
function initAdmin() {
    checkAndClearAdminLegacyCache();

    // Обробники входу
    document.getElementById('adminLoginBtn').onclick = adminLogin;
    document.getElementById('adminPasswordInput').onkeypress = (e) => {
        if (e.key === 'Enter') adminLogin();
    };

    // Обробники панелі
    document.getElementById('adminLogoutBtn').onclick = adminLogout;
    document.getElementById('saveAllBtn').onclick = saveAllSettings;
    document.getElementById('resetScheduleBtn').onclick = resetScheduleToDefault;
    document.getElementById('cleanupBtn').onclick = cleanupOldData;

    // Фокус на полі пароля
    document.getElementById('adminPasswordInput').focus();
}

function adminLogin() {
    const pass = document.getElementById('adminPasswordInput').value;

    if (pass === ADMIN_PASSWORD) {
        isAuthenticated = true;
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('adminPasswordInput').value = '';
        loadSettings();
    } else {
        alert('❌ Невірний пароль!');
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminPasswordInput').focus();
    }
}

function adminLogout() {
    isAuthenticated = false;
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminPasswordInput').focus();
}

// --- ЗАВАНТАЖЕННЯ НАЛАШТУВАНЬ ---
function loadSettings() {
    if (!firebaseInitialized) {
        alert('⚠️ Firebase не підключено. Перевірте конфігурацію.');
        renderDefaultScheduleEditor();
        return;
    }

    db.ref('settings').once('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
            currentSettings.className = val.className || '';
            currentSettings.schoolName = val.schoolName || '';
            currentSettings.editorPassword = val.editorPassword || '';
            if (val.defaultSchedule) {
                currentSettings.defaultSchedule = val.defaultSchedule;
            }
        }

        // Заповнити поля
        document.getElementById('classNameInput').value = currentSettings.className;
        document.getElementById('schoolNameInput').value = currentSettings.schoolName;
        document.getElementById('editorPasswordInput').value = currentSettings.editorPassword;

        renderDefaultScheduleEditor();
    }, (error) => {
        console.error('Помилка завантаження налаштувань:', error);
        alert('Помилка завантаження налаштувань.');
        renderDefaultScheduleEditor();
    });
}

// --- РЕДАКТОР БАЗОВОГО РОЗКЛАДУ ---
function renderDefaultScheduleEditor() {
    const container = document.getElementById('defaultScheduleEditor');
    container.innerHTML = '';

    const schedule = currentSettings.defaultSchedule || getDefaultSchedule();

    DAYS_KEYS.forEach(dayKey => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'schedule-day';

        const lessons = schedule[dayKey] || [];

        let lessonsHtml = '';
        lessons.forEach((lesson, i) => {
            lessonsHtml += `
                <div class="schedule-lesson-item">
                    <span class="lesson-number">${i + 1}.</span>
                    <input type="text" value="${escapeHtml(lesson)}"
                           data-day="${dayKey}" data-index="${i}"
                           onchange="updateDefaultLesson('${dayKey}', ${i}, this.value)">
                    <button class="btn-delete-lesson" onclick="deleteDefaultLesson('${dayKey}', ${i})">✕</button>
                </div>
            `;
        });

        dayDiv.innerHTML = `
            <div class="schedule-day-header">
                <h3>${DAYS_MAP[dayKey]}</h3>
                <button class="btn btn-small btn-outline" onclick="addDefaultLesson('${dayKey}')">+ Урок</button>
            </div>
            <div class="schedule-lessons">
                ${lessonsHtml || '<p style="color:#666;font-size:13px;">Немає уроків</p>'}
            </div>
        `;

        container.appendChild(dayDiv);
    });
}

function getDefaultSchedule() {
    return {
        monday: ['Математика', 'Українська мова', 'Англійська'],
        tuesday: ['Фізика', 'Історія', 'Інформатика'],
        wednesday: ['Хімія', 'Біологія', 'Література'],
        thursday: ['Географія', 'Мистецтво', 'Фізкультура'],
        friday: ['Трудове навчання', 'Основи здоров\'я', 'Математика']
    };
}

// --- ОПЕРАЦІЇ З БАЗОВИМ РОЗКЛАДОМ ---
window.updateDefaultLesson = function (dayKey, index, value) {
    if (!currentSettings.defaultSchedule) {
        currentSettings.defaultSchedule = getDefaultSchedule();
    }
    if (!currentSettings.defaultSchedule[dayKey]) {
        currentSettings.defaultSchedule[dayKey] = [];
    }
    currentSettings.defaultSchedule[dayKey][index] = value.trim();
};

window.deleteDefaultLesson = function (dayKey, index) {
    if (!currentSettings.defaultSchedule) {
        currentSettings.defaultSchedule = getDefaultSchedule();
    }
    if (currentSettings.defaultSchedule[dayKey]) {
        currentSettings.defaultSchedule[dayKey].splice(index, 1);
        renderDefaultScheduleEditor();
    }
};

window.addDefaultLesson = function (dayKey) {
    if (!currentSettings.defaultSchedule) {
        currentSettings.defaultSchedule = getDefaultSchedule();
    }
    if (!currentSettings.defaultSchedule[dayKey]) {
        currentSettings.defaultSchedule[dayKey] = [];
    }
    currentSettings.defaultSchedule[dayKey].push('Новий предмет');
    renderDefaultScheduleEditor();
};

// --- ЗБЕРЕЖЕННЯ ---
function showAdminSaveIndicator() {
    const indicator = document.getElementById('adminSaveIndicator');
    indicator.classList.remove('hidden');
    if (adminSaveTimeout) clearTimeout(adminSaveTimeout);
    adminSaveTimeout = setTimeout(() => {
        indicator.classList.add('hidden');
    }, 3000);
}

function saveAllSettings() {
    const btn = document.getElementById('saveAllBtn');
    if (!firebaseInitialized) {
        alert('⚠️ Firebase не підключено!');
        return;
    }

    // Індикація процесу
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Зберігаю...';
    btn.disabled = true;

    // Зібрати дані з форми
    currentSettings.className = document.getElementById('classNameInput').value.trim();
    currentSettings.schoolName = document.getElementById('schoolNameInput').value.trim();
    currentSettings.editorPassword = document.getElementById('editorPasswordInput').value.trim();

    if (!currentSettings.defaultSchedule) {
        currentSettings.defaultSchedule = getDefaultSchedule();
    }

    const settingsToSave = {
        className: currentSettings.className,
        schoolName: currentSettings.schoolName,
        editorPassword: currentSettings.editorPassword,
        defaultSchedule: currentSettings.defaultSchedule
    };

    db.ref('settings').set(settingsToSave)
        .then(() => {
            showAdminSaveIndicator();
            btn.innerHTML = '✅ Збережено!';
            btn.classList.add('btn-success');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.remove('btn-success');
            }, 2500);
        })
        .catch((error) => {
            console.error('Помилка збереження:', error);
            btn.innerHTML = '❌ Помилка!';
            btn.classList.add('btn-error');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.remove('btn-error');
            }, 2500);
        });
}

let resetConfirmPending = false;
let resetConfirmTimer = null;

function resetScheduleToDefault() {
    const btn = document.getElementById('resetScheduleBtn');

    // Перший натиск — запит підтвердження
    if (!resetConfirmPending) {
        resetConfirmPending = true;
        btn.innerHTML = '⚠️ Точно скинути? (натисніть ще раз)';
        btn.classList.add('btn-error');

        // Скидаємо через 3 секунди якщо не підтверджено
        resetConfirmTimer = setTimeout(() => {
            resetConfirmPending = false;
            btn.innerHTML = '🔄 Скинути розклад до базового';
            btn.classList.remove('btn-error');
        }, 3000);
        return;
    }

    // Другий натиск — виконання
    clearTimeout(resetConfirmTimer);
    resetConfirmPending = false;

    if (!firebaseInitialized) {
        alert('⚠️ Firebase не підключено!');
        btn.innerHTML = '🔄 Скинути розклад до базового';
        btn.classList.remove('btn-error');
        return;
    }

    btn.innerHTML = '⏳ Скидаю...';
    btn.classList.remove('btn-error');
    btn.disabled = true;

    // Видаляємо всі збережені розклади по датах
    // Щоденник автоматично покаже базовий розклад
    db.ref('schedule').remove()
        .then(() => {
            btn.innerHTML = '✅ Скинуто! Переходжу...';
            btn.classList.add('btn-success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        })
        .catch((error) => {
            console.error('Помилка:', error);
            btn.innerHTML = '❌ Помилка!';
            btn.classList.add('btn-error');
            setTimeout(() => {
                btn.innerHTML = '🔄 Скинути розклад до базового';
                btn.disabled = false;
                btn.classList.remove('btn-error');
            }, 2500);
        });
}

// --- ОЧИСТКА СТАРИХ ДАНИХ ---
let cleanupConfirmPending = false;
let cleanupConfirmTimer = null;

function cleanupOldData() {
    const btn = document.getElementById('cleanupBtn');
    const resultDiv = document.getElementById('cleanupResult');

    // Перший натиск — підтвердження
    if (!cleanupConfirmPending) {
        cleanupConfirmPending = true;
        btn.innerHTML = '⚠️ Точно видалити? (натисніть ще раз)';
        btn.classList.add('btn-error');
        btn.classList.remove('btn-danger');

        cleanupConfirmTimer = setTimeout(() => {
            cleanupConfirmPending = false;
            btn.innerHTML = '🗑 Очистити старі дані';
            btn.classList.remove('btn-error');
            btn.classList.add('btn-danger');
        }, 3000);
        return;
    }

    // Другий натиск — виконання
    clearTimeout(cleanupConfirmTimer);
    cleanupConfirmPending = false;

    if (!firebaseInitialized) {
        alert('⚠️ Firebase не підключено!');
        btn.innerHTML = '🗑 Очистити старі дані';
        btn.classList.remove('btn-error');
        btn.classList.add('btn-danger');
        return;
    }

    const days = parseInt(document.getElementById('cleanupPeriod').value);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    btn.innerHTML = '⏳ Очищую...';
    btn.classList.remove('btn-error');
    btn.disabled = true;
    resultDiv.classList.add('hidden');

    let deletedCount = 0;
    const deletePromises = [];

    // Очистка schedule
    const schedulePromise = db.ref('schedule').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const key = child.key;
                // Ключі schedule — це дати (2026-02-16)
                if (key < cutoffStr && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
                    deletePromises.push(db.ref('schedule/' + key).remove());
                    deletedCount++;
                }
            });
        }
    });

    // Очистка homework
    const homeworkPromise = db.ref('homework').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const key = child.key;
                if (key < cutoffStr && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
                    deletePromises.push(db.ref('homework/' + key).remove());
                    deletedCount++;
                }
            });
        }
    });

    Promise.all([schedulePromise, homeworkPromise])
        .then(() => Promise.all(deletePromises))
        .then(() => {
            btn.innerHTML = '✅ Готово!';
            btn.classList.add('btn-success');
            btn.disabled = false;

            resultDiv.classList.remove('hidden');
            if (deletedCount > 0) {
                resultDiv.innerHTML = `✅ Видалено <strong>${deletedCount}</strong> записів старіших за ${cutoffStr}`;
                resultDiv.className = 'cleanup-result success';
            } else {
                resultDiv.innerHTML = 'ℹ️ Старих записів не знайдено.';
                resultDiv.className = 'cleanup-result info';
            }

            setTimeout(() => {
                btn.innerHTML = '🗑 Очистити старі дані';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-danger');
            }, 3000);
        })
        .catch((error) => {
            console.error('Помилка очистки:', error);
            btn.innerHTML = '❌ Помилка!';
            btn.classList.add('btn-error');
            btn.disabled = false;

            setTimeout(() => {
                btn.innerHTML = '🗑 Очистити старі дані';
                btn.classList.remove('btn-error');
                btn.classList.add('btn-danger');
            }, 2500);
        });
}

// --- ДОПОМІЖНІ ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- ЗАПУСК ---
initAdmin();
