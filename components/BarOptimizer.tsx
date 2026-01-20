
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Play, Download, Trash2, FileText, Settings, Boxes, ChevronRight, Hash, Ruler, Warehouse, CheckCircle2, Save, FileSpreadsheet, RotateCcw, Search, ChevronDown, Lock, Unlock } from 'lucide-react';
import { CutRequest, OptimizationResult, OptimizedBar, GroupedBarResult, CommessaArchiviata, Client, Profile } from '../types';
import { optimizerService } from '../services/optimizerService';
import { exportService } from '../services/exportService';
import { supabaseService } from '../services/supabaseService';

interface BarOptimizerProps {
  externalData?: CommessaArchiviata | null;
}

const SearchableSelect = ({ 
  label, 
  value, 
  options, 
  onChange, 
  placeholder,
  displayKey,
  valueKey 
}: { 
  label: string, 
  value: string, 
  options: any[], 
  onChange: (val: string) => void, 
  placeholder: string,
  displayKey: string,
  valueKey: string
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
    (opt.descr && opt.descr.toLowerCase().includes(search.toLowerCase()))
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
                  {opt.descr && <div className="text-[10px] text-slate-400 font-bold truncate uppercase">{opt.descr}</div>}
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
  const [isBarLocked, setIsBarLocked] = useState(true);

  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);

  const [distinta, setDistinta] = useState<CutRequest[]>([]);
  const [results, setResults] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const loadData = () => {
    const profilesRaw = localStorage.getItem('alea_profiles');
    if (profilesRaw) {
      const parsed = JSON.parse(profilesRaw) as Profile[];
      setAvailableProfiles(parsed.sort((a, b) => a.codice.localeCompare(b.codice)));
    }
    
    const clientsRaw = localStorage.getItem('alea_clients');
    if (clientsRaw) {
      const parsed = JSON.parse(clientsRaw) as Client[];
      setAvailableClients(parsed.sort((a, b) => a.nome.localeCompare(b.nome)));
    }
  };

  useEffect(() => {
    loadData();
    if (externalData && externalData.tipo === 'barre') {
      setCliente(externalData.cliente);
      setCommessa(externalData.numero);
      setDistinta(externalData.dettagli.distinta || []);
      setResults(externalData.dettagli.results || null);
    }
    const handleUpdate = () => loadData();
    window.addEventListener('alea_data_updated', handleUpdate);
    return () => window.removeEventListener('alea_data_updated', handleUpdate);
  }, [externalData]);

  useEffect(() => {
    if (selectedProfile) {
      const p = availableProfiles.find(ap => ap.codice === selectedProfile);
      if (p) {
        setLunghezzaBarra(p.lungMax?.toString() || "6000");
        setIsBarLocked(true); // Auto-lock quando cambia il profilo
      }
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

    const lungT = parseFloat(lunghezzaTaglio.replace(',', '.'));
    const lungB = parseFloat(lunghezzaBarra);

    if (lungT > (lungB - scartoIniziale - scartoFinale)) {
      alert(`MISURA TAGLIO ERRATA: Il taglio (${lungT}mm) è più lungo della capacità della barra (${lungB - scartoIniziale - scartoFinale}mm).`);
      return;
    }

    const newCut: CutRequest = {
      id: Math.random().toString(36).substr(2, 9),
      codice: selectedProfile,
      lung: lungT,
      qty: quantita,
      angoli: `${angoloSx}/${angoloDx}`,
      lama,
      scIn: scartoIniziale,
      scFin: scartoFinale,
      lungBarra: lungB
    };

    setDistinta(prev => [...prev, newCut]);
    setLunghezzaTaglio('');
    setQuantita(1);
    resetAngles();
  };

  const runOptimization = () => {
    if (distinta.length === 0) return;
    setIsOptimizing(true);
    setTimeout(() => {
      const res = optimizerService.optimizeBars(distinta);
      setResults(res);
      setIsOptimizing(false);
    }, 600);
  };

  const saveCommessa = async () => {
    if (distinta.length === 0) return;
    const currentCommesse = JSON.parse(localStorage.getItem('alea_commesse') || '[]');
    const nuovaCommessa: CommessaArchiviata = {
      id: Math.random().toString(36).substr(2, 9),
      numero: commessa || 'Senza Rif.',
      cliente: cliente || 'Privato',
      data: new Date().toISOString(),
      tipo: 'barre',
      dettagli: { distinta, results }
    };
    const aggiornate = [nuovaCommessa, ...currentCommesse];
    localStorage.setItem('alea_commesse', JSON.stringify(aggiornate));
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    if (supabaseService.isInitialized()) await supabaseService.syncTable('commesse', aggiornate);
    alert("Archiviato con successo!");
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
           <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2 tracking-tighter"><Warehouse className="w-5 h-5 text-red-600" /> Barra Grezza</h3>
           <SearchableSelect label="Profilo in Archivio" value={selectedProfile} options={availableProfiles} onChange={setSelectedProfile} placeholder="Seleziona Profilo..." displayKey="codice" valueKey="codice" />
           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Lunghezza Barra (mm)</label>
             <div className="relative">
                <input 
                  type="number" 
                  value={lunghezzaBarra} 
                  onChange={e=>setLunghezzaBarra(e.target.value)} 
                  readOnly={isBarLocked}
                  className={`w-full p-4 pr-12 border rounded-2xl font-black transition-all outline-none ${isBarLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100' : 'focus:ring-2 focus:ring-red-500 border-slate-200'}`} 
                />
                <button 
                  onClick={() => setIsBarLocked(!isBarLocked)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isBarLocked ? 'text-slate-400 hover:text-slate-600' : 'text-red-600 bg-red-50'}`}
                  title={isBarLocked ? "Sblocca per modificare" : "Blocca misura"}
                >
                  {isBarLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Scarto Inizio</label>
                 <input type="number" value={scartoIniziale} onChange={e=>setScartoIniziale(parseInt(e.target.value)||0)} className="w-full p-3 border rounded-xl font-bold" />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Scarto Fine</label>
                 <input type="number" value={scartoFinale} onChange={e=>setScartoFinale(parseInt(e.target.value)||0)} className="w-full p-3 border rounded-xl font-bold" />
              </div>
           </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border shadow-xl space-y-4">
           <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2 tracking-tighter"><Plus className="w-5 h-5 text-red-600" /> Nuovo Taglio</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Lunghezza mm</label>
                <input type="text" value={lunghezzaTaglio} onChange={e=>setLunghezzaTaglio(e.target.value)} placeholder="0.0" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black text-red-600 focus:ring-2 focus:ring-red-600 outline-none" />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Quantità</label>
                <input type="number" value={quantita} onChange={e=>setQuantita(parseInt(e.target.value)||1)} className="w-full p-4 border rounded-2xl font-black focus:ring-2 focus:ring-red-600 outline-none" />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Angolo Sx</label>
                 <select value={angoloSx} onChange={e=>setAngoloSx(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none">
                    {['90', '45', '135', '60', '30'].map(a => <option key={a} value={a}>{a}°</option>)}
                 </select>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Angolo Dx</label>
                 <select value={angoloDx} onChange={e=>setAngoloDx(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none">
                    {['90', '45', '135', '60', '30'].map(a => <option key={a} value={a}>{a}°</option>)}
                 </select>
              </div>
           </div>
           <div className="flex items-center gap-4 px-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">Spessore Lama:</label>
              <input type="number" value={lama} onChange={e=>setLama(parseFloat(e.target.value))} className="w-16 p-2 border rounded-lg text-center font-bold" />
           </div>
           <button onClick={handleAddCut} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-red-700 transition-all uppercase tracking-widest text-sm mt-2">Aggiungi Taglio</button>
        </section>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-[2.5rem] border shadow-xl flex flex-col h-[520px]">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Distinta Taglio</h3>
            <div className="flex gap-4">
              <button onClick={saveCommessa} className="text-[10px] font-black bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 shadow-lg flex gap-2 items-center transition-all active:scale-95"><Save className="w-3.5 h-3.5"/> Archivia</button>
              <button onClick={()=>setDistinta([])} className="text-xs text-red-500 font-bold uppercase hover:underline">Svuota tutto</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="w-full text-left text-xs">
                <thead><tr className="border-b font-black text-slate-400 uppercase tracking-widest bg-slate-50/20"><th className="p-5">Profilo</th><th className="p-5">Lunghezza</th><th className="p-5 text-center">Quantità</th><th className="p-5 text-center">Angoli</th><th className="p-5 text-center">Azioni</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {distinta.map(cut => (
                    <tr key={cut.id} className="font-bold hover:bg-slate-50 transition-all group">
                       <td className="p-5 text-slate-900 uppercase font-black">{cut.codice}</td>
                       <td className="p-5 text-slate-900 font-black text-sm">{cut.lung} mm</td>
                       <td className="p-5 text-center bg-slate-50/50"><span className="text-red-600 font-black text-sm">{cut.qty}</span> pz</td>
                       <td className="p-5 text-center text-[10px] text-slate-400">{cut.angoli}</td>
                       <td className="p-5 text-center"><button onClick={()=>setDistinta(prev=>prev.filter(c=>c.id!==cut.id))} className="p-2 text-slate-300 hover:text-red-600 transition-all"><Trash2 className="w-5 h-5"/></button></td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
          <div className="p-6 bg-slate-50 border-t"><button onClick={runOptimization} disabled={distinta.length === 0 || isOptimizing} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-2xl hover:bg-slate-800 transition-all tracking-[0.2em] text-sm">
            {isOptimizing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div> : "Calcola Tagli Ottimali"}
          </button></div>
        </section>

        {results && (
          <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-700">
             <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-lg gap-4">
                <h3 className="font-black text-2xl uppercase tracking-tighter flex items-center gap-3"><Boxes className="w-7 h-7 text-red-600" /> Soluzione Ottimizzata</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 cursor-pointer hover:text-slate-600">
                    <input type="checkbox" checked={groupBars} onChange={e=>setGroupBars(e.target.checked)} className="w-4 h-4 rounded text-red-600" />
                    Raggruppa barre identiche
                  </label>
                  <button onClick={()=>exportService.toPdf(results, cliente, commessa, groupBars)} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black flex gap-2 shadow-xl hover:bg-red-700 transition-all uppercase tracking-widest text-xs"><Download /> Esporta PDF</button>
                </div>
             </div>
             
             {Object.entries(results).map(([code, data]) => (
                <div key={code} className="space-y-6">
                   <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl border-l-[12px] border-red-600">
                      <div>
                        <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">{code}</h4>
                        <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-2">{data.descrizione}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-5xl font-black text-white leading-none">{data.barre.length}</div>
                        <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2">Barre Totali</div>
                      </div>
                   </div>

                   {(groupBars ? exportService.getGroupedBars(data.barre) : data.barre.map(b => ({...b, count: 1}))).map((bar, idx) => (
                      <div key={idx} className="bg-white p-8 sm:p-10 rounded-[3rem] border shadow-2xl space-y-8 group transition-all hover:border-red-100">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-6 gap-2">
                            <span className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                               <ChevronRight className="w-6 h-6 text-red-600" /> 
                               {bar.count}x Barre con schema:
                            </span>
                            <div className="flex gap-4">
                               <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-5 py-2 rounded-full border border-slate-200">Somma Tagli: {bar.somma} mm</span>
                               <span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-5 py-2 rounded-full border border-red-100">Sfrido: {bar.residuo} mm</span>
                            </div>
                         </div>
                         
                         <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start">
                            {bar.tagli.map((cut, cIdx) => (
                               <div key={cIdx} className="relative flex flex-col items-center">
                                  <div className="bg-slate-50 border-2 border-slate-900 w-28 py-8 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden group-hover:bg-white transition-all">
                                     <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
                                     <div className="absolute top-0 right-0 w-1 h-full bg-slate-900"></div>
                                     <span className="text-lg font-black text-slate-900 z-10">{cut.lung}</span>
                                     <div className="absolute bottom-1 right-2 text-[8px] font-black text-slate-300">{cut.angoli}</div>
                                  </div>
                                  <div className="mt-3 flex items-center gap-1">
                                     <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                     <span className="text-[10px] font-black text-slate-400 uppercase">Taglio {cIdx + 1}</span>
                                  </div>
                               </div>
                            ))}
                            <div className="bg-red-50 border-2 border-dashed border-red-200 w-20 py-8 rounded-2xl flex items-center justify-center opacity-60">
                               <span className="text-xs font-black text-red-400 uppercase tracking-widest -rotate-90">Sfrido</span>
                            </div>
                         </div>
                         <div className="pt-6 border-t bg-slate-50/50 p-6 rounded-3xl border-dashed">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Distinta Sintetica:</div>
                            <div className="text-sm font-black text-slate-800 tracking-tight">{bar.riepilogo}</div>
                         </div>
                      </div>
                   ))}
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
