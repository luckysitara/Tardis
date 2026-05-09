import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import axios from 'axios';
import { ShieldCheck, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  tgData: { id: string; username: string } | null;
  onComplete: () => void;
}

const API_BASE_URL = 'https://seek.kikhaus.com/api/auth/telegram';

const OnboardingView: React.FC<Props> = ({ tgData, onComplete }) => {
  const { login, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAction = async (type: 'link' | 'create') => {
    if (!authenticated) {
      login();
      return;
    }

    setLoading(true);
    try {
      // Find embedded wallet
      const solanaWallet = wallets.find((w: any) => w.connectorType === 'embedded') || wallets[0];
      const walletAddress = solanaWallet?.address;
      
      if (!walletAddress) {
        setError('Waiting for wallet initialization. Please try again.');
        setLoading(false);
        return;
      }

      const res = await axios.post(`${API_BASE_URL}/${type}`, {
        walletAddress,
        telegramId: tgData?.id,
        telegramUsername: tgData?.username,
        displayName: user?.email?.address || user?.google?.email || 'Tardis User'
      });

      if (res.data.success) {
        onComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#00050D] flex flex-col items-center justify-center p-6 text-white overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/10 blur-[150px] rounded-full" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-12 text-center relative z-10">
        <div className="space-y-4">
          <div className="w-24 h-24 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-[0_20px_50px_rgba(0,255,255,0.25)]">
            <ShieldCheck size={48} className="text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black italic tracking-tighter">TARDIS</h1>
            <p className="text-cyan-400 font-mono text-[10px] tracking-[0.3em] uppercase">Social-Financial OS</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleAction('link')}
            disabled={loading}
            className="w-full h-16 bg-white text-black rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <>LINK WALLET <ArrowRight size={20} /></>}
          </button>
          
          <button
            onClick={() => handleAction('create')}
            disabled={loading}
            className="w-full h-16 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            CREATE NEW IDENTITY
          </button>
          
          {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest px-4 leading-relaxed">{error}</p>}
        </div>

        <div className="flex justify-center gap-8 opacity-30">
           <div className="flex flex-col items-center gap-2">
              <ShieldCheck size={16}/>
              <span className="text-[8px] font-black tracking-widest uppercase">Secure</span>
           </div>
           <div className="flex flex-col items-center gap-2">
              <Zap size={16}/>
              <span className="text-[8px] font-black tracking-widest uppercase">Solana</span>
           </div>
           <div className="flex flex-col items-center gap-2">
              <ArrowRight size={16}/>
              <span className="text-[8px] font-black tracking-widest uppercase">Seedless</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingView;
