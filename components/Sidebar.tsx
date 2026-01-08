
import React from 'react';
import { Scissors, Square, Settings, Database, Cloud } from 'lucide-react';
import { OptimizerMode } from '../types';

interface SidebarProps {
  activeMode: OptimizerMode;
  onModeChange: (mode: OptimizerMode) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeMode, onModeChange, onOpenSettings }) => {
  const navItems = [
    { id: OptimizerMode.BARRE, icon: Scissors, label: 'Taglio Barre', desc: 'Profili Alluminio' },
    { id: OptimizerMode.PANNELLI, icon: Square, label: 'Taglio Pannelli', desc: 'Lastre & Vetri' },
    { id: OptimizerMode.DATABASE, icon: Database, label: 'Database Profili', desc: 'Gestione Magazzino' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex shrink-0 border-r border-slate-800 shadow-2xl">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-10">
          <div className="bg-red-600 p-2.5 rounded-xl shadow-lg shadow-red-900/40">
            <Scissors className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-2xl leading-none tracking-tighter">ALEA</h2>
            <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase mt-1 font-bold whitespace-nowrap">SISTEMI PRO</p>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onModeChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-xl shadow-red-900/40 translate-x-1' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:scale-110'}`} />
                <div className="text-left">
                  <div className="text-xs font-black uppercase tracking-tight">{item.label}</div>
                  <div className={`text-[9px] font-bold ${isActive ? 'text-red-100' : 'text-slate-600'}`}>{item.desc}</div>
                </div>
              </button>
            );
          })}
          
          <div className="pt-4 border-t border-slate-800 mt-4">
            <button
              onClick={onOpenSettings}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group text-slate-400 hover:bg-slate-800 hover:text-slate-200`}
            >
              <Settings className="w-5 h-5 text-slate-500 group-hover:scale-110 group-hover:rotate-45 transition-all" />
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-tight">Impostazioni Cloud</div>
                <div className="text-[9px] font-bold text-slate-600">Configura BYODB</div>
              </div>
            </button>
          </div>
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
          <div className="flex items-center space-x-2 text-[9px] font-black text-slate-500 mb-2 uppercase tracking-[0.15em]">
            <Cloud className="w-3.5 h-3.5" />
            <span>ALEA SISTEMI Cloud</span>
          </div>
          <div className="text-[10px] font-bold text-slate-300">Ottimizzatore V2.6</div>
          <div className="text-[9px] text-slate-500 mt-0.5 tracking-tight">Eccellenza nel taglio.</div>
        </div>
      </div>
    </aside>
  );
};
