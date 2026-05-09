import React from 'react';
import { PieChart, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const EarnView: React.FC = () => {
  const opportunities = [
    { id: 1, name: 'Meteora DLMM', asset: 'SOL/USDC', apy: '42.5%', risk: 'Medium' },
    { id: 2, name: 'Kamino Lend', asset: 'USDC', apy: '8.2%', risk: 'Low' },
    { id: 3, name: 'TokenMill Stake', asset: 'SKR', apy: '124.0%', risk: 'High' },
  ];

  return (
    <div className="space-y-6">
      <header className="text-left space-y-1">
        <h2 className="text-2xl font-black italic tracking-tighter text-purple-400">EARN</h2>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Yield & Staking Engine</p>
      </header>

      <div className="space-y-3">
        {opportunities.map((op, i) => (
          <motion.div
            key={op.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 border border-white/5 rounded-[2rem] p-6 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-sm group-hover:text-purple-400 transition-colors">{op.name}</h4>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-tighter">{op.asset}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-green-400">{op.apy}</p>
                <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Est. APY</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-[8px] font-black uppercase tracking-widest text-zinc-400">
                  <ShieldCheck size={10} /> {op.risk} Risk
               </div>
               <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={16} className="text-white" />
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-900/20 to-transparent border border-purple-500/10 rounded-[2.5rem] space-y-2">
         <div className="flex items-center gap-2 text-purple-400">
            <TrendingUp size={18} />
            <span className="font-black text-xs uppercase tracking-widest">Premium Rewards</span>
         </div>
         <p className="text-zinc-400 text-[10px] leading-relaxed font-medium">
            Hold **$SKR** to unlock exclusive high-yield vaults and zero-fee lending directly from Telegram.
         </p>
      </div>
    </div>
  );
};

export default EarnView;
