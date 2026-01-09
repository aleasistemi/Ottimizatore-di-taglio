
import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Users, Briefcase, Globe, Settings, CheckCircle2, ShieldCheck, Copy, Square, CloudUpload, CloudDownload, RefreshCw, LogOut, AlertCircle, Info, ExternalLink, Calendar, Eye, Activity, Ruler, Maximize, RotateCw } from 'lucide-react';
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

  // Forms states
  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  const [clientForm, setClientForm] = useState<Client>({ id: '', nome: '', note: '', dataAggiunta: new Date().toISOString() });

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
    if (savedCom) {
      const parsed = JSON.parse(savedCom);
      setCommesse(parsed.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()));
    }
  };

  useEffect(() => {
    if (forcedTab) setActiveTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    loadLocalData();
    setIsConnected(supabaseService.isInitialized());

    const handleGlobalDataUpdate = () => {
      loadLocalData();
      setIsConnected(supabaseService.isInitialized());
    };

    window.addEventListener('alea_data_updated', handleGlobalDataUpdate);
    return () => window.removeEventListener('alea_data_updated', handleGlobalDataUpdate);
  }, []);

  const handleTabChange = (tab: DbTab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
    setIsAdding(false);
    setIsEditing(false);
    loadLocalData();
  };

  const syncManual = async () => {
    setIsSyncing(true);
    try {
      const tables = ['profiles', 'panel_materials', 'clients', 'commesse'];
      const storageKeys: Record<string, string> = {
        'profiles': 'alea_profiles',
        'panel_materials': 'alea_panel_materials',
        'clients': 'alea_clients',
        'commesse': 'alea_commesse'
      };

      for (const table of tables) {
        const data = await supabaseService.fetchTable(table);
        if (data) localStorage.setItem(storageKeys[table], JSON.stringify(data));
      }
      loadLocalData();
      alert("Sincronizzazione completata!");
    } catch (e: any) {
      alert("Errore sincronizzazione: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectSupabase = async () => {
    if (!sbUrl || !sbKey) return alert("Inserisci credenziali");
    const ok = supabaseService.init(sbUrl, sbKey);
    if (ok) {
      localStorage.setItem('alea_sb_url', sbUrl);
      localStorage.setItem('alea_sb_key', sbKey);
      setIsConnected(true);
      await syncManual();
    } else alert("URL non valido.");
  };

  const saveToDbAndCloud = async (type: DbTab, data: any[]) => {
    // Comunica ad App.tsx che abbiamo fatto una modifica locale, per bloccare la sync in entrata temporaneamente
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse' };
    
    localStorage.setItem(keys[type], JSON.stringify(data));
    if (isConnected) {
        try { await supabaseService.syncTable(tables[type], data); } catch (e) {
          console.error("Errore sync cloud:", e);
        }
    }
    loadLocalData();
  };

  const deleteItem = async (type: DbTab, id: string) => {
    if (!confirm("Eliminare definitivamente?")) return;
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse' };
    const idCols: Record<string, string> = { profili: 'codice', pannelli: 'id', clienti: 'id', commesse: 'id' };
    
    let newData: any[] = [];
    if (type === 'profili') newData = profiles.filter(p => p.codice !== id);
    if (type === 'pannelli') newData = panelMaterials.filter(p => p.id !== id);
    if (type === 'clienti') newData = clients.filter(c => c.id !== id);
    if (type === 'commesse') newData = commesse.filter(c => c.id !== id);
    
    await saveToDbAndCloud(type, newData);
    if (isConnected) await supabaseService.deleteFromTable(tables[type], id, idCols[type]);
  };

  const editItem = (type: DbTab, item: any) => {
    setIsEditing(true);
    setIsAdding(true);
    if (type === 'profili') setProfileForm(item);
    if (type === 'pannelli') setPanelForm(item);
    if (type === 'clienti') setClientForm(item);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.codice) return;
    const updated = [profileForm, ...profiles.filter(p => p.codice !== profileForm.codice)];
    await saveToDbAndCloud('profili', updated);
    setIsAdding(false); setIsEditing(false); setProfileForm({ codice: '', descr: '', lungMax: 6000 });
  };

  const handleSavePanelMaterial = async () => {
    if (!panelForm.codice) return;
    const newId = panelForm.id || Math.random().toString(36).substr(2, 9);
    const updated = [{ ...panelForm, id: newId }, ...panelMaterials.filter(p => p.id !== newId)];
    await saveToDbAndCloud('pannelli', updated);
    setIsAdding(false); setIsEditing(false); setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  };

  const handleSaveClient = async () => {
    if (!clientForm.nome) return;
    const newId = clientForm.id || Math.random().toString(36).substr(2, 9);
    const updated = [{ ...clientForm, id: newId }, ...clients.filter(c => c.id !== newId)];
    await saveToDbAndCloud('clienti', updated);
    setIsAdding(false); setIsEditing(false); setClientForm({ id: '', nome: '', note: '', dataAggiunta: new Date().toISOString() });
  };

  const sqlCode = `-- SQL ALEA SISTEMI V4.6
CREATE TABLE IF NOT EXISTS profiles (codice TEXT PRIMARY KEY, descr TEXT NOT NULL, "lungMax" NUMERIC);
CREATE TABLE IF NOT EXISTS panel_materials (id TEXT PRIMARY KEY, codice TEXT NOT NULL, descr TEXT NOT NULL, materiale TEXT, "lungDefault" NUMERIC, "altDefault" NUMERIC, "giraPezzoDefault" BOOLEAN);
CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, nome TEXT NOT NULL, note TEXT, "dataAggiunta" TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS commesse (id TEXT PRIMARY KEY, numero TEXT NOT NULL, cliente TEXT NOT NULL, tipo TEXT NOT NULL, data TIMESTAMPTZ DEFAULT now(), dettagli JSONB);

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE panel_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE commesse DISABLE ROW LEVEL SECURITY;`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-200"><Database className="w-8 h-8 text-white" /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Archivi Centrali ALEA</h2>
            <div className="flex items-center gap-3 mt-1">
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isConnected ? 'Sincronizzazione Cloud Attiva' : 'Archivio Locale'}</span>
               </div>
            </div>
          </div>
        </div>
        {isConnected && (
            <button onClick={syncManual} disabled={isSyncing} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[10px] font-black uppercase px-6 py-3 rounded-2xl transition-all disabled:opacity-50">
                <CloudDownload className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-bounce' : ''}`} />
                Aggiorna Ora
            </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[600px]">
        <div className="flex border-b border-slate-100 bg-slate-50/30 overflow-x-auto scrollbar-hide">
          {[ 
            { id: 'profili', label: 'Catalogo Profili', icon: Database }, 
            { id: 'pannelli', label: 'Catalogo Pannelli', icon: Square }, 
            { id: 'clienti', label: 'Anagrafica Clienti', icon: Users }, 
            { id: 'commesse', label: 'Archivio Commesse', icon: Briefcase }, 
            { id: 'settings', label: 'Configurazione Cloud', icon: Settings } 
          ].map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id as DbTab)} className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-6 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>
          ))}
        </div>

        <div className="p-8 space-y-6">
          {activeTab === 'settings' ? (
             <div className="max-w-4xl mx-auto py-10 space-y-12">
                <div className="text-center space-y-4">
                   <h3 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Setup Cloud</h3>
                   <p className="text-slate-500 font-medium italic">Condividi i dati tra ufficio e officina.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white shadow-2xl space-y-8">
                      <div className="space-y-4">
                        <h4 className="flex items-center gap-3 text-xs font-black uppercase text-blue-400"><ExternalLink className="w-5 h-5" /> 1. Registrazione</h4>
                        <a href="https://supabase.com" target="_blank" className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl text-xs uppercase">SUPABASE.COM</a>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-slate-800">
                        <h4 className="flex items-center gap-3 text-xs font-black uppercase text-red-500"><Settings className="w-5 h-5" /> 2. Credenziali</h4>
                        <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="URL Progetto..." className="w-full px-5 py-4 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 outline-none" />
                        <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="Anon Key..." className="w-full px-5 py-4 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 outline-none" />
                        <div className="grid grid-cols-2 gap-3">
                           <button onClick={handleConnectSupabase} className="bg-blue-600 text-white font-black py-4 rounded-2xl transition-all active:scale-95">COLLEGA</button>
                           <button onClick={() => { supabaseService.disconnect(); setIsConnected(false); }} className="bg-red-600 text-white font-black py-4 rounded-2xl transition-all active:scale-95">SCOLLEGA</button>
                        </div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-[3rem] border border-slate-200">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SQL Editor Script</span>
                           <button onClick={() => { navigator.clipboard.writeText(sqlCode); alert("Copiato!"); }} className="text-[10px] font-black text-blue-600">COPIA SQL</button>
                         </div>
                         <pre className="text-[9px] font-mono text-slate-400 bg-white p-4 rounded-2xl border h-40 overflow-y-auto">{sqlCode}</pre>
                      </div>
                   </div>
                </div>
             </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" /><input type="text" placeholder={`Cerca in ${activeTab}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-bold" /></div>
                {!isAdding && activeTab !== 'commesse' && (
                  <button onClick={() => { setIsAdding(true); setIsEditing(false); }} className="w-full md:w-auto bg-red-600 text-white px-10 py-5 rounded-3xl shadow-xl font-black flex items-center justify-center gap-3">
                    <Plus className="w-6 h-6" /> AGGIUNGI
                  </button>
                )}
              </div>

              {isAdding && (
                <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-red-200 bg-slate-50/50 animate-in zoom-in-95 duration-200">
                   <h4 className="text-xs font-black uppercase text-red-600 mb-4 tracking-widest">{isEditing ? 'MODIFICA ELEMENTO' : 'NUOVO ELEMENTO'}</h4>
                   {activeTab === 'profili' && (
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Codice</label><input type="text" value={profileForm.codice} onChange={e=>setProfileForm({...profileForm, codice: e.target.value.toUpperCase()})} disabled={isEditing} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-black disabled:bg-slate-100" /></div>
                        <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Descrizione</label><input type="text" value={profileForm.descr} onChange={e=>setProfileForm({...profileForm, descr: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Lunghezza Std (mm)</label><input type="number" value={profileForm.lungMax || ''} onChange={e=>setProfileForm({...profileForm, lungMax: parseInt(e.target.value) || 6000})} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div className="md:col-span-4 flex justify-end gap-2 pt-2"><button onClick={handleSaveProfile} className="bg-red-600 text-white font-black px-10 py-3 rounded-xl">SALVA</button><button onClick={()=>{setIsAdding(false); setIsEditing(false);}} className="bg-slate-200 p-3 rounded-xl"><X className="w-5 h-5"/></button></div>
                     </div>
                   )}
                   {activeTab === 'pannelli' && (
                     <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Codice</label><input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-black" /></div>
                        <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Materiale</label><input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Base Std (mm)</label><input type="number" value={panelForm.lungDefault} onChange={e=>setPanelForm({...panelForm, lungDefault: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Altezza Std (mm)</label><input type="number" value={panelForm.altDefault} onChange={e=>setPanelForm({...panelForm, altDefault: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div className="flex flex-col justify-end pb-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Rotabile</label>
                          <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-xl border border-slate-200">
                             <input type="checkbox" checked={panelForm.giraPezzoDefault} onChange={e=>setPanelForm({...panelForm, giraPezzoDefault: e.target.checked})} className="w-4 h-4 text-red-600" />
                             <span className="text-[10px] font-bold uppercase text-slate-500">SÌ</span>
                          </label>
                        </div>
                        <div className="flex items-end gap-2"><button onClick={handleSavePanelMaterial} className="flex-1 bg-red-600 text-white font-black py-3 rounded-xl">SALVA</button><button onClick={()=>{setIsAdding(false); setIsEditing(false);}} className="bg-slate-200 p-3 rounded-xl"><X className="w-5 h-5"/></button></div>
                     </div>
                   )}
                   {activeTab === 'clienti' && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Ragione Sociale</label><input type="text" value={clientForm.nome} onChange={e=>setClientForm({...clientForm, nome: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-black" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Note</label><input type="text" value={clientForm.note} onChange={e=>setClientForm({...clientForm, note: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div className="flex items-end gap-2"><button onClick={handleSaveClient} className="flex-1 bg-red-600 text-white font-black py-3 rounded-xl">SALVA</button><button onClick={()=>{setIsAdding(false); setIsEditing(false);}} className="bg-slate-200 p-3 rounded-xl"><X className="w-5 h-5"/></button></div>
                     </div>
                   )}
                </div>
              )}

              <div className="overflow-x-auto rounded-[2.5rem] border border-slate-100 shadow-lg">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                       <tr>
                          {activeTab === 'profili' && <><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">L. Std</th></>}
                          {activeTab === 'pannelli' && <><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Materiale</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Gira Pezzo</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Misure Std</th></>}
                          {activeTab === 'clienti' && <><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Note</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggiunto</th></>}
                          {activeTab === 'commesse' && <><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rif.</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th></>}
                          <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Azioni</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {activeTab === 'profili' && profiles.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                          <tr key={p.codice} className="hover:bg-slate-50/80 transition-all font-bold group">
                             <td className="px-8 py-6 text-xs font-black text-slate-900">{p.codice}</td>
                             <td className="px-8 py-6 text-sm text-slate-600">{p.descr}</td>
                             <td className="px-8 py-6 text-center text-red-600 font-black text-xs">{p.lungMax || 6000} mm</td>
                             <td className="px-8 py-6 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={()=>editItem('profili', p)} className="p-3 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 className="w-5 h-5" /></button>
                                  <button onClick={()=>deleteItem('profili', p.codice)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {activeTab === 'pannelli' && panelMaterials.filter(p=>p.codice.includes(searchTerm.toUpperCase()) || p.materiale.includes(searchTerm)).map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-all font-bold group">
                             <td className="px-8 py-6 text-xs font-black text-slate-900">{p.codice}</td>
                             <td className="px-8 py-6 text-sm text-blue-600">{p.materiale}</td>
                             <td className="px-8 py-6 text-center"><RotateCw className={`w-4 h-4 mx-auto ${p.giraPezzoDefault ? 'text-green-500' : 'text-slate-200'}`} /></td>
                             <td className="px-8 py-6 text-center text-red-600 font-black text-xs">{p.lungDefault} x {p.altDefault} mm</td>
                             <td className="px-8 py-6 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={()=>editItem('pannelli', p)} className="p-3 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 className="w-5 h-5" /></button>
                                  <button onClick={()=>deleteItem('pannelli', p.id)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {activeTab === 'clienti' && clients.filter(c=>c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 font-bold group">
                             <td className="px-8 py-6 text-sm font-black text-slate-900">{c.nome}</td>
                             <td className="px-8 py-6 text-sm text-slate-500 font-normal">{c.note || '-'}</td>
                             <td className="px-8 py-6 text-center text-[10px] text-slate-400 font-black"><Calendar className="w-3 h-3 inline mr-1" />{new Date(c.dataAggiunta).toLocaleDateString()}</td>
                             <td className="px-8 py-6 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={()=>editItem('clienti', c)} className="p-3 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 className="w-5 h-5" /></button>
                                  <button onClick={()=>deleteItem('clienti', c.id)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {activeTab === 'commesse' && commesse.filter(c=>c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || c.numero.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 font-bold group">
                             <td className="px-8 py-6 text-[10px] text-slate-400 font-black uppercase tracking-tighter">{new Date(c.data).toLocaleString()}</td>
                             <td className="px-8 py-6 text-sm font-black text-slate-800">{c.cliente}</td>
                             <td className="px-8 py-6 text-sm text-red-600 font-black uppercase tracking-tighter">{c.numero}</td>
                             <td className="px-8 py-6 text-center"><span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full ${c.tipo === 'barre' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{c.tipo}</span></td>
                             <td className="px-8 py-6 text-center flex items-center justify-center gap-2">
                                <button onClick={()=>onOpenCommessa?.(c)} className="p-4 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-95"><Eye className="w-6 h-6" /></button>
                                <button onClick={()=>deleteItem('commesse', c.id)} className="p-4 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-6 h-6" /></button>
                             </td>
                          </tr>
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
