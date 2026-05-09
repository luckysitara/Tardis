import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import App from './App';
import './index.css';

// Privy Configuration (Replace with your actual App ID)
const PRIVY_APP_ID = 'cmoy8gxtk04kw0cjx0r6hivf7'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'twitter', 'apple'],
        appearance: {
          theme: 'dark',
          accentColor: '#00FFFF',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com'),
            },
          },
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);
