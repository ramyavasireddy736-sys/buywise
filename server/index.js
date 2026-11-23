import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db.js";
import { retailerIntegrations } from "./integrations/retailerRegistry.js";

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || "dev-only-change-this-secret";
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  "http://localhost:5173",
  "http://localhost:5174",
  "https://buywise-frontend.onrender.com"
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "7d" });
}
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  try {
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Please sign in to continue." });
  }
}
function admin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
}
function productRow(row) {
  if (!row) return null;
  return { ...row, specs: JSON.parse(row.specs || "{}"), prices: db.prepare(`
    SELECT prices.id, retailers.name AS retailer, prices.amount, prices.availability,
    prices.product_url AS searchUrl, prices.is_demo AS isDemo
    FROM prices JOIN retailers ON retailers.id=prices.retailer_id
    WHERE prices.product_id=? ORDER BY prices.amount ASC
  `).all(row.id).map(p => ({...p, isDemo: Boolean(p.isDemo)})) };
}

// Search synonyms help common shopper language match the catalogue.
const SEARCH_SYNONYMS = {
  phone: ["smartphone", "mobile", "mobiles", "cellphone"],
  phones: ["smartphone", "mobile", "mobiles", "cellphone"],
  mobile: ["phone", "smartphone", "mobiles"],
  mobiles: ["phone", "smartphone", "mobile"],
  laptop: ["notebook", "computer"],
  laptops: ["notebook", "computer"],
  headphone: ["headphones", "earphone", "audio"],
  headphones: ["headphone", "earphone", "audio"],
  shoe: ["shoes", "sneaker", "sneakers", "fashion"],
  shoes: ["shoe", "sneaker", "sneakers", "fashion"],
  camera: ["cameras", "photography"],
  cameras: ["camera", "photography"],
  tv: ["television", "smart tv"],
  television: ["tv", "smart tv"],
  appliance: ["appliances", "home appliance"],
  appliances: ["appliance", "home appliance"]
};
const CATEGORY_ALIASES = {
  phone: "Smartphones", phones: "Smartphones", mobile: "Smartphones", mobiles: "Smartphones",
  laptop: "Laptops", notebook: "Laptops",
  headphone: "Audio", headphones: "Audio",
  camera: "Electronics", cameras: "Electronics",
  shoe: "Fashion", shoes: "Fashion", sneakers: "Fashion",
  appliance: "Home Appliances", appliances: "Home Appliances"
};
function searchTerms(raw) {
  const term = String(raw || "").trim().toLowerCase();
  if (!term) return [];
  return [...new Set([term, ...(SEARCH_SYNONYMS[term] || [])])];
}

app.get("/api/health", (_req,res) => res.json({ ok:true, app:"BuyWise API" }));

// Public integration status. "Not connected" is explicit; no sample price is presented as live.
app.get("/api/retailers", (_req, res) => {
  res.json(retailerIntegrations.map(({ id, name, connection, description }) => ({
    id, name, connection, description
  })));
});
app.get("/api/integrations/status", (_req, res) => {
  res.json({
    livePriceFetching: false,
    message: "Retailer adapters are prepared, but live feeds are not connected yet.",
    retailers: retailerIntegrations.map(({ id, name, connection, requirements }) => ({
      id, name, connection, requirements
    }))
  });
});

app.get("/api/products", (req,res) => {
  const rawQuery = String(req.query.q || "");
  const terms = searchTerms(rawQuery);
  let category = String(req.query.category || "").trim();
  if (!category && rawQuery.trim()) category = CATEGORY_ALIASES[rawQuery.trim().toLowerCase()] || "";
  const clauses = [];
  const params = [];
  if (terms.length) {
    const searchParts = [];
    for (const term of terms) {
      const pattern = `%${term}%`;
      searchParts.push(`(
        lower(p.name) LIKE ? OR lower(p.brand) LIKE ? OR
        lower(p.category) LIKE ? OR lower(p.description) LIKE ? OR
        lower(p.specs) LIKE ?
      )`);
      params.push(pattern, pattern, pattern, pattern, pattern);
    }
    clauses.push(`(${searchParts.join(" OR ")})`);
  }
  if (category) {
    clauses.push("lower(p.category) = lower(?)");
    params.push(category);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  let rows = db.prepare(`
    SELECT p.*, COALESCE(MIN(CASE WHEN pr.is_demo=0 THEN pr.amount END), MIN(pr.amount)) AS lowestPrice
    FROM products p LEFT JOIN prices pr ON pr.product_id=p.id
    ${where}
    GROUP BY p.id
  `).all(...params);
  if (req.query.sort === "high") rows.sort((a,b)=>(b.lowestPrice||0)-(a.lowestPrice||0));
  else if (req.query.sort === "name") rows.sort((a,b)=>a.name.localeCompare(b.name));
  else rows.sort((a,b)=>(a.lowestPrice||Number.MAX_SAFE_INTEGER)-(b.lowestPrice||Number.MAX_SAFE_INTEGER));
  res.json(rows.map(r => ({...r, specs:JSON.parse(r.specs||"{}")})));
});

app.get("/api/products/:id", (req,res) => {
  const row = db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({error:"Product not found."});
  res.json(productRow(row));
});

app.post("/api/auth/register", async (req,res) => {
  const {name,email,password} = req.body || {};
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email||"") || (password||"").length < 8)
    return res.status(400).json({error:"Enter a name, valid email and password of at least 8 characters."});
  try {
    const hash = await bcrypt.hash(password, 12);
    const info = db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(name.trim(), email.toLowerCase(), hash);
    const user = {id:Number(info.lastInsertRowid),name:name.trim(),email:email.toLowerCase(),role:"user"};
    res.status(201).json({token:tokenFor(user),user});
  } catch { res.status(409).json({error:"An account with this email already exists."}); }
});

