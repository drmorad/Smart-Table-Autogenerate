import React, { useState, useRef, useEffect } from 'react';
import { MaintenanceDocument } from '../types';
import { INITIAL_DOCUMENTS } from '../constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Save, 
  X,
  Search,
  Download,
  ChevronLeft
} from 'lucide-react';
import { Tooltip } from './Tooltip';

// Fix: Define props interface for PdfDocumentLayout component
interface PdfDocumentLayoutProps {
  doc: Partial<MaintenanceDocument>;
}

// Reusable component for the PDF layout to avoid repetition
// Fix: Use React.FC and the props interface to correctly type the component
const PdfDocumentLayout: React.FC<PdfDocumentLayoutProps> = ({ doc }) => (
    <div 
        className="w-[210mm] min-h-[297mm] bg-white p-[15mm] text-slate-800 box-border flex flex-col"
        style={{ fontFamily: 'Inter, sans-serif', pageBreakAfter: 'always' }}
    >
        {/* Header */}
        <header className="flex justify-between items-start pb-4 border-b-2 border-slate-800">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Rewaya Hotel & Resort</h2>
                <p className="text-sm text-slate-500">Quality & Hygiene Department</p>
            </div>
            <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Document ID</p>
                <p className="text-sm font-mono font-semibold text-slate-600">{doc.id || 'N/A'}</p>
            </div>
        </header>

        {/* Title Section */}
        <section className="my-10">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-indigo-700 font-semibold">{doc.category || 'General'} Protocol</p>
                    <h1 className="text-4xl font-bold leading-tight mt-1 text-slate-900 max-w-[160mm]">
                        {doc.title || 'Untitled Document'}
                    </h1>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                    doc.status === 'Compliant' ? 'bg-emerald-100 text-emerald-800' :
                    doc.status === 'Review Needed' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                }`}>
                    {doc.status || 'Draft'}
                </span>
            </div>
        </section>

        {/* Metadata Grid */}
        <section className="grid grid-cols-2 gap-x-8 gap-y-4 mb-10 p-6 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Regulatory Authority</p>
                <p className="text-sm text-slate-700">{doc.authority || 'Internal Policy'}</p>
            </div>
             <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-slate-700">{doc.lastUpdated ? new Date(doc.lastUpdated).toLocaleDateString() : '-'}</p>
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Next Scheduled Review</p>
                <p className="text-sm font-semibold text-slate-700">{doc.nextReview ? new Date(doc.nextReview).toLocaleDateString() : 'Not Scheduled'}</p>
            </div>
             <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Validation Hash</p>
                <p className="text-xs font-mono text-slate-500 break-all">
                    {doc.id ? btoa(doc.id + (doc.lastUpdated || '')).substring(0, 24) : '...'}
                </p>
            </div>
        </section>

        {/* Content Body */}
        <main className="flex-1 mb-12">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-800 border-b border-slate-200 pb-2 mb-4">
                Policy Details
            </h3>
            <div 
              className="whitespace-pre-wrap text-base leading-relaxed text-slate-700" 
              style={{ fontFamily: 'Times New Roman, serif' }}
            >
                {doc.content || 'No content provided.'}
            </div>
        </main>

        {/* Signature/Footer Area */}
        <footer className="mt-auto pt-8 border-t border-slate-200 grid grid-cols-2 gap-12" style={{ breakInside: 'avoid' }}>
            <div>
                 <div className="h-12 border-b border-slate-300 mb-2"></div>
                 <p className="text-xs text-slate-500">Authorized Signature</p>
            </div>
            <div>
                 <div className="h-12 border-b border-slate-300 mb-2"></div>
                 <p className="text-xs text-slate-500">Date</p>
            </div>
        </footer>
    </div>
);


export const DocumentationPanel: React.FC = () => {
  const [documents, setDocuments] = useState<MaintenanceDocument[]>(INITIAL_DOCUMENTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [docsToExport, setDocsToExport] = useState<MaintenanceDocument[]>([]);
  
  const multiPdfTemplateRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<Partial<MaintenanceDocument>>({});

  useEffect(() => {
    const generatePdf = async () => {
        if (isExporting && docsToExport.length > 0 && multiPdfTemplateRef.current) {
            try {
                const element = multiPdfTemplateRef.current;
                
                const canvas = await html2canvas(element, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    windowWidth: element.scrollWidth,
                    windowHeight: element.scrollHeight,
                });
                
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = imgWidth / pdfWidth;
                const pdfHeight = imgHeight / ratio;

                let heightLeft = pdfHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();

                while (heightLeft > 0) {
                  position = -heightLeft;
                  pdf.addPage();
                  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                  heightLeft -= pdf.internal.pageSize.getHeight();
                }

                const dateStr = new Date().toISOString().slice(0,10);
                pdf.save(`rewaya_policy_export_${dateStr}.pdf`);
            } catch (e) {
                console.error("PDF generation failed", e);
                alert("Failed to generate PDF");
            } finally {
                setIsExporting(false);
                setDocsToExport([]);
            }
        }
    };

    generatePdf();
  }, [isExporting, docsToExport]);

  const handleEdit = (doc: MaintenanceDocument) => {
    setEditingId(doc.id);
    setFormData(doc);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this policy?')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      id: `doc-${Date.now()}`,
      status: 'Draft',
      category: 'General',
      lastUpdated: new Date().toISOString().slice(0, 10),
      nextReview: '',
    });
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) return alert('Title and Content are required');

    if (isCreating) {
      setDocuments(prev => [formData as MaintenanceDocument, ...prev]);
    } else {
      setDocuments(prev => prev.map(d => d.id === editingId ? { ...formData, lastUpdated: new Date().toISOString().slice(0, 10) } as MaintenanceDocument : d));
    }
    
    setEditingId(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleExportSelected = () => {
    if (selectedDocIds.size === 0 || isExporting) return;
    const selected = documents.filter(doc => selectedDocIds.has(doc.id));
    setDocsToExport(selected);
    setIsExporting(true);
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: string) => {
      setSelectedDocIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
              newSet.delete(id);
          } else {
              newSet.add(id);
          }
          return newSet;
      });
  };

  const isAllVisibleSelected = filteredDocs.length > 0 && selectedDocIds.size === filteredDocs.length;

  const handleToggleSelectAll = () => {
      if (isAllVisibleSelected) {
          setSelectedDocIds(new Set());
      } else {
          setSelectedDocIds(new Set(filteredDocs.map(d => d.id)));
      }
  };

  const stats = {
    reviewNeeded: documents.filter(d => d.status === 'Review Needed').length,
    compliant: documents.filter(d => d.status === 'Compliant').length,
    total: documents.length
  };

  const showEditor = isCreating || editingId !== null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 lg:rounded-xl border-x lg:border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative transition-colors duration-200">
      
      <div className={`p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 ${showEditor ? 'hidden lg:block' : 'block'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Documentation Hub</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage SOPs, audit requirements, and decrees.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
                onClick={handleExportSelected}
                disabled={selectedDocIds.size === 0 || isExporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isExporting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4" />}
                Export ({selectedDocIds.size})
            </button>
            <button 
                onClick={handleCreate}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                <Plus className="w-4 h-4" />
                New Policy
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-lg flex items-center gap-3">
             <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-5 h-5" /></div>
             <div>
               <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.compliant}</div>
               <div className="text-xs text-emerald-600 dark:text-emerald-500 font-medium uppercase">Compliant</div>
             </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-lg flex items-center gap-3">
             <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full text-amber-600 dark:text-amber-400"><AlertTriangle className="w-5 h-5" /></div>
             <div>
               <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats.reviewNeeded}</div>
               <div className="text-xs text-amber-600 dark:text-amber-500 font-medium uppercase">Action Required</div>
             </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg flex items-center gap-3">
             <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400"><FileText className="w-5 h-5" /></div>
             <div>
               <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats.total}</div>
               <div className="text-xs text-blue-600 dark:text-blue-500 font-medium uppercase">Total Docs</div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div className={`${showEditor ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 border-r border-slate-200 dark:border-slate-800 flex-col bg-slate-50 dark:bg-slate-850 h-full`}>
           <div className="p-4 border-b border-slate-200 dark:border-slate-800">
             <div className="relative mb-2">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                  type="text" 
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:placeholder-slate-500"
               />
             </div>
             <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 px-1">
                 <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    ref={input => { if(input) input.indeterminate = selectedDocIds.size > 0 && !isAllVisibleSelected; }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                 />
                 <label>Select All</label>
                 {selectedDocIds.size > 0 && (
                     <>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button onClick={() => setSelectedDocIds(new Set())} className="hover:text-indigo-600 dark:hover:text-indigo-400">Clear</button>
                     </>
                 )}
             </div>
           </div>
           <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
              {filteredDocs.map(doc => (
                <div 
                  key={doc.id}
                  className={`p-3 rounded-lg border transition-all flex items-start gap-3 ${
                    editingId === doc.id 
                    ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-1 ring-indigo-500 shadow-sm' 
                    : selectedDocIds.has(doc.id)
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocIds.has(doc.id)}
                    onChange={() => toggleSelection(doc.id)}
                    className="mt-1 w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => handleEdit(doc)}>
                      <div className="flex justify-between items-start mb-2">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            doc.status === 'Compliant' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            doc.status === 'Review Needed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                         }`}>
                           {doc.status}
                         </span>
                         <span className="text-[10px] text-slate-400 dark:text-slate-500">{doc.category}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200 leading-tight mb-1">{doc.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Auth: {doc.authority}</p>
                  </div>
                </div>
              ))}
              {filteredDocs.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-sm">No documents found.</div>
              )}
           </div>
        </div>

        <div className={`
             ${showEditor ? 'flex' : 'hidden lg:flex'} 
             flex-col lg:static absolute inset-0 z-20 
             flex-1 bg-white dark:bg-slate-900 
             lg:h-full overflow-hidden
        `}>
           {showEditor ? (
              <div className="flex flex-col h-full">
                 <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => { setIsCreating(false); setEditingId(null); }}
                            className="lg:hidden p-1 -ml-1 text-slate-500"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-none">
                            {isCreating ? 'Create New' : 'Edit Protocol'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => { setIsCreating(false); setEditingId(null); }} className="hidden lg:block p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg no-print">
                          <X className="w-5 h-5" />
                       </button>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-6">
                     <div className="max-w-3xl mx-auto space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Document Title</label>
                            <input 
                                type="text" 
                                value={formData.title || ''} 
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:outline-none"
                                placeholder="e.g. Legionella Prevention Plan"
                            />
                            </div>

                            <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Category</label>
                            <select 
                                value={formData.category || 'General'}
                                onChange={e => setFormData({...formData, category: e.target.value as MaintenanceDocument['category']})}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="General">General</option>
                                <option value="Hygiene">Hygiene</option>
                                <option value="Safety">Safety</option>
                                <option value="Equipment">Equipment</option>
                                <option value="Structural">Structural</option>
                            </select>
                            </div>

                            <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Regulatory Authority</label>
                            <input 
                                type="text" 
                                value={formData.authority || ''} 
                                onChange={e => setFormData({...formData, authority: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. Health Ministry"
                            />
                            </div>

                            <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
                            <select 
                                value={formData.status || 'Draft'}
                                onChange={e => setFormData({...formData, status: e.target.value as MaintenanceDocument['status']})}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Compliant">Compliant</option>
                                <option value="Review Needed">Review Needed</option>
                                <option value="Draft">Draft</option>
                            </select>
                            </div>

                            <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Next Review Date</label>
                            <input 
                                type="date" 
                                value={formData.nextReview || ''} 
                                onChange={e => setFormData({...formData, nextReview: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            </div>

                            <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Policy Content / Description</label>
                            <textarea 
                                value={formData.content || ''}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm font-mono h-64 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Enter standard operating procedures here..."
                            ></textarea>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 no-print gap-4">
                            {!isCreating && (
                            <button 
                                onClick={() => handleDelete(editingId!)}
                                className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full sm:w-auto"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Policy
                            </button>
                            )}
                            <div className="flex gap-3 ml-auto w-full sm:w-auto">
                                <button onClick={() => { setIsCreating(false); setEditingId(null); }} className="flex-1 sm:flex-none px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">
                                    Cancel
                                </button>
                                <button onClick={handleSave} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-md">
                                    <Save className="w-4 h-4" />
                                    Save
                                </button>
                            </div>
                        </div>
                     </div>
                 </div>
              </div>
           ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-full mb-4">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">Select a document to edit</h3>
                  <p className="max-w-xs text-center text-sm mt-2">Choose a policy from the list or create a new one to prepare for the upcoming audit.</p>
              </div>
           )}
        </div>
      </div>

      {/* Hidden Print Template for multiple docs */}
      <div className="fixed left-[-9999px] top-0 p-0 m-0" aria-hidden="true">
        <div ref={multiPdfTemplateRef}>
            {docsToExport.map(doc => (
                <PdfDocumentLayout key={doc.id} doc={doc} />
            ))}
        </div>
     </div>
    </div>
  );
};