
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Download, Trash2, Layout, FileText, Square, Save, Boxes, ChevronRight, Ruler, Search, ChevronDown, AlertCircle, Lock, Unlock } from 'lucide-react';
import { PanelCutRequest, PanelOptimizationResult, CommessaArchiviata, PanelMaterial, Client } from '../types';
import { optimizerService } from '../services/optimizerService';
import { exportService } from '../services/exportService';
import { supabaseService } from '../services/supabaseService';

const SearchableSelect = ({ 
  label, 
  value, 
  options, 
  onChange, 
  placeholder,
  displayKey,
  valueKey,
  secondaryKey
}: { 
  label: string, 
  value: string, 
  options: any[], 
  onChange: (val: string) => void, 
  placeholder: string,
  displayKey: string,
  valueKey: string,
  secondaryKey?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt[displayKey].toLowerCase().includes(search.toLowerCase()) ||
    (secondaryKey && opt[secondaryKey] && opt[secondaryKey].toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find(opt => opt[valueKey] === value);

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-red-500 outline-none flex items-center justify-between cursor-pointer group"
      >
        <span className={`font-bold truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-900 uppercase'}`}>
          {selectedOption ? selectedOption[displayKey] : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Digita per cercare..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-red-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    onChange(opt[valueKey]);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                >
                  <div className="text-xs font-black text-slate-900 uppercase">{opt[displayKey]}</div>
                  {secondaryKey && opt[secondaryKey] && <div className="text-[10px] text-slate-400 font-bold truncate uppercase">{opt[secondaryKey]}</div>}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 font-bold italic">Nessun risultato trovato</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const PanelOptimizer: React.FC<{ externalData?: CommessaArchiviata | null }> = ({ externalData }) => {
  const [cliente, setCliente] = useState('');
  const [commessa, setCommessa] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [codicePannello, setCodicePannello] = useState('');
  const [materiale, setMateriale] = useState('');
  const [larghezzaLastra, setLarghezzaLastra] = useState('3050');
  const [altezzaLastra, setAltezzaLastra] = useState('2050');
  const [lunghezza, setLunghezza] = useState('');
  const [altezza, setAltezza] = useState('');
  const [quantita, setQuantita] = useState(1);
  const [rotazione, setRotazione] = useState(true);
  const [isSheetLocked, setIsSheetLocked] = useState(true);

  const [availablePanels, setAvailablePanels] = useState<PanelMaterial[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [distinta, setDistinta] = useState<PanelCutRequest[]>([]);
  const [results, setResults] = useState<PanelOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const loadData = () => {
    const pRaw = localStorage.getItem('alea_panel_materials') || '[]';
    const cRaw = localStorage.getItem('alea_clients') || '[]';
    const pParsed = JSON.parse(pRaw) as PanelMaterial[];
    const cParsed = JSON.parse(cRaw) as Client[];
    setAvailablePanels(pParsed.sort((a, b) => a.codice.localeCompare(b.codice)));
    setAvailableClients(cParsed.sort((a, b) => a.nome.localeCompare(b.nome)));
  };

  useEffect(() => {
    loadData();
    if (externalData?.tipo === 'pannelli') {
      setCliente(externalData.cliente); setCommessa(externalData.numero);
      setDistinta(externalData.dettagli.distinta || []); setResults(externalData.dettagli.results || null);
    }
    const handleUpdate = () => loadData();
    window.addEventListener('alea_data_updated', handleUpdate);
    return () => window.removeEventListener('alea_data_updated', handleUpdate);
  }, [externalData]);

  const handleSelectPanel = (id: string) => {
    const p = availablePanels.find(ap => ap.id === id);
    if (p) {
      setSelectedPanelId(id); 
      setCodicePannello(p.codice);
      setMateriale(p.materiale);
      setLarghezzaLastra(p.lungDefault.toString()); 
      setAltezzaLastra(p.altDefault.toString());
      setRotazione(p.giraPezzoDefault);
      setIsSheetLocked(true);
    } else {
      setSelectedPanelId('');
      setCodicePannello('');
      setMateriale('');
    }
  };

  const handleAddCut = () => {
    if (!lunghezza || !altezza || !materiale) {
      alert("Specifica materiale e misure!");
      return;
    }

    const sw = parseFloat(larghezzaLastra);
    const sh = parseFloat(altezzaLastra);
    const pw = parseFloat(lunghezza.replace(',', '.'));
    const ph = parseFloat(altezza.replace(',', '.'));

    if (!rotazione) {
      if (pw > sw || ph > sh) {
        alert(`ERRORE: Pezzo (${pw}x${ph}) troppo grande per lastra (${sw}x${sh}) senza rotazione.`);
        return;
      }
    } else {
      const fitsNormal = pw <= sw && ph <= sh;
      const fitsRotated = ph <= sw && pw <= sh;
      if (!fitsNormal && !fitsRotated) {
        alert(`ERRORE: Pezzo (${pw}x${ph}) non entra in lastra (${sw}x${sh}).`);
        return;
      }
    }

    const newCut: PanelCutRequest = {
      id: Math.random().toString(36).substr(2, 9),
      codice: codicePannello,
      materiale,
      lunghezza: pw,
      altezza: ph,
      quantita,
      rotazione
    };
    setDistinta(prev => [...prev, newCut]);
    setLunghezza(''); setAltezza(''); setQuantita(1);
  };

  const runOptimization = () => {
    if (distinta.length === 0) return;
    setIsOptimizing(true);
    setTimeout(() => {
      const res = optimizerService.optimizePanels(distinta, parseFloat(larghezzaLastra), parseFloat(altezzaLastra));
      setResults(res); setIsOptimizing(false);
    }, 600);
  };

  const saveCommessa = async () => {
    if (distinta.length === 0) return;
    const commesse = JSON.parse(localStorage.getItem('alea_commesse') || '[]');
    const nuova: CommessaArchiviata = {
      id: Math.random().toString(36).substr(2, 9),
      numero: commessa || 'Senza Rif.', cliente: cliente || 'Privato', data: new Date().toISOString(),
      tipo: 'pannelli', dettagli: { distinta, results }
    };
    const aggiornate = [nuova, ...commesse];
    localStorage.setItem('alea_commesse', JSON.stringify(aggiornate));
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    if (supabaseService.isInitialized()) await supabaseService.syncTable('commesse', aggiornate);
    alert("Archiviato!");
  };

  const drawCanvas = (id: string, sheet: any, sheetW: number, sheetH: number) => {
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = Math.min(800 / sheetW, 500 / sheetH);
    ctx.clearRect(0, 0, 800, 500);
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, sheetW * scale, sheetH * scale);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, sheetW * scale, sheetH * scale);
    
    sheet.panels.forEach((p: any) => {
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.strokeRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
        const label = `${p.w}x${p.h}`;
        const fits = (p.w * scale > 45) && (p.h * scale > 20);
        ctx.fillStyle = 'black'; ctx.font = fits ? 'bold 10px Inter' : 'bold 16px Inter'; ctx.textAlign = 'center';
        ctx.fillText(label, p.x * scale + (p.w * scale / 2), p.y * scale + (p.h * scale / 2) + 5);
    });
  };

  useEffect(() => {
    if (results) {
      (Object.entries(results) as [string, any][]).forEach(([key, group]) => {
        group.sheets.forEach((sheet: any, sIdx: number) => {
          drawCanvas(`${key}-${sIdx}`, sheet, parseFloat(larghezzaLastra), parseFloat(altezzaLastra));
        });
      });
    }
  }, [results, larghezzaLastra, altezzaLastra]);

  const getSheetSummary = (sheet: any) => {
    const summary: Record<string, number> = {};
    sheet.panels.forEach((p: any) => {
      const key = `${p.w}x${p.h}`;
      summary[key] = (summary[key] || 0) + 1;
    });
    return Object.entries(summary).sort((a,b) => b[1] - a[1]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 pb-10">
      <div className="space-y-6">
        <section className="bg-white p-6 rounded-[2rem] border shadow-xl space-y-4">
           <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2 tracking-tighter"><FileText className="w-5 h-5 text-red-600" /> Dettagli Commessa</h3>
           <SearchableSelect label="Cliente" value={cliente} options={availableClients} onChange={setCliente} placeholder="Cerca cliente..." displayKey="nome" valueKey="nome" />
           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Commessa / Rif.</label>
             <input type="text" value={commessa} onChange={e=>setCommessa(e.target.value)} placeholder="Commessa..." className="w-full p-4 border rounded-2xl font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all" />
           </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border shadow-xl space-y-4">
           <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2 tracking-tighter"><Square className="w-5 h-5 text-red-600" /> Lastra Officina</h3>
              <button 
                onClick={() => setIsSheetLocked(!isSheetLocked)}
                className={`p-2 rounded-xl transition-all ${isSheetLocked ? 'text-slate-400 hover:text-slate-600' : 'text-red-600 bg-red-50'}`}
                title={isSheetLocked ? "Sblocca per modificare" : "Blocca misure"}
              >
                {isSheetLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
           </div>
           <SearchableSelect label="Seleziona Pannello Archivio" value={selectedPanelId} options={availablePanels} onChange={handleSelectPanel} placeholder="-- Configura Libera --" displayKey="codice" valueKey="id" secondaryKey="materiale" />
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Base (mm)</label>
                 <input 
                  type="number" 
                  value={larghezzaLastra} 
                  onChange={e=>setLarghezzaLastra(e.target.value)} 
                  readOnly={isSheetLocked}
                  className={`w-full p-4 border rounded-2xl font-black outline-none transition-all ${isSheetLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100' : 'bg-white focus:ring-2 focus:ring-red-500 border-red-200'}`} 
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Altezza (mm)</label>
                 <input 
                  type="number" 
                  value={altezzaLastra} 
                  onChange={e=>setAltezzaLastra(e.target.value)} 
                  readOnly={isSheetLocked}
                  className={`w-full p-4 border rounded-2xl font-black outline-none transition-all ${isSheetLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100' : 'bg-white focus:ring-2 focus:ring-red-500 border-red-200'}`} 
                 />
              </div>
           </div>
           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Nome Materiale (per distinta)</label>
             <input type="text" value={materiale} onChange={e=>setMateriale(e.target.value)} placeholder="Es: Lexan 3mm..." className="w-full p-4 border rounded-2xl font-bold focus:ring-2 focus:ring-red-500 outline-none" />
           </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border shadow-xl space-y-4">
           <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2 tracking-tighter"><Plus className="w-5 h-5 text-red-600" /> Pezzo Finito</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Base mm</label>
                <input type="text" value={lunghezza} onChange={e=>setLunghezza(e.target.value)} placeholder="0.0" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black text-red-600 focus:ring-2 focus:ring-red-600 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Altezza mm</label>
                <input type="text" value={altezza} onChange={e=>setAltezza(e.target.value)} placeholder="0.0" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black text-red-600 focus:ring-2 focus:ring-red-600 outline-none" />
              </div>
           </div>
           <div className="flex items-center justify-between px-2 pt-2">
              <label className="flex items-center gap-3 text-[11px] font-black uppercase text-slate-500 cursor-pointer">
                 <input type="checkbox" checked={rotazione} onChange={e=>setRotazione(e.target.checked)} className="w-6 h-6 rounded-lg text-red-600" /> 
                 <span>Ruotabile</span>
              </label>
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase">Qtà:</label>
                <input type="number" value={quantita} onChange={e=>setQuantita(parseInt(e.target.value)||1)} className="w-20 p-3 border rounded-xl text-center font-black focus:ring-2 focus:ring-red-500" />
              </div>
           </div>
           <button onClick={handleAddCut} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-red-700 transition-all uppercase tracking-widest text-sm mt-2">Aggiungi in Distinta</button>
        </section>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-[2.5rem] border shadow-xl flex flex-col h-[520px]">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Elenco Tagli</h3>
            <div className="flex gap-4">
              <button onClick={saveCommessa} className="text-[10px] font-black bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 shadow-lg flex gap-2 items-center transition-all active:scale-95"><Save className="w-3.5 h-3.5"/> Archivia</button>
              <button onClick={()=>{setDistinta([]); setResults(null);}} className="text-xs text-red-500 font-bold uppercase hover:underline">Svuota</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="w-full text-left text-xs">
                <thead><tr className="border-b font-black text-slate-400 uppercase tracking-widest bg-slate-50/20"><th className="p-5">Materiale</th><th className="p-5">Misure (mm)</th><th className="p-5 text-center">Qtà</th><th className="p-5 text-center">X</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {distinta.map(c=>(
                    <tr key={c.id} className="font-bold hover:bg-slate-50 transition-all">
                       <td className="p-5">
                          <div className="text-slate-900 uppercase font-black">{c.materiale}</div>
                          {c.codice && <div className="text-[10px] text-red-600 font-black uppercase tracking-widest mt-0.5">{c.codice}</div>}
                       </td>
                       <td className="p-5 text-slate-900 font-black text-sm">{c.lunghezza} x {c.altezza}</td>
                       <td className="p-5 text-center bg-slate-50/50"><span className="text-red-600 font-black text-sm">{c.quantita}</span> pz</td>
                       <td className="p-5 text-center"><button onClick={()=>setDistinta(prev=>prev.filter(x=>x.id!==c.id))} className="p-2 text-slate-300 hover:text-red-600 transition-all"><Trash2 className="w-5 h-5"/></button></td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
          <div className="p-6 bg-slate-50 border-t"><button onClick={runOptimization} disabled={distinta.length === 0 || isOptimizing} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-2xl hover:bg-slate-800 transition-all tracking-[0.2em] text-sm">
            {isOptimizing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div> : "Avvia Ottimizzazione Nesting"}
          </button></div>
        </section>

        {results && (
          <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-700">
             <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-lg gap-4">
                <h3 className="font-black text-2xl uppercase tracking-tighter flex items-center gap-3"><Boxes className="w-7 h-7 text-red-600" /> Soluzioni Generate</h3>
                <button onClick={()=>exportService.panelToPdf(results, cliente, commessa, parseFloat(larghezzaLastra), parseFloat(altezzaLastra))} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black flex gap-2 shadow-xl hover:bg-red-700 transition-all uppercase tracking-widest text-xs"><Download /> Scarica PDF</button>
             </div>
             
             {(Object.entries(results) as [string, any][]).map(([key, group]) => (
                <div key={key} className="space-y-6">
                   <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl border-l-[12px] border-red-600">
                      <div className="space-y-1">
                        <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">{group.codice || 'LIBERO'}</h4>
                        <p className="text-xs font-black text-slate-300 uppercase tracking-widest">{group.material}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-5xl font-black text-white leading-none">{group.sheets.length}</div>
                        <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2">Fogli Totali</div>
                      </div>
                   </div>

                   {group.sheets.map((sheet: any, sIdx: number) => {
                      const summary = getSheetSummary(sheet);
                      return (
                        <div key={sIdx} className="bg-white p-8 sm:p-10 rounded-[3rem] border shadow-2xl space-y-8">
                           <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-6 gap-2">
                              <span className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><ChevronRight className="w-6 h-6 text-red-600" /> Foglio {sIdx + 1}</span>
                              <div className="flex gap-4">
                                  <span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-5 py-2 rounded-full border border-red-100">Sfrido: {sheet.residuo.toLocaleString()} mm²</span>
                              </div>
                           </div>
                           <div className="flex flex-col items-center gap-8 bg-slate-50 p-4 sm:p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-inner">
                              <canvas ref={el => canvasRefs.current[`${key}-${sIdx}`] = el} width={800} height={500} className="max-w-full rounded-2xl shadow-2xl bg-white border-2 border-slate-900" />
                              <div className="w-full bg-white p-6 rounded-2xl border shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Pezzi in questo foglio:</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  {summary.map(([dim, q]) => (
                                    <div key={dim} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                                      <span className="text-xs font-black text-red-600">{q}x</span>
                                      <span className="text-[11px] font-bold text-slate-700">{dim} mm</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                           </div>
                        </div>
                      );
                   })}
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
