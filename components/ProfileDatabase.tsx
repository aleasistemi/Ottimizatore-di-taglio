
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Square, Settings, Calendar, Save, Code, Palette, Copy, Users, FileSpreadsheet, Upload, CheckCircle2, PlayCircle, ExternalLink, Filter, CheckSquare, Square as SquareIcon } from 'lucide-react';
import { Profile, Client, CommessaArchiviata, PanelMaterial, AleaColor } from '../types';
import { supabaseService } from '../services/supabaseService';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

type DbTab = 'profili' | 'pannelli' | 'colori' | 'clienti' | 'commesse' | 'settings';

interface ProfileDatabaseProps {
  onOpenCommessa?: (commessa: CommessaArchiviata) => void;
  forcedTab?: DbTab;
  onTabChange?: (tab: DbTab) => void;
}

export const ProfileDatabase: React.FC<ProfileDatabaseProps> = ({ onOpenCommessa, forcedTab, onTabChange }) => {
  const [activeTab, setActiveTab] = useState<DbTab>(forcedTab || 'profili');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [panelMaterials, setPanelMaterials] = useState<PanelMaterial[]>([]);
  const [commesse, setCommesse] = useState<CommessaArchiviata[]>([]);
  const [colors, setColors] = useState<AleaColor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedCommessaIds, setSelectedCommessaIds] = useState<string[]>([]);

  const [sbUrl, setSbUrl] = useState(localStorage.getItem('alea_sb_url') || '');
  const [sbKey, setSbKey] = useState(localStorage.getItem('alea_sb_key') || '');

  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan 3mm', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  const [colorForm, setColorForm] = useState<AleaColor>({ id: '', nome: '' });
  const [clientForm, setClientForm] = useState<Client>({ id: '', nome: '', note: '', dataAggiunta: '' });

  const loadLocalData = () => {
    setProfiles(JSON.parse(localStorage.getItem('alea_profiles') || '[]'));
    setPanelMaterials(JSON.parse(localStorage.getItem('alea_panel_materials') || '[]'));
    setCommesse(JSON.parse(localStorage.getItem('alea_commesse') || '[]'));
    setColors(JSON.parse(localStorage.getItem('alea_colors') || '[]'));
    setClients(JSON.parse(localStorage.getItem('alea_clients') || '[]'));
  };

  useEffect(() => { 
    loadLocalData();
    if (forcedTab) setActiveTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    const handleUpdate = () => loadLocalData();
    window.addEventListener('alea_data_updated', handleUpdate);
    return () => window.removeEventListener('alea_data_updated', handleUpdate);
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    commesse.forEach(c => {
      if (c.data) {
        const y = new Date(c.data).getFullYear().toString();
        years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [commesse]);

  const filteredCommesse = useMemo(() => {
    return commesse.filter(c => {
      const year = new Date(c.data).getFullYear().toString();
      const matchesYear = year === selectedYear;
      const matchesSearch = c.numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.cliente.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesYear && matchesSearch;
    });
  }, [commesse, selectedYear, searchTerm]);

  const saveToDb = async (type: DbTab, data: any[]) => {
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', commesse: 'alea_commesse', colori: 'alea_colors', clienti: 'alea_clients' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', commesse: 'commesse', colori: 'colors', clienti: 'clients' };
    
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    localStorage.setItem(keys[type], JSON.stringify(data));
    
    if (supabaseService.isInitialized()) {
      await supabaseService.syncTable(tables[type], data);
    }
    loadLocalData();
  };

  const handleSaveProfile = async () => {
    if (!profileForm.codice) return;
    const updated = [profileForm, ...profiles.filter(p => p.codice !== profileForm.codice)];
    await saveToDb('profili', updated);
    setIsAdding(false); setProfileForm({ codice: '', descr: '', lungMax: 6000 });
  };

  const handleSavePanel = async () => {
    if (!panelForm.codice) return;
    const id = panelForm.id || `PAN_${Date.now()}`;
    const updated = [{ ...panelForm, id }, ...panelMaterials.filter(p => p.id !== id)];
    await saveToDb('pannelli', updated);
    setIsAdding(false); setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan 3mm', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  };

  const handleSaveColor = async () => {
    if (!colorForm.nome) return;
    const id = colorForm.id || `COL_${Date.now()}`;
    const updated = [{ ...colorForm, id }, ...colors.filter(c => c.id !== id)];
    await saveToDb('colori', updated);
    setIsAdding(false); setColorForm({ id: '', nome: '' });
  };

  const handleSaveClient = async () => {
    if (!clientForm.nome) return;
    const id = clientForm.id || `CLI_${Date.now()}`;
    const dataAggiunta = clientForm.dataAggiunta || new Date().toISOString();
    const updated = [{ ...clientForm, id, dataAggiunta }, ...clients.filter(c => c.id !== id)];
    await saveToDb('clienti', updated);
    setIsAdding(false); setClientForm({ id: '', nome: '', note: '', dataAggiunta: '' });
  };

  const deleteItem = async (type: DbTab, id: string) => {
    if (!confirm("Eliminare definitivamente l'elemento?")) return;
    let newData = [];
    if (type === 'profili') newData = profiles.filter(p => p.codice !== id);
    if (type === 'pannelli') newData = panelMaterials.filter(p => p.id !== id);
    if (type === 'colori') newData = colors.filter(c => c.id !== id);
    if (type === 'clienti') newData = clients.filter(c => c.id !== id);
    if (type === 'commesse') newData = commesse.filter(c => c.id !== id);
    
    const idCols: any = { profili: 'codice', pannelli: 'id', colori: 'id', clienti: 'id', commesse: 'id' };
    const tables: any = { profili: 'profiles', pannelli: 'panel_materials', colori: 'colors', clienti: 'clients', commesse: 'commesse' };
    
    if (supabaseService.isInitialized()) await supabaseService.deleteFromTable(tables[type], id, idCols[type]);
    await saveToDb(type, newData);
  };

  const handleImportXlsx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        const importedProfiles: Profile[] = data.filter(row => row[0]).map(row => ({
          codice: String(row[0]).toUpperCase().trim(),
          descr: String(row[1] || '').trim(),
          lungMax: row[2] ? parseInt(row[2]) : 6000
        }));
        if (importedProfiles.length === 0) { alert("Nessun profilo trovato."); return; }
        const existingMap = new Map(profiles.map(p => [p.codice, p]));
        importedProfiles.forEach(p => existingMap.set(p.codice, p));
        await saveToDb('profili', Array.from(existingMap.values()));
        alert(`Importati correttamente ${importedProfiles.length} profili!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) { alert("Errore Excel."); }
    };
    reader.readAsBinaryString(file);
  };

  const handleConnectCloud = () => {
    localStorage.setItem('alea_sb_url', sbUrl);
    localStorage.setItem('alea_sb_key', sbKey);
    window.location.reload();
  };

  const handleDeleteBulkCommesse = async () => {
    if (selectedCommessaIds.length === 0) return;
    if (!confirm(`Eliminare ${selectedCommessaIds.length} commesse?`)) return;
    const updatedCommesse = commesse.filter(c => !selectedCommessaIds.includes(c.id));
    if (supabaseService.isInitialized()) {
      for (const id of selectedCommessaIds) await supabaseService.deleteFromTable('commesse', id, 'id');
    }
    await saveToDb('commesse', updatedCommesse);
    setSelectedCommessaIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedCommessaIds.length === filteredCommesse.length) setSelectedCommessaIds([]);
    else setSelectedCommessaIds(filteredCommesse.map(c => c.id));
  };

  const toggleSelectCommessa = (id: string) => {
    setSelectedCommessaIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden min-h-[600px]">
      <div className="flex border-b bg-slate-50 overflow-x-auto">
        {[
          { id: 'profili', label: 'PROFILI', icon: Database },
          { id: 'pannelli', label: 'PANNELLI', icon: Square },
          { id: 'colori', label: 'COLORI', icon: Palette },
          { id: 'clienti', label: 'CLIENTI', icon: Users },
          { id: 'commesse', label: 'ARCHIVIO', icon: Calendar },
          { id: 'settings', label: 'SETUP CLOUD', icon: Settings }
        ].map(tab => (
          <button key={tab.id} onClick={() => {setActiveTab(tab.id as DbTab); setIsAdding(false); if(onTabChange) onTabChange(tab.id as DbTab);}} className={`flex-1 flex items-center justify-center gap-2 py-5 px-4 text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}>
            <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-8">
        {activeTab === 'settings' ? (
           <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Setup Cloud</h3>
                <p className="text-slate-400 text-sm">Configura Supabase per sincronizzare l'officina.</p>
              </div>
              <div className="flex justify-center">
                 <a href="https://vimeo.com/1153543551" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase shadow-xl hover:bg-green-700 transition-all active:scale-95 text-xs tracking-widest">
                   <PlayCircle className="w-6 h-6" /> GUARDA LE ISTRUZIONI PER COLLEGARE IL CLOUD <ExternalLink className="w-4 h-4 opacity-50" />
                 </a>
              </div>
              <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 space-y-4 shadow-inner">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">URL API SUPABASE</label>
                  <input type="text" placeholder="https://your-project.supabase.co" className="w-full p-4 border rounded-2xl font-mono text-xs focus:ring-2 focus:ring-red-500 outline-none" value={sbUrl} onChange={e => setSbUrl(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">CHIAVE ANONIMA (ANON KEY)</label>
                  <input type="password" placeholder="Anon Key..." className="w-full p-4 border rounded-2xl font-mono text-xs focus:ring-2 focus:ring-red-500 outline-none" value={sbKey} onChange={e => setSbKey(e.target.value)} />
                </div>
                <button onClick={handleConnectCloud} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" /> CONNETTI E SINCRONIZZA
                </button>
              </div>
           </div>
        ) : (
           <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                 <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="Cerca nel database..." className="w-full p-4 pl-12 border rounded-2xl outline-none focus:ring-2 focus:ring-red-500" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                 </div>
                 
                 {activeTab === 'commesse' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                       <div className="flex-1 sm:w-32">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 block">Seleziona Anno</label>
                          <select value={selectedYear} onChange={e => {setSelectedYear(e.target.value); setSelectedCommessaIds([]);}} className="w-full p-3.5 bg-slate-50 border rounded-2xl font-black text-xs outline-none cursor-pointer">
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                       </div>
                    </div>
                 )}

                 <div className="flex gap-2 w-full sm:w-auto">
                    {activeTab === 'profili' && (
                      <>
                        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleImportXlsx} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-2xl font-black uppercase shadow-sm hover:border-slate-800 transition-all flex items-center gap-2 text-xs">
                          <FileSpreadsheet className="w-4 h-4 text-green-600" /> <span className="hidden lg:inline">Importa XLSX</span>
                        </button>
                      </>
                    )}
                    {activeTab !== 'commesse' && (
                      <button onClick={()=>setIsAdding(true)} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase shadow-lg hover:bg-red-700 transition-all flex items-center gap-2 whitespace-nowrap text-xs">
                        <Plus className="w-5 h-5" /> Aggiungi
                      </button>
                    )}
                 </div>
              </div>

              {/* Form Aggiunta Pannelli - Aggiornato senza Colore */}
              {isAdding && activeTab === 'pannelli' && (
                <div className="p-6 bg-slate-50 border rounded-[2rem] animate-in zoom-in-95 space-y-4 shadow-inner">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} placeholder="Codice Materiale..." className="p-3 border rounded-xl font-black" />
                      <input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} placeholder="Nome Materiale..." className="p-3 border rounded-xl font-bold" />
                      <input type="number" value={panelForm.lungDefault} onChange={e=>setPanelForm({...panelForm, lungDefault: parseInt(e.target.value)})} placeholder="Base (mm)" className="p-3 border rounded-xl font-black" />
                      <input type="number" value={panelForm.altDefault} onChange={e=>setPanelForm({...panelForm, altDefault: parseInt(e.target.value)})} placeholder="Altezza (mm)" className="p-3 border rounded-xl font-black" />
                   </div>
                   <div className="flex gap-4">
                      <button onClick={handleSavePanel} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black uppercase shadow-lg flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Salva Pannello</button>
                      <button onClick={()=>setIsAdding(false)} className="px-10 bg-white border rounded-xl font-black uppercase">Annulla</button>
                   </div>
                </div>
              )}

              <div className="border rounded-[2rem] bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                      <tr>
                        {activeTab === 'commesse' && <th className="px-6 py-5 w-10">Sel.</th>}
                        <th className="px-6 py-5">Nome / Codice</th>
                        <th className="px-6 py-5">Dettaglio</th>
                        <th className="px-6 py-5 text-center">Azioni</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {activeTab === 'pannelli' && panelMaterials.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-all font-bold">
                            <td className="px-6 py-5 uppercase font-black">{p.codice} <div className="text-[10px] text-slate-400 font-normal">{p.materiale}</div></td>
                            <td className="px-6 py-5 text-red-600 font-black">{p.lungDefault}x{p.altDefault} mm</td>
                            <td className="px-6 py-5 text-center flex justify-center gap-2">
                               <button onClick={()=>{setPanelForm(p); setIsAdding(true);}} className="p-2 text-slate-300 hover:text-blue-600"><Edit3 className="w-5 h-5"/></button>
                               <button onClick={()=>deleteItem('pannelli', p.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
