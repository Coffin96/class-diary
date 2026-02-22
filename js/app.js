// --- КОНСТАНТИ ---
const DAYS_MAP = {
    monday: 'Понеділок',
    tuesday: 'Вівторок',
    wednesday: 'Середа',
    thursday: 'Четвер',
    friday: 'П\'ятниця'
};
const DAYS_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// --- СТАН ДОДАТКУ ---
let currentWeekStart = getMonday(new Date());
let currentMode = 'viewer'; // 'viewer' | 'editor' | 'admin'
let scheduleData = {};
let homeworkData = {};
let settingsData = {
    className: '',
    schoolName: '',
    editorPassword: '',
    defaultSchedule: null
};
let saveTimeout = null;
let announcementData = {}; // {weekStartDate: text}

// --- ФУНКЦІЇ ДАТ ---
function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDateDisplay(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
}

// --- ЛОКАЛЬНЕ СХОВИЩЕ (РЕЗЕРВНА КОПІЯ) ---
function saveToLocal() {
    try {
        localStorage.setItem('diary_schedule', JSON.stringify(scheduleData));
        localStorage.setItem('diary_homework', JSON.stringify(homeworkData));
        localStorage.setItem('diary_settings', JSON.stringify(settingsData));
        localStorage.setItem('diary_announcements', JSON.stringify(announcementData));
    } catch (e) {
        console.warn('Не вдалося зберегти локально:', e);
    }
}

function loadFromLocal() {
    try {
        const schedule = localStorage.getItem('diary_schedule');
        const homework = localStorage.getItem('diary_homework');
        const settings = localStorage.getItem('diary_settings');
        const announcements = localStorage.getItem('diary_announcements');
        if (schedule) scheduleData = JSON.parse(schedule);
        if (homework) homeworkData = JSON.parse(homework);
        if (settings) settingsData = JSON.parse(settings);
        if (announcements) announcementData = JSON.parse(announcements);
        return !!(schedule || homework);
    } catch (e) {
        console.warn('Не вдалося завантажити локальні дані:', e);
        return false;
    }
}

// --- ІНДИКАТОР ЗБЕРЕЖЕННЯ ---
function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    indicator.classList.remove('hidden');

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        indicator.classList.add('hidden');
    }, 2000);
}

// --- ОНОВЛЕННЯ UI НАЛАШТУВАНЬ ---
function applySettings() {
    const titleEl = document.getElementById('classTitle');
    const footerEl = document.getElementById('schoolFooter');

    if (settingsData.className) {
        titleEl.textContent = '📚 ' + settingsData.className;
        document.title = settingsData.className;
    } else {
        titleEl.textContent = '📚 Щоденник класу';
    }

    if (settingsData.schoolName) {
        footerEl.textContent = settingsData.schoolName;
        footerEl.style.display = 'block';
    } else {
        footerEl.style.display = 'none';
    }
}

// --- ВЕРСІОНУВАННЯ КЕШУ ---
const APP_VERSION = '2.0.0';

function checkAndClearLegacyCache() {
    const currentVersion = localStorage.getItem('diary_app_version');
    if (currentVersion !== APP_VERSION) {
        console.log('🔄 Виявлено нову версію додатку. Очищення застарілого кешу...');
        localStorage.removeItem('diary_schedule');
        localStorage.removeItem('diary_homework');
        localStorage.removeItem('diary_settings');
        localStorage.removeItem('diary_announcements');
        localStorage.setItem('diary_app_version', APP_VERSION);
    }
}

