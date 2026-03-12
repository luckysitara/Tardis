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
- [🎮 User Guide: How to Use TARDIS](#-user-guide-how-to-use-tardis)
- [🤖 Reimagine AI (Solana Agent Kit)](#-reimagine-ai-solana-agent-kit)
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

1.  **Bots Everywhere:** No Web2 platform can prove a post was made by a human. Feeds are polluted with bots and coordinated manipulation.
2.  **Broken Identity:** Social handles have zero link to on-chain identity.
3.  **Fragmented Finance:** Tipping, trading, and lending happen on separate apps.
4.  **Zero Privacy Guarantees:** Centralized servers own your messages.

---

## 💡 The Solution

**One App. Every Seeker User. On-Chain.** TARDIS is the default social home for every Seeker owner — a network where identity, reputation, and community are verifiable on-chain from day one.

*   **Built for One Device:** TARDIS runs exclusively on the Seeker phone.
*   **On-Chain Identity:** Every user is their **.skr identity**.
*   **Financial OS:** Finance happens *inside* the conversation.

---

## 🚀 Core Features

-   **Hardware-Native Auth:** Simultaneous check for physical hardware and the **Seeker Genesis Token (SGT)**.
-   **Signed Social Layer:** Every post and reaction is cryptographically signed by the **Seed Vault**.
-   **Zero-Knowledge DMs:** Private 1-to-1 messaging with keys derived from hardware.
-   **Gated Colonies:** Communities gated by SPL tokens, NFTs, or SGT.
-   **Financial Terminal:** Integrated Pump.fun launching, P2P lending, and tipping.

---

## 🎮 User Guide: How to Use TARDIS

### 1. Onboarding & Identity
1.  **Connect Seeker:** Tap the "Connect Seeker" button on the landing page.
2.  **Hardware Check:** The app will verify your **Seeker Genesis Token (SGT)** via MWA.
3.  **Identity Resolution:** Your **.skr handle** will be automatically resolved and used as your username.
4.  **Secure Profile:** Edit your bio or avatar. Note that every profile update requires a **Seed Vault signature** to verify authorship.

### 2. The Town Square (Social Feed)
1.  **Create a Post:** Tap the `+` icon. Enter your text or attach an IPFS-hosted image.
2.  **Hardware Signing:** When you tap "Post," your Seeker will prompt you to sign the content hash.
3.  **Engage:** Like or Repost updates. These are "gasless" but carry your hardware signature for proof-of-intent.
4.  **Product Listings:** Want to sell something? Use the "List Product" toggle in the composer to attach a price and title. This creates a **Solana Blink** that others can buy with one tap.

### 3. End-to-End Encrypted DMs
1.  **Start Chat:** Search for a user's .skr handle and tap "Message."
2.  **Key Derivation:** The first time you message, TARDIS derives an **X25519 keypair** from your Seed Vault.
3.  **Chat Privately:** All messages are encrypted locally. Only the recipient with the corresponding hardware-derived key can decrypt them.

### 4. Establishing a Colony (Pump.fun Launch)
1.  **Go to Communities:** Navigate to the "Galactic Map" tab.
2.  **Create Community:** Tap the plus icon to start the "Establish Colony" wizard.
3.  **Launch with Token:** Toggle **"Launch with New Token"**.
4.  **Token Details:** Enter your Token Name (e.g., "Seeker Alpha") and Symbol (e.g., "SKRA").
5.  **Initial Buy:** Set the amount of SOL you want to use for the initial bonding curve buy.
6.  **Atomic Execution:** TARDIS will:
    - Upload your metadata to IPFS.
    - Launch the token on **Pump.fun**.
    - Execute the initial buy.
    - Create the community and set the new token as the **access gate**.
    - *All in one hardware-signed flow.*

### 5. Financial Interactions
1.  **Instant Tipping:** In any chat, tap the 💸 icon next to a message to send a SOL tip to the sender.
2.  **Buy from Blinks:** When you see a product listing in the feed, tap **"Buy Now"**. TARDIS fetches the transaction from the server and prompts your Seeker to sign and send.
3.  **P2P Lending:** Use the `/lend` command or lending interface to request a collateralized loan from a peer.

---

## 🤖 Reimagine AI (Solana Agent Kit)

**The Grok of Solana.** Reimagine analyzes on-chain data and executes trades via natural language.
- "Swap 1 SOL for $SKR if price hits $0.50"
- "Alert me if a new Seeker-only colony is established"

---

## 🗺 Phased Roadmap

- **Phase 1: The Big Bang** (Auth, Identity, SGT Gating) ✅
- **Phase 2: Materialization** (Signed Feed, IPFS, Blinks) ✅
- **Phase 3: Zero-Knowledge** (E2EE DMs, Hardware Keys) ✅
- **Phase 4: Financial OS** (Pump.fun, Lending, Escrow) 🚧
- **Phase 5: Galactic Map** (AI Alpha, Node Staking) 🚧

---

## 🛠 Technical Architecture

```text
[ Solana Seeker ] <--- MWA ---> [ TARDIS Mobile App ] <--- Socket.io ---> [ TARDIS Backend ]
       |                                |                                     |
[ Seed Vault ]                  [ Redux / Thunks ]                    [ Node.js / Knex ]
       |                                |                                     |
[ X25519 Keys ]                 [ IPFS / Pinata ]                     [ Supabase / RLS ]
```

---

## 📦 Installation & Setup

1.  **Clone Repository:**
    ```bash
    git clone https://github.com/luckysitara/Tardis.git
    cd Tardis
    ```
2.  **Backend Setup:**
    ```bash
    cd server && pnpm install && cp .env.example .env
    # Run Supabase setup (rls.sql)
    pnpm run dev
    ```
3.  **Mobile Setup:**
    ```bash
    cd .. && pnpm install && cp .env.example .env
    npx expo start # Press 'a' for Android
    ```

---

## 📜 Smart Contract Deployment (Escrow/Lending)

```bash
cd escrow
anchor build
anchor deploy --provider.cluster devnet # or mainnet
```

---

## 🏆 Hackathon Compliance

- **Seeker-Native:** Native MWA/Seed Vault integration.
- **Token Extensions:** SGT gating for 100% human verification.
- **Solana Actions:** Native Blink rendering for social commerce.
- **DeFi Integration:** P2P Lending/Escrow and Pump.fun automation.

---

**Transmitting from the Seeker... See you in the Town Square.** 🛸
