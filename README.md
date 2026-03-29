# 🌌 TARDIS: The Social-Financial OS for Solana Seeker

<div align="center">
  <img src="./Tardis.png" alt="TARDIS Banner" width="800">
  <br />
  <p align="center">
    <b>Hardware-Attested · Bot-Free · Sovereign Identity · Financial Terminal</b>
  </p>

  [![Download APK](https://img.shields.io/badge/Download-APK-orange?style=for-the-badge&logo=android)](./Tardis.apk)
  [![Solana Seeker](https://img.shields.io/badge/Solana-Seeker-000?style=for-the-badge&logo=solana&logoColor=9945FF)](https://solanamobile.com/)
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Seed Vault](https://img.shields.io/badge/Seed_Vault-Secure-green?style=for-the-badge)](https://solanamobile.com/seed-vault)
  [![Blinks](https://img.shields.io/badge/Solana-Blinks-blue?style=for-the-badge)](https://solana.com/developers/actions)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
</div>

---

## 📖 Table of Contents
- [🔍 The Problem](#-the-problem)
- [💡 The Solution](#-the-solution)
- [🚀 Core Pillars](#-core-pillars)
- [🎮 User Guide: Step-by-Step TARDIS Walkthrough](#-user-guide-step-by-step-tardis-walkthrough)
- [🤖 Reimagine AI (Solana Agent Kit)](#-reimagine-ai-solana-agent-kit)
- [📲 Quick Install](#-quick-install)
- [📦 Installation & Local Setup](#-installation--local-setup)
- [🛠 Technical Architecture](#-technical-architecture)
- [🗺 Phased Roadmap](#-phased-roadmap)
- [📜 Smart Contract Deployment](#-smart-contract-deployment)
- [🏆 Hackathon Compliance](#-hackathon-compliance)

---

## 🔍 The Problem: The "Social-Trust" Gap

Web2 social platforms and generic dApps are failing the **Solana Seeker** community:
1.  **The Bot/Sybil Plague:** Without hardware attestation, no platform can prove a post was made by a physical human. Coordinated manipulation and AI spam have destroyed digital trust.
2.  **Disconnected Financials:** Tipping, lending, and trading are treated as "external features," leading to massive friction and fragmented liquidity.
3.  **Privacy Theatre:** "Encrypted" messaging apps still rely on centralized servers or software-based keys that are vulnerable to extraction.

---

## 💡 The Solution: A Hardware-Locked Social Moat

**TARDIS** is the first **Social-Financial OS** built to turn the Solana Seeker into a sovereign communication and wealth-management node. We move past "apps" into a **Hardware-Attested Ecosystem.**

*   **Verified Humanity:** Every user is a confirmed human, verified via **Seeker Hardware Attestation** and the **Seeker Genesis Token (SGT)**.
*   **Unforgeable Identity:** Your **.skr handle** is cryptographically anchored to your device's **Seed Vault**.
*   **Atomic Finance:** We bring the market *into* the conversation. Lending, commerce, and token launches happen via **Solana Actions (Blinks)** directly in the feed.

---

## 🚀 Core Pillars

- 🛡️ **Hardware-Native Auth:** Simultaneous verification of Seeker hardware and SGT Group Member extensions.
- ✍️ **Seed Vault Signing:** Every post, reaction, and listing is cryptographically signed by the device's Secure Element—eliminating bots by design.
- 🔐 **Zero-Knowledge DMs:** E2EE messaging using **X25519 keys** derived directly from the Seed Vault. Private, sovereign, and server-blind.
- 🏦 **P2P Lending & Reputation:** Access collateralized credit markets where your reputation is anchored to your hardware-attested identity.
- 🛍️ **Social Commerce & Escrow:** Secure buyer/seller protection through an **Anchor-based Escrow contract**, rendered via interactive **Blinks**.
- 📊 **Financial Terminal:** A high-fidelity dashboard for **Pump.fun** launches, portfolio management, and real-time social-financial signals.

---

## 🎮 User Guide: Step-by-Step TARDIS Walkthrough

### 1. Onboarding & Hardware-Native Auth
**Goal:** Verify your identity as a Seeker owner and secure your account.

1.  **Launch TARDIS:** Open the app on your Solana Seeker.
2.  **Connect Wallet:** Tap **"Connect Seeker"** to trigger the **Mobile Wallet Adapter (MWA)**.
3.  **Approve Signature:** TARDIS performs a dual-gate check: Physical Hardware + **Seeker Genesis Token (SGT)**.
4.  **Identity Resolution:** Your **.skr handle** (e.g., `satoshi.skr`) is resolved from your wallet and becomes your unforgeable display name.
5.  **Setup Profile:** Navigate to the **Profile** tab. Every change is hardware-signed to ensure authenticity.

### 2. The Town Square (Social Feed & Commerce)
**Goal:** Share updates and list products in the bot-free global feed.

1.  **View Feed:** The **Town Square** shows posts signed by the **Seed Vault**.
2.  **Create a Post:** Tap the `+` button. Toggle **"Product Listing Mode"** to enter a title and price in SOL.
3.  **Hardware Signing:** Every post is cryptographically tied to your hardware via a Seed Vault signature request.
4.  **Purchase:** When you see a Listing, tap **"Buy Now"**. TARDIS renders a **Solana Blink** that handles the transaction atomically via our **Escrow Smart Contract**.
5.  **Engagement:** Like and Repost gaslessly; authenticity is guaranteed by your device signature.

### 3. Communities & Colonies (The Galactic Map)
**Goal:** Join gated groups or establish your own sovereign colony.

1.  **Explore:** Browse the **Galactic Map**—a high-fidelity UI for discovering gated groups.
2.  **Join:** Tap **"Join"** to verify your holdings (NFTs, tokens, or SGT) and gain entry.
3.  **Create:** Use the wizard to set name, description, and gating rules. Toggle "Public Announcement" to notify the Town Square.
4.  **Govern:** Participate in polls and proposals directly in the chat using **Solana Actions**.

### 4. Create New Coin (Integrated Pump.fun)
**Goal:** Launch a token for your community with zero friction.

1.  **Launchpad:** Enter Token Name, Symbol, and Description.
2.  **Initial Buy:** Enter the SOL amount for the initial bonding curve purchase.
3.  **Deploy:** TARDIS uploads metadata to IPFS and launches the coin on **Pump.fun** in a single atomic transaction.

### 5. Secure End-to-End Encrypted DMs
**Goal:** Message other Seeker owners with privacy guaranteed by the Seed Vault.

1.  **New Message:** In the **Chats** tab, search for a .skr handle.
2.  **Key Exchange:** TARDIS uses the **Seed Vault** to derive **X25519 encryption keys**. Your messages are never readable by the server.
3.  **Tipping:** Tap the 💸 icon next to a user's name to send an instant SOL/SPL tip without leaving the conversation.

### 6. Financial OS & AI Agent
**Goal:** Execute complex trades and manage loans via the integrated agent.

1.  **Tardis Agent:** Open the **Reimagine AI** screen.
2.  **Natural Language Commands:** Type commands like *"Swap 0.5 SOL for $BONK"* or *"What is the floor price of my Mad Lads?"*
3.  **Lending:** Use the **Financial** tab to request or provide P2P collateralized loans.

---

## 🤖 Reimagine AI (Solana Agent Kit)

**The Grok of Solana.** Reimagine analyzes on-chain data and executes trades via natural language.
- "Swap 1 SOL for $SKR if price hits $0.50"
- "Alert me if a new Seeker-only colony is established"

---

## 📲 Quick Install

> [!CAUTION]
> 📱 **Hardware Requirement: Solana Mobile Only**
> TARDIS requires a Solana Seeker (or Saga) device to function. It leverages Seed Vault and Hardware Attestation for core security. It will not run on standard Android devices or emulators without the Solana Mobile Stack (SMS) and physical secure element support.

If you are on your **Solana Seeker**, you can download the latest build directly:

> [!IMPORTANT]
> **[Download Tardis.apk](./Tardis.apk)**

---

## 📦 Installation & Local Setup

To run TARDIS locally for development, follow these steps.

### 1. Prerequisites
- **Node.js** (v18+) & **pnpm**
- **Android Studio** (for Seeker Emulator or Physical Device)
- **Solana Seeker** (Physical device or Emulator with MWA support)

### 2. Clone the Repository
```bash
git clone https://github.com/luckysitara/Tardis.git
cd Tardis
```

### 3. Backend Setup (Server)
```bash
cd server
pnpm install
cp .env.example .env # Update with Supabase, RPC, Pinata keys
pnpm dev
```

### 4. Mobile App Setup (Frontend)
```bash
cd ..
pnpm install
# Update .env with your Backend URL (e.g., http://10.0.2.2:3000)
npx expo run:android
```

---

## 🛠 Technical Architecture

```text
[ Solana Seeker ] <--- MWA ---> [ TARDIS Mobile App ] <--- Socket.io ---> [ TARDIS Backend ]
       |                                |                                     |
[ Seed Vault ]                  [ Redux / Thunks ]                    [ Node.js / Knex ]
       |                                |                                     |
[ X25519 Keys ]                 [ IPFS / Escrow Contract ]            [ Supabase / RLS ]
```

---

## 🗺 Phased Roadmap

- **Phase 1: The Big Bang** (Hardware Auth & Identity) ✅
- **Phase 2: Materialization** (Signed Social Feed & Blinks) ✅
- **Phase 3: Zero-Knowledge** (E2EE DMs & Hardware Keys) ✅
- **Phase 4: Financial OS** (Lending, Escrow, Portfolio) ✅
- **Phase 5: Galactic Map** (AI Alpha, Node Staking) 🚧

---

## 📜 Smart Contract Deployment (Escrow/Lending)

```bash
cd escrow
anchor build
anchor deploy --provider.cluster devnet # or mainnet
```

---

## 🏆 Hackathon Compliance

- **Seeker-Native:** Native MWA/Seed Vault integration for unforgeable social identity.
- **Token Extensions:** SGT gating for 100% human verification (Sybil resistance).
- **Solana Actions:** Native Blink rendering for social commerce and governance.
- **DeFi Integration:** P2P Lending/Escrow and Pump.fun atomic token launches.

---

**Transmitting from the Seeker... See you in the Town Square.** 🛸
