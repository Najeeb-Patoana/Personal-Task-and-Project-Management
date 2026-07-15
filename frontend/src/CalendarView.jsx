import React from 'react';

export default function CalendarView({ tasks, currentMonth, setCurrentMonth, onEdit, onDelete }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // padding
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const getTasksForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.due_date === dateStr);
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm text-gray-600 transition-colors">Prev</button>
          <button onClick={nextMonth} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm text-gray-600 transition-colors">Next</button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded overflow-hidden">
        {WEEKDAYS.map(d => (
          <div key={d} className="bg-gray-50 text-center text-sm font-semibold py-3 text-gray-600">{d}</div>
        ))}
        
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="bg-gray-50 min-h-[120px]"></div>;
          
          const dayTasks = getTasksForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();
          
          return (
            <div key={`day-${i}`} className={`bg-white min-h-[120px] p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50 ${isToday ? 'bg-blue-50/20' : ''}`}>
              <div className="flex justify-end">
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}>
                  {date.getDate()}
                </div>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px] pr-1" style={{ scrollbarWidth: 'none' }}>
                {dayTasks.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => onEdit(t)} 
                    className={`text-[10px] px-1.5 py-1 rounded cursor-pointer truncate shadow-sm transition-transform hover:scale-[1.02] ${t.status === 'Completed' ? 'bg-green-100 text-green-800 line-through opacity-75' : 'bg-blue-100 text-blue-800 border border-blue-200/50'}`} 
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
