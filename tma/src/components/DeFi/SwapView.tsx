import React from 'react';
import { Repeat, ChevronDown, ArrowDown, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const SwapView: React.FC = () => {
  return (
    <div className="space-y-6">
      <header className="text-left space-y-1">
        <h2 className="text-2xl font-black italic tracking-tighter">SWAP</h2>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Powered by Jupiter</p>
      </header>

      <div className="space-y-2">
        {/* Sell Card */}
        <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-4">
          <div className="flex justify-between items-center text-zinc-500 text-[10px] font-black uppercase tracking-widest">
            <span>You Sell</span>
            <span>Balance: 12.45</span>
          </div>
          <div className="flex justify-between items-center">
            <input type="number" placeholder="0.00" className="bg-transparent text-3xl font-black w-1/2 outline-none" />
            <button className="bg-zinc-800 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm">
              <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" className="w-6 h-6 rounded-full" />
              SOL <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex justify-center -my-4 relative z-10">
          <div className="w-10 h-10 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-[#00050D]">
             <ArrowDown size={20} className="text-black" />
          </div>
        </div>

        {/* Buy Card */}
        <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-4">
          <div className="flex justify-between items-center text-zinc-500 text-[10px] font-black uppercase tracking-widest">
            <span>You Buy</span>
            <span>Balance: 0.00</span>
          </div>
          <div className="flex justify-between items-center">
            <input type="number" placeholder="0.00" readOnly className="bg-transparent text-3xl font-black w-1/2 outline-none text-zinc-600" />
            <button className="bg-cyan-500 text-black px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm">
              Select <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      <button className="w-full h-16 bg-white text-black rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all opacity-50 cursor-not-allowed">
        ENTER AMOUNT
      </button>

      <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-center gap-3 text-cyan-400">
         <Zap size={16} />
         <p className="text-[10px] font-bold uppercase tracking-widest">Best price found via Jupiter routing</p>
      </div>
    </div>
  );
};

export default SwapView;
