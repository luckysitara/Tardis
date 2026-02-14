/**
 * Profile utility functions
 */


/**
 * Check if a user is the owner of a wallet address
 * @param currentUserWallet Current user's wallet address
 * @param targetWallet Wallet address to check
 * @returns Boolean indicating if the current user owns the target wallet
 */
export function isUserWalletOwner(
  currentUserWallet: string | undefined | null,
  targetWallet: string | undefined | null
): boolean {
  if (!currentUserWallet || !targetWallet) return false;
  return currentUserWallet.toLowerCase() === targetWallet.toLowerCase();
}

/**
 * Format wallet address for display (truncate)
 * @param address Wallet address to format
 * @param startChars Number of characters to show at start
 * @param endChars Number of characters to show at end
 * @returns Formatted wallet address string
 */
export function formatWalletAddress(
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string {
  if (!address || address.length <= startChars + endChars + 3) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Generate a default profile picture URL based on wallet address
 * @param address Wallet address
 * @returns URL for default profile picture
 */
export function getDefaultProfilePicUrl(address: string): string {
  // This could use a service like RoboHash, Dicebear Avatars, etc.
  // For now, returning a simple placeholder
  const hash = address ? address.slice(-8) : Math.random().toString(36).substring(2, 10);
  return `https://robohash.org/${hash}.png?set=set4&size=150x150`;
}
