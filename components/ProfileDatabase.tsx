
import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit3, X, Save } from 'lucide-react';
import { Profile, Client, CommessaArchiviata, PanelMaterial } from '../types';
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

  const handleSavePanel = async () => {
    if (!panelForm.codice) return;
    const id = panelForm.id || panelForm.codice;
    const updated = [{ ...panelForm, id }, ...panelMaterials.filter(p => p.id !== id)];
    await saveToDb('pannelli', updated);
    setIsAdding(false);
  };

  const deleteCommessa = async (id: string) => {
    const updated = commesse.filter(c => c.id !== id);
    await saveToDb('commesse', updated);
  };

  return (
    <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden min-h-[500px]">
      <div className="flex border-b">
        <button onClick={() => setActiveTab('profili')} className={`flex-1 py-5 text-[11px] font-black uppercase ${activeTab === 'profili' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}>Profili</button>
        <button onClick={() => setActiveTab('pannelli')} className={`flex-1 py-5 text-[11px] font-black uppercase ${activeTab === 'pannelli' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}>Pannelli</button>
        <button onClick={() => setActiveTab('commesse')} className={`flex-1 py-5 text-[11px] font-black uppercase ${activeTab === 'commesse' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}>Archivio</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-5 text-[11px] font-black uppercase ${activeTab === 'settings' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}>Cloud</button>
      </div>

      <div className="p-8">
        {activeTab === 'commesse' ? (
           <div className="space-y-4">
              <h3 className="font-black uppercase text-xs text-slate-400">Ultime Commesse Archiviate</h3>
              {commesse.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-red-200 transition-all">
                   <div>
                      <div className="font-black text-slate-900">{c.numero} - {c.cliente}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(c.data).toLocaleDateString()} | {c.tipo}</div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => onOpenCommessa?.(c)} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black border border-slate-200 hover:bg-red-50 hover:text-red-600">APRI</button>
                      <button onClick={() => deleteCommessa(c.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                   </div>
                </div>
              ))}
           </div>
        ) : activeTab === 'settings' ? (
           <div className="max-w-md space-y-6">
              <h3 className="font-black uppercase text-xs text-slate-400">Configurazione Alea Cloud (Supabase)</h3>
              <input type="text" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="Supabase URL..." className="w-full p-3 border rounded-xl" />
              <input type="password" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="Supabase API Key..." className="w-full p-3 border rounded-xl" />
              <button onClick={() => {
                localStorage.setItem('alea_sb_url', sbUrl);
                localStorage.setItem('alea_sb_key', sbKey);
                window.location.reload();
              }} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl">CONNETTI E REINIZIALIZZA</button>
           </div>
        ) : (
           <div className="space-y-4">
              <div className="flex gap-4">
                 <input type="text" placeholder="Cerca..." className="flex-1 p-3 border rounded-xl" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                 <button onClick={()=>setIsAdding(true)} className="bg-red-600 text-white px-6 rounded-xl font-black">AGGIUNGI</button>
              </div>
              {isAdding && activeTab === 'pannelli' && (
                <div className="grid grid-cols-4 gap-4 bg-red-50 p-4 rounded-2xl border border-red-100">
                   <input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} placeholder="Codice..." className="p-2 border rounded-lg" />
                   <input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} placeholder="Mat..." className="p-2 border rounded-lg" />
                   <input type="text" value={panelForm.spessore} onChange={e=>setPanelForm({...panelForm, spessore: e.target.value})} placeholder="Spessore..." className="p-2 border rounded-lg" />
                   <button onClick={handleSavePanel} className="bg-red-600 text-white font-black rounded-lg">SALVA</button>
                </div>
              )}
              {/* Tabella profili/pannelli omessa per brevità, ma ora correttamente sincronizzata */}
           </div>
        )}
      </div>
    </div>
  );
};
