
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { BarOptimizer } from './components/BarOptimizer';
import { PanelOptimizer } from './components/PanelOptimizer';
import { ProfileDatabase } from './components/ProfileDatabase';
import { OptimizerMode, CommessaArchiviata } from './types';
import { AlertTriangle, CheckCircle2, Database as DbIcon, Cloud, Monitor } from 'lucide-react';
import { supabaseService } from './services/supabaseService';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<OptimizerMode>(OptimizerMode.BARRE);
  const [dbTab, setDbTab] = useState<'profili' | 'pannelli' | 'clienti' | 'commesse' | 'settings'>('profili');
  const [loadedCommessa, setLoadedCommessa] = useState<CommessaArchiviata | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('alea_disclaimer_accepted');
    if (!accepted) setShowDisclaimer(true);

    const sbUrl = localStorage.getItem('alea_sb_url');
    const sbKey = localStorage.getItem('alea_sb_key');
    if (sbUrl && sbKey) {
      const ok = supabaseService.init(sbUrl, sbKey);
      setIsCloudActive(ok);
    }

    const interval = setInterval(() => {
      setIsCloudActive(supabaseService.isInitialized());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('alea_disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };

  const handleOpenCommessa = (commessa: CommessaArchiviata) => {
    setLoadedCommessa(commessa);
    setActiveMode(commessa.tipo === 'barre' ? OptimizerMode.BARRE : OptimizerMode.PANNELLI);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToCloudSettings = () => {
    setActiveMode(OptimizerMode.DATABASE);
    setDbTab('settings');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="bg-red-600 p-8 text-white">
              <div className="flex items-center gap-4 mb-2">
                <AlertTriangle className="w-10 h-10" />
                <h2 className="text-3xl font-black tracking-tighter italic uppercase">Informativa</h2>
              </div>
              <p className="text-red-100 font-bold text-xs uppercase tracking-widest opacity-80">ALEA SISTEMI S.r.l.</p>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-4 text-slate-600 leading-relaxed text-sm">
                <p>L’ottimizzatore è uno strumento gratuito messo a disposizione da <strong>ALEA SISTEMI S.r.l.</strong> per facilitare il calcolo dei tagli e l’organizzazione dei materiali.</p>
                <p>L’utilizzo avviene sotto la piena responsabilità dell’utente. Nonostante la massima attenzione nella realizzazione del software, ALEA SISTEMI S.r.l. non garantisce l’accuratezza, la completezza o l’assenza di errori nei risultati forniti.</p>
                <p>L’azienda non potrà essere ritenuta responsabile per eventuali danni, sprechi di materiale o altre conseguenze derivanti dall’uso dei dati generati dallo strumento.</p>
                <p className="font-black text-slate-900">Proseguendo, l’utente dichiara di aver letto e accettato queste condizioni.</p>
              </div>
              <button 
                onClick={handleAcceptDisclaimer}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span>ACCETTO E PROSEGUO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar 
        activeMode={activeMode} 
        onModeChange={(mode) => {
          setActiveMode(mode);
          if (mode === OptimizerMode.DATABASE) setDbTab('profili');
          setLoadedCommessa(null);
        }}
        onOpenSettings={goToCloudSettings}
      />

      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8">
        <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">ALEA SISTEMI</h1>
            <p className="text-[10px] font-bold text-red-600 tracking-[0.3em] uppercase mt-1 opacity-90">Gestione Professionale Taglio</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl border shadow-lg self-center md:self-auto space-x-1">
            <div className={`flex items-center px-4 py-2 space-x-2 rounded-xl border transition-all ${!isCloudActive ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-transparent opacity-60'}`}>
              {!isCloudActive ? (
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ring-4 ring-green-100"></div>
              ) : (
                <Monitor className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-tight whitespace-nowrap ${!isCloudActive ? 'text-green-700' : 'text-slate-500'}`}>
                Archivio Locale
              </span>
            </div>

            <button 
              onClick={goToCloudSettings}
              className={`flex items-center px-4 py-2 space-x-2 rounded-xl border transition-all ${isCloudActive ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-200 group'}`}
            >
              {isCloudActive ? (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse ring-4 ring-blue-100"></div>
              ) : (
                <Cloud className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-tight whitespace-nowrap ${isCloudActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-800'}`}>
                Cloud ALEA
              </span>
              {isCloudActive && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
            </button>
          </div>
        </header>

        {activeMode === OptimizerMode.BARRE && <BarOptimizer externalData={loadedCommessa} />}
        {activeMode === OptimizerMode.PANNELLI && <PanelOptimizer externalData={loadedCommessa} />}
        {activeMode === OptimizerMode.DATABASE && (
          <ProfileDatabase 
            onOpenCommessa={handleOpenCommessa} 
            forcedTab={dbTab} 
            onTabChange={setDbTab}
          />
        )}

        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} ALEA SISTEMI S.r.l. - Tutti i diritti riservati.
        </footer>
      </main>
    </div>
  );
};

export default App;
