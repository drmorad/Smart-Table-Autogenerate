import React, { useState, useRef, useId } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        left: rect.left + rect.width / 2,
        top: rect.top
      });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  // Accessibility: Allow users to dismiss tooltip with Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideTooltip();
    }
  };

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onKeyDown={handleKeyDown}
        // Associate the trigger with the tooltip content
        aria-describedby={isVisible ? tooltipId : undefined}
        // Ensure the trigger is part of the tab sequence so keyboard users can access the tooltip
        // This is crucial if the children are non-interactive (e.g., icons, text labels)
        tabIndex={0}
        className={`inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm ${className || ''}`}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div 
          id={tooltipId}
          role="tooltip"
          className="fixed px-3 py-2 text-xs font-semibold text-slate-50 bg-slate-900 dark:bg-slate-800 rounded-lg shadow-xl z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all opacity-100 border border-slate-700/50 dark:border-slate-600 animate-in fade-in zoom-in-95 duration-200"
          style={{ left: coords.left, top: coords.top - 8 }}
        >
          {content}
          <div 
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"
            aria-hidden="true"
          ></div>
        </div>,
        document.body
      )}
    </>
  );
};