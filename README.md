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

## 🎮 User Guide: Step-by-Step TARDIS Walkthrough

Follow this guide to master all the features of the TARDIS Financial OS.

### 1. Onboarding & Hardware-Native Auth
**Goal:** Verify your identity as a Seeker owner and secure your account.

1.  **Launch TARDIS:** Open the app on your Solana Seeker.
2.  **Connect Wallet:** Tap the **"Connect Seeker"** button. This triggers the Mobile Wallet Adapter (MWA).
3.  **Approve Signature:** Your phone will prompt you to approve the connection. TARDIS checks for your **Seeker Genesis Token (SGT)** to ensure you are a verified human owner.
4.  **Identity Resolution:** Your **.skr handle** (e.g., `satoshi.skr`) is automatically resolved from your wallet and becomes your display name.
5.  **Setup Profile:** Navigate to the **Profile** tab. Tap **"Edit Profile"** to add a bio or change your avatar. Every change is hardware-signed to ensure authenticity.

> *[Screenshot Placeholder: Landing Page / Connect Wallet Prompt]*

---

### 2. The Town Square (Social Feed)
**Goal:** Share updates and list products in the bot-free global feed.

1.  **View Feed:** The **Town Square** tab shows posts from across the Seeker network.
2.  **Create a Post:** Tap the floating `+` button or the "What's happening?" input.
3.  **Add Media:** Tap the **Gallery Icon** to upload an image. TARDIS automatically uploads it to IPFS.
4.  **Product Listing (Social Commerce):**
    - Toggle the **"Product Listing Mode"** switch.
    - Enter a **Product Title** (e.g., "Custom Seeker Case").
    - Enter a **Price in SOL**.
    - Tap **"Post"**.
5.  **Hardware Signing:** Your Seeker will pop up a "Sign Message" request. This ensures your post is cryptographically tied to your hardware.
6.  **Engagement:**
    - **Like/Repost:** Tap the Heart or Repost icons. These are gasless but hardware-signed.
    - **Bookmark:** Save posts for later by tapping the Bookmark icon.
    - **Purchase:** When you see a Listing, tap **"Buy Now"**. This renders a **Solana Blink** that handles the transaction atomically.

> *[Screenshot Placeholder: Create Post Screen with Listing Toggle / Town Square Feed with Product Blink]*

---

### 3. Communities & Colonies (The Galactic Map)
**Goal:** Join gated groups or establish your own sovereign colony.

#### **Joining a Community:**
1.  **Explore:** Tap the **"Communities"** tab (the Galactic Map).
2.  **Select Colony:** Browse the list of available communities.
3.  **Check Access:** Some colonies are gated by specific NFTs, tokens, or your Seeker SGT. Tap **"Join"** to verify your holdings and gain entry.

#### **Creating a Community (Establishing a Colony):**
1.  **Start Wizard:** Tap the `+` icon in the Communities tab.
2.  **Community Details:** Enter the Name, Description, and upload a Banner Image.
3.  **Set Gating:** Choose if the community is Public or Gated by a token.
4.  **Public Announcement:** Toggle "Public Announcement" to notify the Town Square about your new colony.

> *[Screenshot Placeholder: Communities List / Create Community Wizard]*

---

### 4. Create New Coin (Integrated Pump.fun)
**Goal:** Launch a token for your community or project with zero friction.

1.  **Launchpad:** Navigate to the **"Create New Coin"** screen (found in the Galactic Map or side menu).
2.  **Token Metadata:**
    - Enter **Token Name** and **Symbol**.
    - Write a compelling **Description**.
    - Upload your **Token Logo**.
3.  **Initial Buy (Bonding Curve):** Enter the amount of SOL you wish to use for the initial purchase (e.g., `0.1 SOL`). Set to `0` if you only want to initialize the token.
4.  **Launch:** Tap **"Launch"**. TARDIS will:
    - Upload metadata to IPFS.
    - Create the token on the **Pump.fun** bonding curve.
    - Execute your initial buy in a single atomic transaction.
    - Provide a direct link to trade your new coin.

> *[Screenshot Placeholder: Pump.fun Launch Screen / Token Success Confirmation]*

---

### 5. Secure End-to-End Encrypted DMs
**Goal:** Message other Seeker owners with privacy guaranteed by the Seed Vault.

1.  **New Message:** In the **Chats** tab, tap the "New Chat" icon and search for a .skr handle.
2.  **Key Exchange:** TARDIS uses the **Seed Vault** to derive encryption keys. Your messages are never readable by the server.
3.  **Chatting:** Send text and images. All media is encrypted before being sent.
4.  **Tipping:** Inside a chat, tap the 💸 icon next to a user's name to send them an instant SOL tip.

> *[Screenshot Placeholder: Chat List / Encrypted Conversation View]*

---

### 6. Financial OS & AI Agent
**Goal:** Execute complex trades and manage loans via the integrated agent.

1.  **Tardis Agent:** Open the **Reimagine AI** screen.
2.  **Natural Language Commands:** Type commands like:
    - *"Swap 0.5 SOL for $BONK"*
    - *"What is the floor price of my Mad Lads?"*
3.  **Lending:** Use the lending interface in the **Financial** tab to request or provide P2P collateralized loans.

> *[Screenshot Placeholder: AI Agent Chat / Lending Dashboard]*

---
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
