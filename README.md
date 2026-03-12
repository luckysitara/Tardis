# 🌌 TARDIS: The Social Network & Financial OS for Solana Seeker

<div align="center">
  <img src="./Tardis.png" alt="TARDIS Banner" width="800">
  <br />
  <p align="center">
    <b>Hardware-Attested · Bot-Free · Sovereign Identity · Financial OS</b>
  </p>

  [![Solana Seeker](https://img.shields.io/badge/Solana-Seeker-000?style=for-the-badge&logo=solana&logoColor=9945FF)](https://solanamobile.com/)
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
</div>

---

## 📖 Table of Contents
- [🔍 The Problem](#-the-problem)
- [💡 The Solution](#-the-solution)
- [🚀 Core Features](#-core-features)
- [💸 Financial OS Features](#-financial-os-features)
- [🤖 Reimagine AI (Solana Agent Kit)](#-reimagine-ai-solana-agent-kit)
- [💎 $SKR Token Utility](#-skr-token-utility)
- [🗺 Phased Roadmap](#-phased-roadmap)
- [🛠 Technical Architecture](#-technical-architecture)
- [📦 Installation & Setup](#-installation--setup)
- [🔐 Environment Configuration](#-environment-configuration)
- [🛡 Security & Non-Custodial](#-security--non-custodial)
- [📜 Smart Contract Deployment](#-smart-contract-deployment)
- [👤 User Stories & PRD](#-user-stories--prd)
- [🏆 Hackathon Compliance](#-hackathon-compliance)

---

## 🔍 The Problem

**Seeker Users Have No Home.** Web2 social platforms were built for everyone — and serve no one in Web3.

1.  **Bots Everywhere:** No Web2 platform can prove a post was made by a human. Feeds are polluted with bots, fake wallets, and coordinated manipulation.
2.  **Broken Identity:** Social handles have zero link to on-chain identity. There is no unified system connecting social presence with financial reputation.
3.  **Fragmented Finance:** Tipping, trading, and lending happen on separate apps. Every action breaks the conversation, requiring constant tab-switching.
4.  **Zero Privacy Guarantees:** Centralized servers own your messages. Without hardware-level security or ZK encryption, private conversations are never truly private.

---

## 💡 The Solution

**One App. Every Seeker User. On-Chain.** TARDIS is the default social home for every Seeker owner — a network where identity, reputation, and community are verifiable on-chain from day one.

*   **Built for One Device:** TARDIS runs exclusively on the Seeker phone, utilizing hardware-first social attestation.
*   **On-Chain Identity:** Every user is their **.skr identity** — a wallet, a username, and a reputation score in one.
*   **Financial OS:** Finance happens *inside* the conversation. Threads and DMs are your financial terminal.

---

## 🚀 Core Features

### 🌌 1. The .skr Identity (Hardware-Native Auth)
- **Proof of Personhood:** Simultaneous check for physical hardware and the **Seeker Genesis Token (SGT)**.
- **Identity Signing:** All profile updates and identity claims are cryptographically signed by the **Seed Vault**.

### 🏛 2. The Town Square (Social Layer)
- **Hardware-Signed Feed:** High-fidelity "FlashList" feed where every post carries a hardware signature.
- **ZK Encrypted DMs:** Private 1-to-1 messaging with E2EE keys derived from the Seed Vault.
- **Token-Gated Colonies:** Immersive "Galactic Map" discovery for communities gated by SPL tokens, NFTs, or SGT.

---

## 💸 Financial OS Features

### 🤝 P2P Lending & Borrowing
Trustless, 1-to-1 lending secured by PDA-based collateral escrow.
*   **How it works:** Users can request loans directly in DMs or group chats.
*   **Collateral:** Borrowers lock collateral (e.g., SOL, BONK) into a smart contract escrow.
*   **Liquidation:** Automated liquidation logic ensures lenders are protected if collateral value drops.
*   **Zero-Friction:** Agreements are signed instantly via the Seeker's Seed Vault.

### 💰 Instant Tipping
Send value as easily as sending a text.
*   **Multi-Asset:** Tip in $SOL, $USDC, $SKR, or any SPL token.
*   **Context-Aware:** Tips appear inline within chat bubbles and post threads.
*   **No Copy-Pasting:** Recipients are identified by their verified .skr handle, eliminating address errors.

### 🛍 Product Listings in Posts
Turn any post into a storefront.
*   **Create Listings:** Users can attach a "Product" to any post with a price, image, and description.
*   **One-Tap Buy:** Buyers click "Buy Now" to execute a **Solana Action (Blink)** transaction.
*   **Escrow Settlement:** Funds are held in escrow until the buyer confirms receipt or the service is delivered.

---

## 🤖 Reimagine AI (Solana Agent Kit)

**The Grok of Solana.** TARDIS integrates a sophisticated AI layer that lives inside the app.

1.  **Natural Language Execution:** "Swap 2 SOL for $TARDIS if price drops 5%" — executed instantly.
2.  **Portfolio Intelligence:** Live PnL tracking, rug-pull risk scores, and yield opportunity alerts.
3.  **On-Chain Sentiment Alpha:** Monitors ecosystem activity to surface trending tokens before the crowd.
4.  **Conditional Automation:** Set triggers and walk away. Reimagine executes when your conditions are met.

---

## 💎 $SKR Token Utility

**The Currency of the Seeker Ecosystem.**
*   **Fee Discounts:** Reduced fees on all P2P lending and escrow transactions.
*   **Node Staking:** Stake $SKR to secure messaging relay nodes and earn rewards.
*   **Premium AI:** Unlock advanced Reimagine features and deeper portfolio intelligence.
*   **Community Gating:** Required to create token-gated communities.

---

## 🗺 Phased Roadmap

| Phase | Milestone | Status |
| :--- | :--- | :--- |
| **Phase 1** | **The Event Horizon** (MWA Auth, .skr Identity, SGT Gating) | ✅ Complete |
| **Phase 2** | **The Town Square** (Signed Feed, IPFS Media, Blinks Integration) | ✅ Complete |
| **Phase 3** | **Zero-Knowledge** (Seed Vault E2EE, X25519 Key Derivation) | ✅ Complete |
| **Phase 4** | **Financial OS** (Lending, Escrow, Pump.fun Integration) | 🚧 In Progress |
| **Phase 5** | **Galactic Map** (Full AI Sentiment Engine & Node Staking) | 🚧 In Progress |

---

## 🛠 Technical Architecture

TARDIS is built to be **Secure by Design** and **Sovereign by Default**.

-   **Hardware Layer:** Seeker Seed Vault, Hardware Attestation, .skr Identity Signing.
-   **Protocol Layer:** SVM, Program Derived Addresses (PDAs), Smart Contracts (Escrow/Lending).
-   **AI Layer:** Reimagine Engine, Solana Agent Kit, Sentiment Alpha.
-   **Storage Layer:** Shadow Drive / Iridium (Decentralized & Censorship-Resistant).
-   **Application Layer:** TARDIS Social, DeFi Terminal, Pump.fun Suite, $SKR Governance.

---

## 📦 Installation & Setup

### Prerequisites
- **Node.js** v18+ & **pnpm**
- **Android Studio** (Seeker Emulator or Physical Device)
- **Supabase Account** (PostgreSQL + RLS)
- **Pinata Account** (IPFS Storage)
- **Anchor** (For Smart Contract Development)

### 1. Clone the Repository
```bash
git clone https://github.com/luckysitara/Tardis.git
cd Tardis
```

### 2. Backend Setup
```bash
cd server
pnpm install
# Create your .env based on .env.example
cp .env.example .env
# Set up your Supabase DB and run rls.sql from the root directory
# Start the server
pnpm run dev
```

### 3. Mobile App Setup
```bash
# From the root directory
pnpm install
# Create your .env based on .env.example
cp .env.example .env
# Start the Expo development server
npx expo start
# Press 'a' to run on Android
```

---

## 🔐 Environment Configuration

### Root `.env` (Mobile)
```env
SERVER_URL=https://your-api.com
PINATA_GATEWAY=your-subdomain.mypinata.cloud
```

### `server/.env` (Backend)
```env
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
DATABASE_URL=postgresql://postgres:pass@host:5432/postgres
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY=your-subdomain.mypinata.cloud
PINATA_API_KEY=your_api_key
PINATA_SECRET=your_api_secret
PORT=8085
```

---

## 📜 Smart Contract Deployment

TARDIS uses an Anchor-based smart contract for its Escrow and Lending features.

### 1. Setup Anchor
Ensure you have Rust, Solana CLI, and Anchor installed.

### 2. Build the Program
```bash
cd escrow
anchor build
```

### 3. Deploy to Devnet
```bash
# Configure Solana CLI to Devnet
solana config set --url devnet

# Deploy the program
anchor deploy --provider.cluster devnet
```
*Take note of the Program ID output after deployment.*

### 4. Update Program ID
Update `Anchor.toml` and `programs/lending_program/src/lib.rs` with your new Program ID. Re-build and re-deploy if necessary.

### 5. Deploy to Mainnet
```bash
# Configure Solana CLI to Mainnet
solana config set --url mainnet-beta

# Deploy (Ensure you have enough SOL for rent exemption)
anchor deploy --provider.cluster mainnet
```

---

## 👤 User Stories & PRD

### User Story 1: The Verified Creator
*As a digital artist, I want to post my latest work on TARDIS so that my followers know it's authentically mine.*
- **Acceptance Criteria:** Post is signed by Seed Vault; "Verified Hardware" badge appears; Image hosted on IPFS.

### User Story 2: The DeFi Trader
*As a trader, I want to buy a whitelist token directly from a post without copying addresses.*
- **Acceptance Criteria:** Click "Buy Now" on a post; Blink transaction appears; One-tap sign & send via MWA.

### User Story 3: The Community Lead
*As a DAO leader, I want to create a private group chat that only holders of my NFT collection can join.*
- **Acceptance Criteria:** Create group > Select "NFT Gated" > Input Collection Address. Server verifies ownership before allowing entry.

---

## 🏆 Hackathon Compliance

| Requirement | Status | Evidence |
| :--- | :--- | :--- |
| **Seeker-Native** | ✅ | Native MWA/Seed Vault integration in `/src/modules/wallet-providers` |
| **Identity (.skr)** | ✅ | SNS resolution & hardware-signed profile updates |
| **Solana Actions** | ✅ | Native Blink support in `src/shared/components/ProductBlinkCard.tsx` |
| **Token Extensions** | ✅ | Seeker Genesis Token (SGT) gating in `server/src/controllers/communityController.ts` |
| **DeFi Integration**| ✅ | P2P Lending/Escrow Smart Contracts in `/escrow` |

---

**Transmitting from the Seeker... See you in the Town Square.** 🛸
