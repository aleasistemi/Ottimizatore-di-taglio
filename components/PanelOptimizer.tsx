
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
  const [spessore, setSpessore] = useState('');
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
      if (externalData.dettagli.coloreLastra) setColoreLastra(externalData.dettagli.coloreLastra);
    }

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('alea_data_updated', handleUpdate);
    return () => window.removeEventListener('alea_data_updated', handleUpdate);
  }, [externalData]);

  const handleSelectPanel = (id: string) => {
    const p = availablePanels.find(ap => ap.id === id);
    if (p) {
      setSelectedPanelId(id);
      setMateriale(p.materiale);
      setLarghezzaLastra(p.lungDefault.toString());
      setAltezzaLastra(p.altDefault.toString());
      setRotazione(p.giraPezzoDefault);
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
      colore: coloreLastra, // Ora associato alla lastra ma salvato nel pezzo per coerenza dati
      lunghezza: parseFloat(lunghezza.replace(',', '.')),
      altezza: parseFloat(altezza.replace(',', '.')),
      quantita,
      rotazione
    };
    setDistinta(prev => [...prev, newCut]);
    
    // Pulizia campi veloci
    setLunghezza('');
    setAltezza('');
    setQuantita(1);
  };

  const saveCommessaToDb = async () => {
    if (distinta.length === 0) return;
    
    let updatedClients = [...availableClients];
    if (cliente && !availableClients.find(c => c.nome.toLowerCase() === cliente.toLowerCase())) {
        const newClient: Client = { id: Math.random().toString(36).substr(2, 9), nome: cliente, dataAggiunta: new Date().toISOString() };
        updatedClients = [newClient, ...availableClients];
        localStorage.setItem('alea_clients', JSON.stringify(updatedClients));
        setAvailableClients(updatedClients);
        if (supabaseService.isInitialized()) await supabaseService.syncTable('clients', updatedClients);
    }

    const commesseJson = localStorage.getItem('alea_commesse') || '[]';
    const commesse = JSON.parse(commesseJson);
    const nuovaCommessa: CommessaArchiviata = {
      id: Math.random().toString(36).substr(2, 9),
      numero: commessa || 'Senza Rif.',
      cliente: cliente || 'Privato',
      data: new Date().toISOString(),
      tipo: 'pannelli',
      dettagli: { distinta, results, coloreLastra }
    };
    const updatedCommesse = [nuovaCommessa, ...commesse];
    localStorage.setItem('alea_commesse', JSON.stringify(updatedCommesse));
    
    if (supabaseService.isInitialized()) {
        try {
            await supabaseService.syncTable('commesse', updatedCommesse);
            alert("Commessa archiviata su ALEA Cloud!");
        } catch (e) {
            alert("Errore Cloud. Salvata localmente.");
        }
    } else {
        alert("Archiviata localmente!");
    }
  };

  const runOptimization = () => {
    if (distinta.length === 0) return;
    setIsOptimizing(true);
    setTimeout(() => {
      // Passiamo il colore della lastra ai risultati per l'esportazione
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
    if (groups.length === 0) return;
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
      if (p.w * scale > 40 && p.h * scale > 20) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        const label = `${p.w}x${p.h}`;
        const metrics = ctx.measureText(label);
        ctx.fillRect(offsetX + p.x * scale + (p.w * scale / 2) - metrics.width / 2 - 4, offsetY + p.y * scale + (p.h * scale / 2) - 8, metrics.width + 8, 16);
        ctx.fillStyle = 'black'; ctx.font = 'black 11px Inter'; ctx.textAlign = 'center';
        ctx.fillText(label, offsetX + p.x * scale + (p.w * scale / 2), offsetY + p.y * scale + (p.h * scale / 2) + 4);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 pb-10">
      <div className="lg:col-span-1 space-y-6">
        <section className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-xl">
           <h3 className="text-sm font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-tighter"><FileText className="w-5 h-5 text-red-600" /><span>Testata Commessa</span></h3>
           <div className="space-y-4">
              <input list="clients-list-p" type="text" value={cliente} onChange={e=>setCliente(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold" placeholder="Nome Cliente..." />
              <datalist id="clients-list-p">{availableClients.map(c => <option key={c.id} value={c.nome} />)}</datalist>
              <input type="text" value={commessa} onChange={e=>setCommessa(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold" placeholder="Numero Commessa..." />
           </div>
           
           <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 border-t pt-6 mt-6 uppercase tracking-tighter"><Square className="w-5 h-5 text-blue-600" /><span>Dati Lastra Grezza</span></h3>
           <div className="space-y-4">
              <select value={selectedPanelId} onChange={e=>handleSelectPanel(e.target.value)} className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest outline-none border-none">
                <option value="">Scegli Lastra da Archivio...</option>
                {availablePanels.map(p => <option key={p.id} value={p.id}>{p.codice} ({p.materiale})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div><label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Base (mm)</label><input type="number" value={larghezzaLastra} onChange={e=>setLarghezzaLastra(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-black text-red-600" /></div>
                <div><label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Altezza (mm)</label><input type="number" value={altezzaLastra} onChange={e=>setAltezzaLastra(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-black text-red-600" /></div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 flex items-center gap-1"><Palette className="w-2.5 h-2.5" /> Colore / Finitura Lastra</label>
                <input type="text" value={coloreLastra} onChange={e=>setColoreLastra(e.target.value)} placeholder="es. Bianco, RAL 9010..." className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold italic" />
              </div>
           </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Ruler className="w-20 h-20" /></div>
          <h3 className="text-sm font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-tighter"><Plus className="w-5 h-5 text-red-600" /><span>Aggiunta Pezzo Tagliato</span></h3>
          <div className="space-y-5 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Materiale</label>
                <input type="text" value={materiale} onChange={e=>setMateriale(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Spessore (mm)</label>
                <input type="text" value={spessore} onChange={e=>setSpessore(e.target.value)} placeholder="es. 3" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-black" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Base (X)</label><input type="text" value={lunghezza} onChange={e=>setLunghezza(e.target.value)} placeholder="0.0" className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl font-black text-red-600 focus:border-red-500 outline-none" /></div>
                <div><label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Altezza (Y)</label><input type="text" value={altezza} onChange={e=>setAltezza(e.target.value)} placeholder="0.0" className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl font-black text-red-600 focus:border-red-500 outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Quantità</label><input type="number" value={quantita} onChange={e=>setQuantita(parseInt(e.target.value)||1)} className="w-full px-4 py-2 bg-gray-50 border rounded-xl font-black text-center" /></div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rotazione} onChange={e=>setRotazione(e.target.checked)} className="w-5 h-5 text-red-600 rounded" />
                  <span className="text-[10px] font-black uppercase text-slate-500">Gira Pezzo</span>
                </label>
              </div>
            </div>
            <button onClick={handleAddCut} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 active:scale-95">
              <Plus className="w-6 h-6" /><span>INSERISCI IN DISTINTA</span>
            </button>
          </div>
        </section>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden flex flex-col h-[450px]">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center space-x-4">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2"><Layout className="w-4 h-4" /> Elenco Tagli 2D</h3>
                <button onClick={saveCommessaToDb} className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-all shadow-sm bg-white"><Save className="w-3 h-3" /> Archivia</button>
             </div>
             <button onClick={()=>{setDistinta([]); setResults(null);}} className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:underline">Svuota Tutto</button>
          </div>
          <div className="overflow-y-auto flex-1">
             <table className="w-full text-left text-xs">
                <thead className="bg-white border-b sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tight">Materiale / Sp.</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tight">Misure (B x A)</th>
                    <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tight text-center">Quantità</th>
                    <th className="px-6 py-4 text-center">X</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {distinta.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-300 italic font-medium uppercase tracking-widest text-[10px]">Distinta Vuota</td></tr>
                  ) : (
                    distinta.map(cut => (
                      <tr key={cut.id} className="hover:bg-slate-50 font-bold group">
                        <td className="px-6 py-4 text-slate-800"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] uppercase font-black">{cut.materiale} {cut.spessore}mm</span></td>
                        <td className="px-6 py-4 font-black text-red-600 text-sm">{cut.lunghezza} x {cut.altezza} mm</td>
                        <td className="px-6 py-4 text-center text-slate-900 font-black">{cut.quantita} pz</td>
                        <td className="px-6 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>setDistinta(prev=>prev.filter(c=>c.id!==cut.id))} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
          </div>
          <div className="p-6 bg-slate-50 border-t">
            <button onClick={runOptimization} disabled={distinta.length===0 || isOptimizing} className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-2xl transition-all">
               {isOptimizing ? <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <Layout className="w-6 h-6" />}
               <span>GENERA NESTING OTTIMIZZATO</span>
            </button>
          </div>
        </section>
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><Layout className="w-6 h-6 text-red-600" />NESTING OTTIMIZZATO</h3>
              <div className="flex gap-2">
                <button onClick={()=>exportService.panelsToCsv(results)} className="bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl text-xs font-black shadow-sm flex items-center gap-2 hover:border-green-500 transition-all"><FileSpreadsheet className="w-5 h-5 text-green-600" /><span>CSV</span></button>
                <button onClick={()=>exportService.panelToPdf(results, cliente, commessa, parseFloat(larghezzaLastra), parseFloat(altezzaLastra), coloreLastra)} className="bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl text-xs font-black shadow-sm flex items-center gap-2 hover:border-red-500 transition-all"><Download className="w-5 h-5 text-red-600" /><span>PDF</span></button>
              </div>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-2xl flex flex-col items-center justify-center relative">
              <div className="bg-slate-100/50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 w-full flex items-center justify-center">
                <canvas ref={canvasRef} width={1000} height={600} className="max-w-full h-auto drop-shadow-2xl rounded-lg" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
