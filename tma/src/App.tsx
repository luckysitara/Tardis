import React, { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import axios from 'axios';
import { Wallet, Link, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:8085/api/auth/telegram'; // Update with your actual API URL

declare global {
  interface Window {
    Telegram: any;
  }
}

const App: React.FC = () => {
  const { login, ready, authenticated, user, logout } = usePrivy();
  const { createWallet } = useSolanaWallets();
  const { wallets } = useWallets();
  
  const [tgData, setTgData] = useState<{ id: string; username: string } | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Initialize Telegram Web App
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Parse URL params
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
      const walletAddress = user?.wallet?.address;
      if (!walletAddress) {
        setMessage('Creating your secure wallet...');
        await createWallet();
        setLoading(false);
        return;
      }

      const endpoint = action === 'link' ? '/link' : '/create';
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        walletAddress,
        telegramId: tgData?.id,
        telegramUsername: tgData?.username,
        displayName: user?.email?.address || user?.twitter?.username || 'Tardis User'
      });

      if (response.data.success) {
        setStatus('success');
        setMessage(action === 'link' ? 'Account Linked Successfully!' : 'Tardis Identity Created!');
        setTimeout(() => {
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.close();
          }
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-black text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        {/* Header */}
        <div className="space-y-2">
          <div className="w-20 h-20 bg-cyan-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(0,255,255,0.4)]">
            <ShieldCheck size={40} className="text-black" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter">TARDIS</h1>
          <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase">Social-Financial OS</p>
        </div>

        {/* Content */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {status === 'idle' ? (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2 text-left">
                  <h2 className="text-xl font-semibold">
                    {action === 'link' ? 'Link Existing Account' : 'Initialize Your Identity'}
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {claimId 
                      ? "Someone sent you a tip! Create a wallet below to claim it instantly."
                      : "Bridge your Telegram presence with the Solana blockchain. No seed phrases, just secure on-chain execution."}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleAuth}
                    disabled={loading}
                    className="w-full h-14 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {authenticated ? 'Confirm Connection' : 'Get Started'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  
                  {authenticated && (
                    <button 
                      onClick={() => logout()}
                      className="text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      Not your account? Logout
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-8 space-y-4"
              >
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {status === 'success' ? <CheckCircle2 size={32} /> : <Zap size={32} />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">{status === 'success' ? 'Success!' : 'Operation Failed'}</h3>
                  <p className="text-zinc-400 text-sm">{message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-6 text-zinc-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span className="text-[10px] uppercase tracking-wider font-bold">Non-Custodial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link size={14} />
            <span className="text-[10px] uppercase tracking-wider font-bold">Solana Mainnet</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
