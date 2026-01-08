
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Play, Download, Trash2, Layout, Maximize, Settings, FileText, Square, Save, FileSpreadsheet } from 'lucide-react';
import { PanelCutRequest, PanelOptimizationResult, CommessaArchiviata } from '../types';
import { optimizerService } from '../services/optimizerService';
import { exportService } from '../services/exportService';

const COLORI_MATERIALE: Record<string, string> = { 
  "Lexan": "#f87171", // red-400
  "Dibond": "#60a5fa", // blue-400
  "Alveolare": "#4ade80", // green-400
  "Pvc": "#fbbf24", // amber-400
  "Altro": "#94a3b8"  // slate-400
};

interface PanelOptimizerProps {
  externalData?: CommessaArchiviata | null;
}

export const PanelOptimizer: React.FC<PanelOptimizerProps> = ({ externalData }) => {
  const [cliente, setCliente] = useState('');
  const [commessa, setCommessa] = useState('');
  const [materiale, setMateriale] = useState('');
  const [spessore, setSpessore] = useState('');
  const [larghezzaLastra, setLarghezzaLastra] = useState('3050');
  const [altezzaLastra, setAltezzaLastra] = useState('2050');
  const [lunghezza, setLunghezza] = useState('');
  const [altezza, setAltezza] = useState('');
  const [quantita, setQuantita] = useState(1);
  const [rotazione, setRotazione] = useState(true);

  const [distinta, setDistinta] = useState<PanelCutRequest[]>([]);
  const [results, setResults] = useState<PanelOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (externalData && externalData.tipo === 'pannelli') {
      setCliente(externalData.cliente);
      setCommessa(externalData.numero);
      setDistinta(externalData.dettagli.distinta || []);
      setResults(externalData.dettagli.results || null);
    }
  }, [externalData]);

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
    
    // Auto save client
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
      tipo: 'pannelli',
      dettagli: { distinta, results }
    };

    localStorage.setItem('alea_commesse', JSON.stringify([nuovaCommessa, ...commesse]));
    alert("Commessa salvata con successo nell'archivio!");
  };

  const runOptimization = () => {
    if (distinta.length === 0) return;
    setIsOptimizing(true);
    setTimeout(() => {
      const res = optimizerService.optimizePanels(
        distinta, 
        parseFloat(larghezzaLastra), 
        parseFloat(altezzaLastra)
      );
      setResults(res);
      setIsOptimizing(false);
    }, 600);
  };

  useEffect(() => {
    if (results && canvasRef.current) {
      drawVisualization();
    }
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
    
    const groups = Object.values(results) as PanelOptimizationResult[string][];
    const sheetToDraw = groups[0]?.sheets[0]?.panels || [];

    const scale = Math.min((canvas.width - 2 * margin) / sheetW, (canvas.height - 2 * margin) / sheetH);
    const offsetX = (canvas.width - sheetW * scale) / 2;
    const offsetY = (canvas.height - sheetH * scale) / 2;

    // Draw Sheet Background
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, sheetW * scale, sheetH * scale);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(offsetX, offsetY, sheetW * scale, sheetH * scale);

    // Draw Panels
    sheetToDraw.forEach((p, i) => {
      ctx.fillStyle = COLORI_MATERIALE[p.material] || '#cbd5e1';
      ctx.fillRect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX + p.x * scale, offsetY + p.y * scale, p.w * scale, p.h * scale);
      
      if (p.w * scale > 30 && p.h * scale > 15) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Inter';
        ctx.fillText(`${p.w}x${p.h}`, offsetX + p.x * scale + 4, offsetY + p.y * scale + 12);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-1 space-y-6">
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
           <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-red-600" />
            <span>Dettagli Commessa</span>
          </h3>
          <div className="space-y-4 mb-6">
             <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Cliente</label>
                <input type="text" value={cliente} onChange={e=>setCliente(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Nome cliente..." />
             </div>
             <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Commessa / Rif.</label>
                <input type="text" value={commessa} onChange={e=>setCommessa(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Riferimento..." />
             </div>
          </div>

          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center space-x-2 border-t pt-4">
            <Maximize className="w-5 h-5 text-red-600" />
            <span>Configurazione Lastra</span>
          </h3>
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Larghezza (mm)</label>
                  <input type="number" value={larghezzaLastra} onChange={e=>setLarghezzaLastra(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Altezza (mm)</label>
                  <input type="number" value={altezzaLastra} onChange={e=>setAltezzaLastra(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
                </div>
             </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <Plus className="w-5 h-5 text-red-600" />
            <span>Inserimento Pannelli</span>
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Materiale</label>
                <select value={materiale} onChange={e=>setMateriale(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Scegli...</option>
                  <option>Lexan</option><option>Dibond</option><option>Alveolare</option><option>Pvc</option><option>Altro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Spessore (mm)</label>
                <select value={spessore} onChange={e=>setSpessore(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Scegli...</option>
                  <option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>8</option><option>10</option><option>12</option><option>20</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Larghezza (mm)</label>
                  <input type="text" value={lunghezza} onChange={e=>setLunghezza(e.target.value)} placeholder="W" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Altezza (mm)</label>
                  <input type="text" value={altezza} onChange={e=>setAltezza(e.target.value)} placeholder="H" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
                </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Q.tà</label>
                <input type="number" value={quantita} onChange={e=>setQuantita(parseInt(e.target.value)||1)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" />
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <input type="checkbox" checked={rotazione} onChange={e=>setRotazione(e.target.checked)} className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500" />
                <label className="text-xs font-semibold text-gray-600">Ruotabile</label>
              </div>
            </div>
            <button onClick={handleAddCut} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Aggiungi Pezzo</span>
            </button>
          </div>
        </section>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
             <div className="flex items-center space-x-4">
               <h3 className="font-bold text-gray-700">Distinta Pannelli</h3>
               <button onClick={saveCommessaToDb} className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-all">
                 <Save className="w-3 h-3" /> Salva in Archivio
               </button>
             </div>
            <button onClick={()=>{setDistinta([]); setResults(null);}} className="text-xs text-red-500 font-bold uppercase hover:underline">Svuota</button>
          </div>
          <div className="overflow-y-auto flex-1">
             <table className="w-full text-left text-sm">
                <thead className="bg-white border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-500">Materiale</th>
                    <th className="px-6 py-3 font-semibold text-gray-500">Dim. (WxH)</th>
                    <th className="px-6 py-3 font-semibold text-gray-500">Q.tà</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-center">Rimuovi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {distinta.map(cut => (
                    <tr key={cut.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">{cut.materiale} ({cut.spessore}mm)</td>
                      <td className="px-6 py-3 font-mono">{cut.lunghezza}x{cut.altezza} mm</td>
                      <td className="px-6 py-3 font-bold">{cut.quantita}</td>
                      <td className="px-6 py-3 text-center">
                        <button onClick={()=>setDistinta(prev=>prev.filter(c=>c.id!==cut.id))} className="text-gray-300 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
          <div className="p-4 bg-gray-50 border-t">
            <button onClick={runOptimization} disabled={distinta.length===0 || isOptimizing} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50">
               {isOptimizing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Layout className="w-5 h-5" />}
               <span>Calcola Nesting 2D</span>
            </button>
          </div>
        </section>

        {results && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-xl font-bold text-gray-800">Visualizzazione Risultato</h3>
               <div className="flex space-x-2">
                  <button onClick={()=>exportService.panelToPdf(results, cliente, commessa, parseFloat(larghezzaLastra), parseFloat(altezzaLastra))} className="flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:border-red-500 transition-all">
                    <Download className="w-4 h-4 text-red-600" />
                    <span>PDF</span>
                  </button>
                  <button onClick={()=>exportService.panelsToCsv(results)} className="flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:border-slate-500 transition-all">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span>CSV</span>
                  </button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-500">Anteprima Prima Lastra</div>
                <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  Ottimizzato
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                <canvas ref={canvasRef} width={800} height={450} className="max-w-full h-auto" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.values(results) as PanelOptimizationResult[string][]).map((group, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORI_MATERIALE[group.material] }} />
                    <span className="font-bold text-gray-800">{group.material} - {group.spessore}mm</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Lastre richieste: <span className="font-bold text-gray-800">{group.sheets.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
