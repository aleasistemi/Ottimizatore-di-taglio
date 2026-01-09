
import React, { useState, useEffect } from 'react';
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

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [panelMaterials, setPanelMaterials] = useState<PanelMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commesse, setCommesse] = useState<CommessaArchiviata[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan', spessori: '2, 3, 4', lungDefault: 3050, altDefault: 2050 });
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
      alert("Sincronizzazione forzata completata con successo!");
    } catch (e: any) {
      alert("Errore durante la sincronizzazione: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectSupabase = async () => {
    if (!sbUrl || !sbKey) return alert("Inserisci URL e Chiave API");
    const ok = supabaseService.init(sbUrl, sbKey);
    if (ok) {
      localStorage.setItem('alea_sb_url', sbUrl);
      localStorage.setItem('alea_sb_key', sbKey);
      setIsConnected(true);
      await syncManual();
    } else alert("URL del progetto non valido.");
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
    if (!confirm("Sei sicuro di voler eliminare questo elemento? L'operazione è irreversibile sul Cloud.")) return;
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

  const sqlCode = `-- SQL ALEA SISTEMI V4.5
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
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Gestione Cloud Aziendale</h2>
            <div className="flex items-center gap-3 mt-1">
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isConnected ? 'Sincronizzazione Automatica Attiva' : 'Archivio Locale'}</span>
               </div>
               {isConnected && <div className="flex items-center gap-1 text-[9px] font-bold text-blue-400 uppercase tracking-tighter"><Activity className="w-3 h-3" /> Monitoraggio Real-Time</div>}
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
            { id: 'pannelli', icon: Square, label: 'Catalogo Pannelli' }, 
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
                  <h3 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Setup Supabase</h3>
                  <p className="text-slate-500 font-medium italic">Sincronizza i dati tra ufficio tecnico e macchine in officina.</p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white shadow-2xl space-y-8 border border-slate-800">
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-3 text-xs font-black uppercase text-blue-400"><ExternalLink className="w-5 h-5" /> 1. Registrazione Database</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-bold">L'app utilizza Supabase per la condivisione dati. Se non hai le credenziali, creane una gratuita qui:</p>
                      <a href="https://supabase.com" target="_blank" className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 text-xs">
                        APRI SUPABASE.COM
                      </a>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <h4 className="flex items-center gap-3 text-xs font-black uppercase text-red-500"><Settings className="w-5 h-5" /> 2. Parametri di Connessione</h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Project URL</label>
                          <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="https://vostro-progetto.supabase.co" className="w-full px-5 py-4 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 outline-none focus:border-blue-600 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Anon Public Key</label>
                          <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="Inserisci Anon Key..." className="w-full px-5 py-4 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 outline-none focus:border-blue-600 transition-all" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        <button onClick={handleConnectSupabase} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all"><ShieldCheck className="w-6 h-6" /> COLLEGA</button>
                        <button onClick={() => { supabaseService.disconnect(); localStorage.removeItem('alea_sb_url'); localStorage.removeItem('alea_sb_key'); setSbUrl(''); setSbKey(''); setIsConnected(false); }} className="bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all"><LogOut className="w-6 h-6" /> SCOLLEGA</button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inizializzazione Tabelle</span>
                        <button onClick={() => { navigator.clipboard.writeText(sqlCode); alert("Codice SQL Copiato!"); }} className="flex items-center gap-1 text-[10px] font-black text-blue-600 px-4 py-1.5 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all"><Copy className="w-3 h-3" /> COPIA SQL</button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold mb-4 uppercase leading-tight italic">Esegui questo codice nell'editor SQL di Supabase per configurare le tabelle aziendali corrette.</p>
                      <pre className="text-[9px] font-mono text-slate-400 bg-white p-5 rounded-2xl border h-52 overflow-y-auto leading-relaxed shadow-inner">{sqlCode}</pre>
                    </div>
                    <button onClick={() => { if(confirm("Sei sicuro? Questo cancellerà tutti i dati locali su questo PC. Usa questa funzione solo se il Cloud è già configurato e funzionante.")) { localStorage.clear(); window.location.reload(); } }} className="w-full flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 text-red-600 font-black py-6 rounded-[2.5rem] border border-red-200 text-xs uppercase tracking-widest transition-all">
                      <RefreshCw className="w-5 h-5" /> RESET COMPLETO DATI LOCALI
                    </button>
                  </div>
               </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" /><input type="text" placeholder={`Cerca in ${activeTab}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-red-50/50 transition-all shadow-sm" /></div>
                {!isAdding && activeTab !== 'commesse' && (<button onClick={() => setIsAdding(true)} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-3xl shadow-xl font-black flex items-center justify-center gap-3 transition-all active:scale-95"><Plus className="w-6 h-6" />AGGIUNGI</button>)}
              </div>
              
              {isAdding && activeTab === 'clienti' && (
                <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-red-200 bg-slate-50/50 animate-in zoom-in-95 duration-200">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-widest">Ragione Sociale</label><input type="text" value={clientForm.nome} onChange={e=>setClientForm({...clientForm, nome: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-black shadow-sm outline-none focus:border-red-500" /></div>
                      <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-widest">Note Cliente</label><input type="text" value={clientForm.note} onChange={e=>setClientForm({...clientForm, note: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold shadow-sm outline-none focus:border-red-500" /></div>
                      <div className="flex items-end gap-3"><button onClick={handleSaveClient} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95">SALVA CLIENTE</button><button onClick={() => setIsAdding(false)} className="bg-slate-200 text-slate-600 px-5 py-4 rounded-xl hover:bg-slate-300 transition-all"><X className="w-6 h-6" /></button></div>
                   </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-[2.5rem] border border-slate-100 shadow-lg">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                       <tr>
                          {activeTab === 'profili' && <><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">L. Std</th></>}
                          {activeTab === 'pannelli' && <><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato</th></>}
                          {activeTab === 'clienti' && <><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Note</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggiunto</th></>}
                          {activeTab === 'commesse' && <><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rif.</th><th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th></>}
                          <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Azioni</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {activeTab === 'profili' && profiles.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p => (
                          <tr key={p.codice} className="hover:bg-slate-50/80 transition-all font-bold group">
                             <td className="px-8 py-6 text-xs font-black text-slate-900">{p.codice}</td>
                             <td className="px-8 py-6 text-sm text-slate-600 font-bold">{p.descr}</td>
                             <td className="px-8 py-6 text-center text-red-600 font-black text-xs">{p.lungMax || 6000} mm</td>
                             <td className="px-8 py-6 text-center"><button onClick={()=>deleteItem('profili', p.codice)} className="p-3 text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button></td>
                          </tr>
                       ))}
                       {activeTab === 'clienti' && clients.filter(c=>c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-all font-bold group">
                             <td className="px-8 py-6 text-sm font-black text-slate-900">{c.nome}</td>
                             <td className="px-8 py-6 text-sm text-slate-500 font-normal">{c.note || '-'}</td>
                             <td className="px-8 py-6 text-center text-[10px] text-slate-400 font-black uppercase tracking-tighter"><Calendar className="w-3 h-3 inline mr-1" />{new Date(c.dataAggiunta).toLocaleDateString()}</td>
                             <td className="px-8 py-6 text-center"><button onClick={()=>deleteItem('clienti', c.id)} className="p-3 text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button></td>
                          </tr>
                       ))}
                       {activeTab === 'commesse' && commesse.filter(c=>c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || c.numero.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-all font-bold group">
                             <td className="px-8 py-6 text-[10px] text-slate-400 font-black uppercase tracking-tighter">{new Date(c.data).toLocaleString()}</td>
                             <td className="px-8 py-6 text-sm font-black text-slate-800">{c.cliente}</td>
                             <td className="px-8 py-6 text-sm text-red-600 font-black uppercase tracking-tighter">{c.numero}</td>
                             <td className="px-8 py-6 text-center"><span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full ${c.tipo === 'barre' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{c.tipo}</span></td>
                             <td className="px-8 py-6 text-center flex items-center justify-center gap-2">
                                <button onClick={()=>onOpenCommessa?.(c)} className="p-4 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-95" title="Riapri Commessa"><Eye className="w-6 h-6" /></button>
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