// --- ІНІЦІАЛІЗАЦІЯ ---
function init() {
    // Перевірка та очищення старого несумісного кешу перед початком
    checkAndClearLegacyCache();

    // Обробники кнопок
    document.getElementById('prevWeek').onclick = () => changeWeek(-7);
    document.getElementById('nextWeek').onclick = () => changeWeek(7);
    document.getElementById('editorBtn').onclick = toggleEditMode;
    document.getElementById('loginConfirmBtn').onclick = checkLogin;
    document.getElementById('loginCancelBtn').onclick = () => {
        document.getElementById('loginModal').classList.add('hidden');
    };

    // Закриття модалки при кліку по фону
    document.getElementById('loginModal').onclick = (e) => {
        if (e.target.id === 'loginModal') {
            document.getElementById('loginModal').classList.add('hidden');
        }
    };

    // Enter у модальному вікні
    document.getElementById('passwordInput').onkeypress = (e) => {
        if (e.key === 'Enter') checkLogin();
    };

    if (!firebaseInitialized) {
        if (loadFromLocal()) {
            applySettings();
            renderDiary();
        } else {
            applySettings();
            renderDiary();
        }
        return;
    }

    // Спочатку завантажуємо з localStorage як базу
    loadFromLocal();
    applySettings();
    renderDiary();

    // Потім синхронізуємо з Firebase (мерджимо поверх локальних даних)
    db.ref('settings').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
            settingsData.className = val.className || '';
            settingsData.schoolName = val.schoolName || '';
            settingsData.editorPassword = val.editorPassword || '';
            if (val.defaultSchedule) {
                settingsData.defaultSchedule = val.defaultSchedule;
            }
        }
        saveToLocal();
        applySettings();
    });

    // Завантаження розкладу, домашки та оголошень по датах
    loadScheduleForWeeks();
    loadHomeworkForWeeks();
    loadAnnouncement();
}

function loadScheduleForWeeks() {
    const startDateStr = formatDate(addDays(currentWeekStart, -7));
    const endDateStr = formatDate(addDays(currentWeekStart, 14));

    db.ref('schedule')
        .orderByKey()
        .startAt(startDateStr)
        .endAt(endDateStr)
        .once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                // Оновлюємо тільки дані в діапазоні, не стираючи старі
                for (let offset = -7; offset <= 14; offset++) {
                    const dateStr = formatDate(addDays(currentWeekStart, offset));
                    if (data[dateStr]) {
                        scheduleData[dateStr] = data[dateStr];
                    }
                }
            }
            saveToLocal();
            renderDiary();
        })
        .catch(err => console.error('Помилка завантаження розкладу:', err));
}

function loadHomeworkForWeeks() {
    const startDateStr = formatDate(addDays(currentWeekStart, -7));
    const endDateStr = formatDate(addDays(currentWeekStart, 14));

    db.ref('homework')
        .orderByKey()
        .startAt(startDateStr)
        .endAt(endDateStr)
        .once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                for (let offset = -7; offset <= 14; offset++) {
                    const dateStr = formatDate(addDays(currentWeekStart, offset));
                    if (data[dateStr]) {
                        homeworkData[dateStr] = data[dateStr];
                    }
                }
            }
            saveToLocal();
            renderDiary();
        })
        .catch(err => console.error('Помилка завантаження домашки:', err));
}

