// --- КОНФІГУРАЦІЯ FIREBASE (ВСТАВТЕ СВОЇ ДАНІ) ---
const firebaseConfig = {
    apiKey: "AIzaSyBPkx3qZTfSPKT3Tsv4Kn46mUid7FwzJvk",
    authDomain: "class-diary-ad68c.firebaseapp.com",
    databaseURL: "https://class-diary-ad68c-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "class-diary-ad68c",
    storageBucket: "class-diary-ad68c.firebasestorage.app",
    messagingSenderId: "380929228361",
    appId: "1:380929228361:web:39dcf42438d341fe170998",
    measurementId: "G-SZFM4VE73F"
  };

// --- КОНСТАНТИ ---
const ADMIN_LOGIN = 'starosta';
const ADMIN_PASSWORD = 'class123';
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
let isEditMode = false;
let scheduleData = {};
let homeworkData = {};
let firebaseInitialized = false;
let saveTimeout = null;

// --- ІНІЦІАЛІЗАЦІЯ FIREBASE ---
try {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    firebaseInitialized = true;
    console.log('✓ Firebase підключено');
} catch (error) {
    console.error('✗ Помилка Firebase:', error);
    alert('Помилка підключення до бази даних. Перевірте налаштування Firebase.');
}

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
    } catch (e) {
        console.warn('Не вдалося зберегти локально:', e);
    }
}

