<div align="center">

# 🌌 Tardis: The Sovereign Social & Financial OS

### **The "Bigger on the Inside" Ecosystem for Solana Seeker**

Tardis is a hardware-native platform built exclusively for the Solana Seeker. It unifies bot-free, hardware-verified messaging with a powerful DeFi terminal and AI-driven intelligence into a single, sovereign interface.

[![Watch the Tardis Demo](https://img.shields.io/badge/🎥_Watch-Demo_Video-blueviolet?style=for-the-badge)](demo.mp4)
[![View Pitch Deck](https://img.shields.io/badge/📄_View-Pitch_Deck-ff69b4?style=for-the-badge)](tardis_pitch.pdf)
[![Solana Seeker Native](https://img.shields.io/badge/📱_Native-Seeker_Hardware-00FFA3?style=for-the-badge)](https://solanamobile.com/)

</div>

---

## 🚀 Vision: Social Media at the Hardware Layer
Web3 social is currently fragmented. **Tardis** bridges the gap by moving the social layer onto the hardware layer. [span_0](start_span)[span_1](start_span)By utilizing the **Solana Seed Vault** and hardware attestation, we’ve turned every Seeker device into a verifiable identity hub.[span_0](end_span)[span_1](end_span)

- **100% Human Verified:** Every post is cryptographically signed by the device. [span_2](start_span)[span_3](start_span)[span_4](start_span)The bot problem is solved at the protocol level.[span_2](end_span)[span_3](end_span)[span_4](end_span)
- **Unified .skr Identity:** Your wallet IS your profile. [span_5](start_span)[span_6](start_span)One username, one wallet, and one verifiable reputation score.[span_5](end_span)[span_6](end_span)
- **Embedded DeFi:** No more app-switching. [span_7](start_span)[span_8](start_span)Chatting is your financial terminal.[span_7](end_span)[span_8](end_span)

---

## 🛠️ Core Features

### 1. P2P Lending & Escrow (352KB Rust Program)
A non-custodial lending protocol using **Program Derived Addresses (PDAs)**. 
- **[span_9](start_span)Lenders:** Create USDC/SOL pools with custom borrow ranges.[span_9](end_span)
- **[span_10](start_span)[span_11](start_span)Borrowers:** Unlock liquidity by locking **150% $SKR collateral**.[span_10](end_span)[span_11](end_span)
- **[span_12](start_span)On-Chain Oracle:** Full price validation via Pyth/Switchboard.[span_12](end_span)

### 2. Reimagine AI (Solana Agent Kit)
[span_13](start_span)[span_14](start_span)Our "Grok of Solana" lives inside the app.[span_13](end_span)[span_14](end_span)
- **[span_15](start_span)Natural Language Execution:** "Swap 2 SOL for $SKR if price drops 5%"[span_15](end_span)
- **[span_16](start_span)Portfolio Intelligence:** Live PnL tracking and rug-pull risk scores.[span_16](end_span)
- **[span_17](start_span)Sentiment Alpha:** Real-time on-chain data analysis to surface trending tokens.[span_17](end_span)

### 3. Integrated Social-Fi
- **[span_18](start_span)Hardware-Signed Social:** Threads, public feeds, and ZK-encrypted DMs.[span_18](end_span)
- **[span_19](start_span)In-App Tipping:** Send $SOL, $SKR, or SPL tokens directly in chat bubbles.[span_19](end_span)
- **[span_20](start_span)[span_21](start_span)[span_22](start_span)Token-Gated Communities:** Launch groups gated by $SKR or any SPL token.[span_20](end_span)[span_21](end_span)[span_22](end_span)

---

## 📦 Local Installation (Seeker Development)

### **Prerequisites**
- **Hardware:** Solana Seeker mobile device (connected via USB).
- **Environment:** Android Studio + `adb` installed, `pnpm`, and `expo-cli`.

### **Setup Steps**
1. **Clone & Install:**
   ```bash
   git clone [https://github.com/Tardis-Project/tardis.git](https://github.com/Tardis-Project/tardis.git)
   cd tardis
   pnpm install

 * Environment Configuration:
   cp .env.example .env
# Open .env and replace with your RPC credentials and Helius keys

 * Run on Seeker:
   Ensure your Seeker is in developer mode and connected.
   npx expo run:android

🚢 Mainnet Deployment Guide
1. Smart Contract (Anchor/Rust)
The lending program is optimized at 352KB.
 * Fund Wallet: Ensure your deployer (2ggoPe4b9KFQQ5hghks3S9QWYdbSsGq1sJFscVNva5ZM) has ~5 SOL for rent-exemption and buffer.
 * Configure: In escrow/Anchor.toml, set cluster = "mainnet".
 * Deploy:
   cd escrow
anchor build
anchor deploy --provider.cluster mainnet

2. Mobile App (Seeker Dapp Store)
 * Update Oracles: Switch PYTH_SOL_USD to the Mainnet address in LendingView.tsx.
 * Cluster Settings: Update .env to CLUSTER=mainnet-beta.
🧪 Verification & Testing
 * P2P Market: Navigate to Profile -> Lending to create or fill orders.
 * Identity Check: Use the seeded user unclephil.skr (AAxGjNqseQhYtNdEYXjijrQoQi8ZhgNfVk5NJzg2B5Mo) to test cross-device messaging.
 * Premium Access: Hold $SKR to unlock the "Reimagine" AI Sentiment Engine.
<div align="center">
Built for the <b>Solana Seeker</b> community by the <b>TARDIS Team</b>.
</div>

