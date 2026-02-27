# Pump.fun Module

This module integrates functionalities for interacting with the Pump.fun platform.

## Features

- **Token Launching**: Launch new tokens directly on Pump.fun with metadata uploads.
- **Token Trading**: Buy and sell tokens listed on Pump.fun using its bonding curve mechanism.
- **Real-time Status**: Live updates during the token launch and trading process.

## Architecture

- `PumpfunBuySection`: UI for purchasing tokens on the bonding curve.
- `PumpfunSellSection`: UI for selling tokens on the bonding curve.
- `PumpfunLaunchSection`: UI for creating and launching new tokens.
- `pumpfunService`: Core logic for interacting with Pump.fun.

## Requirements

The module requires a backend server for metadata uploads. Ensure `SERVER_URL` is correctly configured in your environment.
