
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { BarOptimizer } from './components/BarOptimizer';
import { PanelOptimizer } from './components/PanelOptimizer';
import { ProfileDatabase } from './components/ProfileDatabase';
import { OptimizerMode, CommessaArchiviata } from './types';
import { AlertTriangle, CheckCircle2, Database as DbIcon, Cloud } from 'lucide-react';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<OptimizerMode>(OptimizerMode.BARRE);
  const [dbTab, setDbTab] = useState<'profili' | 'clienti' | 'commesse' | 'settings'>('profili');
  const [loadedCommessa, setLoadedCommessa] = useState<CommessaArchiviata | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('alea_disclaimer_accepted');
    if (!accepted) {
      setShowDisclaimer(true);
    }
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
      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="bg-red-600 p-8 text-white">
              <div className="flex items-center gap-4 mb-2">
                <AlertTriangle className="w-10 h-10" />
                <h2 className="text-3xl font-black tracking-tighter italic">DISCLAIMER TECNICO</h2>
              </div>
              <p className="text-red-100 font-bold text-sm uppercase tracking-widest opacity-80">Importante Note Legali e di Utilizzo</p>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-800">Benvenuto nell'ottimizzatore professionale ALEA SISTEMI.</p>
                <p>L'algoritmo di calcolo è fornito a scopo di supporto produttivo. Sebbene sia progettato per la massima precisione, ALEA SISTEMI non si assume responsabilità per errori di inserimento quote, scarti imprevisti o interpretazioni errate dei risultati.</p>
                <p>Si consiglia sempre di verificare la distinta di taglio prima di procedere con le lavorazioni meccaniche sui profili.</p>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs italic">
                  Utilizzando questo software, l'utente dichiara di aver compreso che l'ottimizzazione dipende dai parametri impostati (spessore lama, scarto iniziale/finale).
                </div>
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
        onOpenSettings={() => {
          setActiveMode(OptimizerMode.DATABASE);
          setDbTab('settings');
        }}
      />

      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8">
        <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">ALEA SISTEMI</h1>
            <p className="text-[10px] font-bold text-red-600 tracking-[0.3em] uppercase mt-1 opacity-90">Ottimizzatore Professionale</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl border shadow-sm self-center md:self-auto space-x-1">
            <div className="flex items-center px-4 py-2 space-x-2 bg-green-50 rounded-xl border border-green-100">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-green-700 uppercase tracking-tight whitespace-nowrap">Salvataggio Locale</span>
            </div>
            <button 
              onClick={goToCloudSettings}
              className="flex items-center px-4 py-2 space-x-2 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all"
            >
              <Cloud className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight whitespace-nowrap">Salvataggio Cloud</span>
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
          © {new Date().getFullYear()} ALEA SISTEMI. Eccellenza nel Taglio Alluminio.
        </footer>
      </main>
    </div>
  );
};

export default App;
