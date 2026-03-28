## **Product Requirement Document (PRD): TARDIS**

### **1. Executive Summary**

**Tardis** is a high-security, hardware-attested social-financial OS built exclusively for the **Solana Seeker**. It leverages the device's **Seed Vault**, **MWA**, and **Token Extensions** to create a verified, bot-free ecosystem where identity, messaging, and finance converge. By using the **.skr (Seeker ID)** as the primary identity, Tardis eliminates Sybil attacks and provides a sovereign "Home" for Seeker owners to socialize, trade, and govern.

---

### **2. Core Features & User Stories**

#### **Phase 1: The Event Horizon (Auth & Identity)**
* **User Story:** *As a Seeker owner, I want a visually stunning onboarding experience that automatically recognizes my hardware and .skr identity so I feel I'm entering an exclusive ecosystem.*
* **Features:**
    * **Deep Space Landing Page:** Pulsing Tardis Blue theme with "Connect Seeker" CTA.
    * **Dual-Gate Verification:** Simultaneous check for physical hardware (`OSOM/Solana Seeker`) and on-chain **Seeker Genesis Token (SGT)**.
    * **.skr Identity Resolution:** Prioritizing the hardware-linked Seeker ID over standard `.sol` domains via SNS registry.

#### **Phase 2: The Town Square (Signed Social Layer)**
* **User Story:** *As a creator, I want every post I make to be cryptographically signed by my device's Seed Vault so my followers know it's authentically from me.*
* **Features:**
    * **Hardware-Signed Posts:** MWA-integrated signing for all "Town Square" updates to prove human provenance.
    * **X-Style UX:** "FlashList" powered feed with high-fidelity media support and glassmorphic UI.
    * **Gasless Engagement:** Signed off-chain "Likes" and "Reposts" to allow free interaction without compromising proof-of-intent.

#### **Phase 3: Zero-Knowledge Messaging (E2EE)**
* **User Story:** *As a private messenger, I want my conversations to be encrypted using keys that never leave my device's hardware, ensuring even the Tardis servers can't read them.*
* **Features:**
    * **Seed Vault Key Derivation:** Using the Seeker's hardware to derive X25519 encryption keys for messaging.
    * **E2EE Engine:** AES-256-GCM encryption for all 1-on-1 and Group DMs.
    * **Hardware-Attested Tipping:** Direct SOL/SPL tipping integrated into the chat UI.

#### **Phase 4: Gated Colonies (The Galactic Map)**
* **User Story:** *As a community lead, I want to restrict my group to specific token holders or verified Seeker owners to maintain high-signal discussions.*
* **Features:**
    * **Community Discovery Hub:** High-fidelity "Galactic Map" UI featuring glassmorphic cards for public and gated groups.
    * **Server-Side Gating Engine:** Robust verification of SPL balances, NFT ownership, and SGT status via Solana RPC.
    * **Governance Blinks:** Deep integration with **Dialect Solana Actions** for interactive voting and staking directly in chat.

#### **Phase 5: The Galactic Exchange (Financial OS)**
* **User Story:** *As a Seeker power user, I want to launch tokens, manage my portfolio, and access P2P credit markets without leaving my social feed.*
* **Features:**
    * **Pump.fun Launchpad:** One-tap token creation with metadata uploaded to IPFS and initial bonding curve buy.
    * **P2P Lending & Borrowing:** Collateralized P2P lending markets where reputation is anchored to your hardware-attested `.skr` ID.
    * **In-App Commerce & Escrow:** A secure marketplace for physical/digital goods with an Anchor-based escrow contract for buyer protection.
    * **Sovereign Portfolio Management:** A high-fidelity dashboard to track assets, floor prices, and social-financial performance.

---

### **3. Technical Architecture & User Flow**

1. **Materialization:** User opens Tardis; hardware check initiates.
2. **Attestation:** User taps "Connect Seeker"; MWA triggers Seed Vault authorization.
3. **The Gate:** `TardisShield` verifies SGT ownership via Token Group Member extensions.
4. **Identity:** `IdentityService` resolves the `.skr` handle and loads the social graph.
5. **Operation:** User engages in social posts, private chats, or financial trades, with every high-value action requiring a Seed Vault signature.

---

### **4. Security Standards**
* **Non-Custodial:** Private keys never touch the app; all signing happens in the Seed Vault.
* **Privacy:** E2EE by default for all communication.
* **Integrity:** 100% human-verified audience via SGT and hardware checks.
