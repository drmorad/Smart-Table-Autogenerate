import React, { useState, useMemo, useEffect } from 'react';
import { Column, RowData } from '../types';
import { AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Edit2, Minus, Check, X, Wand2 } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { DatePicker } from './DatePicker';

interface SmartTableProps {
  columns: Column[];
  data: RowData[];
  isLoading: boolean;
  loadingMessage?: string;
  onDataChange?: (rowIndex: number, key: string, value: string) => void;
  onRowsDelete?: (indices: number[]) => void;
  onRowsUpdate?: (indices: number[], key: string, value: string) => void;
  onRowsAutoFix?: (indices: number[]) => void;
}

const SmartTable: React.FC<SmartTableProps> = ({ 
    columns, 
    data, 
    isLoading, 
    loadingMessage,
    onDataChange, 
    onRowsDelete, 
    onRowsUpdate,
    onRowsAutoFix
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [bulkEditConfig, setBulkEditConfig] = useState<{column: string, value: string}>({ column: '', value: '' });

  // Clear selection when data length changes drastically (e.g. regen)
  useEffect(() => {
      setSelectedIndices(new Set());
      setLastSelectedIndex(null);
  }, [data.length]);

  // Helper to group columns by their "group" property
  const groupedColumns = useMemo(() => {
    const groups: { [key: string]: Column[] } = {};
    const orderedKeys: string[] = [];

    columns.forEach(col => {
      const groupName = col.group || 'Main';
      if (!groups[groupName]) {
        groups[groupName] = [];
        orderedKeys.push(groupName);
      }
      groups[groupName].push(col);
    });
    return { groups, orderedKeys };
  }, [columns]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDataWithIndices = useMemo(() => {
    // We map the data to preserve original indices so editing works correctly
    const mapped = data.map((row, index) => ({ row, index }));
    
    if (!sortConfig) return mapped;

    return mapped.sort((a, b) => {
      const valA = a.row[sortConfig.key];
      const valB = b.row[sortConfig.key];

      if (valA === valB) return 0;
      // Handle nulls/undefined/empty
      const isEmptyA = valA === null || valA === undefined || valA === '';
      const isEmptyB = valB === null || valB === undefined || valB === '';
      
      if (isEmptyA && isEmptyB) return 0;
      if (isEmptyA) return 1;
      if (isEmptyB) return -1;

      // Try numeric sort
      const numA = Number(valA);
      const numB = Number(valB);
      
      let comparison = 0;
      if (!isNaN(numA) && !isNaN(numB)) {
         comparison = numA - numB;
      } else {
         comparison = String(valA).localeCompare(String(valB));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  // Determine header rows
  const hasGroups = Object.keys(groupedColumns.groups).length > 1 || groupedColumns.groups['Main']?.length !== columns.length;

  const getCellStatus = (value: any, col: Column): { status: 'neutral' | 'success' | 'warning' | 'danger', message?: string } => {
      // Basic heuristic highlighting
      if (value === null || value === undefined || value === '') return { status: 'neutral' };
      
      if (col.subLabel) {
          // Attempt to parse range
          if (col.subLabel.includes('-')) {
              const [min, max] = col.subLabel.split('-').map(parseFloat);
              const numVal = parseFloat(value);
              if (!isNaN(min) && !isNaN(max) && !isNaN(numVal)) {
                  if (numVal < min || numVal > max) {
                      return { status: 'danger', message: `Value must be between ${min} and ${max}` };
                  }
                  return { status: 'success', message: 'Value within compliant range' };
              }
          }
          if (col.subLabel.includes('>')) {
              const min = parseFloat(col.subLabel.replace('>', ''));
              const numVal = parseFloat(value);
               if (!isNaN(min) && !isNaN(numVal)) {
                  if (numVal <= min) {
                      return { status: 'danger', message: `Value must be greater than ${min}` };
                  }
                  return { status: 'success', message: 'Value meets minimum threshold' };
              }
          }
      }
      if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower.includes('fail') || lower.includes('error')) return { status: 'danger', message: 'Error detected in value' };
          if (lower.includes('high')) return { status: 'warning', message: 'Value flagged as high' };
      }
      return { status: 'neutral' };
  };

  const toggleRow = (originalIndex: number, event: React.MouseEvent<HTMLInputElement>) => {
      const newSet = new Set(selectedIndices);
      
      // Handle Shift+Click Range Selection
      if (event.shiftKey && lastSelectedIndex !== null) {
          // Find the positions in the currently sorted view
          const startPos = sortedDataWithIndices.findIndex(item => item.index === lastSelectedIndex);
          const endPos = sortedDataWithIndices.findIndex(item => item.index === originalIndex);

          if (startPos !== -1 && endPos !== -1) {
              const min = Math.min(startPos, endPos);
              const max = Math.max(startPos, endPos);
              
              // Select everything in range
              for (let i = min; i <= max; i++) {
                  newSet.add(sortedDataWithIndices[i].index);
              }
          }
      } else {
          if (newSet.has(originalIndex)) {
              newSet.delete(originalIndex);
              setLastSelectedIndex(originalIndex); 
          } else {
              newSet.add(originalIndex);
              setLastSelectedIndex(originalIndex);
          }
      }
      setSelectedIndices(newSet);
  };

  const toggleAll = () => {
      if (selectedIndices.size === sortedDataWithIndices.length && sortedDataWithIndices.length > 0) {
          setSelectedIndices(new Set());
          setLastSelectedIndex(null);
      } else {
          // Select all visible (sorted) indices
          setSelectedIndices(new Set(sortedDataWithIndices.map(d => d.index)));
          setLastSelectedIndex(null);
      }
  };

  const handleBulkUpdate = () => {
      if (!bulkEditConfig.column) return alert("Please select a column to update.");
      const columnLabel = columns.find(c => c.key === bulkEditConfig.column)?.label || bulkEditConfig.column;
      
      if (window.confirm(`Update column "${columnLabel}" to "${bulkEditConfig.value}" for ${selectedIndices.size} selected row(s)?`)) {
          if (onRowsUpdate) {
              onRowsUpdate(Array.from(selectedIndices), bulkEditConfig.column, bulkEditConfig.value);
              setBulkEditConfig({ ...bulkEditConfig, value: '' });
          }
      }
  };

  const handleDeleteSelected = () => {
      if (selectedIndices.size === 0) return;
      
      if (window.confirm(`Are you sure you want to delete ${selectedIndices.size} selected row(s)? This action cannot be undone.`)) {
          if (onRowsDelete) {
              onRowsDelete(Array.from(selectedIndices));
              setSelectedIndices(new Set());
              setLastSelectedIndex(null);
          }
      }
  };

  const handleAutoFixSelected = () => {
      if (onRowsAutoFix) {
          onRowsAutoFix(Array.from(selectedIndices));
      }
  };

  // Determine if checkbox in header is indeterminate
  const isAllSelected = sortedDataWithIndices.length > 0 && selectedIndices.size === sortedDataWithIndices.length;
  const isIndeterminate = selectedIndices.size > 0 && selectedIndices.size < sortedDataWithIndices.length;

  if (isLoading && data.length === 0) {
      return (
          <div className="w-full h-96 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm transition-colors duration-200">
              <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">{loadingMessage || 'Generating synthetic data...'}</p>
              </div>
          </div>
      )
  }

  if (data.length === 0) {
      return (
        <div className="w-full h-96 flex items-center justify-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg transition-colors duration-200">
             <div className="text-center text-slate-400 dark:text-slate-500">
                 <p>No data generated yet.</p>
                 <p className="text-sm">Click "Auto-Fill Table" to start the simulation.</p>
             </div>
        </div>
      );
  }

  return (
    // The wrapper handles the rounding and scrolling
    <div className="w-full h-full flex flex-col relative">
       <div className="flex-1 overflow-auto custom-scrollbar pb-20">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
            <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-850 sticky top-0 z-20 shadow-sm">
            {hasGroups && (
                <tr>
                    <th className="px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-sm sticky left-0 z-30 w-10"></th>
                    {groupedColumns.orderedKeys.map(groupName => (
                        <th 
                            key={groupName} 
                            colSpan={groupedColumns.groups[groupName].length} 
                            className="px-4 py-3 text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-sm"
                        >
                        {groupName === 'Main' ? '' : groupName}
                        </th>
                    ))}
                </tr>
            )}
            <tr>
                {/* Select All Checkbox */}
                <th scope="col" className="px-4 py-3 w-10 text-center border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 sticky left-0 z-30">
                    <div className="flex items-center justify-center">
                        <Tooltip content="Select All Rows">
                            <input 
                                type="checkbox" 
                                checked={isAllSelected}
                                ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                onChange={toggleAll}
                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            />
                        </Tooltip>
                    </div>
                </th>
                {columns.map((col, idx) => (
                <th key={idx} scope="col" className="px-4 py-3 whitespace-nowrap min-w-[120px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                    <div 
                    className="flex items-center justify-between gap-2 cursor-pointer group select-none"
                    onClick={() => handleSort(col.key)}
                    >
                    <Tooltip content={`${col.label} ${col.subLabel ? `(${col.subLabel})` : ''}`}>
                        <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-slate-200">{col.label}</span>
                            {col.subLabel && <span className="text-[10px] text-slate-400 dark:text-slate-500 normal-case">{col.subLabel}</span>}
                        </div>
                    </Tooltip>
                    <div className="text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                        {sortConfig?.key === col.key ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                        )}
                    </div>
                    </div>
                </th>
                ))}
            </tr>
            </thead>
            <tbody>
            {sortedDataWithIndices.map(({ row, index: originalIndex }, rowIndex) => {
                const isSelected = selectedIndices.has(originalIndex);
                return (
                    <tr key={rowIndex} className={`border-b dark:border-slate-800 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    
                    {/* Row Checkbox */}
                    <td className="px-4 py-2 border border-slate-100 dark:border-slate-800 w-10 text-center sticky left-0 z-10 bg-inherit">
                        <div className="flex items-center justify-center">
                            <input 
                                type="checkbox"
                                checked={isSelected}
                                onClick={(e) => toggleRow(originalIndex, e)}
                                onChange={() => {}} // Controlled by onClick to capture shiftKey
                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            />
                        </div>
                    </td>

                    {columns.map((col, colIndex) => {
                        const value = row[col.key];
                        const { status, message } = getCellStatus(value, col);
                        let cellClass = "px-4 py-2 border border-slate-100 dark:border-slate-800 font-mono text-xs whitespace-nowrap";
                        
                        if (status === 'danger') cellClass += " text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 font-bold";
                        else if (status === 'success') cellClass += " text-emerald-700 dark:text-emerald-400";
                        else if (status === 'warning') cellClass += " text-amber-600 dark:text-amber-400";
                        else cellClass += " text-slate-600 dark:text-slate-300";

                        return (
                            <td key={`${rowIndex}-${colIndex}`} className={cellClass}>
                                <div className="flex items-center gap-2">
                                    {col.type === 'date' ? (
                                        <DatePicker 
                                            value={value} 
                                            onChange={(newVal) => onDataChange && onDataChange(originalIndex, col.key, newVal)} 
                                        />
                                    ) : (
                                        <span>{value}</span>
                                    )}
                                    
                                    {status === 'danger' && message && (
                                        <Tooltip content={message}>
                                            <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400 cursor-help" />
                                        </Tooltip>
                                    )}
                                </div>
                            </td>
                        );
                    })}
                    </tr>
                );
            })}
            </tbody>
        </table>
       </div>

       {/* Bulk Action Floating Toolbar */}
       {selectedIndices.size > 0 && (
           <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-40 animate-in slide-in-from-bottom-5 duration-200 flex flex-col xl:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
                   <div className="flex items-center gap-3">
                       <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                           {selectedIndices.size} Selected
                       </div>
                       <button 
                           onClick={() => setSelectedIndices(new Set())}
                           className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                       >
                           <X className="w-3 h-3" /> Clear
                       </button>
                   </div>
                   
               </div>

               <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                   
                   {/* Batch Edit Controls */}
                   <div className="flex items-center gap-2 w-full sm:w-auto">
                       <select 
                           value={bulkEditConfig.column}
                           onChange={(e) => setBulkEditConfig({ ...bulkEditConfig, column: e.target.value, value: '' })}
                           className="text-xs border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-[120px]"
                       >
                           <option value="" disabled>Select Column</option>
                           {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                       </select>

                       {bulkEditConfig.column && columns.find(c => c.key === bulkEditConfig.column)?.type === 'date' ? (
                           <DatePicker 
                               value={bulkEditConfig.value}
                               onChange={(val) => setBulkEditConfig({ ...bulkEditConfig, value: val })}
                               className="w-32 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1"
                           />
                       ) : (
                           <input 
                               type="text" 
                               placeholder="Value..."
                               value={bulkEditConfig.value}
                               onChange={(e) => setBulkEditConfig({ ...bulkEditConfig, value: e.target.value })}
                               className="text-xs border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none w-24 sm:w-32"
                           />
                       )}
                       
                       <button 
                            onClick={handleBulkUpdate}
                            disabled={!bulkEditConfig.column || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-md shadow-sm disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
                            title="Apply to all selected"
                       >
                           <Check className="w-4 h-4" />
                       </button>
                   </div>
                   
                   <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                   <div className="flex items-center gap-2 w-full sm:w-auto">
                       {onRowsAutoFix && (
                           <button 
                               onClick={handleAutoFixSelected}
                               disabled={isLoading}
                               className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-md text-xs font-semibold transition-colors border border-emerald-200 dark:border-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed"
                               title="AI Auto-Correct Anomalies"
                           >
                               {isLoading ? (
                                   <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                               ) : (
                                   <Wand2 className="w-3.5 h-3.5" />
                               )}
                               {isLoading ? 'Fixing...' : 'Auto-Correct'}
                           </button>
                       )}
                       <button 
                           onClick={handleDeleteSelected}
                           disabled={isLoading}
                           className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-md text-xs font-semibold transition-colors border border-red-200 dark:border-red-900 disabled:opacity-60 disabled:cursor-not-allowed"
                       >
                           <Trash2 className="w-3.5 h-3.5" />
                           Delete
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default SmartTable;