import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, RefreshCcw, MoreHorizontal, ShieldCheck } from 'lucide-react';
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
    <div className="space-y-10">
      {/* Balance Card */}
      <section className="text-center space-y-2">
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Total Portfolio</p>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-5xl font-black tracking-tighter">
            ${loading ? '---' : data?.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <button onClick={fetchPortfolio} className={`${loading ? 'animate-spin' : ''} text-cyan-400 p-2`}>
            <RefreshCcw size={16} />
          </button>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-bold">
           <ArrowUpRight size={12} /> +2.45% (24h)
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-4 gap-4">
        <ActionButton icon={<Plus size={20}/>} label="Buy" color="bg-cyan-500" />
        <ActionButton icon={<ArrowUpRight size={20}/>} label="Send" color="bg-zinc-800" />
        <ActionButton icon={<ArrowDownLeft size={20}/>} label="Receive" color="bg-zinc-800" />
        <ActionButton icon={<MoreHorizontal size={20}/>} label="More" color="bg-zinc-800" />
      </section>

      {/* Token List */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Assets</h3>
          <span className="text-[10px] font-bold text-cyan-400">View All</span>
        </div>
        
        <div className="space-y-2">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-3xl animate-pulse" />)
          ) : (
            <AnimatePresence>
              {data?.tokens.map((token, index) => (
                <motion.div
                  key={token.mint}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white/5 border border-white/0 hover:border-white/5 hover:bg-white/10 p-4 rounded-[2rem] flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={token.logoURI} 
                        onError={(e: any) => e.target.src = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'} 
                        className="w-12 h-12 rounded-2xl bg-black object-cover" 
                      />
                      {token.symbol === 'SOL' && <ShieldCheck size={14} className="absolute -bottom-1 -right-1 text-cyan-400 bg-black rounded-full" />}
                    </div>
                    <div>
                      <h4 className="font-black text-sm">{token.symbol}</h4>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-tighter">${token.price.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm">{token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-tighter">${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </section>
    </div>
  );
};

const ActionButton = ({ icon, label, color }: any) => (
  <button className="flex flex-col items-center gap-2 group">
    <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center group-active:scale-90 transition-all shadow-lg`}>
      {icon}
    </div>
    <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500 group-hover:text-white">{label}</span>
  </button>
);

export default PortfolioView;
