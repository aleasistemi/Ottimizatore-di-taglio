
import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Square, Settings, Calendar, Save, Code, Palette } from 'lucide-react';
import { Profile, Client, CommessaArchiviata, PanelMaterial, AleaColor } from '../types';
import { supabaseService } from '../services/supabaseService';

type DbTab = 'profili' | 'pannelli' | 'clienti' | 'commesse' | 'colori' | 'settings';

interface ProfileDatabaseProps {
  onOpenCommessa?: (commessa: CommessaArchiviata) => void;
  forcedTab?: DbTab;
  onTabChange?: (tab: DbTab) => void;
}

export const ProfileDatabase: React.FC<ProfileDatabaseProps> = ({ onOpenCommessa, forcedTab, onTabChange }) => {
  const [activeTab, setActiveTab] = useState<DbTab>(forcedTab || 'profili');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [panelMaterials, setPanelMaterials] = useState<PanelMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commesse, setCommesse] = useState<CommessaArchiviata[]>([]);
  const [colors, setColors] = useState<AleaColor[]>([]);

  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan 3mm', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  const [colorForm, setColorForm] = useState<AleaColor>({ id: '', nome: '' });

  const loadLocalData = () => {
    setProfiles(JSON.parse(localStorage.getItem('alea_profiles') || '[]'));
    setPanelMaterials(JSON.parse(localStorage.getItem('alea_panel_materials') || '[]'));
    setClients(JSON.parse(localStorage.getItem('alea_clients') || '[]'));
    setCommesse(JSON.parse(localStorage.getItem('alea_commesse') || '[]'));
    setColors(JSON.parse(localStorage.getItem('alea_colors') || '[]'));
  };

  useEffect(() => { loadLocalData(); }, []);
  useEffect(() => {
    window.addEventListener('alea_data_updated', loadLocalData);
    return () => window.removeEventListener('alea_data_updated', loadLocalData);
  }, []);

  const saveToDb = async (type: DbTab, data: any[]) => {
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse', colori: 'alea_colors' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse', colori: 'colors' };
    localStorage.setItem(keys[type], JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    if (supabaseService.isInitialized()) await supabaseService.syncTable(tables[type], data);
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
    const id = panelForm.id || Math.random().toString(36).substr(2, 9);
    const updated = [{ ...panelForm, id }, ...panelMaterials.filter(p => p.id !== id && p.codice !== panelForm.codice)];
    await saveToDb('pannelli', updated);
    setIsAdding(false); setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan 3mm', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  };

  const handleSaveColor = async () => {
    if (!colorForm.nome) return;
    const id = colorForm.id || Math.random().toString(36).substr(2, 9);
    const updated = [{ ...colorForm, id }, ...colors.filter(c => c.id !== id)];
    await saveToDb('colori', updated);
    setIsAdding(false); setColorForm({ id: '', nome: '' });
  };

  const deleteItem = async (type: DbTab, id: string) => {
    if (!confirm("Eliminare definitivamente l'elemento?")) return;
    let newData = [];
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', commesse: 'commesse', colori: 'colors' };
    const idCols: Record<string, string> = { profili: 'codice', pannelli: 'id', commesse: 'id', colori: 'id' };
    
    if (type === 'profili') newData = profiles.filter(p => p.codice !== id);
    if (type === 'pannelli') newData = panelMaterials.filter(p => p.id !== id);
    if (type === 'commesse') newData = commesse.filter(c => c.id !== id);
    if (type === 'colori') newData = colors.filter(c => c.id !== id);
    
    if (supabaseService.isInitialized()) await supabaseService.deleteFromTable(tables[type], id, idCols[type]);
    await saveToDb(type, newData);
  };

  return (
    <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden min-h-[600px] animate-in fade-in duration-500">
      <div className="flex border-b bg-slate-50 overflow-x-auto">
        {[
          { id: 'profili', label: 'PROFILI', icon: Database },
          { id: 'pannelli', label: 'PANNELLI', icon: Square },
          { id: 'colori', label: 'COLORI', icon: Palette },
          { id: 'commesse', label: 'ARCHIVIO', icon: Calendar },
          { id: 'settings', label: 'CLOUD', icon: Settings }
        ].map(tab => (
          <button key={tab.id} onClick={() => {setActiveTab(tab.id as DbTab); setIsAdding(false);}} className={`flex-1 flex items-center justify-center gap-2 py-5 text-[10px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {activeTab === 'settings' ? (
           <div className="max-w-xl mx-auto space-y-8">
              <div className="text-center"><h3 className="text-2xl font-black uppercase">ALEA Cloud</h3><p className="text-slate-400 text-sm">Configura Supabase per sincronizzare i database.</p></div>
              <input type="text" placeholder="URL Supabase..." className="w-full p-4 border rounded-2xl" value={localStorage.getItem('alea_sb_url') || ''} onChange={e=>localStorage.setItem('alea_sb_url', e.target.value)} />
              <input type="password" placeholder="Anon Key..." className="w-full p-4 border rounded-2xl" value={localStorage.getItem('alea_sb_key') || ''} onChange={e=>localStorage.setItem('alea_sb_key', e.target.value)} />
              <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl">SALVA E AGGIORNA</button>
              <div className="bg-slate-900 p-6 rounded-3xl text-white text-[10px] font-mono overflow-x-auto">
                <div className="text-red-500 mb-2 font-black uppercase tracking-widest">Query SQL Setup</div>
                <pre>CREATE TABLE profiles (codice TEXT PRIMARY KEY, descr TEXT, lungMax INTEGER);
CREATE TABLE panel_materials (id TEXT PRIMARY KEY, codice TEXT, materiale TEXT, lungDefault INTEGER, altDefault INTEGER, giraPezzoDefault BOOLEAN);
CREATE TABLE colors (id TEXT PRIMARY KEY, nome TEXT);</pre>
              </div>
           </div>
        ) : (
           <div className="space-y-6">
              <div className="flex gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="Cerca..." className="w-full p-4 pl-12 border rounded-2xl" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                 </div>
                 {activeTab !== 'commesse' && <button onClick={()=>setIsAdding(true)} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase">Aggiungi</button>}
              </div>

              {isAdding && activeTab === 'profili' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50 rounded-3xl animate-in zoom-in-95">
                   <input type="text" value={profileForm.codice} onChange={e=>setProfileForm({...profileForm, codice: e.target.value.toUpperCase()})} placeholder="Codice..." className="p-3 border rounded-xl font-black" />
                   <input type="text" value={profileForm.descr} onChange={e=>setProfileForm({...profileForm, descr: e.target.value})} placeholder="Descrizione..." className="p-3 border rounded-xl" />
                   <div className="flex gap-2">
                     <input type="number" value={profileForm.lungMax || 6000} onChange={e=>setProfileForm({...profileForm, lungMax: parseInt(e.target.value)})} className="flex-1 p-3 border rounded-xl font-black" />
                     <button onClick={handleSaveProfile} className="bg-slate-900 text-white px-6 rounded-xl"><Save className="w-5 h-5"/></button>
                     <button onClick={()=>setIsAdding(false)} className="bg-white border p-3 rounded-xl"><X className="w-5 h-5"/></button>
                   </div>
                </div>
              )}

              {isAdding && activeTab === 'pannelli' && (
                <div className="p-6 bg-slate-50 rounded-3xl animate-in zoom-in-95 space-y-4">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} placeholder="Codice..." className="p-3 border rounded-xl font-black" />
                      <input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} placeholder="Materiale (es Lexan 3mm)..." className="p-3 border rounded-xl" />
                      <input type="number" value={panelForm.lungDefault} onChange={e=>setPanelForm({...panelForm, lungDefault: parseInt(e.target.value)})} placeholder="Base (mm)" className="p-3 border rounded-xl font-black" />
                      <input type="number" value={panelForm.altDefault} onChange={e=>setPanelForm({...panelForm, altDefault: parseInt(e.target.value)})} placeholder="Altezza (mm)" className="p-3 border rounded-xl font-black" />
                   </div>
                   <div className="flex gap-4">
                     <button onClick={handleSavePanel} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase"><Save className="w-5 h-5 inline mr-2"/> Salva Pannello</button>
                     <button onClick={()=>setIsAdding(false)} className="bg-white border px-10 rounded-2xl font-black uppercase">X</button>
                   </div>
                </div>
              )}

              {isAdding && activeTab === 'colori' && (
                <div className="p-6 bg-slate-50 rounded-3xl animate-in zoom-in-95 flex gap-4">
                   <input type="text" value={colorForm.nome} onChange={e=>setColorForm({...colorForm, nome: e.target.value})} placeholder="Nome Colore (es. RAL 7016)..." className="flex-1 p-3 border rounded-xl font-bold" />
                   <button onClick={handleSaveColor} className="bg-slate-900 text-white px-8 rounded-xl font-black">SALVA COLORE</button>
                   <button onClick={()=>setIsAdding(false)} className="bg-white border p-3 rounded-xl"><X className="w-5 h-5"/></button>
                </div>
              )}

              <div className="border rounded-3xl bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b">
                      <tr><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Nome / Codice</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Dettagli</th><th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-400">Azioni</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {activeTab === 'profili' && profiles.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                         <tr key={p.codice} className="hover:bg-slate-50 font-bold">
                            <td className="px-6 py-5">{p.codice} <div className="text-[9px] text-slate-400 uppercase">{p.descr}</div></td>
                            <td className="px-6 py-5 text-red-600 font-black">{p.lungMax} mm</td>
                            <td className="px-6 py-5 text-center flex justify-center gap-2">
                               <button onClick={()=>{setProfileForm(p); setIsAdding(true);}} className="p-2 text-slate-300 hover:text-blue-600"><Edit3 className="w-4 h-4"/></button>
                               <button onClick={()=>deleteItem('profili', p.codice)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                            </td>
                         </tr>
                      ))}
                      {activeTab === 'pannelli' && panelMaterials.filter(p=>p.codice.includes(searchTerm.toUpperCase()) || p.materiale.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 font-bold">
                            <td className="px-6 py-5">{p.codice} <div className="text-[9px] text-slate-400 uppercase">{p.materiale}</div></td>
                            <td className="px-6 py-5 text-red-600 font-black">{p.lungDefault}x{p.altDefault} mm</td>
                            <td className="px-6 py-5 text-center flex justify-center gap-2">
                               <button onClick={()=>{setPanelForm(p); setIsAdding(true);}} className="p-2 text-slate-300 hover:text-blue-600"><Edit3 className="w-4 h-4"/></button>
                               <button onClick={()=>deleteItem('pannelli', p.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                            </td>
                         </tr>
                      ))}
                      {activeTab === 'colori' && colors.filter(c=>c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                         <tr key={c.id} className="hover:bg-slate-50 font-bold">
                            <td className="px-6 py-5 uppercase">{c.nome}</td>
                            <td className="px-6 py-5 text-slate-400 text-xs">Aziendale</td>
                            <td className="px-6 py-5 text-center">
                               <button onClick={()=>deleteItem('colori', c.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                            </td>
                         </tr>
                      ))}
                      {activeTab === 'commesse' && commesse.filter(c => c.numero.includes(searchTerm) || c.cliente.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 font-bold">
                           <td className="px-6 py-5 uppercase">{c.numero} <div className="text-[9px] text-slate-400 uppercase">{c.cliente}</div></td>
                           <td className="px-6 py-5 text-slate-500 text-xs uppercase">{c.tipo} | {new Date(c.data).toLocaleDateString()}</td>
                           <td className="px-6 py-5 text-center flex justify-center gap-2">
                              <button onClick={() => onOpenCommessa?.(c)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px]">APRI</button>
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
