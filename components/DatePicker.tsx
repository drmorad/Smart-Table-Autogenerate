import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DatePickerProps {
  value: string | number | null;
  onChange: (value: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  
  // State for navigation (what month/year we are looking at)
  const [viewDate, setViewDate] = useState(new Date());
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize viewDate based on value prop if valid
  useEffect(() => {
    if (value) {
      // Safe parsing of YYYY-MM-DD to avoid timezone issues
      const strVal = String(value);
      if (strVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = strVal.split('-').map(Number);
        setViewDate(new Date(y, m - 1, d));
      } else {
        const date = new Date(strVal);
        if (!isNaN(date.getTime())) {
          setViewDate(date);
        }
      }
    }
  }, [isOpen, value]); // Update view when opening or value changes

  const toggleCalendar = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      
      // Calculate viewport details to keep popup on screen
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const popupHeight = 320; // Approx height

      let top = rect.bottom + window.scrollY + 4;
      if (spaceBelow < popupHeight && spaceAbove > popupHeight) {
         // Flip to top if not enough space below
         top = rect.top + window.scrollY - popupHeight - 4;
      }

      setCoords({
        left: rect.left,
        top: top
      });
    }
    setIsOpen(!isOpen);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', () => setIsOpen(false));
      window.addEventListener('scroll', () => setIsOpen(false), true); 
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', () => setIsOpen(false));
      window.removeEventListener('scroll', () => setIsOpen(false), true);
    };
  }, [isOpen]);

  const handleDayClick = (day: number) => {
    // Construct date using local time
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    // Format YYYY-MM-DD manually to ensure local date is used
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(newDate.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${dayStr}`;
    
    onChange(isoDate);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const changeMonthDirect = (monthIndex: number) => {
      setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
  };

  const changeYear = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
  };

  // Calendar Logic
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay(); // 0 = Sunday
  
  // Generate days array
  const days = [];
  // Empty slots for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Generate Year Options (current year +/- 50)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  // Helper to check if a specific day is selected
  const isSelected = (day: number) => {
    if (!value) return false;
    // Parse value carefully
    let selectedYear, selectedMonth, selectedDay;
    const strVal = String(value);
    if (strVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        [selectedYear, selectedMonth, selectedDay] = strVal.split('-').map(Number);
        selectedMonth -= 1; // 0-indexed
    } else {
        const d = new Date(strVal);
        selectedYear = d.getFullYear();
        selectedMonth = d.getMonth();
        selectedDay = d.getDate();
    }

    return (
      selectedDay === day &&
      selectedMonth === viewDate.getMonth() &&
      selectedYear === viewDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
      const today = new Date();
      return (
          today.getDate() === day &&
          today.getMonth() === viewDate.getMonth() &&
          today.getFullYear() === viewDate.getFullYear()
      );
  }

  return (
    <>
      <div 
        ref={triggerRef}
        className={`relative flex items-center w-full cursor-pointer group ${className}`}
        onClick={toggleCalendar}
      >
        <span className={`text-xs font-mono flex-1 truncate ${!value ? 'text-slate-400 dark:text-slate-500 italic' : 'text-slate-700 dark:text-slate-200'}`}>
          {value ? String(value) : 'Select date...'}
        </span>
        <CalendarIcon className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors ml-2 flex-shrink-0" />
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white dark:bg-slate-850 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-72 z-[9999] animate-in fade-in zoom-in-95 duration-100 text-slate-900 dark:text-slate-200"
          style={{ left: coords.left, top: coords.top }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
                <button 
                  onClick={() => changeYear(viewDate.getFullYear() - 1)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-full text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Previous Year"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => changeMonth(-1)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-full text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex items-center gap-2">
               {/* Custom Month Select */}
               <div className="relative group">
                   <select 
                      value={viewDate.getMonth()} 
                      onChange={(e) => changeMonthDirect(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   >
                      {MONTH_NAMES.map((m, i) => <option key={i} value={i} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{m}</option>)}
                   </select>
                   <div className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                       {MONTH_NAMES[viewDate.getMonth()]}
                       <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                   </div>
               </div>

               {/* Custom Year Select */}
               <div className="relative group">
                   <select 
                      value={viewDate.getFullYear()} 
                      onChange={(e) => changeYear(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   >
                      {years.map(y => <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{y}</option>)}
                   </select>
                   <div className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                       {viewDate.getFullYear()}
                       <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                   </div>
               </div>
            </div>

            <div className="flex items-center gap-1">
                <button 
                  onClick={() => changeMonth(1)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-full text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => changeYear(viewDate.getFullYear() + 1)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-full text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Next Year"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 text-center uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => (
              <div key={idx} className="aspect-square flex items-center justify-center">
                {day ? (
                  <button
                    onClick={() => handleDayClick(day)}
                    className={`
                      w-7 h-7 text-xs rounded-full flex items-center justify-center transition-all
                      ${isSelected(day) 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                        : isToday(day)
                           ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                           : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }
                    `}
                  >
                    {day}
                  </button>
                ) : <span />}
              </div>
            ))}
          </div>
          
          {/* Footer Actions */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
             <button 
                onClick={() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    onChange(`${year}-${month}-${day}`);
                    setIsOpen(false);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
             >
                Today
             </button>
             <button 
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors"
             >
                Clear
             </button>
          </div>

        </div>,
        document.body
      )}
    </>
  );
};