const express = require("express");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

let botProcess = null;

app.get("/api/status", (req, res) => {
  res.json({ running: !!botProcess });
});

app.post("/api/start", (req, res) => {
  if (botProcess) return res.json({ ok: false, message: "Already running" });

  botProcess = spawn("npx", ["tsx", "bot.ts"], { shell: true, cwd: __dirname });

  botProcess.stdout.on("data", (data) => {
    fs.appendFileSync("trades.log", data.toString());
  });

  botProcess.stderr.on("data", (data) => {
    fs.appendFileSync("trades.log", data.toString());
  });

  botProcess.on("close", () => {
    botProcess = null;
  });

  res.json({ ok: true });
});

app.post("/api/stop", (req, res) => {
  if (botProcess) {
    botProcess.kill();
    botProcess = null;
  }
  res.json({ ok: true });
});

app.get("/api/logs", (req, res) => {
  try {
    const logs = fs.readFileSync("trades.log", "utf8").split("\n").slice(-40).join("\n");
    res.json({ logs });
  } catch {
    res.json({ logs: "No logs yet" });
  }
});

app.listen(PORT, () => {
  console.log(`Trencher running at http://localhost:${PORT}`);
});