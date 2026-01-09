
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
  
  const syncTimerRef = useRef<any>(null);
  const lastMutationTimeRef = useRef<number>(0);

  const performGlobalSync = async (isManual = false) => {
    // Protezione: se ho appena salvato qualcosa localmente, non scaricare dal cloud per 60 secondi
    if (!isManual && Date.now() - lastMutationTimeRef.current < 60000) return;
    
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
        
        // Se il cloud fallisce o è vuoto ma il locale ha dati, NON SOVRASCRIVERE (Protezione dati)
        if (!cloudData) continue;
        
        const localDataRaw = localStorage.getItem(storageKeys[table]);
        const localData = JSON.parse(localDataRaw || '[]');

        if (cloudData.length === 0 && localData.length > 5) {
          console.warn(`Sync saltato per ${table}: Evitata cancellazione di ${localData.length} record locali.`);
          continue;
        }

        const cloudDataClean = cloudData.map(({ created_at, ...rest }: any) => rest);
        const cloudDataStr = JSON.stringify(cloudDataClean);
        const localDataStr = JSON.stringify(localData);

        if (cloudDataStr !== localDataStr) {
          localStorage.setItem(storageKeys[table], cloudDataStr);
          changed = true;
        }
      }
      
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
    }, 10000);

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
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-10 text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Informativa ALEA</h2>
            <p className="text-slate-600 text-sm">ALEA SISTEMI S.r.l. non risponde di eventuali errori nei calcoli. Verifica sempre i risultati prima del taglio.</p>
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">ALEA SISTEMI</h1>
            <p className="text-[10px] font-bold text-red-600 tracking-[0.3em] uppercase mt-1">Taglio Alluminio & Pannelli</p>
          </div>
          <div className="flex bg-white p-2 rounded-2xl border shadow-xl items-center px-4 space-x-3">
            <div className={`w-2 h-2 rounded-full ${isCloudActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] font-black uppercase text-slate-500">{isCloudActive ? 'Cloud Attivo' : 'Offline'}</span>
            {isSyncing && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
          </div>
        </header>

        {activeMode === OptimizerMode.BARRE && <BarOptimizer externalData={loadedCommessa} />}
        {activeMode === OptimizerMode.PANNELLI && <PanelOptimizer externalData={loadedCommessa} />}
        {activeMode === OptimizerMode.DATABASE && <ProfileDatabase onOpenCommessa={handleOpenCommessa} forcedTab={dbTab} onTabChange={setDbTab} />}

        <footer className="mt-12 pt-8 border-t text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2025 ALEA SISTEMI S.r.l.</footer>
      </main>
    </div>
  );
};

export default App;