function loadFromLocal() {
    try {
        const schedule = localStorage.getItem('diary_schedule');
        const homework = localStorage.getItem('diary_homework');
        if (schedule) scheduleData = JSON.parse(schedule);
        if (homework) homeworkData = JSON.parse(homework);
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

// --- ІНІЦІАЛІЗАЦІЯ ---
function init() {
    // Обробники кнопок
    document.getElementById('prevWeek').onclick = () => changeWeek(-7);
    document.getElementById('nextWeek').onclick = () => changeWeek(7);
    document.getElementById('editModeBtn').onclick = toggleEditMode;
    document.getElementById('loginConfirmBtn').onclick = checkLogin;
    document.getElementById('loginCancelBtn').onclick = () => {
        document.getElementById('loginModal').classList.add('hidden');
    };

    // Enter у модальному вікні
    document.getElementById('passwordInput').onkeypress = (e) => {
        if (e.key === 'Enter') checkLogin();
    };

    if (!firebaseInitialized) {
        // Якщо Firebase не працює, завантажуємо з localStorage
        if (loadFromLocal()) {
            renderDiary();
        } else {
            scheduleData = getDefaultSchedule();
            renderDiary();
        }
        return;
    }

    // Завантаження розкладу
    db.ref('schedule').on('value', (snapshot) => {
        scheduleData = snapshot.val() || getDefaultSchedule();
        saveToLocal();
        renderDiary();
    }, (error) => {
        console.error('Помилка завантаження розкладу:', error);
        loadFromLocal();
        renderDiary();
    });

    // Завантаження домашки (оптимізовано - тільки 3 тижні)
    loadHomeworkForWeeks();
}

function loadHomeworkForWeeks() {
    const prevWeek = addDays(currentWeekStart, -7);
    const nextWeek = addDays(currentWeekStart, 7);
    
    for (let offset = -7; offset <= 14; offset++) {
        const date = addDays(currentWeekStart, offset);
        const dateStr = formatDate(date);
        
        db.ref('homework/' + dateStr).on('value', (snapshot) => {
            if (snapshot.exists()) {
                homeworkData[dateStr] = snapshot.val();
            }
            saveToLocal();
            renderDiary();
        });
    }
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

// --- НАВІГАЦІЯ ---
function changeWeek(days) {
    currentWeekStart = addDays(currentWeekStart, days);
    renderDiary();
    
    // Завантажити нові дані якщо потрібно
    if (firebaseInitialized) {
        loadHomeworkForWeeks();
    }
}

// --- РЕНДЕРИНГ ---
function renderDiary() {
    const tbody = document.getElementById('diaryBody');
    tbody.innerHTML = '';
    
    const weekEnd = addDays(currentWeekStart, 4);
    document.getElementById('dateRange').innerText = 
        `${formatDateDisplay(currentWeekStart)} — ${formatDateDisplay(weekEnd)}`;

    const todayStr = formatDate(new Date());

    DAYS_KEYS.forEach((dayKey, index) => {
        const currentDate = addDays(currentWeekStart, index);
        const dateStr = formatDate(currentDate);
        const isToday = dateStr === todayStr;

        const tr = document.createElement('tr');
        if (isToday) tr.classList.add('today-row');

        const lessons = scheduleData[dayKey] || [];
        const homeworks = homeworkData[dateStr] || [];

        // ЛІВА КОЛОНКА - УРОКИ
        const tdLessons = document.createElement('td');
        tdLessons.innerHTML = `<span class="day-name">${DAYS_MAP[dayKey]} (${formatDateDisplay(currentDate)})</span>`;
        
        lessons.forEach((lesson, i) => {
            if (isEditMode) {
                const lessonDiv = document.createElement('div');
                lessonDiv.className = 'lesson-item';
                lessonDiv.innerHTML = `
                    <input type="text" 
                           value="${escapeHtml(lesson)}" 
                           onchange="saveLesson('${dayKey}', ${i}, this.value)"
                           placeholder="Назва предмету">
                    <button class="delete-lesson-btn" onclick="deleteLesson('${dayKey}', ${i})">✕</button>
                `;
                tdLessons.appendChild(lessonDiv);
            } else {
                const lessonDiv = document.createElement('div');
                lessonDiv.textContent = `${i + 1}. ${lesson}`;
                lessonDiv.style.marginBottom = '4px';
                tdLessons.appendChild(lessonDiv);
            }
        });

        if (isEditMode) {
            const addBtn = document.createElement('button');
            addBtn.className = 'add-lesson-btn';
            addBtn.textContent = '+ Додати урок';
            addBtn.onclick = () => addLesson(dayKey);
            tdLessons.appendChild(addBtn);
        }

        // ПРАВА КОЛОНКА - ДОМАШКА
        const tdHomework = document.createElement('td');
        
        lessons.forEach((lesson, i) => {
            const taskObj = homeworks[i] || { subject: lesson, task: '' };
            const taskText = taskObj.task || '';

            const hwDiv = document.createElement('div');
            hwDiv.className = 'homework-item';

            if (isEditMode) {
                hwDiv.innerHTML = `
                    <div class="homework-label">${escapeHtml(lesson)}:</div>
                    <textarea onchange="saveHomework('${dateStr}', ${i}, '${escapeHtml(lesson)}', this.value)" 
                              placeholder="Введіть домашнє завдання...">${escapeHtml(taskText)}</textarea>
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

// --- РЕДАГУВАННЯ ---
function toggleEditMode() {
    if (isEditMode) {
        // Вихід
        isEditMode = false;
        document.getElementById('editModeBtn').innerHTML = '🔒 Режим редагування';
        document.getElementById('editModeBtn').classList.remove('logout');
        renderDiary();
    } else {
        // Вхід
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('loginInput').focus();
    }
}

function checkLogin() {
    const login = document.getElementById('loginInput').value.trim();
    const pass = document.getElementById('passwordInput').value;

    if (login === ADMIN_LOGIN && pass === ADMIN_PASSWORD) {
        isEditMode = true;
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('editModeBtn').innerHTML = '🔓 Вийти';
        document.getElementById('editModeBtn').classList.add('logout');
        
        document.getElementById('loginInput').value = '';
        document.getElementById('passwordInput').value = '';
        
        renderDiary();
    } else {
        alert('❌ Невірний логін або пароль!');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// --- ЗБЕРЕЖЕННЯ В FIREBASE ---
window.saveLesson = function(dayKey, index, newVal) {
    newVal = newVal.trim();
    
    if (!newVal) {
        alert('⚠️ Назва уроку не може бути порожньою!');
        renderDiary();
        return;
    }

    const lessons = [...(scheduleData[dayKey] || [])];
    lessons[index] = newVal;
    
    if (firebaseInitialized) {
        db.ref('schedule/' + dayKey).set(lessons)
            .then(() => showSaveIndicator())
            .catch((error) => {
                console.error('Помилка збереження:', error);
                alert('Помилка збереження. Перевірте підключення.');
            });
    } else {
        scheduleData[dayKey] = lessons;
        saveToLocal();
        renderDiary();
    }
};

window.addLesson = function(dayKey) {
    const lessons = [...(scheduleData[dayKey] || [])];
    lessons.push("Новий предмет");
    
    if (firebaseInitialized) {
        db.ref('schedule/' + dayKey).set(lessons)
            .then(() => {
                showSaveIndicator();
                renderDiary();
            });
    } else {
        scheduleData[dayKey] = lessons;
        saveToLocal();
        renderDiary();
    }
};

window.deleteLesson = function(dayKey, index) {
    if (!confirm('Видалити цей урок?')) return;
    
    const lessons = [...(scheduleData[dayKey] || [])];
    lessons.splice(index, 1);
    
    if (firebaseInitialized) {
        db.ref('schedule/' + dayKey).set(lessons)
            .then(() => {
                showSaveIndicator();
                renderDiary();
            });
    } else {
        scheduleData[dayKey] = lessons;
        saveToLocal();
        renderDiary();
    }
};

window.saveHomework = function(dateStr, index, subject, newVal) {
    newVal = newVal.trim();
    
    let tasks = [...(homeworkData[dateStr] || [])];
    
    while(tasks.length <= index) {
        tasks.push({ subject: '', task: '' });
    }

    tasks[index] = {
        subject: subject,
        task: newVal
    };

    if (firebaseInitialized) {
        db.ref('homework/' + dateStr).set(tasks)
            .then(() => showSaveIndicator())
            .catch((error) => {
                console.error('Помилка збереження:', error);
                alert('Помилка збереження. Перевірте підключення.');
            });
    } else {
        homeworkData[dateStr] = tasks;
        saveToLocal();
        renderDiary();
    }
};

// --- ДОПОМІЖНІ ФУНКЦІЇ ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- ЗАПУСК ---
init();