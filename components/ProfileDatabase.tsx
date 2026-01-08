import React, { useState, useEffect, useRef } from 'react';
import { Database, Plus, Search, Trash2, Edit3, X, Users, Briefcase, Globe, Settings, CheckCircle2, ShieldCheck, Copy, Square, CloudUpload, CloudDownload, RefreshCw, LogOut, AlertCircle, Info, ExternalLink, Calendar, Eye, Activity } from 'lucide-react';
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
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [panelMaterials, setPanelMaterials] = useState<PanelMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commesse, setCommesse] = useState<CommessaArchiviata[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan', spessori: '2, 3, 4', lungDefault: 3050, altDefault: 2050 });
  const [clientForm, setClientForm] = useState<Client>({ id: '', nome: '', note: '', dataAggiunta: new Date().toISOString() });

  // Fix: Replaced NodeJS.Timeout with any to avoid namespace errors in browser environments
  const syncIntervalRef = useRef<any>(null);

  useEffect(() => {
    loadLocalData();
    const initialized = supabaseService.isInitialized();
    setIsConnected(initialized);
    
    if (initialized) {
      syncFromCloud(true); // Sincronizzazione iniziale silenziosa
    }

    // Configura polling automatico ogni 30 secondi se collegato
    syncIntervalRef.current = setInterval(() => {
      if (supabaseService.isInitialized()) {
        syncFromCloud(true);
      }
    }, 30000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
        syncFromCloud(true);
    }
  }, [isConnected]);

  const handleTabChange = (tab: DbTab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
    loadLocalData();
    if (isConnected && tab !== 'settings') syncFromCloud(true);
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

  const syncFromCloud = async (silent: boolean = false) => {
    if (!supabaseService.isInitialized()) return;
    if (!silent) setIsSyncing(true);
    
    try {
      const p = await supabaseService.fetchTable('profiles');
      if (p) { setProfiles(p); localStorage.setItem('alea_profiles', JSON.stringify(p)); }
      
      const pan = await supabaseService.fetchTable('panel_materials');
      if (pan) { setPanelMaterials(pan); localStorage.setItem('alea_panel_materials', JSON.stringify(pan)); }

      const c = await supabaseService.fetchTable('clients');
      if (c) { setClients(c); localStorage.setItem('alea_clients', JSON.stringify(c)); }
      
      const com = await supabaseService.fetchTable('commesse');
      if (com) { 
        // Ordina le commesse per data decrescente
        const sortedCom = com.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setCommesse(sortedCom); 
        localStorage.setItem('alea_commesse', JSON.stringify(sortedCom)); 
      }
      
      setLastSync(new Date());
      if (!silent) alert("Sincronizzazione completata!");
    } catch (e: any) {
      if (!silent) alert("Errore download: " + e.message);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const pushToCloud = async () => {
    if (!isConnected) return;
    setIsSyncing(true);
    try {
      if (profiles.length > 0) await supabaseService.syncTable('profiles', profiles);
      if (panelMaterials.length > 0) await supabaseService.syncTable('panel_materials', panelMaterials);
      if (clients.length > 0) await supabaseService.syncTable('clients', clients);
      if (commesse.length > 0) await supabaseService.syncTable('commesse', commesse);
      alert("Dati caricati sul Cloud!");
      setLastSync(new Date());
    } catch (e: any) {
      alert("Errore caricamento: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectSupabase = async () => {
    const ok = supabaseService.init(sbUrl, sbKey);
    if (ok) {
      localStorage.setItem('alea_sb_url', sbUrl);
      localStorage.setItem('alea_sb_key', sbKey);
      setIsConnected(true);
      await syncFromCloud(true);
      alert("Collegato con successo!");
    } else alert("URL non valido.");
  };

  const saveToDbAndCloud = async (type: DbTab, data: any[]) => {
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse' };
    localStorage.setItem(keys[type], JSON.stringify(data));
    if (isConnected) {
        try { await supabaseService.syncTable(tables[type], data); } catch (e) {}
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

  const handleSaveClient = async () => {
    if (!clientForm.nome) return;
    let updated;
    if (isEditing) {
      updated = clients.map(c => c.id === editingId ? clientForm : c);
    } else {
      const newClient = { ...clientForm, id: Math.random().toString(36).substr(2, 9), dataAggiunta: new Date().toISOString() };
      updated = [newClient, ...clients];
    }
    await saveToDbAndCloud('clienti', updated);
    setIsAdding(false); setIsEditing(false); setEditingId(null); setClientForm({ id: '', nome: '', note: '', dataAggiunta: '' });
  };

  const sqlCode = `-- SQL ALEA SISTEMI V4.4
CREATE TABLE IF NOT EXISTS profiles (codice TEXT PRIMARY KEY, descr TEXT NOT NULL, "lungMax" NUMERIC);
CREATE TABLE IF NOT EXISTS panel_materials (id TEXT PRIMARY KEY, codice TEXT NOT NULL, descr TEXT NOT NULL, materiale TEXT, spessori TEXT, "lungDefault" NUMERIC, "altDefault" NUMERIC);
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
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Gestione Database Centrale</h2>
            <div className="flex items-center gap-4 mt-0.5">
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isConnected ? 'Cloud Attivo' : 'Offline'}</span>
               </div>
               {lastSync && (
                 <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                   <Activity className="w-3 h-3" />
                   Sincronizzato: {lastSync.toLocaleTimeString()}
                 </div>
               )}
            </div>
          </div>
        </div>
        {isConnected && (
            <div className="flex gap-2">
                <button onClick={() => syncFromCloud(false)} disabled={isSyncing} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[10px] font-black uppercase px-5 py-3 rounded-2xl transition-all">
                  <CloudDownload className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-bounce' : ''}`} />
                  Forza Download
                </button>
                <button onClick={pushToCloud} disabled={isSyncing} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase px-5 py-3 rounded-2xl shadow-lg transition-all">
                  <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  Forza Upload
                </button>
            </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[600px]">
        <div className="flex border-b border-slate-100 bg-slate-50/30 overflow-x-auto">
          {[ 
            { id: 'profili', label: 'Barre', icon: Database }, 
            { id: 'pannelli', label: 'Pannelli', icon: Square }, 
            { id: 'clienti', label: 'Clienti', icon: Users }, 
            { id: 'commesse', label: 'Commesse', icon: Briefcase }, 
            { id: 'settings', label: 'Setup Cloud', icon: Settings } 
          ].map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id as DbTab)} className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 py-5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>
          ))}
        </div>

        <div className="p-8 space-y-6">
          {activeTab === 'settings' ? (
            <div className="max-w-4xl mx-auto space-y-10 py-10">
               <div className="text-center space-y-4">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Configurazione Supabase</h3>
                  <div className="inline-block bg-blue-50 px-6 py-2 rounded-full border border-blue-100 font-black text-blue-600 text-[10px] uppercase tracking-widest">Condivisione Real-Time PC Officina</div>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-8 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-5"><Globe className="w-40 h-40" /></div>
                    
                    <div className="bg-slate-800/80 p-6 rounded-[2rem] border border-slate-700 relative z-10">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase text-blue-400 mb-4 tracking-tighter"><ExternalLink className="w-4 h-4" /> Passo 1: Crea il Database Online</h4>
                      <p className="text-[11px] text-slate-400 mb-4 font-bold leading-relaxed">Se non hai ancora un database, vai su Supabase e creane uno gratuito in 2 minuti:</p>
                      <a href="https://supabase.com" target="_blank" className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-4 rounded-xl shadow-lg transition-all group">
                        <Globe className="w-5 h-5 group-hover:animate-spin" />
                        VAI SU SUPABASE.COM
                      </a>
                    </div>

                    <div className="space-y-4 relative z-10">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase text-red-400 tracking-tighter"><Settings className="w-4 h-4" /> Passo 2: Inserisci le credenziali</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Project URL (Settings -> Data API)</label>
                          <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Anon Key (Settings -> API)</label>
                          <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="Chiave anonima..." className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button onClick={handleConnectSupabase} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all"><ShieldCheck className="w-6 h-6" /> COLLEGA</button>
                        <button onClick={() => { supabaseService.disconnect(); localStorage.removeItem('alea_sb_url'); localStorage.removeItem('alea_sb_key'); setSbUrl(''); setSbKey(''); setIsConnected(false); }} className="bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all"><LogOut className="w-6 h-6" /> SCOLLEGA</button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Script SQL per SQL Editor</span>
                        <button onClick={() => { navigator.clipboard.writeText(sqlCode); alert("SQL Copiato!"); }} className="flex items-center gap-1 text-[10px] font-black text-blue-600 px-3 py-1 bg-blue-50 rounded border border-blue-100 transition-all"><Copy className="w-3 h-3" /> COPIA</button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold mb-4 uppercase leading-tight italic">Esegui questo script nel tab "SQL Editor" di Supabase per creare le tabelle necessarie.</p>
                      <pre className="text-[9px] font-mono text-slate-400 bg-white p-4 rounded-xl border h-48 overflow-y-auto leading-relaxed">{sqlCode}</pre>
                    </div>
                    <button onClick={() => { if(confirm("Cancellare tutti i dati locali?")) { localStorage.clear(); window.location.reload(); } }} className="w-full flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 text-red-600 font-black py-5 rounded-[2rem] border border-red-200 text-xs uppercase tracking-widest transition-all">
                      <RefreshCw className="w-4 h-4" /> RESET TOTALE LOCALE
                    </button>
                  </div>
               </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" /><input type="text" placeholder={`Cerca in ${activeTab}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" /></div>
                {!isAdding && activeTab !== 'commesse' && (<button onClick={() => setIsAdding(true)} className="w-full md:w-auto bg-red-600 text-white px-8 py-4 rounded-2xl shadow-xl font-black flex items-center justify-center gap-3"><Plus className="w-6 h-6" />AGGIUNGI</button>)}
              </div>
              
              {isAdding && activeTab === 'clienti' && (
                <div className="p-8 rounded-[2rem] border-2 border-dashed border-red-200 bg-slate-50/50 animate-in zoom-in-95 duration-200">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Ragione Sociale</label><input type="text" value={clientForm.nome} onChange={e=>setClientForm({...clientForm, nome: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black" /></div>
                      <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Note</label><input type="text" value={clientForm.note} onChange={e=>setClientForm({...clientForm, note: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold" /></div>
                      <div className="flex items-end gap-2"><button onClick={handleSaveClient} className="flex-1 bg-red-600 text-white font-black py-3.5 rounded-xl shadow-lg">SALVA</button><button onClick={() => setIsAdding(false)} className="bg-slate-200 text-slate-600 px-4 py-3.5 rounded-xl"><X className="w-5 h-5" /></button></div>
                   </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                       <tr>
                          {activeTab === 'profili' && <><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Codice</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Descrizione</th><th className="px-6 py-4 text-center">L. Std</th></>}
                          {activeTab === 'pannelli' && <><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Codice</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Descrizione</th><th className="px-6 py-4 text-center">Formato</th></>}
                          {activeTab === 'clienti' && <><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Cliente</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Note</th><th className="px-6 py-4 text-center">Aggiunto</th></>}
                          {activeTab === 'commesse' && <><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Data</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Cliente</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Rif.</th><th className="px-6 py-4 text-center">Tipo</th></>}
                          <th className="px-6 py-4 text-center">Azioni</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {activeTab === 'profili' && profiles.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                          <tr key={p.codice} className="hover:bg-slate-50/80 transition-all font-bold">
                             <td className="px-6 py-5 text-xs font-black">{p.codice}</td>
                             <td className="px-6 py-5 text-sm text-slate-600">{p.descr}</td>
                             <td className="px-6 py-5 text-center text-red-600 font-black">{p.lungMax || 6000} mm</td>
                             <td className="px-6 py-5 text-center"><button onClick={()=>deleteItem('profili', p.codice)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                       ))}
                       {activeTab === 'clienti' && clients.filter(c=>c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 font-bold">
                             <td className="px-6 py-5 text-sm font-black">{c.nome}</td>
                             <td className="px-6 py-5 text-sm text-slate-500 font-normal">{c.note || '-'}</td>
                             <td className="px-6 py-5 text-center text-[10px] text-slate-400 font-black uppercase tracking-tighter"><Calendar className="w-3 h-3 inline mr-1" />{new Date(c.dataAggiunta).toLocaleDateString()}</td>
                             <td className="px-6 py-5 text-center"><button onClick={()=>deleteItem('clienti', c.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                       ))}
                       {activeTab === 'commesse' && commesse.filter(c=>c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || c.numero.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 font-bold group">
                             <td className="px-6 py-5 text-[10px] text-slate-400 font-black uppercase tracking-tighter">{new Date(c.data).toLocaleString()}</td>
                             <td className="px-6 py-5 text-sm font-black text-slate-800">{c.cliente}</td>
                             <td className="px-6 py-5 text-sm text-red-600 font-black uppercase tracking-tighter">{c.numero}</td>
                             <td className="px-6 py-5 text-center"><span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${c.tipo === 'barre' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{c.tipo}</span></td>
                             <td className="px-6 py-5 text-center flex items-center justify-center gap-2">
                                <button onClick={()=>onOpenCommessa?.(c)} className="p-3 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl shadow-sm border border-slate-100 transition-all active:scale-95" title="Apri"><Eye className="w-5 h-5" /></button>
                                <button onClick={()=>deleteItem('commesse', c.id)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
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