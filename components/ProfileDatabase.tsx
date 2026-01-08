
import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Users, Briefcase, CloudSync, Globe, Settings, CheckCircle2, ShieldCheck, Copy, Square, CloudUpload, CloudDownload, RefreshCw, LogOut, AlertCircle, Info } from 'lucide-react';
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
    else {
      const defaults: PanelMaterial[] = [
        { id: 'p1', codice: 'LEX2', descr: 'Lexan 2mm', materiale: 'Lexan', spessori: '2, 3', lungDefault: 3050, altDefault: 2050 }
      ];
      setPanelMaterials(defaults);
      localStorage.setItem('alea_panel_materials', JSON.stringify(defaults));
    }
    
    const savedC = localStorage.getItem('alea_clients');
    if (savedC) setClients(JSON.parse(savedC));
    const savedCom = localStorage.getItem('alea_commesse');
    if (savedCom) setCommesse(JSON.parse(savedCom));
  };

  const syncFromCloud = async () => {
    if (!supabaseService.isInitialized()) return;
    if (!confirm("Vuoi scaricare i dati dal Cloud? Questo sovrascriverà i dati locali su questo computer.")) return;
    
    setIsSyncing(true);
    try {
      const p = await supabaseService.fetchTable('profiles');
      if (p) { setProfiles(p); localStorage.setItem('alea_profiles', JSON.stringify(p)); }
      
      const pan = await supabaseService.fetchTable('panel_materials');
      if (pan) { setPanelMaterials(pan); localStorage.setItem('alea_panel_materials', JSON.stringify(pan)); }

      const c = await supabaseService.fetchTable('clients');
      if (c) { setClients(c); localStorage.setItem('alea_clients', JSON.stringify(c)); }
      
      const com = await supabaseService.fetchTable('commesse');
      if (com) { setCommesse(com); localStorage.setItem('alea_commesse', JSON.stringify(com)); }
      alert("Sincronizzazione dal Cloud completata!");
    } catch (e: any) {
      alert("Errore download: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const pushToCloud = async () => {
    if (!isConnected) return;
    if (!confirm("Caricare i dati locali sul Cloud? Se mancano colonne, assicurati di aver eseguito il nuovo script SQL.")) return;
    
    setIsSyncing(true);
    try {
      if (profiles.length > 0) await supabaseService.syncTable('profiles', profiles);
      if (panelMaterials.length > 0) await supabaseService.syncTable('panel_materials', panelMaterials);
      if (clients.length > 0) await supabaseService.syncTable('clients', clients);
      if (commesse.length > 0) await supabaseService.syncTable('commesse', commesse);
      alert("Caricamento Cloud completato con successo!");
    } catch (e: any) {
      alert("ERRORE SCHEΜΑ CLOUD: " + e.message + "\n\nAssicurati di aver eseguito il codice SQL dal pannello Setup.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    if (!confirm("Scollegare il Cloud? I dati locali non verranno toccati.")) return;
    supabaseService.disconnect();
    localStorage.removeItem('alea_sb_url');
    localStorage.removeItem('alea_sb_key');
    setSbUrl('');
    setSbKey('');
    setIsConnected(false);
    alert("Scollegato.");
  };

  const handleResetDefaults = () => {
    if (!confirm("RESET TOTALE: Perderai tutti i dati locali. Sei sicuro?")) return;
    localStorage.clear();
    window.location.reload();
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
    
    if (isConnected) {
        try { await supabaseService.syncTable(tableName, data); } 
        catch (e: any) { console.error("Auto-sync Cloud fallito: " + e.message); }
    }
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
    setIsAdding(false); setIsEditing(false); setEditingId(null); 
    setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan', spessori: '2, 3, 4', lungDefault: 3050, altDefault: 2050 });
  };

  const startEditProfile = (p: Profile) => {
    setProfileForm(p);
    setEditingId(p.codice);
    setIsEditing(true);
    setIsAdding(true);
  };

  const startEditPanel = (p: PanelMaterial) => {
    setPanelForm(p);
    setEditingId(p.id);
    setIsEditing(true);
    setIsAdding(true);
  };

  const handleConnectSupabase = async () => {
    const ok = supabaseService.init(sbUrl, sbKey);
    if (ok) {
      localStorage.setItem('alea_sb_url', sbUrl);
      localStorage.setItem('alea_sb_key', sbKey);
      setIsConnected(true);
      alert("Collegato con successo al Cloud ALEA SISTEMI!");
    } else alert("Parametri non validi. Controlla l'URL del progetto.");
  };

  const sqlCode = `-- SQL ALEA SISTEMI V4.2 (MIGRAZIONE SICURA)
-- 1. Crea tabelle se non esistono
CREATE TABLE IF NOT EXISTS profiles (codice TEXT PRIMARY KEY, descr TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS panel_materials (id TEXT PRIMARY KEY, codice TEXT NOT NULL, descr TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, nome TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS commesse (id TEXT PRIMARY KEY, numero TEXT NOT NULL, cliente TEXT NOT NULL, tipo TEXT NOT NULL);

-- 2. Aggiunge colonne mancanti
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "lungMax" NUMERIC;
ALTER TABLE panel_materials ADD COLUMN IF NOT EXISTS materiale TEXT;
ALTER TABLE panel_materials ADD COLUMN IF NOT EXISTS spessori TEXT;
ALTER TABLE panel_materials ADD COLUMN IF NOT EXISTS "lungDefault" NUMERIC;
ALTER TABLE panel_materials ADD COLUMN IF NOT EXISTS "altDefault" NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "dataAggiunta" TIMESTAMPTZ DEFAULT now();
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS data TIMESTAMPTZ DEFAULT now();
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS dettagli JSONB;

-- 3. Disabilita RLS per accesso libero tra reparti
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
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Archivi ALEA SISTEMI</h2>
            <div className="flex items-center gap-2 mt-0.5">
               <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                 {isConnected ? (isSyncing ? 'Sincronizzazione...' : 'Cloud Attivo') : 'Solo Archivio Locale'}
               </span>
            </div>
          </div>
        </div>
        
        {isConnected && (
            <div className="flex gap-2">
                <button onClick={syncFromCloud} disabled={isSyncing} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all disabled:opacity-50">
                    <CloudDownload className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-bounce' : ''}`} />
                    <span>Scarica dal Cloud</span>
                </button>
                <button onClick={pushToCloud} disabled={isSyncing} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-lg transition-all disabled:opacity-50">
                    <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                    <span>Upload sul Cloud</span>
                </button>
            </div>
        )}
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
            <div className="max-w-4xl mx-auto space-y-12 py-10">
               <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100"><Globe className="w-5 h-5 text-blue-600" /><span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Sincronizzazione Centrale</span></div>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Collegamento Supabase</h3>
                  <p className="text-slate-500 max-w-xl mx-auto leading-relaxed italic">Segui le istruzioni qui sotto per collegare correttamente l'app al database aziendale.</p>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                        <h4 className="flex items-center gap-2 text-xs font-black uppercase text-blue-400 mb-3"><Info className="w-4 h-4" /> Dove trovare i dati:</h4>
                        <ol className="text-[11px] space-y-2 text-slate-300 list-decimal pl-4 font-bold">
                          <li>Accedi a Supabase e vai in <span className="text-white">Project Settings</span>.</li>
                          <li>Clicca su <span className="text-white">Data API</span> per copiare l'<span className="text-blue-400">URL del Progetto</span>.</li>
                          <li>Clicca su <span className="text-white">API</span> per trovare le <span className="text-white">Project API Keys</span>.</li>
                          <li>Copia la chiave di tipo <span className="text-red-400">anon / public</span>.</li>
                        </ol>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Project URL (da Data API)</label>
                          <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Anon Key (da API Keys)</label>
                          <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="Chiave anonima..." className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleConnectSupabase} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3">
                          {isConnected ? <CheckCircle2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                          <span>{isConnected ? 'ATTIVO' : 'COLLEGA'}</span>
                        </button>
                        <button onClick={handleDisconnect} disabled={!isConnected} className="bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-30">
                          <LogOut className="w-6 h-6" />
                          <span>SCOLLEGA</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Script SQL per Database</span>
                        <button onClick={() => { navigator.clipboard.writeText(sqlCode); alert("SQL Copiato!"); }} className="flex items-center gap-1 text-[9px] font-black text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-all"><Copy className="w-3 h-3" /> COPIA SQL</button>
                      </div>
                      <div className="flex items-start gap-2 bg-yellow-50 p-2 rounded-lg border border-yellow-100 mb-2">
                         <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
                         <p className="text-[8px] text-yellow-800 font-bold uppercase">Nota: Esegui questo script se riscontri errori di permessi.</p>
                      </div>
                      <pre className="text-[9px] font-mono text-slate-500 bg-white p-4 rounded-xl border border-slate-100 overflow-x-auto h-32">{sqlCode}</pre>
                    </div>
                    <button onClick={handleResetDefaults} className="w-full flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-[1.5rem] border border-red-200 transition-all text-xs uppercase tracking-widest">
                        <RefreshCw className="w-4 h-4" /> Reset Totale App
                    </button>
                  </div>
               </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" /><input type="text" placeholder={`Cerca in ${activeTab}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" /></div>
                {!isAdding && activeTab !== 'commesse' && (<button onClick={() => { setIsAdding(true); setIsEditing(false); setEditingId(null); }} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl shadow-xl font-black flex items-center justify-center gap-3 transition-all"><Plus className="w-6 h-6" /><span>AGGIUNGI</span></button>)}
              </div>
              
              {isAdding && (
                <div className="p-8 rounded-[2rem] border-2 border-dashed border-red-200 bg-slate-50/50 animate-in zoom-in-95 duration-200">
                   <div className="flex justify-between items-center mb-6"><h4 className="font-black uppercase tracking-widest text-sm text-slate-500">{isEditing ? 'MODIFICA' : 'NUOVO'} ELEMENTO</h4><button onClick={() => { setIsAdding(false); setIsEditing(false); setEditingId(null); }} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button></div>
                   
                   {activeTab === 'profili' && (
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Codice</label><input type="text" value={profileForm.codice} onChange={e=>setProfileForm({...profileForm, codice: e.target.value.toUpperCase()})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black" /></div>
                        <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Descrizione</label><input type="text" value={profileForm.descr} onChange={e=>setProfileForm({...profileForm, descr: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">L. Std (mm)</label><input type="number" value={profileForm.lungMax || 6000} onChange={e=>setProfileForm({...profileForm, lungMax: parseFloat(e.target.value)})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black text-red-600" /></div>
                        <div className="flex items-end"><button onClick={handleSaveProfile} className="w-full bg-red-600 text-white font-black py-3.5 rounded-xl shadow-lg">{isEditing ? 'AGGIORNA' : 'SALVA'}</button></div>
                     </div>
                   )}

                   {activeTab === 'pannelli' && (
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cod. Lastra</label><input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Descrizione</label><input type="text" value={panelForm.descr} onChange={e=>setPanelForm({...panelForm, descr: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Materiale</label><input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Spessori</label><input type="text" value={panelForm.spessori} onChange={e=>setPanelForm({...panelForm, spessori: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-mono text-xs" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">L. Std (mm)</label><input type="number" value={panelForm.lungDefault} onChange={e=>setPanelForm({...panelForm, lungDefault: parseFloat(e.target.value)})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">A. Std (mm)</label><input type="number" value={panelForm.altDefault} onChange={e=>setPanelForm({...panelForm, altDefault: parseFloat(e.target.value)})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black" /></div>
                        <div className="md:col-span-2 flex items-end"><button onClick={handleSavePanel} className="w-full bg-red-600 text-white font-black py-3.5 rounded-xl shadow-lg">{isEditing ? 'AGGIORNA' : 'SALVA'}</button></div>
                     </div>
                   )}
                </div>
              )}

              <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                       <tr>
                          {activeTab === 'profili' && <><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">L. Std</th></>}
                          {activeTab === 'pannelli' && <><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Misure Default</th></>}
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Azioni</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {activeTab === 'profili' && profiles.filter(p => p.codice.includes(searchTerm.toUpperCase())).map(p => (
                          <tr key={p.codice} className="group hover:bg-slate-50/80 transition-all">
                             <td className="px-6 py-5 font-black text-xs">{p.codice}</td>
                             <td className="px-6 py-5 text-sm font-bold text-slate-600">{p.descr}</td>
                             <td className="px-6 py-5 text-center font-mono font-black text-red-600 text-xs">{p.lungMax || 6000} mm</td>
                             <td className="px-6 py-5 text-center flex items-center justify-center gap-2">
                                <button onClick={()=>startEditProfile(p)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={()=>deleteFromDbAndCloud('profili', p.codice)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                             </td>
                          </tr>
                       ))}
                       {activeTab === 'pannelli' && panelMaterials.filter(p => p.codice.includes(searchTerm.toUpperCase())).map(p => (
                          <tr key={p.id} className="group hover:bg-slate-50/80 transition-all">
                             <td className="px-6 py-5 font-black text-xs text-blue-600">{p.codice}</td>
                             <td className="px-6 py-5 text-sm font-bold text-slate-600">{p.descr}</td>
                             <td className="px-6 py-5 text-center font-mono font-black text-slate-400 text-[10px]">{p.lungDefault}x{p.altDefault} mm</td>
                             <td className="px-6 py-5 text-center flex items-center justify-center gap-2">
                                <button onClick={()=>startEditPanel(p)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={()=>deleteFromDbAndCloud('pannelli', p.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
