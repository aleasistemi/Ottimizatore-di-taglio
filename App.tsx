
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { BarOptimizer } from './components/BarOptimizer';
import { PanelOptimizer } from './components/PanelOptimizer';
import { ProfileDatabase } from './components/ProfileDatabase';
import { OptimizerMode, CommessaArchiviata } from './types';
import { AlertTriangle, CheckCircle2, Settings, RefreshCw } from 'lucide-react';
import { supabaseService } from './services/supabaseService';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<OptimizerMode>(OptimizerMode.BARRE);
  const [dbTab, setDbTab] = useState<'profili' | 'pannelli' | 'clienti' | 'commesse' | 'colori' | 'settings'>('profili');
  const [loadedCommessa, setLoadedCommessa] = useState<CommessaArchiviata | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('--:--');
  
  const syncTimerRef = useRef<any>(null);
  const lastMutationTimeRef = useRef<number>(0);

  const performGlobalSync = async (isManual = false) => {
    // PROTEZIONE: Aumentata a 30 secondi per dare tempo al cloud lento di processare l'upsert
    // prima di tentare un fetch che potrebbe restituire dati vecchi e cancellare quelli nuovi.
    if (!isManual && Date.now() - lastMutationTimeRef.current < 30000) return;
    
    if (isSyncing || !supabaseService.isInitialized()) return;
    
    setIsSyncing(true);
    try {
      const tables = ['profiles', 'panel_materials', 'clients', 'commesse', 'colors'];
      const storageKeys: Record<string, string> = {
        'profiles': 'alea_profiles',
        'panel_materials': 'alea_panel_materials',
        'clients': 'alea_clients',
        'commesse': 'alea_commesse',
        'colors': 'alea_colors'
      };

      let changed = false;
      for (const table of tables) {
        const cloudData = await supabaseService.fetchTable(table);
        if (cloudData) {
          const localData = localStorage.getItem(storageKeys[table]);
          const cloudDataStr = JSON.stringify(cloudData);
          if (localData !== cloudDataStr) {
            localStorage.setItem(storageKeys[table], cloudDataStr);
            changed = true;
          }
        }
      }
      
      setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (changed || isManual) window.dispatchEvent(new CustomEvent('alea_data_updated'));
    } catch (e) {
      console.error("Errore sync:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const accepted = localStorage.getItem('alea_disclaimer_accepted');
    if (!accepted) setShowDisclaimer(true);

    const sbUrl = localStorage.getItem('alea_sb_url');
    const sbKey = localStorage.getItem('alea_sb_key');
    
    if (sbUrl && sbKey) {
      const ok = supabaseService.init(sbUrl, sbKey);
      setIsCloudActive(ok);
      if (ok) performGlobalSync(true);
    }

    syncTimerRef.current = setInterval(() => {
      if (supabaseService.isInitialized()) {
        setIsCloudActive(true);
        performGlobalSync();
      }
    }, 5000);

    const handleMutation = () => { 
      lastMutationTimeRef.current = Date.now(); 
    };
    window.addEventListener('alea_local_mutation', handleMutation);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      window.removeEventListener('alea_local_mutation', handleMutation);
    };
  }, []);

  const handleOpenCommessa = (commessa: CommessaArchiviata) => {
    setLoadedCommessa(commessa);
    setActiveMode(commessa.tipo === 'barre' ? OptimizerMode.BARRE : OptimizerMode.PANNELLI);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden text-slate-900">
      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden p-10 text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Informativa ALEA</h2>
            <p className="text-slate-600 text-sm">L’ottimizzatore è uno strumento gratuito. ALEA SISTEMI S.r.l. non garantisce l’assenza di errori nei risultati forniti e non risponde di eventuali sprechi di materiale.</p>
            <button onClick={() => {localStorage.setItem('alea_disclaimer_accepted','true'); setShowDisclaimer(false);}} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" /> ACCETTO E PROSEGUO
            </button>
          </div>
        </div>
      )}

      <Sidebar activeMode={activeMode} onModeChange={(mode) => {setActiveMode(mode); setLoadedCommessa(null);}} onOpenSettings={() => {setActiveMode(OptimizerMode.DATABASE); setDbTab('settings');}} />

      <main className="flex-1 overflow-y-auto h-screen p-8">
        <header className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase">ALEA SISTEMI</h1>
            <p className="text-[10px] font-bold text-red-600 tracking-[0.3em] uppercase mt-1">Soluzioni per l'Alluminio</p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl border shadow-xl items-center px-4 space-x-3">
            <div className={`w-2 h-2 rounded-full ${isCloudActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] font-black uppercase text-slate-500">Cloud Status: {isCloudActive ? 'Sincronizzato' : 'Offline'}</span>
            {isSyncing && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
          </div>
        </header>

        {activeMode === OptimizerMode.BARRE && <BarOptimizer externalData={loadedCommessa} />}
        {activeMode === OptimizerMode.PANNELLI && <PanelOptimizer externalData={loadedCommessa} />}
        {activeMode === OptimizerMode.DATABASE && <ProfileDatabase onOpenCommessa={handleOpenCommessa} forcedTab={dbTab} onTabChange={setDbTab} />}

        <footer className="mt-12 pt-8 border-t text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2025 ALEA SISTEMI S.r.l. - V5.0</footer>
      </main>
    </div>
  );
};

export default App;
