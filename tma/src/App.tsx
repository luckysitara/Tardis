import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import axios from 'axios';
import { Wallet, ShieldCheck, Zap, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'https://seek.kikhaus.com/api/auth/telegram';

declare global {
  interface Window {
    Telegram: any;
  }
}

const App: React.FC = () => {
  const { login, ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  
  const [tgData, setTgData] = useState<{ id: string; username: string } | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!ready) {
        setInitError('Identity service is taking longer than expected. Please check your connection.');
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [ready]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      // Set header color to match Tardis theme
      tg.setHeaderColor('#000000');
      tg.setBackgroundColor('#000000');
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('tg_id') || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const username = params.get('username') || window.Telegram?.WebApp?.initDataUnsafe?.user?.username;
    const act = params.get('action');
    const claim = params.get('claim');

    if (id) setTgData({ id: id.toString(), username: username || '' });
    if (act) setAction(act);
    if (claim) setClaimId(claim);
  }, []);

  const handleAuth = async () => {
    if (!authenticated) {
      login();
      return;
    }

    setLoading(true);
    try {
      const solanaWallet = wallets.find((w: any) => w.connectorType === 'embedded') || wallets[0];
      const walletAddress = solanaWallet?.address;

      if (!walletAddress) {
        setMessage('Initializing secure enclave...');
        setLoading(false);
        return;
      }

      const endpoint = action === 'link' ? '/link' : '/create';
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        walletAddress,
        telegramId: tgData?.id,
        telegramUsername: tgData?.username,
        displayName: user?.email?.address || user?.google?.email || user?.twitter?.username || 'Tardis User'
      });

      if (response.data.success) {
        setStatus('success');
        setMessage(action === 'link' ? 'Account successfully linked to Tardis.' : 'Your Tardis identity has been initialized.');
        setTimeout(() => {
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.close();
          }
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      // Clean up technical error messages for the user
      const errorMsg = err.response?.data?.error || '';
      if (errorMsg.includes('column') || errorMsg.includes('relation')) {
        setMessage('Backend synchronization error. Please try again in a moment.');
      } else {
        setMessage(errorMsg || 'Connection failed. Please ensure you are authorized.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-10 text-center font-sans">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight">Sync Timeout</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">{initError}</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-zinc-800 rounded-full text-sm font-bold hover:bg-zinc-700 transition-all">
          Retry Connection
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,255,255,0.3)]"
        >
          <ShieldCheck size={32} className="text-black" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-10 text-center relative z-10"
      >
        {/* Header */}
        <div className="space-y-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-24 h-24 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-[0_20px_50px_rgba(0,255,255,0.2)] transform rotate-3"
          >
            <ShieldCheck size={48} className="text-white transform -rotate-3" />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter italic">TARDIS</h1>
            <p className="text-cyan-400 font-mono text-[10px] tracking-[0.3em] uppercase opacity-80">Social-Financial OS</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-2xl shadow-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <AnimatePresence mode="wait">
            {status === 'idle' ? (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-3 text-left">
                  <h2 className="text-2xl font-bold leading-tight">
                    {action === 'link' ? 'Link Account' : 'Welcome to Tardis'}
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                    {claimId 
                      ? "You've received a digital asset tip! Initialize your secure wallet to claim it instantly."
                      : "The first social-financial OS built for Solana. Connect your identity to start executing on-chain."}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleAuth}
                    disabled={loading}
                    className="group relative w-full h-16 bg-white text-black rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <>
                        {authenticated ? 'CONFIRM SYNC' : 'GET STARTED'}
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                  
                  {authenticated && !loading && (
                    <button 
                      onClick={() => logout()}
                      className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                    >
                      Use Different Account
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-6 space-y-6"
              >
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${status === 'success' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-500'}`}>
                  {status === 'success' ? <CheckCircle2 size={40} /> : <Zap size={40} />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">{status === 'success' ? 'Sync Complete' : 'Sync Failed'}</h3>
                  <p className="text-zinc-400 text-sm font-medium leading-relaxed px-4">{message}</p>
                </div>
                {status === 'error' && (
                   <button 
                    onClick={() => setStatus('idle')}
                    className="text-xs font-bold text-cyan-500 hover:text-cyan-300 uppercase tracking-widest"
                   >
                     Try Again
                   </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-3 gap-4 pt-4 opacity-40">
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck size={18} />
            <span className="text-[9px] font-black uppercase tracking-tighter leading-none">Non-Custodial</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap size={18} />
            <span className="text-[9px] font-black uppercase tracking-tighter leading-none">Flash Speed</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
               <ShieldCheck size={18} />
            </motion.div>
            <span className="text-[9px] font-black uppercase tracking-tighter leading-none">On-Chain</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
