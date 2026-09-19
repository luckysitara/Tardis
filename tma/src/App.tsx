import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import axios from 'axios';
import { 
  ShieldCheck, Zap, ArrowRight, CheckCircle2, AlertCircle, 
  Loader2, LayoutGrid, Repeat, PieChart, User as UserIcon,
  LogOut, Wallet as WalletIcon, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Components ---
import PortfolioView from './components/DeFi/PortfolioView';
import SwapView from './components/DeFi/SwapView';
import EarnView from './components/DeFi/EarnView';
import OnboardingView from './components/OnboardingView';

const API_BASE_URL = 'https://seek.kikhaus.com/api/auth/telegram';

declare global {
  interface Window {
    Telegram: any;
  }
}

type Tab = 'portfolio' | 'swap' | 'earn' | 'profile';

const App: React.FC = () => {
  const { login, ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [tgData, setTgData] = useState<{ id: string; username: string } | null>(null);
  const [isLinked, setIsLinked] = useState<boolean | null>(null);
  
  const [action, setAction] = useState<string | null>(null);
  const [tipData, setTipData] = useState<{ to: string; amount: string; token: string } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!ready) setInitError('Sync timeout. Please restart the app.');
    }, 12000);
    return () => clearTimeout(timeout);
  }, [ready]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#000000');
      tg.setBackgroundColor('#000000');
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('tg_id') || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const username = params.get('username') || window.Telegram?.WebApp?.initDataUnsafe?.user?.username;
    const act = params.get('action');

    if (id) {
      setTgData({ id: id.toString(), username: username || '' });
      checkLinkingStatus(id.toString());
    }

    if (act) setAction(act);
    
    if (act === 'tip') {
      setTipData({
        to: params.get('to') || '',
        amount: params.get('amount') || '',
        token: params.get('token') || ''
      });
    }

    if (act === 'swap') {
      setActiveTab('swap');
    }
  }, []);

  const handleConfirmTip = async () => {
    setLoading(true);
    try {
      // Simulation for now, can be wired to actual signTransaction later
      await new Promise(r => setTimeout(r, 1500));
      setStatus('success');
      setMessage(`Transfer of ${tipData?.amount} ${tipData?.token} initiated.`);
      setTimeout(() => {
        setStatus('idle');
        setAction(null);
      }, 3000);
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const checkLinkingStatus = async (telegramId: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/status/${telegramId}`);
      setIsLinked(res.data.isLinked);
    } catch (e) {
      console.error('Failed to check linking status');
    }
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle size={40} className="text-red-500 mb-4" />
        <h2 className="text-lg font-black italic tracking-tight mb-2 uppercase">System Timeout</h2>
        <p className="text-zinc-500 text-xs font-bold leading-relaxed">{initError}</p>
        <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Retry Sync</button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-purple-600/5" />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-20 h-20 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center relative z-10"
        >
          <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (!authenticated || isLinked === false) {
    return <OnboardingView tgData={tgData} onComplete={() => setIsLinked(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 font-sans pb-28 antialiased">
      {/* Dynamic Visual Layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-cyan-600/5 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150" />
      </div>

      {/* Premium Header */}
      <header className="sticky top-0 z-40 px-6 py-5 bg-[#050505]/60 backdrop-blur-xl border-b border-white/[0.02] flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-black rounded-[0.9rem] flex items-center justify-center font-black italic text-lg shadow-[0_10px_20px_rgba(255,255,255,0.1)]">T</div>
            <div className="space-y-0">
               <h1 className="text-sm font-black italic tracking-tight uppercase leading-none">TARDIS</h1>
               <p className="text-[8px] font-black text-cyan-400 tracking-[0.2em] uppercase opacity-80 leading-none mt-1">Social OS</p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
               <span className="text-[8px] font-black tracking-widest text-zinc-400">MAINNET</span>
            </div>
         </div>
      </header>

      <main className="relative z-10 p-6 pt-2">
        <AnimatePresence>
          {action === 'tip' && tipData && status === 'idle' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-end justify-center">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full bg-[#0A0A0A] border-t border-white/10 rounded-t-[3.5rem] p-10 pb-12 space-y-10 shadow-2xl">
                 <div className="w-16 h-1 bg-white/10 rounded-full mx-auto" />
                 <div className="space-y-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-cyan-500/20">
                       <Zap size={40} className="text-white" />
                    </div>
                    <div className="space-y-2">
                       <h2 className="text-3xl font-black italic tracking-tighter uppercase">Confirm Send</h2>
                       <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                          You are authorizing a secure transfer on the Solana blockchain.
                       </p>
                    </div>
                 </div>

                 <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-xl font-black italic border border-white/5">?</div>
                       <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Amount</p>
                          <p className="text-xl font-black italic">{tipData.amount} {tipData.token}</p>
                       </div>
                    </div>
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-zinc-600">
                       <ArrowRight size={20} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <button onClick={handleConfirmTip} disabled={loading} className="w-full h-18 bg-white text-black rounded-[2rem] font-black text-xl active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3 py-6">
                      {loading ? <Loader2 size={28} className="animate-spin" /> : 'AUTHORIZE'}
                    </button>
                    <button onClick={() => setAction(null)} className="w-full py-4 text-[10px] font-black text-zinc-600 hover:text-white uppercase tracking-[0.3em] transition-colors">Decline Transaction</button>
                 </div>
              </motion.div>
            </motion.div>
          )}

          {status !== 'idle' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-12 text-center">
               <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl ${status === 'success' ? 'bg-cyan-500/10 text-cyan-400 shadow-cyan-500/20' : 'bg-red-500/10 text-red-500 shadow-red-500/20'}`}>
                  {status === 'success' ? <CheckCircle2 size={56} /> : <Zap size={56} />}
               </motion.div>
               <h3 className="text-3xl font-black italic tracking-tighter mb-3 uppercase">{status === 'success' ? 'Confirmed' : 'Error'}</h3>
               <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed max-w-[240px] mx-auto">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'portfolio' && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <PortfolioView walletAddress={user?.wallet?.address} />
            </motion.div>
          )}
          {activeTab === 'swap' && (
            <motion.div key="swap" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <SwapView />
            </motion.div>
          )}
          {activeTab === 'earn' && (
            <motion.div key="earn" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <EarnView />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="bg-[#0A0A0A] border border-white/[0.03] rounded-[3rem] p-8 backdrop-blur-3xl shadow-2xl space-y-10">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
                      <div className="w-24 h-24 bg-gradient-to-tr from-[#111] to-[#1a1a1a] border border-white/5 rounded-[2.5rem] flex items-center justify-center text-3xl font-black italic relative z-10">
                        {user?.email?.address?.charAt(0).toUpperCase() || 'T'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black italic tracking-tighter uppercase">{tgData?.username || 'ANON USER'}</h2>
                      <p className="text-zinc-500 text-[9px] font-black tracking-[0.2em] uppercase font-mono">{user?.wallet?.address?.substring(0, 12)}...{user?.wallet?.address?.substring(36)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                     <ProfileButton icon={<WalletIcon size={18}/>} label="Manage Wallets" />
                     <ProfileButton icon={<Settings size={18}/>} label="Security Settings" />
                     <ProfileButton icon={<LogOut size={18}/>} label="Log Out" color="text-red-500" onClick={() => logout()} />
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-3 flex justify-between items-center shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          <NavButton active={activeTab === 'portfolio'} onClick={() => setActiveTab('portfolio')} icon={<LayoutGrid size={22} />} label="WALLET" />
          <NavButton active={activeTab === 'swap'} onClick={() => setActiveTab('swap')} icon={<Repeat size={22} />} label="SWAP" />
          <NavButton active={activeTab === 'earn'} onClick={() => setActiveTab('earn')} icon={<PieChart size={22} />} label="EARN" />
          <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={22} />} label="YOU" />
        </div>
      </nav>
    </div>
  );
};

const ProfileButton = ({ icon, label, color = "text-white", onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/5 transition-all group active:scale-[0.98]">
    <div className="flex items-center gap-4">
      <div className={`p-2 bg-black rounded-lg ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
      <span className={`text-[11px] font-black uppercase tracking-widest ${color}`}>{label}</span>
    </div>
    <ChevronRight size={16} className="text-zinc-700" />
  </button>
);

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button onClick={onClick} className={`relative flex flex-col items-center gap-1 w-1/4 py-2 transition-all duration-500 ${active ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
    <motion.div animate={{ y: active ? -2 : 0, scale: active ? 1.1 : 1 }}>
      {icon}
    </motion.div>
    <span className="text-[8px] font-black tracking-[0.2em] uppercase">{label}</span>
    {active && (
      <motion.div layoutId="nav-indicator" className="absolute -bottom-1 w-10 h-1 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee]" />
    )}
  </button>
);

export default App;
