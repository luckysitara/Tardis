# Swap Module

A comprehensive token swapping module that integrates Jupiter Ultra into a unified interface for the Solana blockchain.

## Features

- **Jupiter Ultra**: Powered by Jupiter's most advanced routing and Z (RFQ) technology for the best prices and seamless execution.
- **Unified Interface**: Simple, intuitive UI for swapping any SPL token.
- **Real-time Price Quotes**: Accurate price estimation and price impact calculations.
- **Integrated Fee Collection**: Automated small platform fee collection on successful swaps.
- **Transaction Monitoring**: Built-in status updates and Solscan links for all transactions.

## Components

- `SwapScreen`: The main user interface for token swapping.
- `TokenRow`: Elegant display for input and output token selection and amount entry.
- `Keypad`: Custom numerical keypad optimized for mobile trading.
- `SwapInfo`: Detailed transaction information including rates and price impact.
- `SelectTokenModal`: Searchable list for finding any SPL token on Solana.

## Usage

```typescript
import { SwapScreen } from '@/modules/swap';

// In your navigator
<Stack.Screen name="Swap" component={SwapScreen} />
```

## Service Architecture

The module uses `TradeService` as a coordinator that communicates with `JupiterUltraService`. All swap orders are requested and executed via the secure backend proxy to protect API keys.