app.post("/api/auth/login", async (req,res) => {
  const {email,password} = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE email=?").get((email||"").toLowerCase());
  if (!row || !(await bcrypt.compare(password||"", row.password_hash))) return res.status(401).json({error:"Incorrect email or password."});
  const user = {id:row.id,name:row.name,email:row.email,role:row.role};
  res.json({token:tokenFor(user),user});
});
app.get("/api/auth/me", auth, (req,res) => {
  const u = db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(req.user.id);
  if (!u) return res.status(404).json({error:"User not found."});
  res.json(u);
});

app.get("/api/wishlist", auth, (req,res) => {
  const rows = db.prepare("SELECT p.* FROM wishlist w JOIN products p ON p.id=w.product_id WHERE w.user_id=? ORDER BY w.created_at DESC").all(req.user.id);
  res.json(rows.map(r=>({...r,specs:JSON.parse(r.specs||"{}")})));
});
app.post("/api/wishlist/:productId", auth, (req,res) => {
  const product = db.prepare("SELECT id FROM products WHERE id=?").get(req.params.productId);
  if (!product) return res.status(404).json({error:"Product not found."});
  db.prepare("INSERT OR IGNORE INTO wishlist(user_id,product_id) VALUES(?,?)").run(req.user.id, product.id);
  res.json({saved:true});
});
app.delete("/api/wishlist/:productId", auth, (req,res) => {
  db.prepare("DELETE FROM wishlist WHERE user_id=? AND product_id=?").run(req.user.id, req.params.productId);
  res.json({saved:false});
});

app.get("/api/alerts", auth, (req,res) => {
  res.json(db.prepare(`SELECT a.*,p.name AS productName,p.image,
    (SELECT MIN(amount) FROM prices WHERE product_id=p.id) AS currentPrice
    FROM alerts a JOIN products p ON p.id=a.product_id WHERE a.user_id=? ORDER BY a.created_at DESC`).all(req.user.id));
});
app.post("/api/alerts", auth, (req,res) => {
  const {productId,targetPrice} = req.body || {};
  const product = db.prepare("SELECT id FROM products WHERE id=?").get(productId);
  if (!product || !Number.isInteger(Number(targetPrice)) || Number(targetPrice)<=0) return res.status(400).json({error:"Choose a product and enter a valid target price."});
  const info = db.prepare("INSERT INTO alerts(user_id,product_id,target_price) VALUES(?,?,?)").run(req.user.id,productId,Number(targetPrice));
  res.status(201).json({id:Number(info.lastInsertRowid),saved:true});
});
app.patch("/api/alerts/:id", auth, (req,res) => {
  const {targetPrice,status} = req.body || {};
  const existing = db.prepare("SELECT id FROM alerts WHERE id=? AND user_id=?").get(req.params.id,req.user.id);
  if (!existing) return res.status(404).json({error:"Alert not found."});
  if (targetPrice !== undefined && (!Number.isInteger(Number(targetPrice)) || Number(targetPrice)<=0)) return res.status(400).json({error:"Enter a valid target price."});
  db.prepare("UPDATE alerts SET target_price=COALESCE(?,target_price), status=COALESCE(?,status) WHERE id=? AND user_id=?").run(targetPrice??null,status??null,req.params.id,req.user.id);
  res.json({updated:true});
});
app.delete("/api/alerts/:id", auth, (req,res) => {
  db.prepare("DELETE FROM alerts WHERE id=? AND user_id=?").run(req.params.id,req.user.id);
  res.json({deleted:true});
});

app.post("/api/admin/products", auth, admin, (req,res) => {
  const {name,brand,category,description,image,specs={}} = req.body || {};
  if (!name || !brand || !category) return res.status(400).json({error:"Name, brand and category are required."});
  const info = db.prepare("INSERT INTO products(name,brand,category,description,image,specs) VALUES(?,?,?,?,?,?)")
    .run(name,brand,category,description||"",image||"",JSON.stringify(specs));
  res.status(201).json({id:Number(info.lastInsertRowid)});
});
app.patch("/api/admin/prices/:id", auth, admin, (req,res) => {
  const {amount,availability} = req.body || {};
  if (!Number.isInteger(Number(amount)) || Number(amount)<=0) return res.status(400).json({error:"Enter a valid price in rupees."});
  const info = db.prepare("UPDATE prices SET amount=?,availability=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(Number(amount),availability||"Demo listing",req.params.id);
  if (!info.changes) return res.status(404).json({error:"Price listing not found."});
  res.json({updated:true, demoData:true});
});

app.use((err,_req,res,_next) => {
  console.error(err);
  res.status(500).json({error:"Something went wrong on the server."});
});
app.listen(PORT, () => console.log(`BuyWise API running at http://localhost:${PORT}`));