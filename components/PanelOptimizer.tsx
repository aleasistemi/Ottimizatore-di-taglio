
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Download, Trash2, Layout, FileText, Square, Save, Ruler, Palette, FileSpreadsheet } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      setColoreLastra(externalData.dettagli.coloreLastra || '');
      setSpessore(externalData.dettagli.spessore || '3');
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
      spessore, // Lo spessore è quello della lastra
      colore: coloreLastra, // Il colore è quello della lastra
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
    const commesse = JSON.parse(localStorage.getItem('alea_commesse') || '[]');
    const nuova: CommessaArchiviata = {
      id: Math.random().toString(36).substr(2, 9),
      numero: commessa || 'Senza Rif.',
      cliente: cliente || 'Privato',
      data: new Date().toISOString(),
      tipo: 'pannelli',
      dettagli: { distinta, results, coloreLastra, spessore }
    };
    const aggiornate = [nuova, ...commesse];
    localStorage.setItem('alea_commesse', JSON.stringify(aggiornate));
    window.dispatchEvent(new CustomEvent('alea_local_mutation'));
    if (supabaseService.isInitialized()) await supabaseService.syncTable('commesse', aggiornate);
    alert("Archiviata!");
  };

  useEffect(() => {
    if (results && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        const sheetW = parseFloat(larghezzaLastra);
        const sheetH = parseFloat(altezzaLastra);
        const scale = Math.min(800 / sheetW, 500 / sheetH);
        ctx.clearRect(0, 0, 800, 500);
        ctx.strokeStyle = '#334155'; ctx.strokeRect(0, 0, sheetW * scale, sheetH * scale);
        // Fixed: Cast Object.values to any array to avoid "unknown" type error on .sheets access
        const sheet = (Object.values(results) as any[])[0]?.sheets[0];
        sheet?.panels.forEach(p => {
            ctx.fillStyle = COLORI_MATERIALE[p.material] || '#cbd5e1';
            ctx.fillRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
            ctx.strokeStyle = 'white'; ctx.strokeRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
            ctx.fillStyle = 'black'; ctx.font = 'bold 10px Inter';
            ctx.fillText(`${p.w}x${p.h}`, p.x * scale + 5, p.y * scale + 15);
        });
    }
  }, [results, larghezzaLastra, altezzaLastra]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
      <div className="space-y-6">
        <section className="bg-white p-6 rounded-[2rem] border shadow-xl">
           <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><FileText className="w-4 h-4" /> Testata</h3>
           <input type="text" value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Cliente..." className="w-full p-3 border rounded-xl mb-4 font-bold" />
           <input type="text" value={commessa} onChange={e=>setCommessa(e.target.value)} placeholder="Commessa..." className="w-full p-3 border rounded-xl font-bold" />
        </section>

        <section className="bg-white p-6 rounded-[2rem] border shadow-xl">
           <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><Square className="w-4 h-4" /> Dati Lastra Grezza</h3>
           <select value={selectedPanelId} onChange={e=>handleSelectPanel(e.target.value)} className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase mb-4">
              <option value="">Seleziona Lastra...</option>
              {availablePanels.map(p => <option key={p.id} value={p.id}>{p.codice} - {p.materiale}</option>)}
           </select>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="number" value={larghezzaLastra} onChange={e=>setLarghezzaLastra(e.target.value)} className="w-full p-3 border rounded-xl font-black" placeholder="Base..." />
              <input type="number" value={altezzaLastra} onChange={e=>setAltezzaLastra(e.target.value)} className="w-full p-3 border rounded-xl font-black" placeholder="Altezza..." />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400">Spessore (mm)</label>
                 <input type="text" value={spessore} onChange={e=>setSpessore(e.target.value)} className="w-full p-3 border rounded-xl font-black text-red-600" />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-slate-400">Colore Lastra</label>
                 <input type="text" value={coloreLastra} onChange={e=>setColoreLastra(e.target.value)} className="w-full p-3 border rounded-xl font-bold" placeholder="es. Rosso..." />
              </div>
           </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border shadow-xl">
           <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuovo Pezzo</h3>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="text" value={lunghezza} onChange={e=>setLunghezza(e.target.value)} placeholder="Base..." className="w-full p-3 border-2 border-slate-100 rounded-xl font-black text-red-600" />
              <input type="text" value={altezza} onChange={e=>setAltezza(e.target.value)} placeholder="Altezza..." className="w-full p-3 border-2 border-slate-100 rounded-xl font-black text-red-600" />
           </div>
           <div className="flex items-center justify-between mb-4 px-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 cursor-pointer">
                 <input type="checkbox" checked={rotazione} onChange={e=>setRotazione(e.target.checked)} className="w-4 h-4" /> Rotabile
              </label>
              <input type="number" value={quantita} onChange={e=>setQuantita(parseInt(e.target.value)||1)} className="w-16 p-2 border rounded-lg text-center font-black" />
           </div>
           <button onClick={handleAddCut} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg">AGGIUNGI IN DISTINTA</button>
        </section>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-[2.5rem] border shadow-xl flex flex-col h-[450px]">
          <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-black uppercase text-slate-500">Distinta Pannelli {materiale} {spessore}mm</h3>
              <button onClick={saveCommessa} className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full flex gap-1 items-center"><Save className="w-3 h-3" /> Archivia</button>
            </div>
            <button onClick={()=>setDistinta([])} className="text-xs text-red-500 font-bold uppercase">Svuota</button>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="w-full text-left text-xs">
                <thead><tr className="border-b font-black text-slate-400 uppercase"><th className="p-4">Misure</th><th className="p-4 text-center">Quantità</th><th className="p-4 text-center">Rotazione</th><th className="p-4 text-center">X</th></tr></thead>
                <tbody>
                  {distinta.map(c=>(
                    <tr key={c.id} className="border-b font-bold group">
                       <td className="p-4 text-red-600 font-black">{c.lunghezza} x {c.altezza} mm</td>
                       <td className="p-4 text-center">{c.quantita} pz</td>
                       <td className="p-4 text-center text-[10px] uppercase text-slate-400">{c.rotazione ? 'Sì' : 'No'}</td>
                       <td className="p-4 text-center"><button onClick={()=>setDistinta(prev=>prev.filter(x=>x.id!==c.id))}><Trash2 className="w-4 h-4 text-slate-300 group-hover:text-red-500" /></button></td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
          <div className="p-6 bg-slate-50"><button onClick={runOptimization} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-2xl">Calcola Nesting</button></div>
        </section>

        {results && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="font-black text-xl uppercase flex items-center gap-2"><Layout className="w-6 h-6 text-red-600" /> Anteprima Nesting</h3>
                <div className="flex gap-2">
                   <button onClick={()=>exportService.panelToPdf(results, cliente, commessa, parseFloat(larghezzaLastra), parseFloat(altezzaLastra), coloreLastra, spessore)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black flex gap-2"><Download /> PDF</button>
                </div>
             </div>
             <div className="bg-white p-8 rounded-[2rem] border shadow-xl flex justify-center overflow-hidden">
                <canvas ref={canvasRef} width={800} height={500} className="max-w-full rounded-lg border bg-slate-50" />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
