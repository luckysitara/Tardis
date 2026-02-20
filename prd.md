## **Product Requirement Document (PRD): TARDIS**

### **1. Executive Summary**

**Tardis** is a high-security, hardware-attested social messaging platform built exclusively for the **Solana Seeker**. It leverages the device's **Seed Vault** and **Token Extensions** to ensure that every user is a verified human with a physical Seeker device. The app aims to eliminate bot spam and sybil attacks by using the **.skr (Seeker ID)** as the primary, unforgeable identity.

### **2. Core Features & User Stories**

#### **Phase 1: The Event Horizon (Auth & Gating)**

* **User Story:** *As a Seeker owner, I want a visually stunning onboarding experience that automatically recognizes my hardware and .skr identity so I feel I'm entering an exclusive ecosystem.*
* **Features:**
* **Deep Space Landing Page:** Pulsing Tardis Blue theme with "Connect Seeker" CTA.
* **Dual-Gate Verification:** Simultaneous check for physical hardware (`OSOM/Solana Seeker`) and on-chain **Seeker Genesis Token (SGT)**.
* **.skr Identity Resolution:** Prioritizing the hardware-linked Seeker ID over standard `.sol` domains.



#### **Phase 2: The Town Square (Signed Social Feed)**

* **User Story:** *As a creator, I want every post I make to be cryptographically signed by my device's Seed Vault so my followers know it's authentically from me.*
* **Features:**
* **Hardware-Signed Posts:** MWA-integrated signing for all "Town Square" updates.
* **X-Style UX:** "FlashList" powered feed with high-fidelity media support.
* **Gasless Engagement:** Signed off-chain "Likes" and "Reposts" to allow free interaction without compromising proof-of-intent.



#### **Phase 3: Zero-Knowledge Messaging (E2EE)**

* **User Story:** *As a private messenger, I want my conversations to be encrypted using keys that never leave my device's hardware, ensuring even the Tardis servers can't read them.*
* **Features:**
* **Seed Vault Key Derivation:** Using the Seeker's hardware to derive X25519 encryption keys.
* **E2EE Engine:** AES-256-GCM encryption for all 1-on-1 and Group DMs.



#### **Phase 4: Gated Communities (The Galactic Map)**

* **User Story:** *As a community lead, I want to restrict my group to specific token holders or verified Seeker owners to maintain high-signal discussions and conduct on-chain governance directly in chat.*
* **Features:**
    * **Community Discovery Hub:** High-fidelity "Galactic Map" UI featuring glassmorphic cards for public and gated groups.
    * **Server-Side Gating Engine:** Robust backend verification of SPL Token balances, NFT ownership, and Seeker Genesis status via Solana RPC.
    * **Temporal Gates:** Multi-step creation wizard for setting membership requirements (e.g., "Must hold 100 $TARDIS" or "Seeker Genesis Only").
    * **Governance Blinks:** Deep integration with **Dialect Solana Actions** to allow interactive voting, staking, and tipping directly within community chat bubbles.
    * **Community Metadata:** Support for high-resolution banners, avatars, and rich descriptions to establish unique group identities.



### **3. Technical Architecture & User Flow**

1. **Launch:** User opens Tardis; hardware check initiates.
2. **Connect:** User taps "Connect Seeker"; MWA triggers Seed Vault authorization.
3. **The Gate:** `TardisShield` verifies SGT ownership via **Token Group Member** extensions.
4. **Identity:** `IdentityService` resolves the `.skr` handle from the SNS registry.
5. **Access:** Upon successful verification, the user "materializes" into the main Feed.

---
