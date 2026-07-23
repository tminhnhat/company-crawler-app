import React from 'react';
import { Building2, Database, Sparkles, Cpu, Layers } from 'lucide-react';

interface NavbarProps {
  dbCount: number;
  crawledCount: number;
  onOpenBatchModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ dbCount, crawledCount, onOpenBatchModal }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight gradient-text">TaxClaw</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Tra cứu & Auto-Crawl Thông Tin Doanh Nghiệp</p>
          </div>
        </div>

        {/* Stats & Batch Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Database:</span>
              <span className="font-bold text-white">{dbCount}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Phiên này:</span>
              <span className="font-bold text-white">{crawledCount}</span>
            </div>
          </div>

          {/* MaSoThue.com Data Indicator */}
          <a
            href="https://masothue.com"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition"
          >
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span>MaSoThue.com Engine</span>
          </a>

          {/* Batch Crawl Button */}
          <button
            onClick={onOpenBatchModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-cyan-500/20 active:scale-95 transition"
          >
            <Layers className="w-4 h-4" />
            <span>Crawl Hàng Loạt</span>
          </button>
        </div>
      </div>
    </header>
  );
};
