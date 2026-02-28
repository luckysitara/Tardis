# Swap Module

A comprehensive token swapping module that integrates Jupiter into a unified interface for the Solana blockchain.

## Features

- **Jupiter Integration**: Powered by Jupiter's advanced routing for the best prices and seamless execution.
- **Unified Interface**: Swap between any supported tokens on Solana.
- **Real-time Price Updates**: Get the latest prices and estimated output for your swaps.
- **Balance Management**: Automatically fetches and displays your token balances.
- **Transaction Tracking**: Easy access to transaction signatures and Solscan for verification.

## Architecture

The module uses `TradeService` as a coordinator that communicates with swap providers.

- `TradeService`: The central entry point for executing swaps.
- `useSwapLogic`: A comprehensive hook that manages the UI state and swap flow.
- `SwapScreen`: The main user interface for the swap module.

## Future Plans

- Re-implementing the latest Jupiter Ultra SDK/API for enhanced performance and MEV protection.
- Support for more DEX protocols and aggregators.
- Enhanced transaction status tracking and error handling.