function getDefaultScheduleFromSettings() {
    if (settingsData.defaultSchedule) {
        return JSON.parse(JSON.stringify(settingsData.defaultSchedule));
    }
    return getDefaultSchedule();
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

function getBaseScheduleForDay(dayKey) {
    if (settingsData.defaultSchedule && settingsData.defaultSchedule[dayKey]) {
        return [...settingsData.defaultSchedule[dayKey]];
    }
    return [...(getDefaultSchedule()[dayKey] || [])];
}

// --- ОТРИМАННЯ УРОКІВ ДЛЯ ДАТИ ---
function getLessonsForDate(dateStr, dayKey) {
    if (scheduleData[dateStr]) {
        return scheduleData[dateStr];
    }
    return getBaseScheduleForDay(dayKey);
}

// --- ОЧИЩЕННЯ ЗАЙВОГО РОЗКЛАДУ ---
// Якщо розклад повністю співпадає з базовим і немає домашки - видаляємо запис
function checkAndCleanupSchedule(dateStr, dayKey, currentLessons) {
    const baseLessons = getBaseScheduleForDay(dayKey);
    let isDefault = (currentLessons.length === baseLessons.length) && currentLessons.every((l, i) => l === baseLessons[i]);

    const tasks = homeworkData[dateStr] || [];
    const hasAnyTask = tasks.some(t => t && t.task && t.task.trim());

    if (isDefault && !hasAnyTask) {
        delete scheduleData[dateStr];
        saveToLocal();
        return true; // Вказує, що дані очищені
    }
    return false;
}

// Універсальна функція збереження розкладу, яка сама вирішує чи видалити чи зберегти
function saveScheduleToDb(dateStr, dayKey, lessons, additionalUpdates = {}) {
    const isCleanedUp = checkAndCleanupSchedule(dateStr, dayKey, lessons);
    const updates = { ...additionalUpdates };

    if (isCleanedUp) {
        updates['schedule/' + dateStr] = null;
    } else {
        scheduleData[dateStr] = lessons;
        saveToLocal();
        updates['schedule/' + dateStr] = lessons;
    }

    if (firebaseInitialized && Object.keys(updates).length > 0) {
        db.ref().update(updates)
            .then(() => {
                showSaveIndicator();
                renderDiary();
            })
            .catch((error) => console.error('Помилка збереження:', error));
    } else {
        renderDiary();
    }
}

// --- НАВІГАЦІЯ ---
function changeWeek(days) {
    currentWeekStart = addDays(currentWeekStart, days);
    renderDiary();
    if (firebaseInitialized) {
        loadScheduleForWeeks();
        loadHomeworkForWeeks();
        loadAnnouncement();
    } else {
        renderAnnouncement();
    }
}

// --- ОГОЛОШЕННЯ ---
function loadAnnouncement() {
    const weekStr = formatDate(currentWeekStart);
    db.ref('announcements/' + weekStr).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            announcementData[weekStr] = snapshot.val();
        } else {
            delete announcementData[weekStr];
        }
        saveToLocal();
        renderAnnouncement();
    });
}

function renderAnnouncement() {
    const block = document.getElementById('announcementBlock');
    const weekStr = formatDate(currentWeekStart);
    const text = announcementData[weekStr] || '';

    if (currentMode === 'editor') {
        block.classList.remove('hidden');
        block.innerHTML = `
            <div class="announcement-header">📢 Оголошення на тиждень</div>
            <textarea class="announcement-textarea"
                      oninput="onAnnouncementInput(this.value)"
                      placeholder="Введіть оголошення для учнів на цей тиждень...">${escapeHtml(text)}</textarea>
        `;
    } else if (text.trim()) {
        block.classList.remove('hidden');
        block.innerHTML = `
            <div class="announcement-header">📢 Оголошення</div>
            <div class="announcement-text">${escapeHtml(text)}</div>
        `;
    } else {
        block.classList.add('hidden');
        block.innerHTML = '';
    }
}

let announcementSaveTimer = null;

window.onAnnouncementInput = function (text) {
    const weekStr = formatDate(currentWeekStart);

    // Миттєво оновлюємо локальний кеш
    if (text.trim()) {
        announcementData[weekStr] = text.trim();
    } else {
        delete announcementData[weekStr];
    }

    // Дебаунс збереження у Firebase (500мс після останнього введення)
    if (announcementSaveTimer) clearTimeout(announcementSaveTimer);
    announcementSaveTimer = setTimeout(() => {
        saveAnnouncement(text);
    }, 500);
};

window.saveAnnouncement = function (text) {
    const weekStr = formatDate(currentWeekStart);
    text = text.trim();

    // Оновлюємо локальний кеш
    if (text) {
        announcementData[weekStr] = text;
    } else {
        delete announcementData[weekStr];
    }
    saveToLocal();

    if (firebaseInitialized) {
        if (text) {
            db.ref('announcements/' + weekStr).set(text)
                .then(() => showSaveIndicator());
        } else {
            db.ref('announcements/' + weekStr).remove()
                .then(() => showSaveIndicator());
        }
    }
};

