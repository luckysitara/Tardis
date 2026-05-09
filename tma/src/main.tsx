import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { SolanaProvider } from '@privy-io/react-auth/solana';
import App from './App';
import './index.css';

// Privy Configuration (Replace with your actual App ID)
const PRIVY_APP_ID = 'cm7h0f1g403a4lqex62696is9'; 

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
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </PrivyProvider>
  </React.StrictMode>
);
