<div align="center">

# Tardis

### Open-Source React Native Application for Building iOS and Android Crypto Mobile Apps with Solana Protocols.

<p> From AI to Social, Launchpads to Wallets, and Trading — build mobile apps faster. </p>

![SolanaAppKit](https://github.com/user-attachments/assets/b4a6dbbd-1073-412a-a5b9-4c2e41e39964)

<p align="center">
  <a href="demo.mp4"><b>🎥 Watch Demo Video</b></a> | 
  <a href="tardis_pitch.pdf"><b>📄 View Pitch Deck</b></a>
</p>

<p align="center">
  <a href="https://github.com/Tardis-Project/tardis/network/members"><img src="https://img.shields.io/github/forks/sendarcade/solana-app-kit?style=for-the-badge&color=blue" alt="GitHub Forks" /></a>
  <a href="https://github.com/Tardis-Project/tardis/blob/main/LICENSE"><img src="https://img.shields.io/github/license/sendarcade/solana-app-kit?style=for-the-badge&color=orange" alt="GitHub License" /></a>
</p>

</div>

## 🚀 Key Protocol Integrations

1. **P2P Lending (Pool-Based):**  
   A Bybit-style "Lender-First" lending protocol. Lenders create USDC/SOL pools with borrow ranges, and borrowers take loans by locking 150% SKR collateral. Full on-chain oracle validation via Pyth/Switchboard.

2. **Social Tipping:**  
   Send SOL or SPL token tips directly within chat threads. Integrated into the `ChatComposer` for seamless user rewards.

3. **Swaps:**  
   In-App trading via [Jupiter Ultra](https://jup.ag/) for the best prices across all DEXs.

4. **Launchpads:**  
   Meteora, Pump.fun, and Token Mill integrations for token launches.

---

## 📋 Table of Contents
- [📦 Core Installation](#-core-installation)
- [🚢 Mainnet Deployment](#-mainnet-deployment)
- [🧪 Testing Features](#-testing-features)
- [📂 Project Structure](#-project-structure)
- [🧩 Modules](#-modules)

---

## 🚢 Mainnet Deployment Guide

Deploying the Tardis ecosystem to Solana Mainnet involves two primary steps: the Smart Contract and the Mobile App.

### 1. Smart Contract (Rust/Anchor)
1. **Fund Wallet**: Send ~3.5 SOL to your deployment wallet (`2ggoPe4b9KFQQ5hghks3S9QWYdbSsGq1sJFscVNva5ZM`) to cover Mainnet account rent.
2. **Configure Cluster**: In `escrow/Anchor.toml`, update the provider:
   ```toml
   [provider]
   cluster = "mainnet"
   ```
3. **Deploy**:
   ```sh
   cd escrow
   anchor build
   anchor deploy --provider.cluster mainnet
   ```

### 2. Mobile App (React Native)
1. **Update Oracles**: In `src/core/profile/components/lending/LendingView.tsx`, update the Pyth SOL/USD address to Mainnet:
   ```typescript
   const PYTH_SOL_USD = new PublicKey("H6ARHf6XYucvS8B8vzeZfQ9xySstSsySAnQR6WDUvPB");
   ```
2. **Environment Variables**: Update `.env.local` to point to Mainnet RPCs:
   ```
   CLUSTER=mainnet-beta
   HELIUS_RPC_CLUSTER=mainnet
   ```

---

## 🧪 Testing Features

Use the following procedures to verify the core app functionalities:

### 1. P2P Lending (Lender Flow)
- **Navigate**: Go to `Profile` -> `Lending` -> `My Offers`.
- **Action**: Click `Create Lending Order`.
- **Verify**: Enter USDC amount and borrow range. After transaction, switch to `P2P Market` to see your order listed.

### 2. P2P Borrowing (Borrower Flow)
- **Navigate**: Go to `Profile` -> `Lending` -> `P2P Market`.
- **Action**: Click `Borrow Now` on an available pool.
- **Verify**: Enter the amount. The app will automatically calculate the **150% SKR Collateral**. Confirm to lock SKR and receive USDC.

### 3. Tipping
- **Setup**: Use the seeded default user `unclephil.skr` (Address: `AAxGjNqseQhYtNdEYXjijrQoQi8ZhgNfVk5NJzg2B5Mo`).
- **Action**: Open a chat with Uncle Phil and tap the `+` icon in the composer to select `Send Tip`.
- **Verify**: Send 0.1 SOL. Check the transaction bubble in the chat UI.

### 4. Session Management
- **Action**: Go to `Profile` header and tap the `Settings` icon.
- **Verify**: Select `Logout` to securely clear your session and return to the Landing Screen.

---

## 📂 Project Structure
*(See detailed structure in previous README sections)*

---

<div align="center">
Built with ❤️ for the Solana ecosystem by the Tardis Community.
</div>