// --- РЕНДЕРИНГ ---
function renderDiary() {
    const tbody = document.getElementById('diaryBody');
    tbody.innerHTML = '';

    const weekEnd = addDays(currentWeekStart, 4);
    document.getElementById('dateRange').innerText =
        `${formatDateDisplay(currentWeekStart)} — ${formatDateDisplay(weekEnd)}`;

    renderAnnouncement();

    const todayStr = formatDate(new Date());

    DAYS_KEYS.forEach((dayKey, index) => {
        const currentDate = addDays(currentWeekStart, index);
        const dateStr = formatDate(currentDate);
        const isToday = dateStr === todayStr;

        const tr = document.createElement('tr');
        if (isToday) tr.classList.add('today-row');

        const lessons = getLessonsForDate(dateStr, dayKey);
        const homeworks = homeworkData[dateStr] || [];

        // ЛІВА КОЛОНКА - УРОКИ
        const tdLessons = document.createElement('td');
        tdLessons.innerHTML = `<span class="day-name">${DAYS_MAP[dayKey]} (${formatDateDisplay(currentDate)})</span>`;

        const lessonsContainer = document.createElement('div');
        lessonsContainer.className = 'lessons-container';

        lessons.forEach((lesson, i) => {
            if (currentMode === 'editor') {
                const lessonDiv = document.createElement('div');
                lessonDiv.className = 'lesson-item';

                const moveBtns = `
                    <div class="move-buttons">
                        <button class="move-btn" ${i === 0 ? 'disabled' : ''}
                                onclick="moveLesson('${dateStr}', ${i}, ${i - 1})" title="Вгору">▲</button>
                        <button class="move-btn" ${i === lessons.length - 1 ? 'disabled' : ''}
                                onclick="moveLesson('${dateStr}', ${i}, ${i + 1})" title="Вниз">▼</button>
                    </div>
                `;

                lessonDiv.innerHTML = `
                    ${moveBtns}
                    <input type="text"
                           value="${escapeHtml(lesson)}"
                           onchange="saveLesson('${dateStr}', ${i}, this.value)"
                           placeholder="Назва предмету">
                    <button class="delete-lesson-btn" onclick="deleteLesson('${dateStr}', ${i})">✕</button>
                `;

                lessonsContainer.appendChild(lessonDiv);
            } else {
                const lessonDiv = document.createElement('div');
                lessonDiv.textContent = `${i + 1}. ${lesson}`;
                lessonDiv.style.marginBottom = '4px';
                lessonsContainer.appendChild(lessonDiv);
            }
        });

        tdLessons.appendChild(lessonsContainer);

        if (currentMode === 'editor') {
            const addBtn = document.createElement('button');
            addBtn.className = 'add-lesson-btn';
            addBtn.textContent = '+ Додати урок';
            addBtn.onclick = () => addLesson(dateStr);
            tdLessons.appendChild(addBtn);
        }

        // ПРАВА КОЛОНКА - ДОМАШКА
        const tdHomework = document.createElement('td');

        lessons.forEach((lesson, i) => {
            const taskObj = homeworks[i] || { subject: lesson, task: '' };
            const taskText = taskObj.task || '';

            const hwDiv = document.createElement('div');
            hwDiv.className = 'homework-item';

            if (currentMode === 'editor') {
                const transferBtn = taskText ? `<button class="transfer-btn" data-subject="${escapeHtml(lesson)}" onclick="transferHomework('${dateStr}', ${i}, this.dataset.subject)" title="Перенести завдання на наступний такий урок">→ Наступний</button>` : '';
                hwDiv.innerHTML = `
                    <div class="homework-label">${escapeHtml(lesson)}:</div>
                    <div class="homework-edit-row">
                        <textarea data-subject="${escapeHtml(lesson)}"
                                  onchange="saveHomework('${dateStr}', ${i}, this.dataset.subject, this.value)"
                                  placeholder="Введіть домашнє завдання...">${escapeHtml(taskText)}</textarea>
                        ${transferBtn}
                    </div>
                `;
            } else {
                hwDiv.innerHTML = `
                    <div class="homework-label">${escapeHtml(lesson)}:</div>
                    <div class="homework-text ${taskText ? '' : 'empty'}">
                        ${taskText ? escapeHtml(taskText) : 'Немає завдання'}
                    </div>
                `;
            }

            tdHomework.appendChild(hwDiv);
        });

        tr.appendChild(tdLessons);
        tr.appendChild(tdHomework);
        tbody.appendChild(tr);
    });
}

