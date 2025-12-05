import express from "express";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GET: 全ドット取得
app.get("/api/dots", async (req, res) => {
  const { data, error } = await supabase.from("dots").select("*");
  if (error) return res.status(500).json(error);
  res.json(data || []);
});

// POST: 上書き or 削除
app.post("/api/dots", async (req, res) => {
  const { x, y, color } = req.body;

  if (color === "#FFFFFF") {
    const { error } = await supabase
      .from("dots")
      .delete()
      .eq("x", x)
      .eq("y", y);
    if (error) return res.status(500).json(error);
    return res.json({ removed: true });
  }

  const { error } = await supabase
    .from("dots")
    .upsert({ x, y, color });
  if (error) return res.status(500).json(error);

  res.json({ ok: true });
});

// fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("server running on port " + port));
