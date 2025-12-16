import React, { useState } from 'react';
import { SimulationConfig } from '../types';
import { Sliders, Zap, ShieldCheck, AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface ControlPanelProps {
  config: SimulationConfig;
  onConfigChange: (newConfig: SimulationConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onClear: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onConfigChange, onGenerate, isGenerating, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleModeChange = (mode: SimulationConfig['mode']) => {
    onConfigChange({ ...config, mode });
  };

  const handleChange = (key: keyof SimulationConfig, value: number) => {
      onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-colors duration-200 overflow-hidden">
      
      {/* Mobile Header / Toggle */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer lg:cursor-default"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Simulation Engine
        </h3>
        <div className="lg:hidden text-slate-400">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>
      
      {/* Content Section - Collapsible on Mobile, always visible on Desktop */}
      <div className={`px-4 pb-4 space-y-6 ${isExpanded ? 'block' : 'hidden'} lg:block`}>
        
        {/* Mode Selection */}
        <div className="grid grid-cols-3 gap-2">
            <Tooltip content="Enforce strict validation rules. No errors generated." className="w-full">
                <button 
                    onClick={() => handleModeChange('compliant')}
                    className={`flex flex-col items-center justify-center p-2 w-full rounded-lg border text-xs font-medium transition-all ${
                        config.mode === 'compliant' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 dark:ring-emerald-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-750'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4 mb-1" />
                    Compliant
                </button>
            </Tooltip>
            
            <Tooltip content="Simulate real-world conditions with occasional minor issues." className="w-full">
                <button 
                    onClick={() => handleModeChange('realistic')}
                    className={`flex flex-col items-center justify-center p-2 w-full rounded-lg border text-xs font-medium transition-all ${
                        config.mode === 'realistic' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:ring-blue-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-750'
                    }`}
                >
                    <Zap className="w-4 h-4 mb-1" />
                    Realistic
                </button>
            </Tooltip>

            <Tooltip content="Simulate system failures with frequent critical errors." className="w-full">
                <button 
                    onClick={() => handleModeChange('chaos')}
                    className={`flex flex-col items-center justify-center p-2 w-full rounded-lg border text-xs font-medium transition-all ${
                        config.mode === 'chaos' 
                        ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:ring-red-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-750'
                    }`}
                >
                    <AlertTriangle className="w-4 h-4 mb-1" />
                    Chaos
                </button>
            </Tooltip>
        </div>

        {/* Date Selector */}
        <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Target Month & Year
            </label>
            <input 
                type="month" 
                value={config.targetMonth}
                onChange={(e) => onConfigChange({ ...config, targetMonth: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
            />
        </div>

        {/* Sliders */}
        <div className="space-y-4">
            <Tooltip content="Controls how many cells are populated (10% - 100%)." className="w-full block">
                <div>
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                        <span>Data Fill Rate</span>
                        <span className="font-mono text-slate-900 dark:text-white">{config.fillRate}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="10" max="100" 
                        value={config.fillRate}
                        onChange={(e) => handleChange('fillRate', parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                    />
                </div>
            </Tooltip>

            <Tooltip content="Chance of a row containing a compliance issue (0% - 50%)." className="w-full block">
                <div>
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                        <span>Anomaly Probability</span>
                        <span className="font-mono text-slate-900 dark:text-white">{config.anomalyChance}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="50" 
                        value={config.anomalyChance}
                        onChange={(e) => handleChange('anomalyChance', parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                    />
                </div>
            </Tooltip>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <Tooltip content="Generate synthetic data using AI based on settings." className="w-full">
                <button 
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all"
                >
                    {isGenerating ? (
                        <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                        </>
                    ) : (
                        <>
                        <Zap className="w-4 h-4" />
                        Auto-Fill Table
                        </>
                    )}
                </button>
            </Tooltip>
            
            <Tooltip content="Remove all rows from the table." className="w-full">
                <button 
                    onClick={onClear}
                    className="w-full py-2 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-all"
                >
                    Clear Data
                </button>
            </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;