// --- ПЕРЕСТАВЛЕННЯ УРОКІВ ---
window.moveLesson = function (dateStr, fromIndex, toIndex) {
    const dayKey = getDayKeyFromDate(dateStr);
    const lessons = [...getLessonsForDate(dateStr, dayKey)];
    if (toIndex < 0 || toIndex >= lessons.length) return;

    // Переставляємо урок
    const [movedLesson] = lessons.splice(fromIndex, 1);
    lessons.splice(toIndex, 0, movedLesson);

    // Домашку теж переставляємо
    let tasks = [...(homeworkData[dateStr] || [])];
    const maxIndex = Math.max(fromIndex, toIndex);

    if (tasks.length > 0) {
        while (tasks.length <= maxIndex) {
            tasks.push({ subject: '', task: '' });
        }
        const movedTask = tasks.splice(fromIndex, 1)[0];
        tasks.splice(toIndex, 0, movedTask);
    }

    const hasAnyTask = tasks.some(t => t.task && t.task.trim());

    const updates = {};
    if (hasAnyTask) {
        homeworkData[dateStr] = tasks;
        updates['homework/' + dateStr] = tasks;
    } else {
        delete homeworkData[dateStr];
        updates['homework/' + dateStr] = null;
    }

    saveScheduleToDb(dateStr, dayKey, lessons, updates);
};

// Визначення dayKey по даті
function getDayKeyFromDate(dateStr) {
    const d = new Date(dateStr);
    const dayNum = d.getDay(); // 0=Нд, 1=Пн ... 5=Пт
    return DAYS_KEYS[dayNum - 1] || 'monday';
}

