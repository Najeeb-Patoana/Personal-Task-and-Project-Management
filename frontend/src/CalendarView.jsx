import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function CalendarView({ tasks, currentMonth, setCurrentMonth, onEdit, onDelete }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // padding for empty cells
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const getTasksForDate = (date) => {
    if (!date) return [];
    
    // Adjust local date calculation to safe ISO string conversion
    const offset = date.getTimezoneOffset();
    const localAdjusted = new Date(date.getTime() - (offset * 60 * 1000));
    const dateStr = localAdjusted.toISOString().split('T')[0];

    return tasks.filter(t => {
      if (!t.due_date) return false;
      
      // Grab just the "YYYY-MM-DD" part from the backend's full ISO string
      const taskDateStr = t.due_date.split('T')[0]; 
      
      return taskDateStr === dateStr;
    });
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-[#1e1e24] border border-[#2d2d38] rounded-xl p-6 shadow-xl">
      {/* Calendar Navigation Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-[#f3f3f5] tracking-tight">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth} 
            className="p-2 bg-[#2a2a35] hover:bg-[#323241] border border-[#3e3e4f] text-[#a0a0b2] hover:text-[#f3f3f5] rounded-lg transition-all flex items-center justify-center"
          >
            <FaChevronLeft size={12} />
          </button>
          <button 
            onClick={nextMonth} 
            className="p-2 bg-[#2a2a35] hover:bg-[#323241] border border-[#3e3e4f] text-[#a0a0b2] hover:text-[#f3f3f5] rounded-lg transition-all flex items-center justify-center"
          >
            <FaChevronRight size={12} />
          </button>
        </div>
      </div>
      
      {/* Grid Layout */}
      <div className="grid grid-cols-7 gap-px bg-[#2d2d38] border border-[#2d2d38] rounded-xl overflow-hidden shadow-inner">
        {/* Day Header Row */}
        {WEEKDAYS.map(d => (
          <div key={d} className="bg-[#1c1c22] text-center text-xs font-bold tracking-wider uppercase py-3 text-[#a0a0b2]">
            {d}
          </div>
        ))}
        
        {/* Calendar Cells */}
        {days.map((date, i) => {
          if (!date) {
            return (
              <div 
                key={`empty-${i}`} 
                className="bg-[#14141a] min-h-30 opacity-20 cursor-not-allowed"
              />
            );
          }
          
          const dayTasks = getTasksForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();
          
          return (
            <div 
              key={`day-${i}`} 
              className={`bg-[#111115] min-h-[30] p-2 flex flex-col justify-between border-t border-l border-[#2d2d38] transition-all hover:bg-[#1a1a24] relative group ${
                isToday ? 'bg-[#7b68ee]/5 border-[#7b68ee]/30' : ''
              }`}
            >
              {/* Date Number Badge */}
              <div className="flex justify-end mb-1">
                <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                  isToday 
                    ? 'bg-[#7b68ee] text-white shadow-[0_0_10px_rgba(123,104,238,0.5)]' 
                    : 'text-[#7c7c90] group-hover:text-[#f3f3f5]'
                }`}>
                  {date.getDate()}
                </div>
              </div>

              {/* Day Tasks Container */}
              <div 
                className="flex flex-col gap-1.5 overflow-y-auto max-h-[20] flex-1 pr-0.5" 
                style={{ scrollbarWidth: 'none' }}
              >
                {dayTasks.map(t => {
                  const isCompleted = t.status === 'Completed';
                  const priorityClass = t.priority === 'High' 
                    ? 'border-l-2 border-l-[#e74c3c]' 
                    : t.priority === 'Medium' 
                    ? 'border-l-2 border-l-[#f1c40f]' 
                    : 'border-l-2 border-l-[#a0a0b2]';

                  return (
                    <div 
                      key={t.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(t);
                      }} 
                      className={`text-[10px] font-semibold px-2 py-1.5 rounded-md cursor-pointer truncate shadow-sm transition-transform hover:scale-[1.02] border border-[#2d2d38] ${priorityClass} ${
                        isCompleted 
                          ? 'bg-[#2ecc71]/10 text-[#2ecc71] line-through opacity-50 border-[#2ecc71]/20' 
                          : 'bg-[#2a2a35] hover:bg-[#323241] text-[#f3f3f5]'
                      }`} 
                      title={`${t.title} (${t.priority} Priority)`}
                    >
                      {t.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}