import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import axios from 'axios';
import { Wallet, ShieldCheck, Zap, ArrowRight, CheckCircle2, AlertCircle, Loader2, Home, Repeat, PieChart, User as UserIcon } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!ready) setInitError('Identity service timeout. Please check your connection.');
    }, 10000);
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
    
    if (id) {
      setTgData({ id: id.toString(), username: username || '' });
      checkLinkingStatus(id.toString());
    }
  }, []);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-10 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Sync Error</h2>
        <p className="text-zinc-500 text-sm">{initError}</p>
        <button onClick={() => window.location.reload()} className="mt-6 text-cyan-400 font-bold uppercase tracking-widest text-xs">Retry</button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(0,255,255,0.2)]" />
      </div>
    );
  }

  // If not authenticated or not linked, show onboarding
  if (!authenticated || isLinked === false) {
    return <OnboardingView tgData={tgData} onComplete={() => setIsLinked(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#00050D] text-white selection:bg-cyan-500/30 font-sans pb-24">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 blur-[120px] rounded-full opacity-50" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'portfolio' && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <PortfolioView walletAddress={user?.wallet?.address} />
            </motion.div>
          )}
          {activeTab === 'swap' && (
            <motion.div key="swap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <SwapView />
            </motion.div>
          )}
          {activeTab === 'earn' && (
            <motion.div key="earn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <EarnView />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
               <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
                      {user?.email?.address?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{tgData?.username || 'Tardis User'}</h2>
                      <p className="text-zinc-500 text-xs font-mono">{user?.wallet?.address?.substring(0, 8)}...{user?.wallet?.address?.substring(38)}</p>
                    </div>
                  </div>
                  <button onClick={() => logout()} className="w-full py-4 bg-white/5 rounded-2xl text-red-400 font-bold hover:bg-white/10 transition-colors">
                    Disconnect Wallet
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-black/80 backdrop-blur-2xl border-t border-white/5 p-4 flex justify-around items-center z-50 safe-area-bottom">
        <NavButton active={activeTab === 'portfolio'} onClick={() => setActiveTab('portfolio')} icon={<Home size={22} />} label="Wallet" />
        <NavButton active={activeTab === 'swap'} onClick={() => setActiveTab('swap')} icon={<Repeat size={22} />} label="Swap" />
        <NavButton active={activeTab === 'earn'} onClick={() => setActiveTab('earn')} icon={<PieChart size={22} />} label="Earn" />
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={22} />} label="Profile" />
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
    <motion.div animate={{ scale: active ? 1.2 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      {icon}
    </motion.div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    {active && <motion.div layoutId="nav-glow" className="absolute -bottom-4 w-12 h-1 bg-cyan-400 blur-sm rounded-full" />}
  </button>
);

export default App;
