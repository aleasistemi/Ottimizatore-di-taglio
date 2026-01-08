
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Play, Download, Trash2, Layout, Maximize, Settings, FileText, Square, Save, FileSpreadsheet } from 'lucide-react';
import { PanelCutRequest, PanelOptimizationResult, CommessaArchiviata, PanelMaterial } from '../types';
import { optimizerService } from '../services/optimizerService';
import { exportService } from '../services/exportService';

const COLORI_MATERIALE: Record<string, string> = { "Lexan": "#f87171", "Dibond": "#60a5fa", "Alveolare": "#4ade80", "Pvc": "#fbbf24", "Vetro": "#94a3b8" };

interface PanelOptimizerProps {
  externalData?: CommessaArchiviata | null;
}

export const PanelOptimizer: React.FC<PanelOptimizerProps> = ({ externalData }) => {
  const [cliente, setCliente] = useState('');
  const [commessa, setCommessa] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [materiale, setMateriale] = useState('Lexan');
  const [spessore, setSpessore] = useState('');
  const [larghezzaLastra, setLarghezzaLastra] = useState('3050');
  const [altezzaLastra, setAltezzaLastra] = useState('2050');
  const [lunghezza, setLunghezza] = useState('');
  const [altezza, setAltezza] = useState('');
  const [quantita, setQuantita] = useState(1);
  const [rotazione, setRotazione] = useState(true);

  const [availablePanels, setAvailablePanels] = useState<PanelMaterial[]>([]);
  const [distinta, setDistinta] = useState<PanelCutRequest[]>([]);
  const [results, setResults] = useState<PanelOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('alea_panel_materials');
    if (saved) setAvailablePanels(JSON.parse(saved));

    if (externalData && externalData.tipo === 'pannelli') {
      setCliente(externalData.cliente);
      setCommessa(externalData.numero);
      setDistinta(externalData.dettagli.distinta || []);
      setResults(externalData.dettagli.results || null);
    }
  }, [externalData]);

  const handleSelectPanel = (id: string) => {
    const p = availablePanels.find(ap => ap.id === id);
    if (p) {
      setSelectedPanelId(id);
      setMateriale(p.materiale);
      setLarghezzaLastra(p.lungDefault.toString());
      setAltezzaLastra(p.altDefault.toString());
    }
  };

  const handleAddCut = () => {
    if (!materiale || !spessore || !lunghezza || !altezza || quantita <= 0) {
      alert("Compila tutti i campi correttamente!");
      return;
    }
    const newCut: PanelCutRequest = {
      id: Math.random().toString(36).substr(2, 9),
      materiale,
      spessore,
      lunghezza: parseFloat(lunghezza.replace(',', '.')),
      altezza: parseFloat(altezza.replace(',', '.')),
      quantita,
      rotazione
    };
    setDistinta(prev => [...prev, newCut]);
    setLunghezza('');
    setAltezza('');
    setQuantita(1);
  };

  const saveCommessaToDb = () => {
    if (distinta.length === 0) return;
    const commesseJson = localStorage.getItem('alea_commesse') || '[]';
    const commesse = JSON.parse(commesseJson);
    const nuovaCommessa: CommessaArchiviata = {
      id: Math.random().toString(36).substr(2, 9),
      numero: commessa || 'Senza Nome',
      cliente: cliente || 'Privato',
      data: new Date().toISOString(),
      tipo: 'pannelli',
      dettagli: { distinta, results }
    };
    localStorage.setItem('alea_commesse', JSON.stringify([nuovaCommessa, ...commesse]));
    alert("Commessa ALEA SISTEMI salvata!");
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

  useEffect(() => {
    if (results && canvasRef.current) drawVisualization();
  }, [results]);

  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas || !results) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sheetW = parseFloat(larghezzaLastra);
    const sheetH = parseFloat(altezzaLastra);
    const margin = 20;
    const groups = Object.values(results) as any[];
    const sheetToDraw = groups[0]?.sheets[0]?.panels || [];
    const scale = Math.min((canvas.width - 2 * margin) / sheetW, (canvas.height - 2 * margin) / sheetH);
    const offsetX = (canvas.width - sheetW * scale) / 2;
    const offsetY = (canvas.height - sheetH * scale) / 2;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.strokeRect(offsetX, offsetY, sheetW * scale, sheetH * scale);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(offsetX, offsetY, sheetW * scale, sheetH * scale);
    sheetToDraw.forEach(p => {
      ctx.fillStyle = COLORI_MATERIALE[p.material] || '#cbd5e1';
      ctx.fillRect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale);
      ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.strokeRect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale);
      if (p.w * scale > 30 && p.h * scale > 15) { ctx.fillStyle = 'white'; ctx.font = 'bold 10px Inter'; ctx.fillText(`${p.w}x${p.h}`, offsetX + p.x * scale + 4, offsetY + p.y * scale + 12); }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-1 space-y-6">
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl">
           <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-tighter"><FileText className="w-5 h-5 text-red-600" /><span>Commessa Pannelli</span></h3>
           <div className="space-y-4">
              <input type="text" value={cliente} onChange={e=>setCliente(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Cliente..." />
              <input type="text" value={commessa} onChange={e=>setCommessa(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Numero Commessa..." />
           </div>
           
           <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 border-t pt-4 mt-6 uppercase tracking-tighter"><Square className="w-5 h-5 text-blue-600" /><span>Lastra di Partenza</span></h3>
           <div className="space-y-4">
              <select value={selectedPanelId} onChange={e=>handleSelectPanel(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold">
                <option value="">-- Seleziona Lastra --</option>
                {availablePanels.map(p => <option key={p.id} value={p.id}>{p.codice} - {p.materiale}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[9px] font-black uppercase text-slate-400">Larghezza (mm)</label><input type="number" value={larghezzaLastra} onChange={e=>setLarghezzaLastra(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-black" /></div>
                <div><label className="text-[9px] font-black uppercase text-slate-400">Altezza (mm)</label><input type="number" value={altezzaLastra} onChange={e=>setAltezzaLastra(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-black" /></div>
              </div>
           </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-tighter"><Plus className="w-5 h-5 text-red-600" /><span>Aggiungi Pezzo</span></h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[9px] font-black uppercase text-slate-400">Materiale</label><select value={materiale} onChange={e=>setMateriale(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"><option>Lexan</option><option>Dibond</option><option>Alveolare</option><option>Pvc</option><option>Vetro</option></select></div>
              <div><label className="text-[9px] font-black uppercase text-slate-400">Spessore (mm)</label>
                <input type="text" placeholder="Es: 2" value={spessore} onChange={e=>setSpessore(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-black" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[9px] font-black uppercase text-slate-400">Larghezza</label><input type="text" value={lunghezza} onChange={e=>setLunghezza(e.target.value)} placeholder="mm" className="w-full px-4 py-2 border rounded-xl font-black text-red-600" /></div>
                <div><label className="text-[9px] font-black uppercase text-slate-400">Altezza</label><input type="text" value={altezza} onChange={e=>setAltezza(e.target.value)} placeholder="mm" className="w-full px-4 py-2 border rounded-xl font-black text-red-600" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" value={quantita} onChange={e=>setQuantita(parseInt(e.target.value)||1)} className="px-4 py-2 bg-gray-50 border rounded-xl font-black" />
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rotazione} onChange={e=>setRotazione(e.target.checked)} className="w-4 h-4 text-red-600" /><span className="text-xs font-black uppercase text-slate-400">Ruotabile</span></label>
            </div>
            <button onClick={handleAddCut} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /><span>INSERISCI</span>
            </button>
          </div>
        </section>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden flex flex-col h-[400px]">
          <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center space-x-4"><h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Distinta Pannelli ALEA SISTEMI</h3><button onClick={saveCommessaToDb} className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-all"><Save className="w-3 h-3" /> Salva</button></div>
             <button onClick={()=>{setDistinta([]); setResults(null);}} className="text-[10px] text-red-500 font-black uppercase tracking-widest">Svuota</button>
          </div>
          <div className="overflow-y-auto flex-1">
             <table className="w-full text-left text-xs">
                <thead className="bg-white border-b sticky top-0 z-10">
                  <tr><th className="px-6 py-4 font-black text-slate-400">Materiale</th><th className="px-6 py-4 font-black text-slate-400">Misure (mm)</th><th className="px-6 py-4 font-black text-slate-400">Pezzi</th><th className="px-6 py-4 text-center">X</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {distinta.map(cut => (
                    <tr key={cut.id} className="hover:bg-slate-50 font-bold"><td className="px-6 py-4 text-slate-800">{cut.materiale} ({cut.spessore}mm)</td><td className="px-6 py-4 font-mono text-red-600">{cut.lunghezza}x{cut.altezza}</td><td className="px-6 py-4">{cut.quantita}</td><td className="px-6 py-4 text-center"><button onClick={()=>setDistinta(prev=>prev.filter(c=>c.id!==cut.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td></tr>
                  ))}
                </tbody>
             </table>
          </div>
          <div className="p-4 bg-gray-50 border-t">
            <button onClick={runOptimization} disabled={distinta.length===0 || isOptimizing} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-2xl">
               {isOptimizing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Layout className="w-5 h-5" />}
               <span>AVVIA OTTIMIZZAZIONE 2D</span>
            </button>
          </div>
        </section>

        {results && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center"><h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><Layout className="w-6 h-6 text-red-600" />NESTING ALEA SISTEMI</h3><div className="flex gap-2"><button onClick={()=>exportService.panelsToCsv(results)} className="bg-white border-2 px-4 py-2 rounded-xl text-xs font-black shadow-sm flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-green-600" /><span>CSV</span></button><button onClick={()=>exportService.panelToPdf(results, cliente, commessa, parseFloat(larghezzaLastra), parseFloat(altezzaLastra))} className="bg-white border-2 px-4 py-2 rounded-xl text-xs font-black shadow-sm flex items-center gap-2"><Download className="w-4 h-4 text-red-600" /><span>PDF</span></button></div></div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-2xl flex flex-col items-center justify-center"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">Anteprima Taglio Officina</div><div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 w-full flex items-center justify-center p-4"><canvas ref={canvasRef} width={800} height={450} className="max-w-full h-auto" /></div></div>
          </div>
        )}
      </div>
    </div>
  );
};
