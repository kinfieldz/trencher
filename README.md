# The Trencher

A modular, self-contained Solana trading bot designed for repeated dip-buying cycles with built-in risk management. It dynamically sources tokens from external feeds, enters positions on dips, manages exits with stop-losses and trailing stops, and consolidates holdings back into SOL so the process can continue without leaving capital locked in open trades.

The project includes a local web dashboard so settings can be adjusted without editing code. Both the bot and the dashboard read from the same `config.json` file, keeping the interface and the trading logic in sync.

**Warning:** This is experimental software. Cryptocurrency trading carries a high risk of loss. Only use funds you can afford to lose. The authors are not responsible for any financial losses.

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
├── bot.ts              # Main trading bot logic
├── server.js           # Local web server that serves the dashboard
├── trencher.html       # Web-based GUI / dashboard
├── config.json         # Shared settings file (read by both bot and website)
├── .env                # Private key, RPC URL, and API keys (never commit this)
├── package.json        # Node.js dependencies
├── trades.log          # Auto-generated trade log (created when the bot runs)
└── TRENCHER-GUIDE.txt  # Plain-text setup guide
```

### File Explanations

- **bot.ts** — The core trading script. It loads settings from `config.json`, pulls tokens, places buys/sells via Jupiter, and handles risk management.
- **server.js** — A small Express server that hosts the website and provides API endpoints so the dashboard can read and save settings.
- **trencher.html** — The frontend dashboard. Lets you change settings, view status, and see logs without editing code.
- **config.json** — The single source of truth for settings (trade size, stop-loss, DEX source, Pump.fun toggle, etc.). Both the website and the bot use this file.
- **.env** — Stores sensitive information (your wallet private key and RPC URL). This file should never be uploaded to GitHub.
- **package.json** — Lists the required Node.js packages (`express`, `@solana/web3.js`, `bs58`, `dotenv`).
- **trades.log** — Automatically created by the bot. Contains a timestamped history of buys, sells, and screening results.
- **TRENCHER-GUIDE.txt** — A simple text guide with setup and usage instructions.

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
