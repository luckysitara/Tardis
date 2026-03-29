# 🌌 TARDIS: The Social-Financial OS for Solana Seeker

<div align="center">
  <img src="./Tardis.png" alt="TARDIS Banner" width="800">
  <br />
  <p align="center">
    <b>Hardware-Attested · Bot-Free · Sovereign Identity · Financial Terminal</b>
  </p>
  
  [![Download APK](https://img.shields.io/badge/Download-APK-orange?style=for-the-badge&logo=android)](./Tardis.apk)

  [![Solana Seeker](https://img.shields.io/badge/Solana-Seeker-000?style=for-the-badge&logo=solana&logoColor=9945FF)](https://solanamobile.com/)
  [![Seed Vault](https://img.shields.io/badge/Seed_Vault-Secure-green?style=for-the-badge)](https://solanamobile.com/seed-vault)
  [![Blinks](https://img.shields.io/badge/Solana-Blinks-blue?style=for-the-badge)](https://solana.com/developers/actions)
</div>



## 🔍 The Problem: The "Social-Trust" Gap

Web2 social platforms and generic dApps are failing the **Solana Seeker** community:
1. **The Bot/Sybil Plague:** Without hardware attestation, no platform can prove a post was made by a physical human. Coordinated manipulation and AI spam have destroyed digital trust.
2. **Disconnected Financials:** Tipping, lending, and trading are treated as "external features," leading to massive friction and fragmented liquidity.
3. **Privacy Theatre:** "Encrypted" messaging apps still rely on centralized servers or software-based keys that are vulnerable to extraction.

## 💡 The Solution: A Hardware-Locked Social Moat

**TARDIS** is the first **Social-Financial OS** built to turn the Solana Seeker into a sovereign communication and wealth-management node. We move past "apps" into a **Hardware-Attested Ecosystem.**

*   **Verified Humanity:** Every user is a confirmed human, verified via **Seeker Hardware Attestation** and the **Seeker Genesis Token (SGT)**.
*   **Unforgeable Identity:** Your **.skr handle** is cryptographically anchored to your device's **Seed Vault**.
*   **Atomic Finance:** We bring the market *into* the conversation. Lending, commerce, and token launches happen via **Solana Actions (Blinks)** directly in the feed.



## 🚀 Core Pillars

- 🛡️ **Hardware-Native Auth:** Simultaneous verification of Seeker hardware and SGT Group Member extensions.
- ✍️ **Seed Vault Signing:** Every post, reaction, and listing is cryptographically signed by the device's Secure Element—eliminating bots by design.
- 🔐 **Zero-Knowledge DMs:** E2EE messaging using **X25519 keys** derived directly from the Seed Vault. Private, sovereign, and server-blind.
- 🏦 **P2P Lending & Reputation:** Access collateralized credit markets where your reputation is anchored to your hardware-attested identity.
- 🛍️ **Social Commerce & Escrow:** Secure buyer/seller protection through an **Anchor-based Escrow contract**, rendered via interactive **Blinks**.
- 📊 **Financial Terminal:** A high-fidelity dashboard for **Pump.fun** launches, portfolio management, and real-time social-financial signals.



## 🎮 User Guide: Step-by-Step TARDIS Walkthrough

### 1. Onboarding (The Event Horizon)
1.  **Launch:** Open TARDIS on your Seeker.
2.  **Connect:** Tap **"Connect Seeker"** to trigger the **Mobile Wallet Adapter (MWA)**.
3.  **Verify:** TARDIS performs a dual-gate check: Physical Hardware + **Seeker Genesis Token (SGT)**.
4.  **Identify:** Your **.skr handle** (e.g., `satoshi.skr`) is resolved and becomes your unforgeable name.

### 2. The Town Square (Feed & Commerce)
1.  **Post:** Share updates signed by your **Seed Vault**. Choose between a standard post or a **Product Listing**.
2.  **Buy:** Purchase items directly from the feed. TARDIS renders a **Solana Blink** that handles the transaction through our **Escrow Smart Contract**.
3.  **Engage:** Like and Repost gaslessly; authenticity is guaranteed by your device signature.

### 3. Communities & Colonies (The Galactic Map)
1.  **Explore:** Browse the **Galactic Map**—a high-fidelity UI for discovering gated groups.
2.  **Govern:** Participate in polls and proposals directly in the chat using **Dialect Solana Actions**.

### 4. Create New Coin (Integrated Pump.fun)
1.  **Launch:** Enter Token Name, Symbol, and Description.
2.  **Deploy:** TARDIS uploads metadata to IPFS and launches the coin on **Pump.fun** in a single atomic transaction.

### 5. Secure Messaging & Tipping
1.  **DM:** Message other Seeker owners with **E2EE** (keys derived from Seed Vault).
2.  **Tip:** Send instant SOL/SPL tips 💸 next to a user's name without leaving the conversation.


## 📲 Quick Install

[!CAUTION]
📱 Hardware Requirement: Solana Mobile Only
TARDIS requires a Solana Seeker (or Saga) device to function.
This app leverages Seed Vault and Hardware Attestation for core security and identity features. It will not run on standard Android devices or emulators without the Solana Mobile Stack (SMS) and physical secure element support.
If you are viewing this on your **Solana Seeker** or an Android device, you can download the latest build directly:

> [!IMPORTANT]
> **[Download Tardis.apk](./Tardis.apk)**

## 📦 Installation & Local Setup

To run TARDIS locally for development or testing, follow these steps.

### 1. Prerequisites
- **Node.js** (v18+)
- **pnpm** (`npm install -g pnpm`)
- **Android Studio** (for Seeker Emulator or Physical Device)
- **Solana Seeker** (Physical device or Emulator with MWA support)

### 2. Clone the Repository
```bash
git clone https://github.com/luckysitara/Tardis.git
cd Tardis
```

### 3. Backend Setup (Server)
1. **Navigate to server:**
   ```bash
   cd server
   pnpm install
   ```
2. **Configure Environment:**
   Copy the example environment file and update it with your credentials (e.g., Supabase, Solana RPC, Pinata).
   ```bash
   cp .env.example .env
   ```
3. **Run Server:**
   ```bash
   pnpm dev
   ```

### 4. Mobile App Setup (Frontend)
1. **Navigate back to root and install dependencies:**
   ```bash
   cd ..
   pnpm install
   ```
2. **Configure Environment:**
   Update the `.env` file in the root directory with your **Backend URL** (e.g., `http://10.0.2.2:3000` for Android emulator).
3. **Run on Android (Debug):**
   ```bash
   npx expo run:android
   ```
4. **Run on Android (Release Variant):**
   ```bash
   npx expo run:android --variant=release
   ```



## 🛠 Technical Architecture

```text
[ Solana Seeker ] <--- MWA ---> [ TARDIS Mobile App ] <--- Socket.io ---> [ TARDIS Backend ]
       |                                |                                     |
[ Seed Vault ]                  [ Redux / Thunks ]                    [ Node.js / Knex ]
       |                                |                                     |
[ X25519 Keys ]                 [ Escrow Smart Contract ]             [ Supabase / RLS ]
```



## 🗺 Phased Roadmap

- **Phase 1: The Big Bang** (Hardware Auth & Identity) ✅
- **Phase 2: Materialization** (Signed Social Feed & Blinks) ✅
- **Phase 3: Zero-Knowledge** (E2EE DMs & Hardware Keys) ✅
- **Phase 4: Financial OS** (Lending, Escrow, Portfolio) ✅
- **Phase 5: Galactic Map** (AI Alpha, Node Staking) 🚧



**Transmitting from the Seeker... See you in the Town Square.** 🛸
