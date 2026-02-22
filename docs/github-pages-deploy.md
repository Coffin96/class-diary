# 🚀 Розгортання на GitHub Pages

Покрокова інструкція для публікації електронного щоденника через GitHub Pages.

---

## Передумови

- Обліковий запис на [GitHub](https://github.com)
- Архів або папка з файлами проекту

---

## Крок 1: Створення репозиторію

1. Увійдіть в [GitHub](https://github.com)
2. Натисніть кнопку **«+»** → **«New repository»**
3. Заповніть:
   - **Repository name**: `class-diary` (або будь-яке інше ім'я)
   - **Description**: `Електронний щоденник класу`
   - **Visibility**: `Public` (обов'язково для безкоштовного GitHub Pages)
4. Натисніть **«Create repository»**

---

## Крок 2: Завантаження файлів

### Варіант А: Через веб-інтерфейс GitHub (найпростіший)

1. Відкрийте створений репозиторій
2. Натисніть **«uploading an existing file»** або кнопку **«Add file» → «Upload files»**
3. Перетягніть ВСІ файли та папки проекту або натисніть **«choose your files»**:
   ```
   index.html
   admin.html
   css/
     style.css
     admin.css
   js/
     app.js
     admin.js
     firebase-config.js
     admin-credentials.js
   docs/
   LICENSE
   CHANGELOG.md
   README.md
   ```
4. Внизу сторінки натисніть **«Commit changes»**

### Варіант Б: Через Git (для досвідчених)

```bash
# Перейдіть до папки проекту
cd class-diary

# Ініціалізуйте Git та завантажте
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ВАШ-ЛОГІН/class-diary.git
git push -u origin main
```

---

## Крок 3: Увімкнення GitHub Pages

1. Перейдіть у **Settings** (⚙️) репозиторію
2. У лівому меню виберіть **Pages**
3. У розділі **«Build and deployment»**:
   - **Source**: виберіть **«Deploy from a branch»**
   - **Branch**: виберіть **`main`** та папку **`/ (root)`**
4. Натисніть **«Save»**

---

## Крок 4: Перевірка

1. Зачекайте 1–3 хвилини на деплой
2. Поверніться на сторінку **Settings → Pages**
3. Вгорі з'явиться посилання вигляду:
   ```
   https://ваш-логін.github.io/class-diary/
   ```
4. Відкрийте це посилання — ви побачите щоденник!

---

## Крок 5: Оновлення сайту

Після будь-яких змін у файлах:

### Через веб-інтерфейс:
1. Відкрийте файл в репозиторії → натисніть 🖊️ (Edit)
2. Внесіть зміни → **«Commit changes»**

### Через Git:
```bash
git add .
git commit -m "Опис змін"
git push
```

GitHub Pages автоматично оновить сайт протягом 1–2 хвилин.

---

## ⚠️ Важливо

- Файл `index.html` повинен бути **в корені** репозиторію (не в підпапці)
- Репозиторій повинен бути **Public** для безкоштовного GitHub Pages
- Після першого деплою подальші коміти автоматично оновлюють сайт
- Адмін-панель доступна за адресою: `https://ваш-логін.github.io/class-diary/admin.html`
