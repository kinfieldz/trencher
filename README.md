# The Trencher

A modular Solana trading bot with a local web dashboard. It dynamically sources tokens, buys on dips, manages risk with stop-losses and trailing stops, and consolidates positions back into SOL so the cycle can repeat.

**Warning:** This is experimental software. Cryptocurrency trading carries a high risk of loss. Only use funds you can afford to lose.

## Features

- **Modular dashboard** — Change settings from a local website instead of editing code
- **Dynamic token source** — Currently uses DexScreener (more sources planned)
- **Risk management**
  - Configurable stop-loss
  - Trailing stop
  - Max open positions
  - Minimum liquidity filter
  - Slippage control
- **Consolidation** — Automatically sells positions back to SOL on a schedule
- **Optional Pump.fun mode** — High-risk mode with an explicit warning in the UI
- **Shared config** — Website and bot both read/write the same `config.json`

## Project Structure

```
trencher/
├── bot.ts              # Main trading bot
├── server.js           # Local web server for the dashboard
├── trencher.html       # Web GUI
├── config.json         # Shared settings (bot + website)
├── .env                # Private key and RPC (do not commit)
├── package.json
└── TRENCHER-GUIDE.txt  # Setup instructions
```

## Requirements

- Node.js 18+
- A Solana wallet with some SOL
- A Solana RPC endpoint
- Optional: Jupiter API key

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/kinfieldz/trencher.git
   cd trencher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```
   PRIVATE_KEY=your_base58_private_key_here
   RPC_URL=https://your-rpc-url.com
   JUPITER_API_KEY=optional
   ```

4. Make sure `config.json` exists (a default is included).

## Usage

### Start the dashboard
```bash
node server.js
```
Open **http://localhost:3000/trencher.html** in your browser.

### Start the bot
In a second terminal:
```bash
npx tsx bot.ts
```

Change settings in the dashboard and click **LOCK IN**. Restart the bot for the new settings to take effect.

## Configuration

All major settings are controlled from the website and saved to `config.json`:

| Setting                  | Description                          |
|--------------------------|--------------------------------------|
| Chain                    | Blockchain (Solana active)           |
| Token Source             | Where tokens are sourced             |
| Pump.fun Mode            | Optional high-risk mode              |
| Trade Size (USD)         | Approximate size per trade           |
| Buy Dip %                | Minimum dip required to buy          |
| Profit Target %          | Take-profit level                    |
| Stop Loss %              | Automatic exit on loss               |
| Trailing Start / Distance| Trailing stop parameters             |
| Max Open Positions       | Position limit                       |
| Min Liquidity            | Filters low-liquidity tokens         |
| Max Slippage             | Slippage cap in basis points         |

## Disclaimer

This software is provided as-is for educational and experimental purposes. Trading cryptocurrencies involves substantial risk of loss. The authors are not responsible for any financial losses. Always do your own research and never trade more than you can afford to lose.

## License

MIT
