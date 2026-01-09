
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

  const [profileForm, setProfileForm] = useState<Profile>({ codice: '', descr: '', lungMax: 6000 });
  const [panelForm, setPanelForm] = useState<PanelMaterial>({ id: '', codice: '', descr: '', materiale: 'Lexan', spessore: '3', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  const [clientForm, setClientForm] = useState<Client>({ id: '', nome: '', note: '', dataAggiunta: new Date().toISOString() });

  const loadLocalData = () => {
    const savedP = localStorage.getItem('alea_profiles');
    if (savedP) {
      setProfiles(JSON.parse(savedP).sort((a: any, b: any) => a.codice.localeCompare(b.codice)));
    }
    const savedPan = localStorage.getItem('alea_panel_materials');
    if (savedPan) setPanelMaterials(JSON.parse(savedPan));
    const savedC = localStorage.getItem('alea_clients');
    if (savedC) setClients(JSON.parse(savedC));
    const savedCom = localStorage.getItem('alea_commesse');
    if (savedCom) setCommesse(JSON.parse(savedCom));
  };

  useEffect(() => { loadLocalData(); setIsConnected(supabaseService.isInitialized()); }, []);
  useEffect(() => {
    const handleUpdate = () => loadLocalData();
    window.addEventListener('alea_data_updated', handleUpdate);
    return () => window.removeEventListener('alea_data_updated', handleUpdate);
  }, []);

  const saveToDbAndCloud = async (type: DbTab, data: any[]) => {
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    const keys: Record<string, string> = { profili: 'alea_profiles', pannelli: 'alea_panel_materials', clienti: 'alea_clients', commesse: 'alea_commesse' };
    const tables: Record<string, string> = { profili: 'profiles', pannelli: 'panel_materials', clienti: 'clients', commesse: 'commesse' };
    localStorage.setItem(keys[type], JSON.stringify(data));
    if (isConnected) {
        try { await supabaseService.syncTable(tables[type], data); } catch (e) { console.error("Sync error", e); }
    }
    loadLocalData();
  };

  const handleSaveProfile = async () => {
    if (!profileForm.codice) return;
    const updated = [profileForm, ...profiles.filter(p => p.codice !== profileForm.codice)];
    await saveToDbAndCloud('profili', updated);
    setIsAdding(false); setIsEditing(false); setProfileForm({ codice: '', descr: '', lungMax: 6000 });
  };

  const handleSavePanelMaterial = async () => {
    if (!panelForm.codice) return;
    const id = panelForm.id || panelForm.codice; // Usiamo il codice come ID per stabilità sync
    const updated = [{ ...panelForm, id }, ...panelMaterials.filter(p => p.id !== id)];
    await saveToDbAndCloud('pannelli', updated);
    setIsAdding(false); setIsEditing(false); setPanelForm({ id: '', codice: '', descr: '', materiale: 'Lexan', spessore: '3', lungDefault: 3050, altDefault: 2050, giraPezzoDefault: true });
  };

  const editItem = (type: DbTab, item: any) => {
    setIsEditing(true); setIsAdding(true);
    if (type === 'profili') setProfileForm({ ...item });
    if (type === 'pannelli') setPanelForm({ ...item });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden min-h-[500px]">
        <div className="flex border-b">
          <button onClick={() => setActiveTab('profili')} className={`flex-1 py-5 text-[11px] font-black uppercase ${activeTab === 'profili' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}>Profili</button>
          <button onClick={() => setActiveTab('pannelli')} className={`flex-1 py-5 text-[11px] font-black uppercase ${activeTab === 'pannelli' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}>Pannelli</button>
          <button onClick={() => setActiveTab('commesse')} className={`flex-1 py-5 text-[11px] font-black uppercase ${activeTab === 'commesse' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}>Archivio</button>
        </div>

        <div className="p-8">
          <div className="flex gap-4 mb-6">
             <input type="text" placeholder="Cerca..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="flex-1 px-5 py-4 bg-slate-50 border rounded-2xl outline-none" />
             {!isAdding && activeTab !== 'commesse' && <button onClick={()=>setIsAdding(true)} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs">Aggiungi</button>}
          </div>

          {isAdding && activeTab === 'pannelli' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border border-dashed border-red-200 mb-6">
               <input type="text" value={panelForm.codice} onChange={e=>setPanelForm({...panelForm, codice: e.target.value.toUpperCase()})} placeholder="Codice..." className="px-4 py-3 border rounded-xl" />
               <input type="text" value={panelForm.materiale} onChange={e=>setPanelForm({...panelForm, materiale: e.target.value})} placeholder="Materiale..." className="px-4 py-3 border rounded-xl" />
               <input type="text" value={panelForm.spessore} onChange={e=>setPanelForm({...panelForm, spessore: e.target.value})} placeholder="Spessore (mm)..." className="px-4 py-3 border rounded-xl" />
               <div className="flex gap-2">
                 <button onClick={handleSavePanelMaterial} className="flex-1 bg-red-600 text-white font-black rounded-xl">Salva</button>
                 <button onClick={()=>setIsAdding(false)} className="p-3 bg-slate-200 rounded-xl"><X /></button>
               </div>
            </div>
          )}

          {activeTab === 'profili' && (
             <table className="w-full">
                <thead><tr className="border-b text-[10px] text-slate-400 uppercase"><th className="text-left py-4">Codice</th><th className="text-left py-4">Descrizione</th><th className="text-center py-4">Azioni</th></tr></thead>
                <tbody>
                   {profiles.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p=>(
                     <tr key={p.codice} className="border-b hover:bg-slate-50">
                        <td className="py-4 font-black">{p.codice}</td>
                        <td className="py-4 text-sm text-slate-500">{p.descr}</td>
                        <td className="py-4 text-center">
                           <button onClick={()=>editItem('profili', p)} className="p-2 text-blue-600"><Edit3 className="w-4 h-4" /></button>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          )}

          {activeTab === 'pannelli' && (
             <table className="w-full">
                <thead><tr className="border-b text-[10px] text-slate-400 uppercase"><th className="text-left py-4">Codice</th><th className="text-left py-4">Materiale</th><th className="text-center py-4">Spessore</th><th className="text-center py-4">Azioni</th></tr></thead>
                <tbody>
                   {panelMaterials.filter(p=>p.codice.includes(searchTerm.toUpperCase())).map(p=>(
                     <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="py-4 font-black">{p.codice}</td>
                        <td className="py-4 text-sm text-slate-500">{p.materiale}</td>
                        <td className="py-4 text-center font-black text-red-600">{p.spessore} mm</td>
                        <td className="py-4 text-center">
                           <button onClick={()=>editItem('pannelli', p)} className="p-2 text-blue-600"><Edit3 className="w-4 h-4" /></button>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          )}
        </div>
      </div>
    </div>
  );
};
