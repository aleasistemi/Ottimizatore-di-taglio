
import { CutRequest, OptimizationResult, OptimizedBar, PanelCutRequest, PanelOptimizationResult, OptimizedSheet, PlacedPanel } from '../types';
import { PROFILI } from '../constants';

export const optimizerService = {
  optimizeBars: (requests: CutRequest[]): OptimizationResult => {
    const results: OptimizationResult = {};

    // Raggruppamento pezzi per codice profilo
    const grouped: Record<string, any[]> = {};
    requests.forEach(req => {
      if (!grouped[req.codice]) grouped[req.codice] = [];
      for (let i = 0; i < req.qty; i++) {
        grouped[req.codice].push({ 
          lung: req.lung, 
          angoli: req.angoli, 
          lama: req.lama, 
          scIn: req.scIn, 
          scFin: req.scFin, 
          lungBarra: req.lungBarra 
        });
      }
    });

    for (const codice in grouped) {
      let piecesPool = [...grouped[codice]];
      const profileInfo = PROFILI[codice];
      const maxLen = piecesPool[0]?.lungBarra || (profileInfo ? profileInfo.lungMax : null) || 6000;
      const lama = piecesPool[0]?.lama || 0;

      const optimizedBarList: OptimizedBar[] = [];

      // Funzione per trovare la migliore combinazione possibile per una singola barra
      const findBestPattern = (capacity: number, available: any[]): number[] => {
        let bestWaste = Infinity;
        let bestCombination: number[] = [];

        // Funzione ricorsiva per esplorare le combinazioni (depth-first search limitata)
        const backtrack = (remCap: number, startIdx: number, currentCombo: number[]) => {
          if (remCap < bestWaste) {
            bestWaste = remCap;
            bestCombination = [...currentCombo];
          }
          if (bestWaste === 0) return; // Ottimo trovato

          for (let i = startIdx; i < available.length; i++) {
            const p = available[i];
            const spaceNeeded = currentCombo.length === 0 ? p.lung : p.lung + lama;
            
            if (spaceNeeded <= remCap) {
              // Ottimizzazione: se il pezzo è uguale al precedente provato a questo livello, salta
              if (i > startIdx && available[i].lung === available[i-1].lung) continue;
              
              currentCombo.push(i);
              backtrack(remCap - spaceNeeded, i + 1, currentCombo);
              currentCombo.pop();
              if (bestWaste === 0) return;
            }
          }
        };

        // Ordiniamo per lunghezza decrescente per l'efficienza del backtracking
        available.sort((a, b) => b.lung - a.lung);
        backtrack(capacity, 0, []);
        return bestCombination;
      };

      while (piecesPool.length > 0) {
        const scIn = piecesPool[0].scIn;
        const scFin = piecesPool[0].scFin;
        const usableCapacity = maxLen - scIn - scFin;

        // Trova la combinazione che lascia meno scarto
        const bestComboIndices = findBestPattern(usableCapacity, piecesPool);
        
        // Estrai i pezzi selezionati dal pool
        const currentBarCuts = bestComboIndices
          .sort((a, b) => b - a) // Ordine inverso per rimuovere correttamente dal pool
          .map(idx => piecesPool.splice(idx, 1)[0]);

        const totalCutsLength = currentBarCuts.reduce((sum, p) => sum + p.lung, 0);
        
        const summaryMap: Record<string, number> = {};
        currentBarCuts.forEach(p => {
          const key = `${p.lung}${p.angoli !== "90/90" ? ` (${p.angoli})` : ""}`;
          summaryMap[key] = (summaryMap[key] || 0) + 1;
        });
        const summaryString = Object.entries(summaryMap)
          .map(([key, count]) => `n°${count} ${key}`)
          .join(" - ");

        optimizedBarList.push({
          tagli: currentBarCuts.map(p => ({ lung: p.lung, angoli: p.angoli, lama: p.lama })),
          somma: totalCutsLength,
          residuo: parseFloat((usableCapacity - (currentBarCuts.length > 0 ? (currentBarCuts.length - 1) * lama : 0) - totalCutsLength).toFixed(2)),
          riepilogo: summaryString
        });
      }

      results[codice] = {
        descrizione: profileInfo ? profileInfo.descr : "PROFILO GENERICO",
        barre: optimizedBarList
      };
    }

    return results;
  },

  optimizePanels: (requests: PanelCutRequest[], sheetW: number, sheetH: number, gap: number = 2): PanelOptimizationResult => {
    const results: PanelOptimizationResult = {};

    const groupedRequests: Record<string, PanelCutRequest[]> = {};
    requests.forEach(r => {
      const key = `${r.codice || 'LIBERO'}___${r.materiale}`;
      if (!groupedRequests[key]) groupedRequests[key] = [];
      groupedRequests[key].push(r);
    });

    for (const key in groupedRequests) {
      const group = groupedRequests[key];
      const material = group[0].materiale;
      const codice = group[0].codice;
      
      let panelsToPlace: any[] = [];
      group.forEach(r => {
        for (let i = 0; i < r.quantita; i++) {
          let w = r.lunghezza;
          let h = r.altezza;
          if (r.rotazione) {
            const minDim = Math.min(r.lunghezza, r.altezza);
            const maxDim = Math.max(r.lunghezza, r.altezza);
            if (maxDim <= sheetH) { w = minDim; h = maxDim; }
            else { w = maxDim; h = minDim; }
          }
          panelsToPlace.push({ w, h, rot: r.rotazione, material: r.materiale, origW: r.lunghezza, origH: r.altezza });
        }
      });

      panelsToPlace.sort((a, b) => b.w - a.w || b.h - a.h);
      const sheets: OptimizedSheet[] = [];

      while (panelsToPlace.length > 0) {
        let placedPanels: PlacedPanel[] = [];
        let currentX = 0;

        while (currentX < sheetW) {
          const headIdx = panelsToPlace.findIndex(p => p.w <= (sheetW - currentX));
          if (headIdx === -1) break;

          const head = panelsToPlace[headIdx];
          const stripWidth = head.w;
          panelsToPlace.splice(headIdx, 1);

          let currentY = 0;
          placedPanels.push({ 
            material: head.material, 
            x: currentX, 
            y: currentY, 
            w: head.w, 
            h: head.h, 
            rotated: head.w !== head.origW 
          });
          currentY += head.h + gap;

          for (let i = 0; i < panelsToPlace.length; ) {
            const p = panelsToPlace[i];
            const canFitNormally = p.w <= stripWidth && p.h <= (sheetH - currentY);
            let canFitRotated = false;
            if (!canFitNormally && p.rot) {
              canFitRotated = p.h <= stripWidth && p.w <= (sheetH - currentY);
            }

            if (canFitNormally) {
              placedPanels.push({ material: p.material, x: currentX, y: currentY, w: p.w, h: p.h, rotated: p.w !== p.origW });
              currentY += p.h + gap;
              panelsToPlace.splice(i, 1);
            } else if (canFitRotated) {
              placedPanels.push({ material: p.material, x: currentX, y: currentY, w: p.h, h: p.w, rotated: p.h !== p.origW });
              currentY += p.w + gap;
              panelsToPlace.splice(i, 1);
            } else { i++; }
            if (currentY >= sheetH) break;
          }
          currentX += stripWidth + gap;
        }

        const areaUsata = placedPanels.reduce((s, p) => s + (p.w * p.h), 0);
        sheets.push({ 
          panels: placedPanels, 
          areaUsata, 
          residuo: (sheetW * sheetH) - areaUsata 
        });
      }
      results[key] = { codice, material, sheets };
    }
    return results;
  }
};
