import React, { useState, useEffect } from 'react';
import { Calendar, Edit3, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

const ClassDiary = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [homework, setHomework] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);

  const ADMIN_LOGIN = 'starosta';
  const ADMIN_PASSWORD = 'class123';
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const DAY_NAMES = {
    monday: 'Понеділок',
    tuesday: 'Вівторок',
    wednesday: 'Середа',
    thursday: 'Четвер',
    friday: 'П\'ятниця'
  };

  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  useEffect(() => {
    const initData = async () => {
      const monday = getMonday(new Date());
      setCurrentWeekStart(monday);
      await loadData(monday);
      setLoading(false);
    };
    initData();
  }, []);

  const loadData = async (weekStart) => {
    try {
      const scheduleData = await window.storage.get('schedule');
      const homeworkData = await window.storage.get('homework');
      
      setSchedule(scheduleData ? JSON.parse(scheduleData.value) : getDefaultSchedule());
      setHomework(homeworkData ? JSON.parse(homeworkData.value) : {});
    } catch (error) {
      setSchedule(getDefaultSchedule());
      setHomework({});
    }
  };

  const getDefaultSchedule = () => ({
    monday: ['Математика', 'Українська мова', 'Англійська мова', 'Фізика', 'Історія'],
    tuesday: ['Біологія', 'Географія', 'Математика', 'Хімія', 'Фізкультура'],
    wednesday: ['Література', 'Англійська мова', 'Інформатика', 'Математика', 'Музика'],
    thursday: ['Фізика', 'Українська мова', 'Історія', 'Біологія', 'Хімія'],
    friday: ['Математика', 'Географія', 'Англійська мова', 'Література', 'Малювання']
  });

  const saveSchedule = async (day, lessons) => {
    const newSchedule = { ...schedule, [day]: lessons };
    setSchedule(newSchedule);
    await window.storage.set('schedule', JSON.stringify(newSchedule));
  };

  const saveHomework = async (date, tasks) => {
    const newHomework = { ...homework, [date]: tasks };
    setHomework(newHomework);
    await window.storage.set('homework', JSON.stringify(newHomework));
  };

  const handleLogin = () => {
    if (loginData.username === ADMIN_LOGIN && loginData.password === ADMIN_PASSWORD) {
      setIsEditMode(true);
      setShowLoginModal(false);
      setLoginData({ username: '', password: '' });
    } else {
      alert('Невірний логін або пароль');
    }
  };

  const handleLogout = () => {
    setIsEditMode(false);
  };

  const changeWeek = (direction) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
    loadData(newDate);
  };

  const updateLesson = (day, index, value) => {
    const lessons = [...(schedule[day] || [])];
    lessons[index] = value;
    saveSchedule(day, lessons);
  };

  const updateHomework = (date, index, value) => {
    const tasks = [...(homework[date] || [])];
    if (!tasks[index]) {
      tasks[index] = { subject: '', task: '' };
    }
    tasks[index].task = value;
    saveHomework(date, tasks);
  };

  const addLesson = (day) => {
    const lessons = [...(schedule[day] || []), 'Новий урок'];
    saveSchedule(day, lessons);
  };

  if (loading || !currentWeekStart) {
    return <div className="flex items-center justify-center h-screen">Завантаження...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={28} />
              <h1 className="text-2xl font-bold text-gray-800">Електронний щоденник</h1>
            </div>
            
            <div className="flex gap-2">
              {!isEditMode ? (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit3 size={18} />
                  Режим редагування
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <LogOut size={18} />
                  Вийти
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={() => changeWeek(-1)}
              className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-semibold">
              {formatDate(currentWeekStart)} - {formatDate(new Date(currentWeekStart.getTime() + 4 * 24 * 60 * 60 * 1000))}
            </span>
            <button
              onClick={() => changeWeek(1)}
              className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="border border-gray-300 p-3 text-left">День / Урок</th>
                  <th className="border border-gray-300 p-3 text-left">Домашнє завдання</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIndex) => {
                  const date = new Date(currentWeekStart);
                  date.setDate(date.getDate() + dayIndex);
                  const dateStr = formatDate(date);
                  const lessons = schedule[day] || [];
                  const tasks = homework[dateStr] || [];
                  const today = isToday(date);

                  return (
                    <tr key={day} className={today ? 'bg-yellow-50' : ''}>
                      <td className="border border-gray-300 p-3 align-top">
                        <div className="font-bold mb-2 text-blue-700">
                          {DAY_NAMES[day]}
                          {today && <span className="ml-2 text-sm text-red-600">(Сьогодні)</span>}
                        </div>
                        {lessons.map((lesson, idx) => (
                          <div key={idx} className="mb-1">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={lesson}
                                onChange={(e) => updateLesson(day, idx, e.target.value)}
                                className="w-full p-1 border rounded"
                              />
                            ) : (
                              <div>{idx + 1}. {lesson}</div>
                            )}
                          </div>
                        ))}
                        {isEditMode && (
                          <button
                            onClick={() => addLesson(day)}
                            className="mt-2 text-sm text-blue-600 hover:underline"
                          >
                            + Додати урок
                          </button>
                        )}
                      </td>
                      <td className="border border-gray-300 p-3 align-top">
                        {lessons.map((lesson, idx) => (
                          <div key={idx} className="mb-2">
                            {isEditMode ? (
                              <textarea
                                value={tasks[idx]?.task || ''}
                                onChange={(e) => updateHomework(dateStr, idx, e.target.value)}
                                placeholder={`Завдання з ${lesson}`}
                                className="w-full p-2 border rounded resize-none"
                                rows="2"
                              />
                            ) : (
                              <div className="text-gray-700">
                                {tasks[idx]?.task || '-'}
                              </div>
                            )}
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Вхід для старости</h2>
            <input
              type="text"
              placeholder="Логін"
              value={loginData.username}
              onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
              className="w-full p-2 border rounded mb-3"
            />
            <input
              type="password"
              placeholder="Пароль"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleLogin}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              >
                Увійти
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginData({ username: '', password: '' });
                }}
                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400 transition"
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDiary;