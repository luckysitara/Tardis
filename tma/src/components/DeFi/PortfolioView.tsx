import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Plus, RefreshCcw, 
  MoreHorizontal, ShieldCheck, ChevronRight, TrendingUp,
  CreditCard, Send, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Token {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  price: number;
  usdValue: number;
  logoURI: string;
}

interface PortfolioData {
  totalBalance: number;
  tokens: Token[];
}

const PortfolioView: React.FC<{ walletAddress?: string }> = ({ walletAddress }) => {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await axios.get(`https://seek.kikhaus.com/api/user/portfolio/${walletAddress}`);
      setData(res.data);
    } catch (e) {
      console.error('Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [walletAddress]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Balance Card */}
      <section className="relative overflow-hidden pt-4 pb-2">
        <div className="text-center space-y-1 relative z-10">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em]"
          >
            Total Net Worth
          </motion.p>
          <div className="flex items-baseline justify-center gap-1">
            <motion.span 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-zinc-400 text-2xl font-black italic mr-1"
            >$</motion.span>
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-6xl font-black tracking-tighter italic bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent"
            >
              {loading ? '---' : data?.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.h1>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 mt-3"
          >
            <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-black tracking-wider flex items-center gap-1">
               <TrendingUp size={12} /> +4.2% TODAY
            </div>
            <button 
              onClick={fetchPortfolio} 
              className={`p-2 rounded-full hover:bg-white/5 transition-colors ${loading ? 'animate-spin' : ''}`}
            >
              <RefreshCcw size={14} className="text-zinc-600" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* High-Fidelity Quick Actions */}
      <section className="grid grid-cols-4 gap-4 px-2">
        <ActionButton icon={<Plus size={22}/>} label="BUY" primary />
        <ActionButton icon={<Send size={22}/>} label="SEND" />
        <ActionButton icon={<Download size={22}/>} label="RECEIVE" />
        <ActionButton icon={<MoreHorizontal size={22}/>} label="MORE" />
      </section>

      {/* Asset List with Premium Styling */}
      <section className="space-y-6">
        <div className="flex justify-between items-end px-4">
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Your Assets</h3>
            <p className="text-lg font-black italic tracking-tight">PORTFOLIO</p>
          </div>
          <button className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg border border-cyan-400/20">
            Analytics
          </button>
        </div>
        
        <div className="space-y-3 px-2">
          {loading ? (
            [1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-zinc-900/50 border border-white/5 rounded-[2.5rem] animate-pulse" />
            ))
          ) : (
            <AnimatePresence>
              {data?.tokens.map((token, index) => (
                <motion.div
                  key={token.mint}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative bg-[#0A0A0A] border border-white/[0.03] hover:border-white/[0.08] p-5 rounded-[2.2rem] flex items-center justify-between transition-all shadow-xl active:bg-zinc-900"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="relative group-hover:scale-110 transition-transform duration-500">
                      <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img 
                        src={token.logoURI} 
                        onError={(e: any) => e.target.src = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'} 
                        className="w-14 h-14 rounded-[1.4rem] bg-black object-cover relative z-10 border border-white/10" 
                      />
                      {token.symbol === 'SOL' && (
                        <div className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full p-0.5 z-20 border-2 border-black">
                           <ShieldCheck size={10} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-black text-base italic tracking-tight uppercase">{token.name}</h4>
                      <div className="flex items-center gap-2">
                         <span className="text-zinc-500 text-[10px] font-black tracking-widest">{token.symbol}</span>
                         <span className="text-green-500 text-[10px] font-black">+1.2%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right relative z-10">
                    <p className="font-black text-lg tracking-tight italic tabular-nums">
                      {token.amount > 0.0001 ? token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) : token.amount.toFixed(6)}
                    </p>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-tighter opacity-80 tabular-nums">
                      ${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                     <ChevronRight size={40} className="text-white" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* Bottom Footer Info */}
      <section className="px-6 py-4 bg-zinc-900/30 border border-white/5 rounded-[2rem] mx-2 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
               <ShieldCheck size={18} />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 leading-none">Security</p>
               <p className="text-[10px] font-black text-white italic">Protected by Seeker</p>
            </div>
         </div>
         <ChevronRight size={16} className="text-zinc-700" />
      </section>
    </div>
  );
};

const ActionButton = ({ icon, label, primary }: { icon: any, label: string, primary?: boolean }) => (
  <button className="flex flex-col items-center gap-3 group">
    <motion.div 
      whileHover={{ y: -5, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`w-16 h-16 ${primary ? 'bg-white text-black' : 'bg-[#111111] text-white border border-white/5'} rounded-[1.8rem] flex items-center justify-center transition-all shadow-2xl relative overflow-hidden`}
    >
      {primary && <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/20 to-transparent" />}
      {icon}
    </motion.div>
    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-cyan-400 transition-colors">{label}</span>
  </button>
);

export default PortfolioView;
