
import React, { useState, useEffect } from 'react';
import { Plus, Play, Download, Trash2, FileText, Settings, RotateCcw, Boxes, ChevronRight, Hash, Ruler, Warehouse, CheckCircle2, Save, FileSpreadsheet, RefreshCcw } from 'lucide-react';
import { CutRequest, OptimizationResult, OptimizedBar, GroupedBarResult, CommessaArchiviata } from '../types';
import { optimizerService } from '../services/optimizerService';
import { exportService } from '../services/exportService';

interface BarOptimizerProps {
  externalData?: CommessaArchiviata | null;
}

export const BarOptimizer: React.FC<BarOptimizerProps> = ({ externalData }) => {
  const [cliente, setCliente] = useState('');
  const [commessa, setCommessa] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [lunghezzaBarra, setLunghezzaBarra] = useState<string>('');
  const [lunghezzaTaglio, setLunghezzaTaglio] = useState<string>('');
  const [quantita, setQuantita] = useState<number>(1);
  const [angoloSx, setAngoloSx] = useState('90');
  const [angoloDx, setAngoloDx] = useState('90');
  const [lama, setLama] = useState(4);
  const [scartoIniziale, setScartoIniziale] = useState(10);
  const [scartoFinale, setScartoFinale] = useState(10);
  const [groupBars, setGroupBars] = useState(true);

  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [availableClients, setAvailableClients] = useState<any[]>([]);

  const [distinta, setDistinta] = useState<CutRequest[]>([]);
  const [results, setResults] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const profiles = localStorage.getItem('alea_profiles');
    if (profiles) setAvailableProfiles(JSON.parse(profiles));
    const clients = localStorage.getItem('alea_clients');
    if (clients) setAvailableClients(JSON.parse(clients));

    if (externalData && externalData.tipo === 'barre') {
      setCliente(externalData.cliente);
      setCommessa(externalData.numero);
      setDistinta(externalData.dettagli.distinta || []);
      setResults(externalData.dettagli.results || null);
    }
  }, [externalData]);

  useEffect(() => {
    if (selectedProfile) {
      const p = availableProfiles.find(ap => ap.codice === selectedProfile);
      if (p) setLunghezzaBarra(p.lungMax?.toString() || "6000");
    }
  }, [selectedProfile, availableProfiles]);

  const resetAngles = () => {
    setAngoloSx('90');
    setAngoloDx('90');
  };

  const handleAddCut = () => {
    if (!selectedProfile || !lunghezzaTaglio || quantita <= 0 || !lunghezzaBarra) {
      alert("Compila tutti i campi obbligatori!");
      return;
    }
    const newCut: CutRequest = {
      id: Math.random().toString(36).substr(2, 9),
      codice: selectedProfile,
      lung: parseFloat(lunghezzaTaglio.replace(',', '.')),
      qty: quantita,
      angoli: `${angoloSx}/${angoloDx}`,
      lama,
      scIn: scartoIniziale,
      scFin: scartoFinale,
      lungBarra: parseFloat(lunghezzaBarra.replace(',', '.'))
    };
    setDistinta(prev => [...prev, newCut]);
    setLunghezzaTaglio('');
    setQuantita(1);
  };

  const saveCommessaToDb = () => {
    if (distinta.length === 0) return;
    if (cliente.trim()) {
      const savedClients = JSON.parse(localStorage.getItem('alea_clients') || '[]');
      if (!savedClients.find((c: any) => c.nome.toLowerCase() === cliente.toLowerCase())) {
        const nuovoCliente = { id: Math.random().toString(36).substr(2, 9), nome: cliente, dataAggiunta: new Date().toISOString() };
        localStorage.setItem('alea_clients', JSON.stringify([nuovoCliente, ...savedClients]));
      }
    }
    const commesseJson = localStorage.getItem('alea_commesse') || '[]';
    const commesse = JSON.parse(commesseJson);
    const nuovaCommessa: CommessaArchiviata = {
      id: Math.random().toString(36).substr(2, 9),
      numero: commessa || 'Senza Nome',
      cliente: cliente || 'Privato',
      data: new Date().toISOString(),
      tipo: 'barre',
      dettagli: { distinta, results }
    };
    localStorage.setItem('alea_commesse', JSON.stringify([nuovaCommessa, ...commesse]));
    alert("Commessa salvata con successo!");
  };

  const removeCut = (id: string) => setDistinta(prev => prev.filter(c => c.id !== id));

  const runOptimization = () => {
    if (distinta.length === 0) return;
    setIsOptimizing(true);
    setTimeout(() => {
      const result = optimizerService.optimizeBars(distinta);
      setResults(result);
      setIsOptimizing(false);
    }, 600);
  };

  const getGroupedBars = (barre: OptimizedBar[]): GroupedBarResult[] => {
    const groups: Record<string, GroupedBarResult> = {};
    barre.forEach(bar => {
      const fingerprint = bar.tagli.map(t => `${t.lung}-${t.angoli}`).join('|');
      if (groups[fingerprint]) groups[fingerprint].count++;
      else groups[fingerprint] = { ...bar, count: 1 };
    });
    return Object.values(groups);
  };

  const getPezziSummary = (barre: OptimizedBar[]) => {
    const summary: Record<string, { qty: number, lung: number, angoli: string }> = {};
    barre.forEach(bar => {
      bar.tagli.forEach(t => {
        const key = `${t.lung}-${t.angoli}`;
        if (summary[key]) summary[key].qty++;
        else summary[key] = { qty: 1, lung: t.lung, angoli: t.angoli };
      });
    });
    return Object.values(summary).sort((a, b) => b.lung - a.lung);
  };

  // Fix: Added handleExportPdf and handleExportCsv functions to resolve "Cannot find name" errors.
  const handleExportPdf = () => {
    if (results) {
      exportService.toPdf(results, cliente, commessa, groupBars);
    }
  };

  const handleExportCsv = () => {
    if (results) {
      exportService.toCsv(results, groupBars);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
            <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center space-x-2 uppercase tracking-tighter">
              <FileText className="w-5 h-5 text-red-600" />
              <span>Dettagli Commessa</span>
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cliente</label>
                <input list="clients-list" type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Seleziona o scrivi..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                <datalist id="clients-list">{availableClients.map(c => <option key={c.id} value={c.nome} />)}</datalist>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Commessa / Rif.</label>
                <input type="text" value={commessa} onChange={e => setCommessa(e.target.value)} placeholder="ID commessa..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium" />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
            <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center space-x-2 uppercase tracking-tighter">
              <Plus className="w-5 h-5 text-red-600" />
              <span>Aggiunta Taglio</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Profilo</label>
                <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold">
                  <option value="">Seleziona...</option>
                  {availableProfiles.map(p => <option key={p.codice} value={p.codice}>{p.codice} - {p.descr}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">L. Barra (mm)</label>
                  <input type="text" value={lunghezzaBarra} onChange={e => setLunghezzaBarra(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">L. Taglio (mm)</label>
                  <input type="text" value={lunghezzaTaglio} onChange={e => setLunghezzaTaglio(e.target.value)} placeholder="0.0" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-center text-red-600 focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Quantità (pz)</label>
                  <input type="number" value={quantita} onChange={e => setQuantita(parseInt(e.target.value) || 0)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center" />
                </div>
                <div>
                   <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase block">Angoli</label>
                      <button onClick={resetAngles} title="Reset 90/90" className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                   </div>
                   <div className="flex items-center space-x-1">
                      <input type="text" value={angoloSx} onChange={e=>setAngoloSx(e.target.value)} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-xs" />
                      <span className="text-slate-300 font-black">/</span>
                      <input type="text" value={angoloDx} onChange={e=>setAngoloDx(e.target.value)} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-xs" />
                   </div>
                </div>
              </div>
              <button onClick={handleAddCut} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-3 mt-4">
                <Plus className="w-5 h-5" />
                <span>INSERISCI IN DISTINTA</span>
              </button>
            </div>
          </section>

          <section className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl">
             <h3 className="text-xs font-black mb-4 flex items-center space-x-2 uppercase tracking-widest text-slate-400"><Settings className="w-4 h-4" /><span>Setup Tecnico</span></h3>
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Lama (mm)</label>
                      <input type="number" value={lama} onChange={e=>setLama(parseFloat(e.target.value))} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none text-xs" />
                  </div>
                  <div className="flex items-center space-x-2 pt-5">
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={groupBars} onChange={e=>setGroupBars(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-700 rounded-full peer-checked:bg-red-600 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                        <span className="ml-2 text-[9px] font-bold uppercase text-slate-400">Raggruppa</span>
                      </label>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Scarto In. (mm)</label>
                      <input type="number" value={scartoIniziale} onChange={e=>setScartoIniziale(parseFloat(e.target.value))} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none text-xs" />
                  </div>
                  <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Scarto Fin. (mm)</label>
                      <input type="number" value={scartoFinale} onChange={e=>setScartoFinale(parseFloat(e.target.value))} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none text-xs" />
                  </div>
               </div>
             </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-4">
                 <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">Distinta Attuale</h3>
                 <button onClick={saveCommessaToDb} className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-all"><Save className="w-3 h-3" /> Salva in Archivio</button>
              </div>
              <button onClick={() => {setDistinta([]); setResults(null);}} className="text-[10px] font-black text-slate-400 hover:text-red-600 uppercase tracking-widest transition-colors">Svuota</button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white border-b z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase">Profilo</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase">L. Taglio</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase">Pezzi</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-center">X</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {distinta.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-300 italic">Inserisci i tagli per iniziare.</td></tr>
                  ) : (
                    distinta.map((cut) => (
                      <tr key={cut.id} className="hover:bg-slate-50/80 font-bold">
                        <td className="px-6 py-4 text-slate-900">{cut.codice}</td>
                        <td className="px-6 py-4 font-mono text-red-600">{cut.lung} mm <span className="text-[9px] text-slate-400">({cut.angoli})</span></td>
                        <td className="px-6 py-4">{cut.qty}</td>
                        <td className="px-6 py-4 text-center"><button onClick={() => removeCut(cut.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-5 bg-slate-50 border-t">
              <button onClick={runOptimization} disabled={distinta.length === 0 || isOptimizing} className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center space-x-3 shadow-2xl">
                {isOptimizing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Play className="w-5 h-5 fill-white" />}
                <span>CALCOLA OTTIMIZZAZIONE</span>
              </button>
            </div>
          </section>

          {results && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Boxes className="w-6 h-6 text-red-600" />RISULTATI</h3>
                  <div className="flex gap-2">
                    <button onClick={handleExportCsv} className="flex items-center justify-center space-x-2 bg-white border-2 border-slate-200 hover:border-slate-800 px-5 py-2.5 rounded-xl text-xs font-black text-slate-700 shadow-sm transition-all"><FileSpreadsheet className="w-4 h-4 text-green-600" /><span>CSV</span></button>
                    <button onClick={handleExportPdf} className="flex items-center justify-center space-x-2 bg-white border-2 border-slate-200 hover:border-red-500 px-5 py-2.5 rounded-xl text-xs font-black text-slate-700 shadow-sm transition-all"><Download className="w-4 h-4 text-red-600" /><span>STAMPA PDF</span></button>
                  </div>
               </div>
               {(Object.entries(results) as [string, any][]).map(([code, data]) => {
                 const barreDaMostrare = groupBars ? getGroupedBars(data.barre) : data.barre.map(b => ({...b, count: 1}));
                 const pezziSummary = getPezziSummary(data.barre);
                 return (
                   <div key={code} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex items-center space-x-5 border border-slate-800">
                           <div className="bg-red-600/20 p-4 rounded-2xl border border-red-600/30"><Warehouse className="w-8 h-8 text-red-500" /></div>
                           <div>
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Prelievo Magazzino</div>
                              <div className="text-2xl font-black">{data.barre.length} <span className="text-sm font-bold text-slate-400">Barre</span></div>
                              <div className="text-[10px] font-bold text-red-400 mt-1 uppercase">Profilo: {code}</div>
                           </div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl flex items-center space-x-5">
                           <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200"><Hash className="w-8 h-8 text-slate-400" /></div>
                           <div>
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Conteggio Pezzi</div>
                              <div className="text-2xl font-black">{pezziSummary.reduce((s, p) => s + p.qty, 0)} <span className="text-sm font-bold text-slate-400">Pezzi</span></div>
                              <div className="text-[10px] font-bold text-green-600 mt-1 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Pronto per officina</div>
                           </div>
                        </div>
                     </div>
                     <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b flex items-center gap-2"><Ruler className="w-4 h-4 text-red-600" /><h5 className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Riepilogo Tagli Univoci</h5></div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                           {pezziSummary.map((p, pIdx) => (
                              <div key={pIdx} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                 <div className="text-red-600 font-black text-lg leading-none mb-1">{p.qty}x</div>
                                 <div className="text-slate-800 font-black text-xs">{p.lung} mm</div>
                                 <div className="text-[9px] font-bold text-slate-400 uppercase">{p.angoli}</div>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden">
                       <div className="p-6 bg-slate-900 text-white flex justify-between items-center"><div className="space-y-1"><h4 className="font-black text-2xl tracking-tighter text-red-500">{code}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{data.descrizione}</p></div></div>
                       <div className="p-8 space-y-10">
                         {barreDaMostrare.map((bar, idx) => (
                           <div key={idx} className="space-y-4 group">
                             <div className="flex items-end justify-between border-b border-slate-100 pb-2"><span className="text-sm font-black text-slate-800 uppercase">{bar.count > 1 ? `${bar.count}x BARRE IDENTICHE` : `BARRA ${idx + 1}`}</span><div className="text-[10px] font-bold text-slate-400 space-x-3 italic"><span>Taglio: <b className="text-slate-700">{bar.somma} mm</b></span><span>Scarto: <b className="text-red-500">{bar.residuo} mm</b></span></div></div>
                             <div className="h-10 w-full bg-slate-100 rounded-xl overflow-hidden flex border-2 border-slate-200/50 shadow-inner">{bar.tagli.map((t, tIdx) => (<div key={tIdx} className="h-full border-r-2 border-white/40 flex items-center justify-center text-[10px] text-white font-black overflow-hidden" style={{ width: `${(t.lung / (bar.somma + bar.residuo)) * 100}%`, backgroundColor: `hsl(${350 - (tIdx * 15)}, 80%, 55%)` }}><span className="truncate px-1">{t.lung}</span></div>))}<div className="h-full bg-slate-300/20 flex items-center justify-center text-[9px] text-slate-400 font-black italic" style={{ width: `${(bar.residuo / (bar.somma + bar.residuo)) * 100}%` }}>RES.</div></div>
                             <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100"><span className="text-red-600 font-black flex items-center gap-1 uppercase tracking-tighter"><ChevronRight className="w-3 h-3" /> SCHEMA:</span>{bar.riepilogo}</div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                 );
               })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
