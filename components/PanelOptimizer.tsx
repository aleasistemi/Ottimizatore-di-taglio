
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Play, Download, Trash2, Layout, Maximize, Settings, FileText, Square, Save, FileSpreadsheet, Ruler, Palette } from 'lucide-react';
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

  useEffect(() => {
    const load = () => {
      const p = localStorage.getItem('alea_panel_materials');
      if (p) setAvailablePanels(JSON.parse(p));
      const c = localStorage.getItem('alea_clients');
      if (c) setAvailableClients(JSON.parse(c));
    };
    load();
    window.addEventListener('alea_data_updated', load);
    return () => window.removeEventListener('alea_data_updated', load);
  }, []);

  const handleSelectPanel = (id: string) => {
    const p = availablePanels.find(ap => ap.id === id);
    if (p) {
      setSelectedPanelId(id);
      setMateriale(p.materiale);
      setSpessore(p.spessore);
      setLarghezzaLastra(p.lungDefault.toString());
      setAltezzaLastra(p.altDefault.toString());
    }
  };

  const handleAddCut = () => {
    if (!lunghezza || !altezza) return;
    const newCut: PanelCutRequest = {
      id: Math.random().toString(36).substr(2, 9),
      materiale,
      spessore,
      colore: coloreLastra,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
      <div className="lg:col-span-1 space-y-6">
        <section className="bg-white p-6 rounded-[2rem] border shadow-xl">
           <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2">Dati Lastra Grezza</h3>
           <div className="space-y-4">
              <select value={selectedPanelId} onChange={e=>handleSelectPanel(e.target.value)} className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase outline-none">
                <option value="">Lastra da Archivio...</option>
                {availablePanels.map(p => <option key={p.id} value={p.id}>{p.codice} ({p.materiale})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={larghezzaLastra} onChange={e=>setLarghezzaLastra(e.target.value)} className="w-full p-3 border rounded-xl font-black" placeholder="Base..." />
                <input type="number" value={altezzaLastra} onChange={e=>setAltezzaLastra(e.target.value)} className="w-full p-3 border rounded-xl font-black" placeholder="Altezza..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={spessore} onChange={e=>setSpessore(e.target.value)} className="w-full p-3 border rounded-xl font-black text-red-600" placeholder="Spessore mm..." />
                <input type="text" value={coloreLastra} onChange={e=>setColoreLastra(e.target.value)} className="w-full p-3 border rounded-xl font-bold" placeholder="Colore..." />
              </div>
           </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border shadow-xl">
          <h3 className="text-xs font-black uppercase text-slate-400 mb-6">Nuovo Pezzo Tagliato</h3>
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <input type="text" value={lunghezza} onChange={e=>setLunghezza(e.target.value)} placeholder="Base..." className="w-full p-4 border-2 border-slate-100 rounded-xl font-black text-red-600" />
                <input type="text" value={altezza} onChange={e=>setAltezza(e.target.value)} placeholder="Altezza..." className="w-full p-4 border-2 border-slate-100 rounded-xl font-black text-red-600" />
             </div>
             <div className="flex gap-4">
                <input type="number" value={quantita} onChange={e=>setQuantita(parseInt(e.target.value)||1)} className="w-24 p-3 border rounded-xl font-black text-center" />
                <button onClick={handleAddCut} className="flex-1 bg-red-600 text-white font-black rounded-2xl shadow-lg">AGGIUNGI</button>
             </div>
          </div>
        </section>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden h-[450px] flex flex-col">
          <div className="p-6 border-b bg-slate-50 flex justify-between">
            <h3 className="text-xs font-black uppercase text-slate-500">Distinta Pannelli ({materiale} {spessore}mm)</h3>
            <button onClick={()=>setDistinta([])} className="text-xs text-red-500 font-bold">SVUOTA</button>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="w-full text-left text-xs">
                <thead><tr className="border-b font-black text-slate-400"><th className="p-4">Misure</th><th className="p-4 text-center">Quantità</th><th className="p-4 text-center">X</th></tr></thead>
                <tbody>
                  {distinta.map(c=>(
                    <tr key={c.id} className="border-b font-bold">
                       <td className="p-4 text-red-600">{c.lunghezza} x {c.altezza} mm</td>
                       <td className="p-4 text-center">{c.quantita} pz</td>
                       <td className="p-4 text-center"><button onClick={()=>setDistinta(prev=>prev.filter(x=>x.id!==c.id))}><Trash2 className="w-4 h-4 text-slate-300" /></button></td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
          <div className="p-6"><button onClick={runOptimization} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase">Ottimizza Nesting</button></div>
        </section>
        {results && (
          <div className="animate-in fade-in duration-500 space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="font-black text-xl uppercase">Nesting Risultante</h3>
                <button onClick={()=>exportService.panelToPdf(results, cliente, commessa, parseFloat(larghezzaLastra), parseFloat(altezzaLastra), coloreLastra, spessore)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black flex gap-2"><Download /> PDF</button>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border shadow-xl flex justify-center">
                <canvas ref={canvasRef} width={800} height={500} className="max-w-full rounded-lg border shadow-inner" />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