// --- РЕЖИМИ ---
function toggleEditMode() {
    if (currentMode !== 'viewer') {
        // Зберегти оголошення перед виходом
        const announcementTextarea = document.querySelector('.announcement-textarea');
        if (announcementTextarea) {
            saveAnnouncement(announcementTextarea.value);
        }

        // Вихід з режиму
        currentMode = 'viewer';
        document.getElementById('editorBtn').innerHTML = '📝 Редактор';
        document.getElementById('editorBtn').classList.remove('logout');
        document.getElementById('todayHwBtn').classList.add('hidden');
        renderDiary();
    } else {
        // Показати модалку
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

function checkLogin() {
    const pass = document.getElementById('passwordInput').value;
    const editorPass = settingsData.editorPassword || 'edit123';

    if (pass === editorPass) {
        currentMode = 'editor';
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('editorBtn').innerHTML = '🔓 Вийти з редагування';
        document.getElementById('editorBtn').classList.add('logout');
        document.getElementById('todayHwBtn').classList.remove('hidden');
        document.getElementById('passwordInput').value = '';
        renderDiary();
    } else {
        alert('❌ Невірний пароль редактора!');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// --- ЗБЕРЕЖЕННЯ В FIREBASE ---
window.saveLesson = function (dateStr, index, newVal) {
    newVal = newVal.trim();

    if (!newVal) {
        alert('⚠️ Назва уроку не може бути порожньою!');
        renderDiary();
        return;
    }

    const dayKey = getDayKeyFromDate(dateStr);
    const lessons = [...getLessonsForDate(dateStr, dayKey)];
    lessons[index] = newVal;

    saveScheduleToDb(dateStr, dayKey, lessons);
};

window.addLesson = function (dateStr) {
    const dayKey = getDayKeyFromDate(dateStr);
    const lessons = [...getLessonsForDate(dateStr, dayKey)];
    lessons.push("Новий предмет");

    saveScheduleToDb(dateStr, dayKey, lessons);
};

window.deleteLesson = function (dateStr, index) {
    const dayKey = getDayKeyFromDate(dateStr);
    const lessons = [...getLessonsForDate(dateStr, dayKey)];
    lessons.splice(index, 1);

    // Синхронізуємо ДЗ — видаляємо запис за тим же індексом
    let tasks = [...(homeworkData[dateStr] || [])];
    if (tasks.length > index) {
        tasks.splice(index, 1);
    }
    const hasAnyTask = tasks.some(t => t.task && t.task.trim());

    const updates = {};
    if (hasAnyTask) {
        homeworkData[dateStr] = tasks;
        updates['homework/' + dateStr] = tasks;
    } else {
        delete homeworkData[dateStr];
        updates['homework/' + dateStr] = null;
    }

    saveScheduleToDb(dateStr, dayKey, lessons, updates);
};

window.saveHomework = function (dateStr, index, subject, newVal) {
    newVal = newVal.trim();

    // Перевіряємо чи значення реально змінилось
    const currentTask = (homeworkData[dateStr] || [])[index];
    const currentText = currentTask ? (currentTask.task || '') : '';
    if (newVal === currentText) return false; // Нічого не змінилось — не записуємо

    let tasks = [...(homeworkData[dateStr] || [])];

    while (tasks.length <= index) {
        tasks.push({ subject: '', task: '' });
    }

    tasks[index] = {
        subject: subject,
        task: newVal
    };

    // Перевіряємо чи є хоч одне непусте завдання
    const hasAnyTask = tasks.some(t => t.task && t.task.trim());

    if (hasAnyTask) {
        // Є завдання — зберігаємо
        homeworkData[dateStr] = tasks;
        saveToLocal();
        updateTransferButton(dateStr, index, subject, newVal);

        if (firebaseInitialized) {
            db.ref('homework/' + dateStr).set(tasks)
                .then(() => showSaveIndicator())
                .catch((error) => {
                    console.error('Помилка збереження:', error);
                    alert('Помилка збереження. Перевірте підключення.');
                });
        }
    } else {
        // Все пусте — видаляємо запис з бази
        delete homeworkData[dateStr];
        saveToLocal();
        updateTransferButton(dateStr, index, subject, newVal);

        // Перевіряємо, чи не час очистити і розклад, якщо він базовий
        const dayKey = getDayKeyFromDate(dateStr);
        const currentLessons = getLessonsForDate(dateStr, dayKey);
        const isCleanedUp = checkAndCleanupSchedule(dateStr, dayKey, currentLessons);

        if (firebaseInitialized) {
            const updates = { ['homework/' + dateStr]: null };
            if (isCleanedUp) {
                updates['schedule/' + dateStr] = null;
            }
            db.ref().update(updates)
                .then(() => showSaveIndicator())
                .catch((error) => console.error('Помилка видалення:', error));
        }
    }
    return true; // Відображаємо, що зміна таки відбулась
};

// Динамічне оновлення кнопки переносу без перемалювання всього UI
function updateTransferButton(dateStr, index, subject, taskText) {
    const textareas = document.querySelectorAll('.homework-edit-row textarea');
    let targetRow = null;
    let count = 0;

    // Знаходимо конкретний homework-edit-row за dateStr і index
    document.querySelectorAll('.homework-edit-row').forEach((row) => {
        const textarea = row.querySelector('textarea');
        if (textarea) {
            const onchange = textarea.getAttribute('onchange') || '';
            if (onchange.includes("'" + dateStr + "'") && onchange.includes(', ' + index + ',')) {
                targetRow = row;
            }
        }
    });

    if (!targetRow) return;

    const existingBtn = targetRow.querySelector('.transfer-btn');

    if (taskText) {
        if (!existingBtn) {
            const btn = document.createElement('button');
            btn.className = 'transfer-btn';
            btn.textContent = '→ Наступний';
            btn.title = 'Перенести завдання на наступний такий урок';
            btn.onclick = () => transferHomework(dateStr, index, subject);
            targetRow.appendChild(btn);
        }
    } else {
        if (existingBtn) {
            existingBtn.remove();
        }
    }
}

// --- ПЕРЕНЕСЕННЯ ЗАВДАННЯ ---
window.transferHomework = function (dateStr, index, subject) {
    const currentDate = new Date(dateStr);
    const taskObj = (homeworkData[dateStr] || [])[index];
    const taskText = taskObj ? taskObj.task : '';

    if (!taskText) {
        alert('❗ Немає завдання для перенесення.');
        return;
    }

    // Шукаємо наступний день з таким же предметом (до 30 днів вперед)
    for (let d = 1; d <= 30; d++) {
        const nextDate = addDays(currentDate, d);
        const nextDay = nextDate.getDay(); // 0=Нд, 1=Пн, ... 5=Пт
        if (nextDay === 0 || nextDay === 6) continue; // пропускаємо вихідні

        const dayKey = DAYS_KEYS[nextDay - 1];
        const nextDateStr2 = formatDate(nextDate);
        const lessons = getLessonsForDate(nextDateStr2, dayKey);
        const lessonIndex = lessons.findIndex(l => l === subject);

        if (lessonIndex !== -1) {
            const nextDateStr = formatDate(nextDate);

            // Записуємо завдання на наступний день
            let nextTasks = [...(homeworkData[nextDateStr] || [])];
            while (nextTasks.length <= lessonIndex) {
                nextTasks.push({ subject: '', task: '' });
            }
            nextTasks[lessonIndex] = { subject: subject, task: taskText };

            // Очищуємо поточне
            let currentTasks = [...(homeworkData[dateStr] || [])];
            while (currentTasks.length <= index) {
                currentTasks.push({ subject: '', task: '' });
            }
            currentTasks[index] = { subject: subject, task: '' };

            // Оновлюємо локальний кеш
            homeworkData[nextDateStr] = nextTasks;
            homeworkData[dateStr] = currentTasks;
            saveToLocal();

            if (firebaseInitialized) {
                Promise.all([
                    db.ref('homework/' + nextDateStr).set(nextTasks),
                    db.ref('homework/' + dateStr).set(currentTasks)
                ]).then(() => {
                    showSaveIndicator();
                    renderDiary();
                    alert(`✅ Завдання перенесено на ${formatDateDisplay(nextDate)} (${DAYS_MAP[dayKey]})`);
                }).catch(err => {
                    console.error('Помилка перенесення:', err);
                    alert('❌ Помилка перенесення. Перевірте підключення.');
                });
            } else {
                renderDiary();
                alert(`✅ Завдання перенесено на ${formatDateDisplay(nextDate)} (${DAYS_MAP[dayKey]})`);
            }
            return;
        }
    }

    alert('⚠️ Не знайдено наступного уроку "' + subject + '" протягом місяця.');
};

// --- ДОПОМІЖНІ ФУНКЦІЇ ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- СЬОГОДНІ ЗАДАЛИ ---
let todayHwTargets = []; // [{subject, targetDateStr, targetIndex}]

window.openTodayHomework = function () {
    let targetDate = new Date();
    const currentDay = targetDate.getDay();

    // Перевірка: якщо сьогодні субота або неділя — беремо п'ятницю
    if (currentDay === 0) { // Неділя
        targetDate = addDays(targetDate, -2);
        alert('ℹ️ Сьогодні неділя. Відкриваємо уроки за п\'ятницю.');
    } else if (currentDay === 6) { // Субота
        targetDate = addDays(targetDate, -1);
        alert('ℹ️ Сьогодні субота. Відкриваємо уроки за п\'ятницю.');
    }

    const todayStr = formatDate(targetDate);
    const dayNum = targetDate.getDay();
    const dayKey = DAYS_KEYS[dayNum - 1];
    const lessons = getLessonsForDate(todayStr, dayKey);

    if (!lessons || lessons.length === 0) {
        alert('ℹ️ Сьогодні немає уроків у розкладі.');
        return;
    }

    // Знаходимо наступний день для кожного уроку
    todayHwTargets = [];
    const form = document.getElementById('todayHwForm');
    form.innerHTML = '';

    lessons.forEach((lesson, i) => {
        const target = findNextLessonDate(todayStr, lesson);

        todayHwTargets.push({
            subject: lesson,
            targetDateStr: target ? target.dateStr : null,
            targetIndex: target ? target.index : -1
        });

        let existingHwText = '';
        if (target && target.dateStr && target.index !== -1) {
            const dateTasks = homeworkData[target.dateStr] || [];
            const taskObj = dateTasks[target.index];
            if (taskObj && taskObj.task) {
                // Використовуємо .task без escapeHtml, бо value тега textarea екранується автоматично браузером 
                // при встановленні через textContent або якщо віддаємо його в HTML (з escapeHtml безпечніше)
                existingHwText = escapeHtml(taskObj.task);
            }
        }

        const field = document.createElement('div');
        field.className = 'today-form-field';

        const targetInfo = target
            ? `→ ${DAYS_MAP[getDayKeyFromDate(target.dateStr)]} (${formatDateDisplay(new Date(target.dateStr))})`
            : '⚠️ не знайдено';

        field.innerHTML = `
            <div class="today-field-header">
                <strong>${escapeHtml(lesson)}</strong>
                <span class="today-field-target">${targetInfo}</span>
            </div>
            <textarea class="today-field-input" data-index="${i}"
                      placeholder="Домашнє завдання..."
                      ${!target ? 'disabled' : ''}>${existingHwText}</textarea>
        `;
        form.appendChild(field);
    });

    document.getElementById('todayHwModal').classList.remove('hidden');
};

// Знайти наступний день з таким уроком (після сьогодні)
function findNextLessonDate(fromDateStr, subject) {
    const fromDate = new Date(fromDateStr);

    for (let d = 1; d <= 30; d++) {
        const nextDate = addDays(fromDate, d);
        const nextDay = nextDate.getDay();
        if (nextDay === 0 || nextDay === 6) continue;

        const dayKey = DAYS_KEYS[nextDay - 1];
        const nextDateStr = formatDate(nextDate);
        const lessons = getLessonsForDate(nextDateStr, dayKey);
        const lessonIndex = lessons.findIndex(l => l === subject);

        if (lessonIndex !== -1) {
            return { dateStr: nextDateStr, index: lessonIndex };
        }
    }
    return null;
}

window.saveTodayHomework = function () {
    let savedCount = 0;

    todayHwTargets.forEach((target, i) => {
        const textarea = document.querySelector(`.today-field-input[data-index="${i}"]`);
        if (!textarea) return;

        const text = textarea.value.trim();
        if (!target.targetDateStr) return;

        // Зберігаємо через існуючу функцію і перевіряємо чи відбулись зміни (додавання/зміна/видалення)
        const didSave = saveHomework(target.targetDateStr, target.targetIndex, target.subject, text);
        if (didSave) savedCount++;
    });

    closeTodayHomework();

    if (savedCount > 0) {
        renderDiary();
        showSaveIndicator();
        alert(`✅ Збережено ${savedCount} завдань!`);
    } else {
        alert('ℹ️ Нічого не заповнено.');
    }
};

window.closeTodayHomework = function () {
    document.getElementById('todayHwModal').classList.add('hidden');
    todayHwTargets = [];
};

// Закриття модалки при кліку по фону
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('todayHwModal').addEventListener('click', (e) => {
        if (e.target.id === 'todayHwModal') closeTodayHomework();
    });
});

// --- ЗАПУСК ---
init();