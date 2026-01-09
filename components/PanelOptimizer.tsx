
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Download, Trash2, Layout, FileText, Square, Save, Ruler, Palette, FileSpreadsheet, ChevronRight } from 'lucide-react';
import { PanelCutRequest, PanelOptimizationResult, CommessaArchiviata, PanelMaterial, Client } from '../types';
import { optimizerService } from '../services/optimizerService';
import { exportService } from '../services/exportService';
import { supabaseService } from '../services/supabaseService';

const COLORI_MATERIALE: Record<string, string> = { "Lexan": "#f87171", "Dibond": "#60a5fa", "Alveolare": "#4ade80", "Pvc": "#fbbf24", "Vetro": "#94a3b8" };

interface PanelOptimizerProps {
  externalData?: CommessaArchiviata | null;
}

export const PanelOptimizer: React.FC<PanelOptimizerProps> = ({ externalData }) => {
  const [cliente, setCliente] = useState('');
  const [commessa, setCommessa] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [materiale, setMateriale] = useState('Lexan');
  const [spessore, setSpessore] = useState('3');
  const [coloreLastra, setColoreLastra] = useState('');
  const [larghezzaLastra, setLarghezzaLastra] = useState('3050');
  const [altezzaLastra, setAltezzaLastra] = useState('2050');
  const [lunghezza, setLunghezza] = useState('');
  const [altezza, setAltezza] = useState('');
  const [quantita, setQuantita] = useState(1);
  const [rotazione, setRotazione] = useState(true);

  const [availablePanels, setAvailablePanels] = useState<PanelMaterial[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [distinta, setDistinta] = useState<PanelCutRequest[]>([]);
  const [results, setResults] = useState<PanelOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const loadData = () => {
    const saved = localStorage.getItem('alea_panel_materials');
    if (saved) setAvailablePanels(JSON.parse(saved));
    const clients = localStorage.getItem('alea_clients');
    if (clients) setAvailableClients(JSON.parse(clients));
  };

  useEffect(() => {
    loadData();
    if (externalData && externalData.tipo === 'pannelli') {
      setCliente(externalData.cliente);
      setCommessa(externalData.numero);
      setDistinta(externalData.dettagli.distinta || []);
      setResults(externalData.dettagli.results || null);
    }
    window.addEventListener('alea_data_updated', loadData);
    return () => window.removeEventListener('alea_data_updated', loadData);
  }, [externalData]);

  const handleSelectPanel = (id: string) => {
    const p = availablePanels.find(ap => ap.id === id);
    if (p) {
      setSelectedPanelId(id);
      setMateriale(p.materiale);
      setSpessore(p.spessore);
      setLarghezzaLastra(p.lungDefault.toString());
      setAltezzaLastra(p.altDefault.toString());
      setRotazione(p.giraPezzoDefault);
    }
  };

  const handleAddCut = () => {
    if (!lunghezza || !altezza) return;
    const newCut: PanelCutRequest = {
      id: Math.random().toString(36).substr(2, 9),
      materiale,
      spessore, 
      colore: coloreLastra || 'N/D',
      lunghezza: parseFloat(lunghezza.replace(',', '.')),
      altezza: parseFloat(altezza.replace(',', '.')),
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
      setResults(res);
      setIsOptimizing(false);
    }, 600);
  };

  const saveCommessa = async () => {
    if (distinta.length === 0) return;
    
    // Gestione Clienti automatica
    let updatedClients = [...availableClients];
    if (cliente && !availableClients.find(c => c.nome.toLowerCase() === cliente.toLowerCase())) {
        const newClient: Client = { id: Math.random().toString(36).substr(2, 9), nome: cliente, dataAggiunta: new Date().toISOString() };
        updatedClients = [newClient, ...availableClients];
        localStorage.setItem('alea_clients', JSON.stringify(updatedClients));
        setAvailableClients(updatedClients);
        if (supabaseService.isInitialized()) await supabaseService.syncTable('clients', updatedClients);
    }

    const commesse = JSON.parse(localStorage.getItem('alea_commesse') || '[]');
    const nuova: CommessaArchiviata = {
      id: Math.random().toString(36).substr(2, 9),
      numero: commessa || 'Senza Rif.',
      cliente: cliente || 'Privato',
      data: new Date().toISOString(),
      tipo: 'pannelli',
      dettagli: { distinta, results }
    };
    const aggiornate = [nuova, ...commesse];
    localStorage.setItem('alea_commesse', JSON.stringify(aggiornate));
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    if (supabaseService.isInitialized()) await supabaseService.syncTable('commesse', aggiornate);
    alert("Commessa archiviata con successo!");
  };

  const drawCanvas = (id: string, sheet: any, sheetW: number, sheetH: number) => {
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = Math.min(800 / sheetW, 500 / sheetH);
    ctx.clearRect(0, 0, 800, 500);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, sheetW * scale, sheetH * scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW * scale, sheetH * scale);
    
    sheet.panels.forEach((p: any) => {
        ctx.fillStyle = COLORI_MATERIALE[p.material] || '#cbd5e1';
        ctx.fillRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1;
        ctx.strokeRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
        
        if (p.w * scale > 30) {
          ctx.fillStyle = 'black'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
          ctx.fillText(`${p.w}x${p.h}`, p.x * scale + (p.w * scale / 2), p.y * scale + (p.h * scale / 2) + 4);
        }
    });
  };

  useEffect(() => {
    if (results) {
      // Fix: Cast entries to [string, any][] to avoid 'unknown' type errors when accessing group properties
      (Object.entries(results) as [string, any][]).forEach(([key, group]) => {
        group.sheets.forEach((sheet: any, sIdx: number) => {
          drawCanvas(`${key}-${sIdx}`, sheet, parseFloat(larghezzaLastra), parseFloat(altezzaLastra));
        });
      });
    }
  }, [results, larghezzaLastra, altezzaLastra]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10 animate-in fade-in duration-500">
      <div className="space-y-6">
        <section className="bg-white p-6 rounded-[2rem] border shadow-xl">
           <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><FileText className="w-4 h-4" /> Dettagli Commessa</h3>
           <div className="space-y-4">
             <div>
               <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cliente</label>
               <input list="clients-list" type="text" value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Seleziona o scrivi..." className="w-full p-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-red-500" />
               <datalist id="clients-list">{availableClients.map(c => <option key={c.id} value={c.nome} />)}</datalist>
             </div>
             <div>
               <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Commessa / Rif.</label>
               <input type="text" value={commessa} onChange={e=>setCommessa(e.target.value)} placeholder="Rif. Commessa..." className="w-full p-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-red-500" />
             </div>
           </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border shadow-xl">
           <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><Square className="w-4 h-4" /> Dati Lastra Grezza</h3>
           <select value={selectedPanelId} onChange={e=>handleSelectPanel(e.target.value)} className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase mb-4">
              <option value="">Configurazione Libera...</option>
              {availablePanels.map(p => <option key={p.id} value={p.id}>{p.codice} - {p.materiale} ({p.spessore}mm)</option>)}
           </select>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400">Base Lastra (mm)</label>
                 <input type="number" value={larghezzaLastra} onChange={e=>setLarghezzaLastra(e.target.value)} className="w-full p-3 border rounded-xl font-black" />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400">Altezza Lastra (mm)</label>
                 <input type="number" value={altezzaLastra} onChange={e=>setAltezzaLastra(e.target.value)} className="w-full p-3 border rounded-xl font-black" />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400">Spessore (mm)</label>
                 <input type="text" value={spessore} onChange={e=>setSpessore(e.target.value)} className="w-full p-3 border rounded-xl font-black text-red-600" />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400">Colore Lastra</label>
                 <input type="text" value={coloreLastra} onChange={e=>setColoreLastra(e.target.value)} className="w-full p-3 border rounded-xl font-bold" placeholder="es. Trasparente..." />
              </div>
           </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border shadow-xl">
           <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><Plus className="w-4 h-4" /> Aggiunta Pezzo</h3>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="text" value={lunghezza} onChange={e=>setLunghezza(e.target.value)} placeholder="Base pezzo..." className="w-full p-3 border-2 border-slate-100 rounded-xl font-black text-red-600" />
              <input type="text" value={altezza} onChange={e=>setAltezza(e.target.value)} placeholder="Altezza pezzo..." className="w-full p-3 border-2 border-slate-100 rounded-xl font-black text-red-600" />
           </div>
           <div className="flex items-center justify-between mb-4 px-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 cursor-pointer">
                 <input type="checkbox" checked={rotazione} onChange={e=>setRotazione(e.target.checked)} className="w-5 h-5 rounded text-red-600" /> Ruotabile
              </label>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black text-slate-400">QTÀ</label>
                <input type="number" value={quantita} onChange={e=>setQuantita(parseInt(e.target.value)||1)} className="w-16 p-2 border rounded-lg text-center font-black" />
              </div>
           </div>
           <button onClick={handleAddCut} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-red-700 transition-all active:scale-95">INSERISCI IN DISTINTA</button>
        </section>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-[2.5rem] border shadow-xl flex flex-col h-[500px]">
          <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-black uppercase text-slate-500">Distinta Pezzi da Ottimizzare</h3>
              <button onClick={saveCommessa} className="text-[10px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-full flex gap-1 items-center hover:bg-blue-700 transition-colors"><Save className="w-3 h-3" /> Archivia</button>
            </div>
            <button onClick={()=>setDistinta([])} className="text-xs text-red-500 font-bold uppercase hover:underline">Svuota Tutto</button>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="w-full text-left text-xs">
                <thead><tr className="border-b font-black text-slate-400 uppercase"><th className="p-4">Materiale / Spessore</th><th className="p-4">Misure (BxH)</th><th className="p-4 text-center">Qtà</th><th className="p-4 text-center">X</th></tr></thead>
                <tbody>
                  {distinta.map(c=>(
                    <tr key={c.id} className="border-b font-bold group hover:bg-slate-50">
                       <td className="p-4">
                         <div className="text-slate-900">{c.materiale} - {c.colore}</div>
                         <div className="text-[10px] text-red-600 font-black">{c.spessore} mm</div>
                       </td>
                       <td className="p-4 text-slate-900 font-black">{c.lunghezza} x {c.altezza} mm</td>
                       <td className="p-4 text-center">{c.quantita} pz</td>
                       <td className="p-4 text-center"><button onClick={()=>setDistinta(prev=>prev.filter(x=>x.id!==c.id))} className="text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                  {distinta.length === 0 && (
                    <tr><td colSpan={4} className="p-20 text-center text-slate-300 italic font-medium">Nessun pezzo in lista. Inserisci i dati a sinistra.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
          <div className="p-6 bg-slate-50 border-t"><button onClick={runOptimization} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">{isOptimizing ? "Calcolo in corso..." : "Avvia Ottimizzazione Multi-Materiale"}</button></div>
        </section>

        {results && (
          <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-500">
             <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border shadow-lg">
                <h3 className="font-black text-xl uppercase flex items-center gap-2"><Layout className="w-6 h-6 text-red-600" /> Soluzioni di Nesting</h3>
                <button onClick={()=>exportService.panelToPdf(results, cliente, commessa, parseFloat(larghezzaLastra), parseFloat(altezzaLastra), coloreLastra, spessore)} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black flex gap-2 shadow-lg hover:bg-red-700 transition-all"><Download /> PDF PROFESSIONALE</button>
             </div>
             
             {/* Fix: Cast entries to [string, any][] to avoid 'unknown' type errors when accessing group properties */}
             {(Object.entries(results) as [string, any][]).map(([key, group]) => (
                <div key={key} className="space-y-6">
                   <div className="bg-slate-900 p-6 rounded-3xl text-white flex justify-between items-center">
                      <div>
                        <h4 className="text-2xl font-black tracking-tighter text-red-500 uppercase">{group.material}</h4>
                        <p className="text-xs font-bold text-slate-400">Spessore: {group.spessore}mm | Gruppo: {key.split('___')[2] || 'N/D'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black">{group.sheets.length}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase">Lastre Necessarie</div>
                      </div>
                   </div>

                   {/* Fix: Explicitly type sheet and index to resolve 'unknown' property access errors */}
                   {group.sheets.map((sheet: any, sIdx: number) => (
                      <div key={sIdx} className="bg-white p-8 rounded-[2.5rem] border shadow-xl space-y-6">
                         <div className="flex justify-between items-center border-b pb-4">
                            <span className="text-sm font-black text-slate-800 flex items-center gap-2"><ChevronRight className="w-4 h-4 text-red-600" /> FOGLIO {sIdx + 1}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">Efficienza: {((sheet.areaUsata / (parseFloat(larghezzaLastra)*parseFloat(altezzaLastra)))*100).toFixed(1)}%</span>
                         </div>
                         <div className="flex justify-center bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
                            <canvas 
                              ref={el => canvasRefs.current[`${key}-${sIdx}`] = el} 
                              width={800} height={500} 
                              className="max-w-full rounded-lg shadow-inner bg-white border" 
                            />
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
