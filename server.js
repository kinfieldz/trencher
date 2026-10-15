const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const CONFIG_PATH = path.join(__dirname, "config.json");

app.get("/api/config", (req, res) => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  res.json(config);
});

app.post("/api/config", (req, res) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.get("/api/logs", (req, res) => {
  try {
    const logs = fs.readFileSync("trades.log", "utf8").split("\n").slice(-60).join("\n");
    res.json({ logs });
  } catch {
    res.json({ logs: "No logs yet" });
  }
});

app.listen(PORT, () => {
  console.log(`Trencher GUI → http://localhost:${PORT}`);
});