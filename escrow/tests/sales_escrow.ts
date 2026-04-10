import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SalesEscrow } from "../target/types/sales_escrow";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Transaction
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  MINT_SIZE, 
  createInitializeMintInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import { expect } from "chai";

describe("sales_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SalesEscrow as Program<SalesEscrow>;

  const buyer = Keypair.generate();
  const seller = Keypair.generate();
  const mint = Keypair.generate();
  
  let buyerTokenAccount: PublicKey;
  let sellerTokenAccount: PublicKey;
  
  const orderId = "order-123";
  const amount = new anchor.BN(1000);

  before(async () => {
    // Airdrop SOL to buyer and seller
    const sig1 = await provider.connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig1);
    
    const sig2 = await provider.connection.requestAirdrop(seller.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig2);

    // Create Mint
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(mint.publicKey, 0, provider.wallet.publicKey, provider.wallet.publicKey)
    );
    await provider.sendAndConfirm(transaction, [mint]);

    // Create ATAs
    buyerTokenAccount = await getAssociatedTokenAddress(mint.publicKey, buyer.publicKey);
    sellerTokenAccount = await getAssociatedTokenAddress(mint.publicKey, seller.publicKey);

    const ataTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        buyerTokenAccount,
        buyer.publicKey,
        mint.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        sellerTokenAccount,
        seller.publicKey,
        mint.publicKey
      ),
      createMintToInstruction(mint.publicKey, buyerTokenAccount, provider.wallet.publicKey, 2000)
    );
    await provider.sendAndConfirm(ataTx, []);
  });

  it("Initializes escrow", async () => {
    const [escrowAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), buyer.publicKey.toBuffer(), Buffer.from(orderId)],
      program.programId
    );

    const [escrowVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowAccount.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeEscrow(orderId, amount)
      .accounts({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        buyerTokenAccount,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    const escrowData = await program.account.escrowAccount.fetch(escrowAccount);
    expect(escrowData.buyer.toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(escrowData.seller.toBase58()).to.equal(seller.publicKey.toBase58());
    expect(escrowData.amount.toNumber()).to.equal(amount.toNumber());
    expect(escrowData.isInitialized).to.be.true;
    expect(escrowData.isCompleted).to.be.false;

    const vaultBalance = await provider.connection.getTokenAccountBalance(escrowVault);
    expect(vaultBalance.value.amount).to.equal("1000");
  });

  it("Confirms delivery", async () => {
    const [escrowAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), buyer.publicKey.toBuffer(), Buffer.from(orderId)],
      program.programId
    );

    await program.methods
      .confirmDelivery()
      .accounts({
        signer: buyer.publicKey,
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        sellerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    const escrowData = await program.account.escrowAccount.fetch(escrowAccount);
    expect(escrowData.isCompleted).to.be.true;

    const sellerBalance = await provider.connection.getTokenAccountBalance(sellerTokenAccount);
    expect(sellerBalance.value.amount).to.equal("1000");
  });

  it("Cancels escrow (Refund)", async () => {
    const newOrderId = "order-456";
    const [escrowAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), buyer.publicKey.toBuffer(), Buffer.from(newOrderId)],
      program.programId
    );

    // Init new escrow
    await program.methods
      .initializeEscrow(newOrderId, amount)
      .accounts({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        buyerTokenAccount,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    // Cancel by Seller
    await program.methods
      .cancelEscrow()
      .accounts({
        signer: seller.publicKey,
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();

    const escrowData = await program.account.escrowAccount.fetch(escrowAccount);
    expect(escrowData.isCancelled).to.be.true;

    const buyerBalance = await provider.connection.getTokenAccountBalance(buyerTokenAccount);
    // 2000 (initial) - 1000 (escrow 1) - 1000 (escrow 2) + 1000 (refund) = 1000
    expect(buyerBalance.value.amount).to.equal("1000");
  });
});
