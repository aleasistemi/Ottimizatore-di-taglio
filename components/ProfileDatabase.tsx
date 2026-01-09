
import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Save, Square, Settings, CloudDownload, Calendar, Eye, RotateCw } from 'lucide-react';
import { Profile, Client, CommessaArchiviata, PanelMaterial } from '../types';
import { PROFILI as INITIAL_PROFILI } from '../constants';
import { supabaseService } from '../services/supabaseService';

type DbTab = 'profili' | 'pannelli' | 'clienti' | 'commesse' | 'settings';

interface ProfileDatabaseProps {
  onOpenCommessa?: (commessa: CommessaArchiviata) => void;
  forcedTab?: DbTab;
  onTabChange?: (tab: DbTab) => void;
}

export const ProfileDatabase: React.FC<ProfileDatabaseProps> = ({ onOpenCommessa, forcedTab, onTabChange }) => {
  const [activeTab, setActiveTab] = useState<DbTab>(forcedTab || 'profili');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [sbUrl, setSbUrl] = useState(localStorage.getItem('alea_sb_url') || '');
  const [sbKey, setSbKey] = useState(localStorage.getItem('alea_sb_key') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [panelMaterials, setPanelMaterials] = useState<PanelMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commesse, setCommesse] = useState<CommessaArchiviata[]>([]);

  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan', spessore: '3', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });

  const loadLocalData = () => {
    setProfiles(JSON.parse(localStorage.getItem('alea_profiles') || '[]'));
    setPanelMaterials(JSON.parse(localStorage.getItem('alea_panel_materials') || '[]'));
    setClients(JSON.parse(localStorage.getItem('alea_clients') || '[]'));
    setCommesse(JSON.parse(localStorage.getItem('alea_commesse') || '[]'));
  };

  useEffect(() => {
    loadLocalData();
    setIsConnected(supabaseService.isInitialized());
    const handleUpdate = () => { loadLocalData(); setIsConnected(supabaseService.isInitialized()); };
    window.addEventListener('alea_data_updated', handleUpdate);
    return () => window.removeEventListener('alea_data_updated', handleUpdate);
  }, []);

  const saveToDb = async (type: DbTab, data: any[]) => {
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse' };
    
    localStorage.setItem(keys[type], JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    
    if (isConnected) {
        try { 
            await supabaseService.syncTable(tables[type], data); 
        } catch (e) { 
            console.error("Sync error:", e); 
        }
    }
    loadLocalData();
  };

  const handleSavePanel = async () => {
    if (!panelForm.codice) return;
    // Utilizziamo il codice come ID se non presente per garantire stabilità nel sync
    const id = panelForm.id || panelForm.codice;
    const updated = [{ ...panelForm, id }, ...panelMaterials.filter(p => p.id !== id)];
    await saveToDb('pannelli', updated);
    setIsAdding(false); setIsEditing(false);
    setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan', spessore: '3', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  };

  const editItem = (type: DbTab, item: any) => {
    setIsEditing(true); setIsAdding(true);
    if (type === 'pannelli') setPanelForm({ ...item });
  };

  const deleteItem = async (type: DbTab, id: string) => {
    if (!confirm("Eliminare l'elemento?")) return;
    let newData = [];
    if (type === 'pannelli') newData = panelMaterials.filter(p => p.id !== id);
    if (type === 'commesse') newData = commesse.filter(c => c.id !== id);
    await saveToDb(type, newData);
  };

  return (
    <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden min-h-[500px]">
      <div className="flex border-b bg-slate-50/50 overflow-x-auto">
        {[
          { id: 'profili', label: 'Profili', icon: Database },
          { id: 'pannelli', label: 'Pannelli', icon: Square },
          { id: 'commesse', label: 'Archivio', icon: Calendar },
          { id: 'settings', label: 'Cloud Setup', icon: Settings }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as DbTab)} className={`flex-1 flex items-center justify-center gap-2 py-5 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {activeTab === 'settings' ? (
           <div className="max-w-md mx-auto py-10 space-y-6 text-center">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Setup ALEA Cloud</h3>
              <p className="text-slate-400 text-sm italic">Configura le credenziali Supabase per la sincronizzazione.</p>
              <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="Supabase URL..." className="w-full p-4 border rounded-2xl font-mono text-xs" />
              <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="Anon API Key..." className="w-full p-4 border rounded-2xl font-mono text-xs" />
              <button onClick={() => { localStorage.setItem('alea_sb_url', sbUrl); localStorage.setItem('alea_sb_key', sbKey); window.location.reload(); }} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all">CONNETTI E AGGIORNA</button>
           </div>
        ) : activeTab === 'commesse' ? (
           <div className="space-y-4">
              <div className="flex gap-4 mb-6">
                 <input type="text" placeholder="Cerca commessa o cliente..." className="flex-1 p-4 border rounded-2xl outline-none" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
              </div>
              <div className="space-y-3">
                 {commesse.filter(c => c.numero.includes(searchTerm) || c.cliente.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-5 bg-slate-50 border rounded-2xl hover:border-red-200 transition-all group">
                       <div>
                          <div className="font-black text-slate-900">{c.numero} - {c.cliente}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(c.data).toLocaleString()} | {c.tipo}</div>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => onOpenCommessa?.(c)} className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm font-black text-xs hover:bg-red-50 hover:text-red-600 flex gap-2 items-center"><Eye className="w-4 h-4" /> APRI</button>
                          <button onClick={() => deleteItem('commesse', c.id)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        ) : (
           <div className="space-y-6">
              <div className="flex gap-4">
                 <input type="text" placeholder={`Cerca in ${activeTab}...`} className="flex-1 p-4 border rounded-2xl outline-none" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                 <button onClick={()=>setIsAdding(true)} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase shadow-lg">Aggiungi</button>
              </div>

              {isAdding && activeTab === 'pannelli' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-red-50 border border-red-100 rounded-[2rem] animate-in zoom-in-95 duration-200 shadow-inner">
                   <div className="space-y-1"><label className="text-[9px] font-black uppercase text-red-400 px-1">Codice</label><input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} placeholder="es. LEX3" className="w-full p-3 border rounded-xl font-black" /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black uppercase text-red-400 px-1">Materiale</label><input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} className="w-full p-3 border rounded-xl font-bold" /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black uppercase text-red-400 px-1">Spessore (mm)</label><input type="text" value={panelForm.spessore} onChange={e=>setPanelForm({...panelForm, spessore: e.target.value})} className="w-full p-3 border rounded-xl font-black text-red-600" /></div>
                   <div className="flex items-end gap-2">
                      <button onClick={handleSavePanel} className="flex-1 bg-red-600 text-white font-black py-3 rounded-xl shadow-lg">SALVA</button>
                      <button onClick={()=>{setIsAdding(false); setIsEditing(false);}} className="p-3 bg-white border border-red-200 rounded-xl"><X className="w-5 h-5"/></button>
                   </div>
                </div>
              )}

              <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b">
                    <tr>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Codice</th>
                       {activeTab === 'pannelli' ? (
                         <>
                           <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Materiale</th>
                           <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Spessore</th>
                         </>
                       ) : (
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th>
                       )}
                       <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Azioni</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {activeTab === 'pannelli' && panelMaterials.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                       <tr key={p.id} className="hover:bg-slate-50 transition-all group font-bold">
                          <td className="px-6 py-5 text-sm font-black text-slate-900">{p.codice}</td>
                          <td className="px-6 py-5 text-sm text-slate-600">{p.materiale}</td>
                          <td className="px-6 py-5 text-center text-red-600 font-black">{p.spessore} mm</td>
                          <td className="px-6 py-5 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={()=>editItem('pannelli', p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-5 h-5"/></button>
                             <button onClick={()=>deleteItem('pannelli', p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                          </td>
                       </tr>
                    ))}
                    {activeTab === 'profili' && profiles.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                       <tr key={p.codice} className="hover:bg-slate-50 transition-all group font-bold">
                          <td className="px-6 py-5 text-sm font-black text-slate-900">{p.codice}</td>
                          <td className="px-6 py-5 text-sm text-slate-600">{p.descr}</td>
                          <td className="px-6 py-5 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-5 h-5"/></button>
                             <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}
      </div>
    </div>
  );
};
