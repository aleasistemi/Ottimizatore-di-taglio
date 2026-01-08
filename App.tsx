
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="bg-red-600 p-8 text-white">
              <div className="flex items-center gap-4 mb-2">
                <AlertTriangle className="w-10 h-10" />
                <h2 className="text-3xl font-black tracking-tighter italic">DISCLAIMER TECNICO</h2>
              </div>
              <p className="text-red-100 font-bold text-sm uppercase tracking-widest opacity-80">ALEA SISTEMI - Note Legali</p>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-800 text-lg">Benvenuto nell'ottimizzatore professionale ALEA SISTEMI.</p>
                <p>L'algoritmo di calcolo è fornito a scopo di supporto produttivo. Sebbene sia progettato per la massima precisione, ALEA SISTEMI non si assume responsabilità per errori di inserimento quote o scarti imprevisti.</p>
                <p>Verificare sempre la distinta di taglio prima di procedere con le lavorazioni meccaniche.</p>
              </div>
              <button 
                onClick={handleAcceptDisclaimer}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span>ACCETTO E CONTINUO</span>
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
                Salvataggio Locale
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
                Salvataggio Cloud
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
          © {new Date().getFullYear()} ALEA SISTEMI. Innovazione nel Taglio.
        </footer>
      </main>
    </div>
  );
};

export default App;
