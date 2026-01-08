
import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, Edit3, Save, X, Users, Briefcase, Download, Upload, CloudSync, Globe, Settings, AlertCircle, CheckCircle2, Eye, ExternalLink, Info } from 'lucide-react';
import { Profile, Client, CommessaArchiviata } from '../types';
import { PROFILI as INITIAL_PROFILI } from '../constants';
import { supabaseService } from '../services/supabaseService';

type DbTab = 'profili' | 'clienti' | 'commesse' | 'settings';

interface ProfileDatabaseProps {
  onOpenCommessa?: (commessa: CommessaArchiviata) => void;
}

export const ProfileDatabase: React.FC<ProfileDatabaseProps> = ({ onOpenCommessa }) => {
  const [activeTab, setActiveTab] = useState<DbTab>('profili');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Supabase Config
  const [sbUrl, setSbUrl] = useState(localStorage.getItem('alea_sb_url') || '');
  const [sbKey, setSbKey] = useState(localStorage.getItem('alea_sb_key') || '');
  const [isConnected, setIsConnected] = useState(false);

  // Data States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commesse, setCommesse] = useState<CommessaArchiviata[]>([]);

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [clientForm, setClientForm] = useState<Partial<Client>>({ nome: '', note: '' });

  useEffect(() => {
    loadLocalData();
    if (sbUrl && sbKey) {
      const ok = supabaseService.init(sbUrl, sbKey);
      setIsConnected(ok);
      if (ok) syncFromCloud();
    }
  }, []);

  const loadLocalData = () => {
    const savedP = localStorage.getItem('alea_profiles');
    if (savedP) setProfiles(JSON.parse(savedP));
    else {
      const defaults = Object.entries(INITIAL_PROFILI).map(([codice, p]) => ({ codice, descr: p.descr, lungMax: p.lungMax || 6000 }));
      setProfiles(defaults);
      localStorage.setItem('alea_profiles', JSON.stringify(defaults));
    }
    const savedC = localStorage.getItem('alea_clients');
    if (savedC) setClients(JSON.parse(savedC));
    const savedCom = localStorage.getItem('alea_commesse');
    if (savedCom) setCommesse(JSON.parse(savedCom));
  };

  const syncFromCloud = async () => {
    const p = await supabaseService.fetchTable('profiles');
    if (p) { setProfiles(p); localStorage.setItem('alea_profiles', JSON.stringify(p)); }
    const c = await supabaseService.fetchTable('clients');
    if (c) { setClients(c); localStorage.setItem('alea_clients', JSON.stringify(c)); }
    const com = await supabaseService.fetchTable('commesse');
    if (com) { setCommesse(com); localStorage.setItem('alea_commesse', JSON.stringify(com)); }
  };

  const saveToDbAndCloud = async (type: DbTab, data: any[]) => {
    const key = type === 'profili' ? 'alea_profiles' : type === 'clienti' ? 'alea_clients' : 'alea_commesse';
    const tableName = type === 'profili' ? 'profiles' : type === 'clienti' ? 'clients' : 'commesse';
    
    // Update local
    localStorage.setItem(key, JSON.stringify(data));
    if (type === 'profili') setProfiles(data);
    if (type === 'clienti') setClients(data);
    if (type === 'commesse') setCommesse(data);

    // Sync cloud
    if (isConnected) {
      await supabaseService.syncTable(tableName, data);
    }
  };

  const deleteFromDbAndCloud = async (type: DbTab, id: string) => {
    const tableName = type === 'profili' ? 'profiles' : type === 'clienti' ? 'clients' : 'commesse';
    const idCol = type === 'profili' ? 'codice' : 'id';
    
    let newData: any[] = [];
    if (type === 'profili') { newData = profiles.filter(p => p.codice !== id); setProfiles(newData); }
    if (type === 'clienti') { newData = clients.filter(c => c.id !== id); setClients(newData); }
    if (type === 'commesse') { newData = commesse.filter(c => c.id !== id); setCommesse(newData); }

    const key = type === 'profili' ? 'alea_profiles' : type === 'clienti' ? 'alea_clients' : 'alea_commesse';
    localStorage.setItem(key, JSON.stringify(newData));

    if (isConnected) {
      await supabaseService.deleteFromTable(tableName, id, idCol);
    }
  };

  const handleConnectSupabase = () => {
    const ok = supabaseService.init(sbUrl, sbKey);
    if (ok) {
      localStorage.setItem('alea_sb_url', sbUrl);
      localStorage.setItem('alea_sb_key', sbKey);
      setIsConnected(true);
      syncFromCloud();
      alert("Connessione a Supabase stabilita e dati sincronizzati!");
    } else {
      alert("Parametri Supabase non validi.");
    }
  };

  // Profile CRUD
  const startEditProfile = (p: Profile) => {
    setProfileForm(p);
    setEditingId(p.codice);
    setIsEditing(true);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProfile = async () => {
    if (!profileForm.codice || !profileForm.descr) return;
    
    let newProfiles;
    if (isEditing) {
      newProfiles = profiles.map(p => p.codice === editingId ? profileForm : p);
    } else {
      if (profiles.find(p => p.codice === profileForm.codice)) return alert("Codice esistente!");
      newProfiles = [profileForm, ...profiles];
    }

    await saveToDbAndCloud('profili', newProfiles);
    setIsAdding(false);
    setIsEditing(false);
    setEditingId(null);
    setProfileForm({ codice: '', descr: '', lungMax: 6000 });
  };

  // Client CRUD
  const handleSaveClient = async () => {
    if (!clientForm.nome) return;
    const nuovoCliente: Client = {
      id: Math.random().toString(36).substr(2, 9),
      nome: clientForm.nome,
      note: clientForm.note,
      dataAggiunta: new Date().toISOString()
    };
    const newClients = [nuovoCliente, ...clients];
    await saveToDbAndCloud('clienti', newClients);
    setClientForm({ nome: '', note: '' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-200">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">GESTIONE ARCHIVI</h2>
            <div className="flex items-center gap-2 mt-0.5">
               <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                 {isConnected ? 'Cloud Sync Attivo (Supabase)' : 'Database Locale'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-900'}`}>
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[600px]">
        {/* Tabs Desktop */}
        <div className="flex border-b border-slate-100 bg-slate-50/30">
          {[
            { id: 'profili', label: 'Anagrafica Profili', icon: Database },
            { id: 'clienti', label: 'Clienti', icon: Users },
            { id: 'commesse', label: 'Archivio Commesse', icon: Briefcase }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as DbTab); setIsAdding(false); setIsEditing(false); }}
              className={`flex-1 flex items-center justify-center gap-3 py-5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8 space-y-6">
          {activeTab === 'settings' ? (
            <div className="max-w-3xl mx-auto space-y-8 py-10 animate-in slide-in-from-top-4">
               <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-black text-blue-800 uppercase tracking-tighter">Modalità Professionale Cloud</span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Sincronizzazione Multi-Dispositivo</h3>
                  <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">Inserisci le credenziali del tuo database privato Supabase per condividere i dati tra Ufficio, Magazzino e Clienti.</p>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-inner">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Supabase Project URL</label>
                        <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Anon / Public API Key</label>
                        <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="eyJhbGci..." className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs" />
                      </div>
                    </div>
                    <button 
                      onClick={handleConnectSupabase} 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
                    >
                      {isConnected ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <CloudSync className="w-5 h-5" />}
                      <span>{isConnected ? 'CONNESSIONE ATTIVA' : 'CONNETTI E SINCRONIZZA'}</span>
                    </button>
                    {isConnected && (
                      <button onClick={() => { localStorage.removeItem('alea_sb_url'); localStorage.removeItem('alea_sb_key'); setIsConnected(false); setSbUrl(''); setSbKey(''); }} className="w-full text-[10px] font-black text-red-500 uppercase hover:underline">Scollega Database Cloud</button>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                       <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm">
                         <Info className="w-4 h-4 text-blue-600" />
                         GUIDA PER IL TUO CLIENTE
                       </h4>
                       <ul className="text-xs space-y-3 text-slate-500 font-medium leading-relaxed">
                         <li className="flex gap-2">
                           <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">1</span>
                           <span>Il cliente crea un account su <a href="https://supabase.com" target="_blank" className="text-blue-600 font-bold inline-flex items-center gap-0.5 underline">Supabase <ExternalLink className="w-3 h-3" /></a></span>
                         </li>
                         <li className="flex gap-2">
                           <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">2</span>
                           <span>Crea un progetto e copia le chiavi API nel form a sinistra.</span>
                         </li>
                         <li className="flex gap-2">
                           <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">3</span>
                           <span>Da quel momento i suoi profili e le sue commesse saranno visibili solo a lui su ogni suo dispositivo.</span>
                         </li>
                       </ul>
                    </div>

                    <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-100 rounded-[1.5rem]">
                      <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                      <p className="text-[10px] text-amber-800 leading-relaxed font-bold uppercase tracking-tight">
                        Senza credenziali cloud, i dati vengono salvati localmente (solo su questo PC) e andranno persi se svuoti la cache del browser.
                      </p>
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text"
                    placeholder={`Cerca in ${activeTab}...`}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
                {!isAdding && activeTab !== 'commesse' && (
                  <button onClick={() => { setIsAdding(true); setIsEditing(false); }} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl shadow-xl shadow-red-100 font-black flex items-center justify-center gap-3 active:scale-95 transition-all">
                    <Plus className="w-6 h-6" />
                    <span>NUOVO INSERIMENTO</span>
                  </button>
                )}
              </div>

              {isAdding && (
                <div className={`p-8 rounded-[2rem] border-2 border-dashed ${isEditing ? 'border-blue-300 bg-blue-50/30' : 'border-red-200 bg-slate-50/50'} animate-in zoom-in-95 duration-200`}>
                   <div className="flex justify-between items-center mb-6">
                      <h4 className={`font-black uppercase tracking-widest text-sm ${isEditing ? 'text-blue-700' : 'text-slate-500'}`}>
                        {isEditing ? 'MODIFICA PROFILO' : 'NUOVO PROFILO'}
                      </h4>
                      <button onClick={() => { setIsAdding(false); setIsEditing(false); }} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button>
                   </div>
                   
                   {activeTab === 'profili' && (
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Codice</label>
                          <input disabled={isEditing} type="text" placeholder="AL-123" value={profileForm.codice} onChange={e=>setProfileForm({...profileForm, codice: e.target.value.toUpperCase()})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black focus:ring-2 focus:ring-red-500 outline-none disabled:bg-slate-200" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Descrizione</label>
                          <input type="text" placeholder="Profilo alluminio..." value={profileForm.descr} onChange={e=>setProfileForm({...profileForm, descr: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-red-500 outline-none" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">L. Barra Std (mm)</label>
                          <input type="number" value={profileForm.lungMax || 6000} onChange={e=>setProfileForm({...profileForm, lungMax: parseFloat(e.target.value)})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black text-red-600 focus:ring-2 focus:ring-red-500 outline-none" />
                        </div>
                        <div className="flex items-end">
                          <button onClick={handleSaveProfile} className={`w-full ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white font-black py-3.5 rounded-xl shadow-lg transition-all`}>
                            {isEditing ? 'AGGIORNA' : 'SALVA'}
                          </button>
                        </div>
                     </div>
                   )}

                   {activeTab === 'clienti' && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Ragione Sociale</label>
                          <input type="text" placeholder="Azienda S.p.A." value={clientForm.nome} onChange={e=>setClientForm({...clientForm, nome: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                        <div className="flex items-end">
                          <button onClick={handleSaveClient} className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl shadow-lg">SALVA CLIENTE</button>
                        </div>
                     </div>
                   )}
                </div>
              )}

              <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                       <tr>
                          {activeTab === 'profili' && <>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">L. Std</th>
                          </>}
                          {activeTab === 'clienti' && <><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggiunto il</th></>}
                          {activeTab === 'commesse' && <>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rif.</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                          </>}
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Azioni</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {activeTab === 'profili' && profiles.filter(p => p.codice.includes(searchTerm.toUpperCase()) || p.descr.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                          <tr key={p.codice} className="group hover:bg-slate-50/80 transition-all">
                             <td className="px-6 py-5"><span className="bg-slate-100 text-slate-900 px-3 py-1.5 rounded-lg font-black text-xs border border-slate-200">{p.codice}</span></td>
                             <td className="px-6 py-5 text-sm font-bold text-slate-600">{p.descr}</td>
                             <td className="px-6 py-5 text-center font-mono font-black text-red-600 text-xs">{p.lungMax || 6000} mm</td>
                             <td className="px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                                   <button onClick={()=>startEditProfile(p)} title="Modifica" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 className="w-4 h-4" /></button>
                                   <button onClick={()=>deleteFromDbAndCloud('profili', p.codice)} title="Elimina" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {activeTab === 'clienti' && clients.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                          <tr key={c.id} className="group hover:bg-slate-50/80 transition-all">
                             <td className="px-6 py-5 font-black text-slate-800 text-sm">{c.nome}</td>
                             <td className="px-6 py-5 text-slate-400 font-mono text-[10px]">{new Date(c.dataAggiunta).toLocaleString()}</td>
                             <td className="px-6 py-5 text-center">
                                <button onClick={()=>deleteFromDbAndCloud('clienti', c.id)} className="p-2 text-slate-300 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                             </td>
                          </tr>
                       ))}
                       {activeTab === 'commesse' && commesse.filter(c => c.numero.toLowerCase().includes(searchTerm.toLowerCase()) || c.cliente.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                          <tr key={c.id} className="group hover:bg-slate-50/80 transition-all">
                             <td className="px-6 py-5">
                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${c.tipo === 'barre' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {c.tipo}
                                </span>
                             </td>
                             <td className="px-6 py-5 font-black text-slate-800 text-sm">{c.numero}</td>
                             <td className="px-6 py-5 text-slate-600 font-bold text-xs uppercase">{c.cliente}</td>
                             <td className="px-6 py-5 text-slate-400 font-mono text-[10px]">{new Date(c.data).toLocaleDateString()}</td>
                             <td className="px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => onOpenCommessa?.(c)} title="Apri Commessa" className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"><Eye className="w-4 h-4" /></button>
                                   <button onClick={()=>deleteFromDbAndCloud('commesse', c.id)} title="Elimina" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
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
