
export interface Profile {
  codice: string;
  descr: string;
  lungMax: number | null;
}

export interface PanelMaterial {
  id: string;
  codice: string;
  descr: string;
  materiale: string;
  lungDefault: number;
  altDefault: number;
  giraPezzoDefault: boolean;
}

export interface Client {
  id: string;
  nome: string;
  note?: string;
  dataAggiunta: string;
}

export interface CommessaArchiviata {
  id: string;
  numero: string;
  cliente: string;
  data: string;
  tipo: 'barre' | 'pannelli';
  dettagli: any;
}

export interface CutRequest {
  id: string;
  codice: string;
  lung: number;
  qty: number;
  angoli: string;
  lama: number;
  scIn: number;
  scFin: number;
  lungBarra: number;
}

export interface OptimizedBar {
  tagli: { lung: number; angoli: string; lama: number }[];
  somma: number;
  residuo: number;
  riepilogo: string;
}

export interface GroupedBarResult extends OptimizedBar {
  count: number;
}

export interface OptimizationResult {
  [codice: string]: {
    descrizione: string;
    barre: OptimizedBar[];
  };
}

export interface PanelCutRequest {
  id: string;
  materiale: string;
  colore: string;
  lunghezza: number;
  altezza: number;
  quantita: number;
  rotazione: boolean;
}

export interface PlacedPanel {
  material: string;
  colore?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
}

export interface OptimizedSheet {
  panels: PlacedPanel[];
  areaUsata: number;
  residuo: number;
}

export interface PanelOptimizationResult {
  [key: string]: {
    material: string;
    sheets: OptimizedSheet[];
  };
}

export enum OptimizerMode {
  BARRE = 'barre',
  PANNELLI = 'pannelli',
  DATABASE = 'database'
}
