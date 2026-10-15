import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config();

const rawPrivate = (process.env.PRIVATE_KEY || "").trim().replace(/['"]/g, "");
if (!rawPrivate) {
  console.error("PRIVATE_KEY missing");
  process.exit(1);
}

const wallet = Keypair.fromSecretKey(bs58.decode(rawPrivate));
console.log("Wallet:", wallet.publicKey.toBase58());

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const API_KEY = process.env.JUPITER_API_KEY || "";
const connection = new Connection(RPC_URL, "confirmed");

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const WHITELIST: Record<string, string> = {
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  RENDER: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
};

const headers: Record<string, string> = { "Content-Type": "application/json" };
if (API_KEY) headers["x-api-key"] = API_KEY;

const TRADE_USD = 1.5;
const BUY_DIP_PERCENT = 0.5;
const SELL_PROFIT_PERCENT = 100;
const STOP_LOSS_PERCENT = 15;
const TRAILING_START_PERCENT = 5;
const TRAILING_DISTANCE_PERCENT = 3;

const POLL_INTERVAL_MS = 5000;
const TOKEN_DELAY_MS = 200;

const positions: Record<string, { tokens: number; entryPrice: number; highestPrice: number }> = {};
const lastHigh: Record<string, number> = {};

function logTrade(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync("trades.log", line);
  console.log(msg);
}

async function getQuote(inputMint: string, outputMint: string, amount: string) {
  const url = new URL("https://api.jup.ag/swap/v2/order");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amount);
  url.searchParams.set("taker", wallet.publicKey.toBase58());
  url.searchParams.set("slippageBps", "100");

  const res = await fetch(url.toString(), { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

async function executeSwap(order: any) {
  if (!order.transaction) throw new Error("No transaction");
  const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, "base64"));
  tx.sign([wallet]);
  const signed = Buffer.from(tx.serialize()).toString("base64");

  const res = await fetch("https://api.jup.ag/swap/v2/execute", {
    method: "POST",
    headers,
    body: JSON.stringify({ signedTransaction: signed, requestId: order.requestId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function getSolPriceUsdc(): Promise<number | null> {
  try {
    const order = await getQuote(SOL_MINT, USDC_MINT, "1000000000");
    if (!order.outAmount) return null;
    return Number(order.outAmount) / 1e6;
  } catch {
    return null;
  }
}

async function getPrice(mint: string): Promise<number | null> {
  try {
    const order = await getQuote(mint, USDC_MINT, "1000000000");
    if (!order.outAmount) return null;
    return Number(order.outAmount) / 1e6;
  } catch (err) {
    console.error(`Price fetch failed for ${mint.slice(0, 8)}...`);
    return null;
  }
}

async function buyToken(symbol: string, mint: string, currentPrice: number) {
  const solPrice = await getSolPriceUsdc();
  if (!solPrice) {
    console.error("Could not get SOL price");
    return;
  }

  const solAmount = TRADE_USD / solPrice;
  const amountLamports = Math.floor(solAmount * 1e9).toString();

  logTrade(`Buying ~$${TRADE_USD.toFixed(2)} of ${symbol} at ~${currentPrice.toFixed(4)}`);

  try {
    const order = await getQuote(SOL_MINT, mint, amountLamports);
    if (!order.transaction) {
      console.error("No transaction returned for", symbol);
      return;
    }

    await executeSwap(order);
    const tokensBought = TRADE_USD / currentPrice;
    positions[symbol] = { tokens: tokensBought, entryPrice: currentPrice, highestPrice: currentPrice };
    logTrade(`Bought ${symbol}. Position: ${tokensBought.toFixed(2)}`);
  } catch (err) {
    console.error(`Buy failed for ${symbol}:`, err);
  }
}

async function sellToken(symbol: string, mint: string, currentPrice: number, reason: string) {
  const pos = positions[symbol];
  if (!pos) return;

  const amount = Math.floor(pos.tokens * 1e9).toString();
  logTrade(`Selling ${symbol} (${reason}) at ${currentPrice.toFixed(4)}`);

  try {
    const order = await getQuote(mint, USDC_MINT, amount);
    if (!order.transaction) {
      console.error("No sell transaction for", symbol);
      return;
    }
    await executeSwap(order);
    delete positions[symbol];
    logTrade(`Sold ${symbol} (${reason})`);
  } catch (err) {
    console.error(`Sell failed for ${symbol}:`, err);
  }
}

async function run() {
  console.log("Starting $1.50 bot (every 5s)...");
  console.log("Tokens:", Object.keys(WHITELIST).join(", "));

  while (true) {
    for (const [symbol, mint] of Object.entries(WHITELIST)) {
      try {
        const price = await getPrice(mint);
        if (price === null) {
          console.log(`${symbol}: price unavailable, skipping`);
          await new Promise(r => setTimeout(r, TOKEN_DELAY_MS));
          continue;
        }

        if (!lastHigh[symbol] || price > lastHigh[symbol]) lastHigh[symbol] = price;

        const hasPosition = !!positions[symbol];
        const dipPercent = lastHigh[symbol] > 0 ? ((lastHigh[symbol] - price) / lastHigh[symbol]) * 100 : 0;

        if (hasPosition) {
          const pos = positions[symbol];
          if (price > pos.highestPrice) pos.highestPrice = price;

          const profitPct = ((price - pos.entryPrice) / pos.entryPrice) * 100;
          const drawdownFromHigh = ((pos.highestPrice - price) / pos.highestPrice) * 100;

          console.log(`${symbol}: $${price.toFixed(4)} | Pos: ${pos.tokens.toFixed(2)} | P/L: ${profitPct.toFixed(2)}%`);

          if (profitPct <= -STOP_LOSS_PERCENT) {
            await sellToken(symbol, mint, price, `stop-loss`);
          } else if (profitPct >= TRAILING_START_PERCENT && drawdownFromHigh >= TRAILING_DISTANCE_PERCENT) {
            await sellToken(symbol, mint, price, `trailing stop`);
          } else if (profitPct >= SELL_PROFIT_PERCENT) {
            await sellToken(symbol, mint, price, `+${profitPct.toFixed(1)}% target`);
          }
        } else {
          console.log(`${symbol}: $${price.toFixed(4)} | Pos: 0 | Dip: ${dipPercent.toFixed(2)}%`);
          if (dipPercent >= BUY_DIP_PERCENT) {
            await buyToken(symbol, mint, price);
          }
        }
      } catch (err) {
        console.error(`Error with ${symbol}:`, err);
      }

      await new Promise(r => setTimeout(r, TOKEN_DELAY_MS));
    }

    console.log("--- Cycle complete (5s) ---");
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

run();  