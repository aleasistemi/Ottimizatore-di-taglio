
import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Save, Square, Settings, CloudDownload, Calendar, Eye, Code } from 'lucide-react';
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

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [panelMaterials, setPanelMaterials] = useState<PanelMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commesse, setCommesse] = useState<CommessaArchiviata[]>([]);

  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan', spessore: '3', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });

  const loadLocalData = () => {
    setProfiles(JSON.parse(localStorage.getItem('alea_profiles') || '[]'));
    setPanelMaterials(JSON.parse(localStorage.getItem('alea_panel_materials') || '[]'));
    setClients(JSON.parse(localStorage.getItem('alea_clients') || '[]'));
    setCommesse(JSON.parse(localStorage.getItem('alea_commesse') || '[]'));
  };

  useEffect(() => { loadLocalData(); }, []);
  useEffect(() => {
    window.addEventListener('alea_data_updated', loadLocalData);
    return () => window.removeEventListener('alea_data_updated', loadLocalData);
  }, []);

  const saveToDb = async (type: DbTab, data: any[]) => {
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse' };
    localStorage.setItem(keys[type], JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    if (supabaseService.isInitialized()) await supabaseService.syncTable(tables[type], data);
    loadLocalData();
  };

  const handleSaveProfile = async () => {
    if (!profileForm.codice) return;
    const updated = [profileForm, ...profiles.filter(p => p.codice !== profileForm.codice)];
    await saveToDb('profili', updated);
    setIsAdding(false); setIsEditing(false);
    setProfileForm({ codice: '', descr: '', lungMax: 6000 });
  };

  const handleSavePanel = async () => {
    if (!panelForm.codice) return;
    const id = panelForm.id || panelForm.codice;
    const updated = [{ ...panelForm, id }, ...panelMaterials.filter(p => p.id !== id)];
    await saveToDb('pannelli', updated);
    setIsAdding(false); setIsEditing(false);
    setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan', spessore: '3', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  };

  const deleteItem = async (type: DbTab, id: string) => {
    if (!confirm("Eliminare definitivamente l'elemento?")) return;
    let newData = [];
    if (type === 'profili') newData = profiles.filter(p => p.codice !== id);
    if (type === 'pannelli') newData = panelMaterials.filter(p => p.id !== id);
    if (type === 'commesse') newData = commesse.filter(c => c.id !== id);
    await saveToDb(type, newData);
  };

  const sqlSetup = `
-- Esegui questo SQL in Supabase per creare le tabelle corrette
CREATE TABLE profiles (codice TEXT PRIMARY KEY, descr TEXT, lungMax INTEGER);
CREATE TABLE panel_materials (id TEXT PRIMARY KEY, codice TEXT, descr TEXT, materiale TEXT, spessore TEXT, lungDefault INTEGER, altDefault INTEGER, giraPezzoDefault BOOLEAN);
CREATE TABLE clients (id TEXT PRIMARY KEY, nome TEXT, note TEXT, dataAggiunta TEXT);
CREATE TABLE commesse (id TEXT PRIMARY KEY, numero TEXT, cliente TEXT, data TEXT, tipo TEXT, dettagli JSONB);
  `.trim();

  return (
    <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden min-h-[600px] animate-in fade-in duration-500">
      <div className="flex border-b bg-slate-50/50 overflow-x-auto">
        {[
          { id: 'profili', label: 'Archivio Profili', icon: Database },
          { id: 'pannelli', label: 'Archivio Pannelli', icon: Square },
          { id: 'commesse', label: 'Commesse Archiviate', icon: Calendar },
          { id: 'settings', label: 'Setup Cloud', icon: Settings }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as DbTab)} className={`flex-1 flex items-center justify-center gap-2 py-5 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {activeTab === 'settings' ? (
           <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter">ALEA Cloud Setup</h3>
                <p className="text-slate-400 text-sm">Configura Supabase per mantenere sincronizzati i tuoi dati su ogni dispositivo.</p>
              </div>
              <div className="grid gap-4">
                <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="Supabase Project URL..." className="w-full p-4 border rounded-2xl font-mono text-xs" />
                <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="Supabase Service Role / Anon Key..." className="w-full p-4 border rounded-2xl font-mono text-xs" />
                <button onClick={() => { localStorage.setItem('alea_sb_url', sbUrl); localStorage.setItem('alea_sb_key', sbKey); window.location.reload(); }} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 transition-all shadow-xl">SALVA E REINIZIALIZZA</button>
              </div>
              <div className="bg-slate-900 p-6 rounded-3xl text-white">
                <div className="flex items-center gap-2 mb-4 text-red-500 font-black text-xs uppercase tracking-widest"><Code className="w-4 h-4" /> Query SQL per Supabase</div>
                <pre className="text-[10px] font-mono bg-black/40 p-4 rounded-xl overflow-x-auto text-blue-300">{sqlSetup}</pre>
              </div>
           </div>
        ) : (
           <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder={`Cerca per codice o descrizione...`} className="w-full p-4 pl-12 border rounded-2xl outline-none focus:ring-2 focus:ring-red-500" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                 </div>
                 <button onClick={()=>{setIsAdding(true); setIsEditing(false);}} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase shadow-lg hover:bg-red-700 transition-all">Aggiungi Nuovo</button>
              </div>

              {isAdding && activeTab === 'profili' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-red-50 border border-red-100 rounded-3xl animate-in zoom-in-95">
                   <input type="text" value={profileForm.codice} onChange={e=>setProfileForm({...profileForm, codice: e.target.value.toUpperCase()})} placeholder="Codice Profilo..." className="p-3 border rounded-xl font-black" />
                   <input type="text" value={profileForm.descr} onChange={e=>setProfileForm({...profileForm, descr: e.target.value})} placeholder="Descrizione..." className="p-3 border rounded-xl font-bold" />
                   <div className="flex gap-2">
                     <input type="number" value={profileForm.lungMax || 6000} onChange={e=>setProfileForm({...profileForm, lungMax: parseInt(e.target.value)})} className="flex-1 p-3 border rounded-xl font-black" />
                     <button onClick={handleSaveProfile} className="bg-slate-900 text-white px-6 rounded-xl font-black">SALVA</button>
                   </div>
                </div>
              )}

              {isAdding && activeTab === 'pannelli' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-red-50 border border-red-100 rounded-3xl animate-in zoom-in-95">
                   <input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} placeholder="Codice..." className="p-3 border rounded-xl font-black" />
                   <input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} placeholder="Materiale..." className="p-3 border rounded-xl font-bold" />
                   <input type="text" value={panelForm.spessore} onChange={e=>setPanelForm({...panelForm, spessore: e.target.value})} placeholder="Spessore..." className="p-3 border rounded-xl font-black text-red-600" />
                   <button onClick={handleSavePanel} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black">SALVA PANNELLO</button>
                </div>
              )}

              <div className="overflow-x-auto border rounded-3xl bg-white">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Codice / Nome</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">{activeTab === 'commesse' ? 'Data' : 'Info Tecnica'}</th>
                         <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-400">Azioni</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {activeTab === 'profili' && profiles.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                         <tr key={p.codice} className="hover:bg-slate-50 transition-all group font-bold">
                            <td className="px-6 py-5">
                               <div className="text-slate-900">{p.codice}</div>
                               <div className="text-[10px] text-slate-400 font-bold uppercase">{p.descr}</div>
                            </td>
                            <td className="px-6 py-5 text-red-600 font-black">{p.lungMax} mm</td>
                            <td className="px-6 py-5 flex justify-center gap-2">
                               <button onClick={()=>deleteItem('profili', p.codice)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5"/></button>
                            </td>
                         </tr>
                      ))}
                      {activeTab === 'pannelli' && panelMaterials.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-all group font-bold">
                            <td className="px-6 py-5">
                               <div className="text-slate-900">{p.codice} - {p.materiale}</div>
                            </td>
                            <td className="px-6 py-5 text-red-600 font-black">{p.spessore} mm</td>
                            <td className="px-6 py-5 flex justify-center gap-2">
                               <button onClick={()=>deleteItem('pannelli', p.id)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5"/></button>
                            </td>
                         </tr>
                      ))}
                      {activeTab === 'commesse' && commesse.filter(c => c.numero.includes(searchTerm) || c.cliente.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 font-bold">
                           <td className="px-6 py-5">
                              <div className="text-slate-900">{c.numero} - {c.cliente}</div>
                              <div className="text-[10px] text-slate-400 uppercase">{c.tipo}</div>
                           </td>
                           <td className="px-6 py-5 text-slate-500">{new Date(c.data).toLocaleDateString()}</td>
                           <td className="px-6 py-5 flex justify-center gap-2">
                              <button onClick={() => onOpenCommessa?.(c)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">APRI</button>
                              <button onClick={() => deleteItem('commesse', c.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
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
