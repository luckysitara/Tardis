import { ActionAdapter, ActionAdapterUiOptions } from '@dialectlabs/blinks';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  VersionedTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { Alert } from 'react-native';

export interface TardisActionAdapterOptions {
  address: string;
  sendTransaction: (
    tx: Transaction | VersionedTransaction, 
    connection: Connection,
    options?: { confirmTransaction?: boolean }
  ) => Promise<string>;
  signTransaction?: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  connection: Connection;
}

/**
 * A custom ActionAdapter for Tardis that bridges our useWallet hook
 * with the @dialectlabs/blinks library.
 */
export class TardisActionAdapter implements ActionAdapter {
  constructor(private options: TardisActionAdapterOptions) {}

  get publicKey(): PublicKey {
    return new PublicKey(this.options.address);
  }

  async signTransaction(tx: Transaction | VersionedTransaction): Promise<{ signature: string }> {
    try {
      // PRE-FLIGHT CHECK: Check if user has enough SOL for fees (minimal check)
      try {
        const balance = await this.options.connection.getBalance(this.publicKey);
        if (balance < 0.001 * LAMPORTS_PER_SOL) {
          Alert.alert(
            "Insufficient SOL",
            "You don't have enough SOL for transaction fees. Please add some SOL to your wallet.",
            [{ text: "OK" }]
          );
          throw new Error('Insufficient SOL for fees');
        }
      } catch (balanceError: any) {
        if (balanceError.message === 'Insufficient SOL for fees') throw balanceError;
        console.warn('[TardisActionAdapter] Balance check failed:', balanceError);
        // Continue anyway if balance check fails for some other reason (e.g. network)
      }

      // Use sendTransaction which handles both signing and sending/confirming in our stack
      const signature = await this.options.sendTransaction(tx, this.options.connection, {
        confirmTransaction: true,
      });
      return { signature };
    } catch (error: any) {
      console.error('[TardisActionAdapter] Sign/Send error:', error);
      throw error;
    }
  }

  // Optional: support message signing if needed by some blinks
  async signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }> {
    if (!this.options.signMessage) {
      throw new Error('Message signing not supported by this wallet');
    }
    const signature = await this.options.signMessage(message);
    return { signature };
  }

  // metadata for the adapter
  async confirmTransaction(signature: string): Promise<void> {
    await this.options.connection.confirmTransaction(signature, 'confirmed');
  }
}
