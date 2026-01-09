
import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Square, Settings, Calendar, Save, Code, Palette, CheckCircle2, Copy } from 'lucide-react';
import { Profile, Client, CommessaArchiviata, PanelMaterial, AleaColor } from '../types';
import { supabaseService } from '../services/supabaseService';

type DbTab = 'profili' | 'pannelli' | 'colori' | 'commesse' | 'settings';

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
    const handleUpdate = () => loadLocalData();
    window.addEventListener('alea_data_updated', handleUpdate);
    return () => window.removeEventListener('alea_data_updated', handleUpdate);
  }, []);

  const saveToDb = async (type: DbTab, data: any[]) => {
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse', colori: 'alea_colors' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse', colori: 'colors' };
    
    // 1. BLOCCO IMMEDIATO: Diciamo ad App.tsx di non sincronizzare dal cloud per un po'
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));

    // 2. SALVATAGGIO LOCALE: Aggiorniamo subito il magazzino locale
    localStorage.setItem(keys[type], JSON.stringify(data));
    
    // 3. SINCRONIZZAZIONE CLOUD
    if (supabaseService.isInitialized()) {
      try {
        await supabaseService.syncTable(tables[type], data);
      } catch (e) {
        console.error("Errore caricamento cloud:", e);
      }
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
    // Generiamo un ID univoco robusto se è un nuovo inserimento
    const id = panelForm.id || `PAN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newPanel = { ...panelForm, id };
    const updated = [newPanel, ...panelMaterials.filter(p => p.id !== id)];
    
    await saveToDb('pannelli', updated);
    
    setIsAdding(false); 
    setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan 3mm', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  };

  const handleSaveColor = async () => {
    if (!colorForm.nome) return;
    const id = colorForm.id || `COL_${Date.now()}`;
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

  const sqlSetup = `
-- ESEGUI QUESTO SQL IN SUPABASE (SQL EDITOR)
-- Usiamo IF NOT EXISTS per evitare errori se le tabelle già esistono

CREATE TABLE IF NOT EXISTS profiles (
  codice TEXT PRIMARY KEY, 
  descr TEXT, 
  "lungMax" INTEGER
);

CREATE TABLE IF NOT EXISTS panel_materials (
  id TEXT PRIMARY KEY, 
  codice TEXT, 
  materiale TEXT, 
  descr TEXT,
  "lungDefault" INTEGER, 
  "altDefault" INTEGER, 
  "giraPezzoDefault" BOOLEAN
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, 
  nome TEXT, 
  note TEXT, 
  "dataAggiunta" TEXT
);

CREATE TABLE IF NOT EXISTS colors (
  id TEXT PRIMARY KEY, 
  nome TEXT
);

CREATE TABLE IF NOT EXISTS commesse (
  id TEXT PRIMARY KEY, 
  numero TEXT, 
  cliente TEXT, 
  data TEXT, 
  tipo TEXT, 
  dettagli JSONB
);

-- NOTA: Assicurati di disabilitare la Row Level Security (RLS) 
-- o di aggiungere policy di accesso libero.
  `.trim();

  return (
    <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden min-h-[600px] animate-in fade-in duration-500">
      <div className="flex border-b bg-slate-50 overflow-x-auto scrollbar-hide">
        {[
          { id: 'profili', label: 'PROFILI', icon: Database },
          { id: 'pannelli', label: 'PANNELLI', icon: Square },
          { id: 'colori', label: 'COLORI', icon: Palette },
          { id: 'commesse', label: 'ARCHIVIO', icon: Calendar },
          { id: 'settings', label: 'SETUP CLOUD', icon: Settings }
        ].map(tab => (
          <button key={tab.id} onClick={() => {setActiveTab(tab.id as DbTab); setIsAdding(false);}} className={`flex-1 flex items-center justify-center gap-2 py-5 px-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-8">
        {activeTab === 'settings' ? (
           <div className="max-w-3xl mx-auto space-y-10 pb-10">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter">Configurazione Cloud ALEA</h3>
                <p className="text-slate-400 text-sm">Collega l'app a Supabase per sincronizzare l'officina.</p>
              </div>

              <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 space-y-6">
                <div className="space-y-4">
                  <input type="text" placeholder="Project URL (https://...)" className="w-full p-4 border rounded-2xl font-mono text-xs outline-none" value={localStorage.getItem('alea_sb_url') || ''} onChange={e=>localStorage.setItem('alea_sb_url', e.target.value)} />
                  <input type="password" placeholder="Anon Key" className="w-full p-4 border rounded-2xl font-mono text-xs outline-none" value={localStorage.getItem('alea_sb_key') || ''} onChange={e=>localStorage.setItem('alea_sb_key', e.target.value)} />
                </div>
                <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-slate-800 transition-all uppercase tracking-widest">
                   Applica e Aggiorna
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest"><Code className="w-5 h-5" /> Istruzioni SQL (SQL Editor)</div>
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white relative group">
                  <button onClick={() => navigator.clipboard.writeText(sqlSetup)} className="absolute top-4 right-4 bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all"><Copy className="w-4 h-4 text-slate-400" /></button>
                  <pre className="text-[11px] font-mono leading-relaxed bg-black/30 p-4 rounded-xl overflow-x-auto text-blue-300">{sqlSetup}</pre>
                </div>
              </div>
           </div>
        ) : (
           <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder={`Cerca...`} className="w-full p-4 pl-12 border rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-medium" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                 </div>
                 {activeTab !== 'commesse' && (
                    <button onClick={()=>setIsAdding(true)} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Nuovo</button>
                 )}
              </div>

              {isAdding && activeTab === 'profili' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8 bg-slate-50 border rounded-[2rem] animate-in zoom-in-95">
                   <input type="text" value={profileForm.codice} onChange={e=>setProfileForm({...profileForm, codice: e.target.value.toUpperCase()})} placeholder="Codice Profilo..." className="p-3 border rounded-xl font-black" />
                   <input type="text" value={profileForm.descr} onChange={e=>setProfileForm({...profileForm, descr: e.target.value})} placeholder="Descrizione..." className="p-3 border rounded-xl font-bold" />
                   <div className="flex gap-2">
                     <input type="number" value={profileForm.lungMax || 6000} onChange={e=>setProfileForm({...profileForm, lungMax: parseInt(e.target.value)})} className="flex-1 p-3 border rounded-xl font-black" />
                     <button onClick={handleSaveProfile} className="bg-slate-900 text-white px-6 rounded-xl shadow-lg"><Save className="w-5 h-5"/></button>
                     <button onClick={()=>setIsAdding(false)} className="bg-white border p-3 rounded-xl"><X className="w-5 h-5"/></button>
                   </div>
                </div>
              )}

              {isAdding && activeTab === 'pannelli' && (
                <div className="p-8 bg-slate-50 border rounded-[2rem] animate-in zoom-in-95 space-y-4">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} placeholder="Codice Pannello..." className="p-3 border rounded-xl font-black" />
                      <input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} placeholder="Materiale (es Lexan 3mm)..." className="p-3 border rounded-xl font-bold" />
                      <input type="number" value={panelForm.lungDefault} onChange={e=>setPanelForm({...panelForm, lungDefault: parseInt(e.target.value)})} placeholder="Base (mm)" className="p-3 border rounded-xl font-black" />
                      <input type="number" value={panelForm.altDefault} onChange={e=>setPanelForm({...panelForm, altDefault: parseInt(e.target.value)})} placeholder="Altezza (mm)" className="p-3 border rounded-xl font-black" />
                   </div>
                   <div className="flex gap-4">
                     <button onClick={handleSavePanel} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase shadow-xl flex items-center justify-center gap-2"><Save className="w-5 h-5"/> Salva in Archivio</button>
                     <button onClick={()=>setIsAdding(false)} className="bg-white border px-10 rounded-2xl font-black uppercase">Chiudi</button>
                   </div>
                </div>
              )}

              {isAdding && activeTab === 'colori' && (
                <div className="p-8 bg-slate-50 border rounded-[2rem] animate-in zoom-in-95 flex flex-col md:flex-row gap-4">
                   <input type="text" value={colorForm.nome} onChange={e=>setColorForm({...colorForm, nome: e.target.value})} placeholder="Nome Colore (es. Trasparente o RAL 7016)..." className="flex-1 p-3 border rounded-xl font-bold uppercase" />
                   <div className="flex gap-2">
                      <button onClick={handleSaveColor} className="bg-slate-900 text-white px-10 py-3.5 rounded-xl font-black uppercase shadow-lg flex items-center gap-2"><Save className="w-5 h-5"/> Salva Colore</button>
                      <button onClick={()=>setIsAdding(false)} className="bg-white border p-3 rounded-xl"><X className="w-5 h-5"/></button>
                   </div>
                </div>
              )}

              <div className="border rounded-[2rem] bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr><th className="px-6 py-5">Identificativo</th><th className="px-6 py-5">Dettagli</th><th className="px-6 py-5 text-center">Azioni</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {activeTab === 'profili' && profiles.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                         <tr key={p.codice} className="hover:bg-slate-50 transition-all font-bold">
                            <td className="px-6 py-5">{p.codice} <div className="text-[10px] text-slate-400 font-normal uppercase">{p.descr}</div></td>
                            <td className="px-6 py-5 text-red-600 font-black">{p.lungMax} mm</td>
                            <td className="px-6 py-5 flex justify-center gap-2">
                               <button onClick={()=>{setProfileForm(p); setIsAdding(true);}} className="p-3 text-slate-300 hover:text-blue-600"><Edit3 className="w-5 h-5"/></button>
                               <button onClick={()=>deleteItem('profili', p.codice)} className="p-3 text-slate-300 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                            </td>
                         </tr>
                      ))}
                      {activeTab === 'pannelli' && panelMaterials.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-all font-bold">
                            <td className="px-6 py-5">{p.codice} <div className="text-[10px] text-slate-400 font-normal uppercase">{p.materiale}</div></td>
                            <td className="px-6 py-5 text-red-600 font-black">{p.lungDefault}x{p.altDefault} mm</td>
                            <td className="px-6 py-5 flex justify-center gap-2">
                               <button onClick={()=>{setPanelForm(p); setIsAdding(true);}} className="p-3 text-slate-300 hover:text-blue-600"><Edit3 className="w-5 h-5"/></button>
                               <button onClick={()=>deleteItem('pannelli', p.id)} className="p-3 text-slate-300 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                            </td>
                         </tr>
                      ))}
                      {activeTab === 'colori' && colors.map(c => (
                         <tr key={c.id} className="hover:bg-slate-50 transition-all font-bold group">
                            <td className="px-6 py-5 text-sm uppercase font-black text-slate-900">{c.nome}</td>
                            <td className="px-6 py-5 text-slate-400 text-[10px] uppercase">RAL / Colore Officina</td>
                            <td className="px-6 py-5 text-center">
                               <button onClick={()=>deleteItem('colori', c.id)} className="p-3 text-slate-300 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                            </td>
                         </tr>
                      ))}
                      {activeTab === 'commesse' && commesse.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-all font-bold">
                           <td className="px-6 py-5 uppercase font-black">{c.numero} <div className="text-[10px] text-slate-400 font-normal">{c.cliente}</div></td>
                           <td className="px-6 py-5 text-slate-500 text-[10px] uppercase font-black"><span className="bg-slate-100 px-3 py-1 rounded-full">{c.tipo}</span> | {new Date(c.data).toLocaleDateString()}</td>
                           <td className="px-6 py-5 flex justify-center gap-2">
                              <button onClick={() => onOpenCommessa?.(c)} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Apri</button>
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
