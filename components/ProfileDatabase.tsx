
import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Users, Briefcase, CloudSync, Globe, Settings, AlertCircle, CheckCircle2, Eye, Info, ShieldCheck, Copy, Square } from 'lucide-react';
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

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [panelMaterials, setPanelMaterials] = useState<PanelMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commesse, setCommesse] = useState<CommessaArchiviata[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan', spessori: '2, 3, 4', lungDefault: 3050, altDefault: 2050 });

  useEffect(() => {
    if (forcedTab) setActiveTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    loadLocalData();
    setIsConnected(supabaseService.isInitialized());
  }, []);

  const handleTabChange = (tab: DbTab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const loadLocalData = () => {
    const savedP = localStorage.getItem('alea_profiles');
    if (savedP) setProfiles(JSON.parse(savedP));
    else {
      const defaults = Object.entries(INITIAL_PROFILI).map(([codice, p]) => ({ codice, descr: p.descr, lungMax: p.lungMax || 6000 }));
      setProfiles(defaults);
      localStorage.setItem('alea_profiles', JSON.stringify(defaults));
    }
    const savedPan = localStorage.getItem('alea_panel_materials');
    if (savedPan) setPanelMaterials(JSON.parse(savedPan));
    
    const savedC = localStorage.getItem('alea_clients');
    if (savedC) setClients(JSON.parse(savedC));
    const savedCom = localStorage.getItem('alea_commesse');
    if (savedCom) setCommesse(JSON.parse(savedCom));
  };

  const syncFromCloud = async () => {
    const p = await supabaseService.fetchTable('profiles');
    if (p) { setProfiles(p); localStorage.setItem('alea_profiles', JSON.stringify(p)); }
    
    const pan = await supabaseService.fetchTable('panel_materials');
    if (pan) { setPanelMaterials(pan); localStorage.setItem('alea_panel_materials', JSON.stringify(pan)); }

    const c = await supabaseService.fetchTable('clients');
    if (c) { setClients(c); localStorage.setItem('alea_clients', JSON.stringify(c)); }
    
    const com = await supabaseService.fetchTable('commesse');
    if (com) { setCommesse(com); localStorage.setItem('alea_commesse', JSON.stringify(com)); }
  };

  const saveToDbAndCloud = async (type: DbTab, data: any[]) => {
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse' };
    
    const key = keys[type];
    const tableName = tables[type];
    
    localStorage.setItem(key, JSON.stringify(data));
    if (type === 'profili') setProfiles(data);
    if (type === 'pannelli') setPanelMaterials(data);
    if (type === 'clienti') setClients(data);
    if (type === 'commesse') setCommesse(data);
    
    if (isConnected) await supabaseService.syncTable(tableName, data);
  };

  const deleteFromDbAndCloud = async (type: DbTab, id: string) => {
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse' };
    const idCols: Record<string, string> = { profili: 'codice', pannelli: 'id', clienti: 'id', commesse: 'id' };
    
    const tableName = tables[type];
    const idCol = idCols[type];
    
    let newData: any[] = [];
    if (type === 'profili') { newData = profiles.filter(p => p.codice !== id); setProfiles(newData); }
    if (type === 'pannelli') { newData = panelMaterials.filter(p => p.id !== id); setPanelMaterials(newData); }
    if (type === 'clienti') { newData = clients.filter(c => c.id !== id); setClients(newData); }
    if (type === 'commesse') { newData = commesse.filter(c => c.id !== id); setCommesse(newData); }
    
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse' };
    localStorage.setItem(keys[type], JSON.stringify(newData));
    if (isConnected) await supabaseService.deleteFromTable(tableName, id, idCol);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.codice || !profileForm.descr) return;
    let updated = isEditing ? profiles.map(p => p.codice === editingId ? profileForm : p) : [profileForm, ...profiles];
    await saveToDbAndCloud('profili', updated);
    setIsAdding(false); setIsEditing(false); setEditingId(null); setProfileForm({ codice: '', descr: '', lungMax: 6000 });
  };

  const handleSavePanel = async () => {
    if (!panelForm.codice || !panelForm.descr) return;
    let updated;
    if (isEditing) {
      updated = panelMaterials.map(p => p.id === editingId ? panelForm : p);
    } else {
      const newPanel = { ...panelForm, id: Math.random().toString(36).substr(2, 9) };
      updated = [newPanel, ...panelMaterials];
    }
    await saveToDbAndCloud('pannelli', updated);
    setIsAdding(false); setIsEditing(false); setEditingId(null); setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan', spessori: '2, 3, 4', lungDefault: 3050, altDefault: 2050 });
  };

  const handleConnectSupabase = async () => {
    const ok = supabaseService.init(sbUrl, sbKey);
    if (ok) {
      localStorage.setItem('alea_sb_url', sbUrl);
      localStorage.setItem('alea_sb_key', sbKey);
      setIsConnected(true);
      
      // Controllo se il cloud è vuoto per fare il primo upload
      const cloudProfiles = await supabaseService.fetchTable('profiles');
      if (!cloudProfiles || cloudProfiles.length === 0) {
        if (confirm("Database Cloud vuoto. Vuoi caricare i tuoi dati locali (Profili, Pannelli, Clienti) sul server ALEA SISTEMI?")) {
          await supabaseService.syncTable('profiles', profiles);
          await supabaseService.syncTable('panel_materials', panelMaterials);
          await supabaseService.syncTable('clients', clients);
          await supabaseService.syncTable('commesse', commesse);
          alert("Sincronizzazione Iniziale completata!");
        }
      }
      
      syncFromCloud();
      alert("Connessione ALEA SISTEMI Cloud stabilita con successo!");
    } else alert("Parametri non validi. Verifica URL e Key.");
  };

  const sqlCode = `-- SCRIPTS SQL PER ALEA SISTEMI V2.7
CREATE TABLE profiles (codice TEXT PRIMARY KEY, descr TEXT NOT NULL, lungMax NUMERIC);
CREATE TABLE panel_materials (id TEXT PRIMARY KEY, codice TEXT NOT NULL, descr TEXT NOT NULL, materiale TEXT, spessori TEXT, lungDefault NUMERIC, altDefault NUMERIC);
CREATE TABLE clients (id TEXT PRIMARY KEY, nome TEXT NOT NULL, note TEXT, dataAggiunta TIMESTAMPTZ DEFAULT now());
CREATE TABLE commesse (id TEXT PRIMARY KEY, numero TEXT NOT NULL, cliente TEXT NOT NULL, data TIMESTAMPTZ DEFAULT now(), tipo TEXT NOT NULL, dettagli JSONB);`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-200"><Database className="w-8 h-8 text-white" /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Archivi ALEA SISTEMI</h2>
            <div className="flex items-center gap-2 mt-0.5">
               <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                 {isConnected ? 'Sincronizzazione Cloud Attiva' : 'Archivio Locale Attivo'}
               </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[600px]">
        <div className="flex border-b border-slate-100 bg-slate-50/30">
          {[ 
            { id: 'profili', label: 'Barre', icon: Database }, 
            { id: 'pannelli', label: 'Pannelli', icon: Square }, 
            { id: 'clienti', label: 'Clienti', icon: Users }, 
            { id: 'commesse', label: 'Commesse', icon: Briefcase }, 
            { id: 'settings', label: 'Setup Cloud', icon: Settings } 
          ].map(tab => (
            <button key={tab.id} onClick={() => { handleTabChange(tab.id as DbTab); setIsAdding(false); setIsEditing(false); }} className={`flex-1 flex items-center justify-center gap-3 py-5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>
          ))}
        </div>

        <div className="p-8 space-y-6">
          {activeTab === 'settings' ? (
            <div className="max-w-4xl mx-auto space-y-12 py-10 animate-in slide-in-from-bottom-4">
               <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100"><Globe className="w-5 h-5 text-blue-600" /><span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">ALEA SISTEMI - BYODB</span></div>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Sincronizzazione Cloud</h3>
                  <p className="text-slate-500 max-w-xl mx-auto leading-relaxed italic">I tuoi dati viaggiano sicuri tra i reparti ALEA SISTEMI.</p>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><CloudSync className="w-32 h-32" /></div>
                    <div className="relative z-10 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Project URL</label>
                          <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs text-blue-300" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Anon Key</label>
                          <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="Incolla chiave..." className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs text-blue-300" />
                        </div>
                      </div>
                      <button onClick={handleConnectSupabase} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95">
                        {isConnected ? <CheckCircle2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                        <span>{isConnected ? 'SISTEMA CONNESSO' : 'ATTIVA CLOUD ALEA'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice SQL per Supabase</span>
                      <button onClick={() => { navigator.clipboard.writeText(sqlCode); alert("SQL Copiato!"); }} className="flex items-center gap-1 text-[9px] font-black text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-all"><Copy className="w-3 h-3" /> COPIA SQL</button>
                    </div>
                    <pre className="text-[9px] font-mono text-slate-500 bg-white p-4 rounded-xl border border-slate-100 overflow-x-auto h-40">{sqlCode}</pre>
                  </div>
               </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" /><input type="text" placeholder={`Cerca in ${activeTab}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-slate-700" /></div>
                {!isAdding && activeTab !== 'commesse' && (<button onClick={() => { setIsAdding(true); setIsEditing(false); }} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl shadow-xl shadow-red-100 font-black flex items-center justify-center gap-3 active:scale-95 transition-all"><Plus className="w-6 h-6" /><span>NUOVO {activeTab.toUpperCase()}</span></button>)}
              </div>
              
              {isAdding && (
                <div className="p-8 rounded-[2rem] border-2 border-dashed border-red-200 bg-slate-50/50 animate-in zoom-in-95 duration-200">
                   <div className="flex justify-between items-center mb-6"><h4 className="font-black uppercase tracking-widest text-sm text-slate-500">NUOVO INSERIMENTO ALEA SISTEMI</h4><button onClick={() => { setIsAdding(false); setIsEditing(false); }} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button></div>
                   
                   {activeTab === 'profili' && (
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Codice</label><input type="text" placeholder="AL-123" value={profileForm.codice} onChange={e=>setProfileForm({...profileForm, codice: e.target.value.toUpperCase()})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black focus:ring-2 focus:ring-red-500 outline-none" /></div>
                        <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Descrizione</label><input type="text" placeholder="Profilo..." value={profileForm.descr} onChange={e=>setProfileForm({...profileForm, descr: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-red-500 outline-none" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">L. Std (mm)</label><input type="number" value={profileForm.lungMax || 6000} onChange={e=>setProfileForm({...profileForm, lungMax: parseFloat(e.target.value)})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black text-red-600 focus:ring-2 focus:ring-red-500 outline-none" /></div>
                        <div className="flex items-end"><button onClick={handleSaveProfile} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-xl shadow-lg">SALVA</button></div>
                     </div>
                   )}

                   {activeTab === 'pannelli' && (
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cod. Lastra</label><input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black outline-none" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Materiale</label><select value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold outline-none"><option>Lexan</option><option>Dibond</option><option>Alveolare</option><option>Pvc</option><option>Vetro</option></select></div>
                        <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Spessori Disponibili (separati da virgola)</label><input type="text" placeholder="2, 3, 4, 10" value={panelForm.spessori} onChange={e=>setPanelForm({...panelForm, spessori: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-mono text-xs outline-none" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">L. Std (mm)</label><input type="number" value={panelForm.lungDefault} onChange={e=>setPanelForm({...panelForm, lungDefault: parseFloat(e.target.value)})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black outline-none" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">A. Std (mm)</label><input type="number" value={panelForm.altDefault} onChange={e=>setPanelForm({...panelForm, altDefault: parseFloat(e.target.value)})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black outline-none" /></div>
                        <div className="md:col-span-2 flex items-end"><button onClick={handleSavePanel} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-xl shadow-lg">SALVA LASTRA</button></div>
                     </div>
                   )}
                </div>
              )}

              <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                       <tr>
                          {activeTab === 'profili' && <><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">L. Std</th></>}
                          {activeTab === 'pannelli' && <><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Materiale</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Spessori</th></>}
                          {activeTab === 'commesse' && <><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rif.</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th></>}
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Azioni</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {activeTab === 'profili' && profiles.filter(p => p.codice.includes(searchTerm.toUpperCase())).map(p => (
                          <tr key={p.codice} className="group hover:bg-slate-50/80 transition-all"><td className="px-6 py-5 font-black text-xs">{p.codice}</td><td className="px-6 py-5 text-sm font-bold text-slate-600">{p.descr}</td><td className="px-6 py-5 text-center font-mono font-black text-red-600 text-xs">{p.lungMax || 6000} mm</td><td className="px-6 py-5 text-center"><button onClick={()=>deleteFromDbAndCloud('profili', p.codice)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td></tr>
                       ))}
                       {activeTab === 'pannelli' && panelMaterials.filter(p => p.codice.includes(searchTerm.toUpperCase())).map(p => (
                          <tr key={p.id} className="group hover:bg-slate-50/80 transition-all"><td className="px-6 py-5 font-black text-xs text-blue-600">{p.codice}</td><td className="px-6 py-5 text-sm font-bold text-slate-600">{p.materiale}</td><td className="px-6 py-5 text-center font-mono font-black text-slate-400 text-[10px]">{p.spessori} mm</td><td className="px-6 py-5 text-center"><button onClick={()=>deleteFromDbAndCloud('pannelli', p.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td></tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
