import React, { useState, useEffect } from 'react';
import { TEMPLATES } from './constants';
import { TableTemplate, SimulationConfig, RowData } from './types';
import SmartTable from './components/SmartTable';
import ControlPanel from './components/ControlPanel';
import { Tooltip } from './components/Tooltip';
import { DocumentationPanel } from './components/DocumentationPanel';
import { generateTableData, analyzeFileAndGenerate, fixDataRows } from './services/geminiService';
import { 
    Layout, 
    FileSpreadsheet, 
    Upload, 
    ChevronRight,
    Sparkles,
    Download,
    FileText,
    Moon,
    Sun,
    Trash2,
    Menu,
    X
} from 'lucide-react';

const DEFAULT_CONFIG: SimulationConfig = {
  fillRate: 100,
  anomalyChance: 5,
  mode: 'realistic',
  targetMonth: new Date().toISOString().slice(0, 7) // Defaults to current YYYY-MM
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'generator' | 'documentation'>('generator');
  const [activeTemplate, setActiveTemplate] = useState<TableTemplate>(TEMPLATES[0]);
  const [tableData, setTableData] = useState<RowData[]>([]);
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Changed from single object to array to support multiple custom sheets
  const [customTemplates, setCustomTemplates] = useState<TableTemplate[]>([]);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Reset data when template changes
  useEffect(() => {
    setTableData([]);
  }, [activeTemplate]);

  const handleApiError = (error: any) => {
    console.error(error);
    const msg = error?.message || error?.error?.message || JSON.stringify(error);
    const code = error?.status || error?.error?.code;

    if (code === 429 || (typeof msg === 'string' && msg.toLowerCase().includes('quota'))) {
      alert(
        "Usage Limit Reached: You have exceeded the free tier quota for the Gemini API. " +
        "Please check your plan and billing details or try again later.\n\n" +
        "For more information, visit ai.google.dev/gemini-api/docs/rate-limits"
      );
    } else if (msg.includes("API key") || code === 400) {
        alert("API Error: The API key is invalid or expired. Please check your environment configuration.\n\nDetails: " + msg);
    } else if (code === 503) {
        alert("Service Unavailable: The AI model is currently overloaded. Please try again in a few moments.");
    } else {
        alert("Failed to generate data. Please try again.\n\nError: " + msg);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLoadingMessage("Initializing AI model...");
    try {
        const rows = await generateTableData(
            activeTemplate, 
            config, 
            tableData,
            (msg) => setLoadingMessage(msg)
        );
        setTableData(rows);
    } catch (error) {
        handleApiError(error);
    } finally {
        setIsGenerating(false);
        setLoadingMessage('');
    }
  };

  const handleDataChange = (rowIndex: number, key: string, value: string) => {
    const newData = [...tableData];
    newData[rowIndex] = { ...newData[rowIndex], [key]: value };
    setTableData(newData);
  };

  const handleDeleteRows = (indices: number[]) => {
      // Confirmation is now handled in the SmartTable component for better UI flow
      setTableData(prev => prev.filter((_, idx) => !indices.includes(idx)));
  };

  const handleBulkUpdate = (indices: number[], key: string, value: string) => {
      setTableData(prev => {
          const newData = [...prev];
          indices.forEach(idx => {
              if (newData[idx]) {
                  newData[idx] = { ...newData[idx], [key]: value };
              }
          });
          return newData;
      });
  };
  
  const handleAutoFix = async (indices: number[]) => {
    if (indices.length === 0) return;
    
    setIsGenerating(true);
    setLoadingMessage(`Analyzing ${indices.length} rows for compliance issues...`);
    
    try {
        // 1. Extract the rows to fix
        const rowsToFix = indices.map(idx => tableData[idx]).filter(Boolean);
        
        // 2. Call AI service
        const fixedRows = await fixDataRows(rowsToFix, activeTemplate);
        
        // 3. Merge back into state
        setTableData(prev => {
            const newData = [...prev];
            indices.forEach((originalIndex, i) => {
                if (fixedRows[i]) {
                    newData[originalIndex] = fixedRows[i];
                }
            });
            return newData;
        });
    } catch (error) {
        handleApiError(error);
    } finally {
        setIsGenerating(false);
        setLoadingMessage('');
    }
  };

  const handleDeleteCustomTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this sheet?")) {
        setCustomTemplates(prev => prev.filter(t => t.id !== id));
        if (activeTemplate.id === id) {
            setActiveTemplate(TEMPLATES[0]);
        }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = reader.result as string;
          // Extract base64 part
          const pureBase64 = base64.split(',')[1];
          const mimeType = file.type;
          
          setIsGenerating(true);
          setLoadingMessage("Analyzing document structure...");
          try {
              const result = await analyzeFileAndGenerate(pureBase64, mimeType, config);
              
              // Construct a new temporary template from result with a unique ID
              const newTemplate: TableTemplate = {
                  id: 'custom-' + Date.now(),
                  name: result.template.name || file.name.replace(/\.[^/.]+$/, ""),
                  description: 'Imported from ' + file.name,
                  context: 'Custom uploaded table context based on file analysis.',
                  columns: result.template.columns as any || [],
                  defaultRows: result.rows.length || 10,
                  aiRules: 'Follow structure extracted from the uploaded file.',
              };
              
              // Add to the list of custom templates
              setCustomTemplates(prev => [...prev, newTemplate]);
              
              // Set as active and populate data
              setActiveTemplate(newTemplate);
              setTableData(result.rows);
              setCurrentView('generator'); 
          } catch (err) {
              handleApiError(err);
          } finally {
              setIsGenerating(false);
              setLoadingMessage('');
              // Reset input value to allow re-uploading the same file if needed
              e.target.value = '';
          }
      };
      reader.readAsDataURL(file);
  };

  const handleExportCSV = () => {
    if (tableData.length === 0) {
        alert("No data available to export. Please generate data first.");
        return;
    }

    // Generate CSV Header
    const headers = activeTemplate.columns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',');
    
    // Generate CSV Rows
    const rows = tableData.map(row => {
        return activeTemplate.columns.map(col => {
            const cellValue = row[col.key];
            const stringValue = cellValue === null || cellValue === undefined ? '' : String(cellValue);
            // Escape double quotes by doubling them
            return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    
    // Create Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const cleanName = activeTemplate.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `${cleanName}_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <Sparkles className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">SmartFill</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Intelligent Table Simulation</p>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight sm:hidden">SmartFill</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-6">
              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-4">
                 <button 
                    onClick={() => setCurrentView('generator')}
                    className={`text-sm font-medium transition-colors ${currentView === 'generator' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                 >
                    Generator
                 </button>
                 <button 
                    onClick={() => setCurrentView('documentation')}
                    className={`text-sm font-medium transition-colors ${currentView === 'documentation' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                 >
                    Documentation
                 </button>
              </nav>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden md:block"></div>
              
              <button 
                onClick={toggleTheme} 
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                 {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {showMobileMenu && (
             <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 space-y-1">
                 <button 
                    onClick={() => { setCurrentView('generator'); setShowMobileMenu(false); }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${currentView === 'generator' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}
                 >
                    Generator
                 </button>
                 <button 
                    onClick={() => { setCurrentView('documentation'); setShowMobileMenu(false); }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${currentView === 'documentation' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}
                 >
                    Documentation
                 </button>
             </div>
        )}
      </header>

      {/* Main Container - Responsive Layout */}
      {/* On Mobile: auto height for natural scrolling. On Desktop: fixed height with internal scrolling */}
      <div className="flex flex-col lg:flex-row flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 gap-6 lg:h-[calc(100vh-64px)] h-auto">
        
        {/* Render Documentation View */}
        {currentView === 'documentation' ? (
           <div className="w-full h-full">
              <DocumentationPanel />
           </div>
        ) : (
           /* Render Generator View */
           <>
            {/* Sidebar / Template Selector */}
            {/* Mobile: Horizontal Scroll. Desktop: Vertical List in Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0 space-y-4 lg:space-y-6 lg:overflow-y-auto lg:max-h-full pb-2 lg:pb-6 custom-scrollbar">
                
                {/* Standard Templates */}
                <div className="space-y-2">
                    <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 hidden lg:block">Templates</h2>
                    {/* Responsive Nav: Horizontal scroll on mobile, Vertical stack on desktop */}
                    <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 lg:gap-1 pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                        {TEMPLATES.map(t => (
                            <Tooltip key={t.id} content={t.description} className="block flex-shrink-0 lg:w-full">
                                <button
                                    onClick={() => setActiveTemplate(t)}
                                    className={`flex-shrink-0 w-auto lg:w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-full lg:rounded-lg transition-colors border lg:border-none whitespace-nowrap ${
                                        activeTemplate.id === t.id 
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' 
                                        : 'bg-white dark:bg-slate-900 lg:bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <span className="truncate max-w-[150px] lg:max-w-none">{t.name}</span>
                                    {activeTemplate.id === t.id && <ChevronRight className="w-4 h-4 hidden lg:block" />}
                                </button>
                            </Tooltip>
                        ))}
                    </nav>
                </div>
                
                {/* Custom / Uploaded Sheets List */}
                {customTemplates.length > 0 && (
                    <div className="space-y-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
                         <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 hidden lg:block">My Sheets</h2>
                         <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 lg:gap-1 pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                             {customTemplates.map(t => (
                                 <Tooltip key={t.id} content={t.description} className="block flex-shrink-0 lg:w-full">
                                     <div className="relative group w-auto lg:w-full flex-shrink-0">
                                         <button
                                            onClick={() => setActiveTemplate(t)}
                                            className={`w-auto lg:w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-full lg:rounded-lg transition-colors border lg:border-none pr-8 whitespace-nowrap ${
                                                activeTemplate.id === t.id 
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' 
                                                : 'bg-white dark:bg-slate-900 lg:bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <span className="truncate max-w-[120px] lg:max-w-[140px]">{t.name}</span>
                                            {activeTemplate.id === t.id && <ChevronRight className="w-4 h-4 hidden lg:block" />}
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteCustomTemplate(e, t.id)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Sheet"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </div>
                                 </Tooltip>
                             ))}
                         </nav>
                    </div>
                )}

                {/* Mobile: Upload Button as part of the horizontal flow or separate block */}
                <div className="bg-indigo-50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-700">
                    <h3 className="text-indigo-900 dark:text-indigo-300 font-semibold text-sm mb-2 hidden lg:block">Add New Sheet</h3>
                    <p className="text-indigo-700 dark:text-slate-400 text-xs mb-3 hidden lg:block">Upload a PDF or Image of a table to add it to your sheets.</p>
                    <Tooltip content="Analyze a PDF or Image to create a new sheet." className="w-full block">
                        <label className="cursor-pointer flex items-center justify-center w-full py-2 px-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-600 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors shadow-sm whitespace-nowrap">
                            <Upload className="w-3 h-3 mr-2" />
                            <span className="lg:hidden">Import Table</span>
                            <span className="hidden lg:inline">Upload PDF / Image</span>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                        </label>
                    </Tooltip>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col gap-4 lg:gap-6 overflow-hidden min-h-[500px]">
                
                {/* Title Bar & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4 transition-colors duration-200">
                    <div className="overflow-hidden">
                        <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white truncate">{activeTemplate.name}</h2>
                        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{activeTemplate.description}</p>
                    </div>
                    <Tooltip content="Download the current table data as a CSV file.">
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors whitespace-nowrap w-full sm:w-auto"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </Tooltip>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start h-full lg:overflow-hidden relative">
                     {/* Control Panel: Collapsible on mobile or just placed inline */}
                     {/* On Mobile, we place it above table. order-1. On Desktop, order-2 (right side) */}
                     <div className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-0 order-1 lg:order-2 lg:overflow-y-auto lg:max-h-full custom-scrollbar">
                        <ControlPanel 
                            config={config} 
                            onConfigChange={setConfig} 
                            onGenerate={handleGenerate}
                            isGenerating={isGenerating}
                            onClear={() => setTableData([])}
                        />

                        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl hidden lg:block">
                            <h4 className="text-yellow-800 dark:text-yellow-500 font-semibold text-sm flex items-center gap-2 mb-2">
                                <Layout className="w-4 h-4" />
                                Context Analysis
                            </h4>
                            <p className="text-xs text-yellow-700 dark:text-yellow-600 leading-relaxed">
                                {activeTemplate.context}
                            </p>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 w-full order-2 lg:order-1 overflow-x-auto overflow-y-auto h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                         <SmartTable 
                            columns={activeTemplate.columns} 
                            data={tableData} 
                            isLoading={isGenerating} 
                            loadingMessage={loadingMessage}
                            onDataChange={handleDataChange}
                            onRowsDelete={handleDeleteRows}
                            onRowsUpdate={handleBulkUpdate}
                            onRowsAutoFix={handleAutoFix}
                        />
                    </div>
                </div>

            </main>
           </>
        )}
      </div>
    </div>
  );
};

export default App;
