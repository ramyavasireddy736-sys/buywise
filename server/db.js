import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "buywise.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  specs TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS retailers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  search_template TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  retailer_id INTEGER NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  availability TEXT NOT NULL DEFAULT 'Demo listing',
  product_url TEXT,
  is_demo INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, retailer_id)
);
CREATE TABLE IF NOT EXISTS wishlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, product_id)
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (count === 0) {
  const retailers = [
    ["Amazon India", "https://www.amazon.in/s?k="],
    ["Flipkart", "https://www.flipkart.com/search?q="],
    ["Croma", "https://www.croma.com/search/?text="],
    ["Reliance Digital", "https://www.reliancedigital.in/search?q="]
  ];
  const addRetailer = db.prepare("INSERT OR IGNORE INTO retailers(name, search_template) VALUES (?, ?)");
  retailers.forEach(r => addRetailer.run(...r));

  const products = [
    ["iPhone 15 Pro (128GB)", "Apple", "Smartphones", "Premium smartphone with A17 Pro chip, titanium design and advanced camera system.", "https://images.unsplash.com/photo-1696440991900-7f5b7f9a4d9c?auto=format&fit=crop&w=900&q=85", JSON.stringify({"Display":"6.1-inch OLED","Storage":"128GB","Chip":"A17 Pro","Camera":"48MP main camera"})],
    ["Galaxy S24 (256GB)", "Samsung", "Smartphones", "Flagship Android smartphone with a bright display and versatile cameras.", "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85", JSON.stringify({"Display":"6.2-inch AMOLED","Storage":"256GB","Processor":"Snapdragon 8 Gen 3","Camera":"50MP main camera"})],
    ["MacBook Air M3 (13-inch)", "Apple", "Laptops", "Lightweight laptop with Apple silicon, long battery life and a vivid display.", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85", JSON.stringify({"Display":"13.6-inch Liquid Retina","Chip":"Apple M3","Memory":"8GB","Storage":"256GB SSD"})],
    ["Sony WH-1000XM5", "Sony", "Audio", "Wireless noise-cancelling headphones with immersive sound.", "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=85", JSON.stringify({"Type":"Wireless headphones","Noise cancellation":"Active","Battery":"Up to 30 hours"})],
    ["Canon EOS R50", "Canon", "Electronics", "Compact mirrorless camera for creators and photography enthusiasts.", "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85", JSON.stringify({"Type":"Mirrorless camera","Video":"4K","Sensor":"APS-C CMOS"})],
    ["Nike Air Max Pulse", "Nike", "Fashion", "Everyday sneakers with a cushioned ride and contemporary design.", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85", JSON.stringify({"Type":"Sneakers","Style":"Lifestyle","Closure":"Lace-up"})]
  ];
  const addProduct = db.prepare("INSERT INTO products(name,brand,category,description,image,specs) VALUES(?,?,?,?,?,?)");
  const addPrice = db.prepare("INSERT INTO prices(product_id,retailer_id,amount,availability,product_url,is_demo) VALUES(?,?,?,?,?,1)");
  const getRetailer = db.prepare("SELECT id FROM retailers WHERE name=?");
  const priceRows = [
    [108999,112490,116500,119900],
    [64999,66999,67999,68999],
    [99900,102990,104990,105500],
    [24999,25999,26999,27999],
    [58999,59999,60999,61999],
    [11995,12495,12995,13495]
  ];
  const seed = db.transaction(() => {
    products.forEach((p, idx) => {
      const info = addProduct.run(...p);
      retailers.forEach((r, ri) => addPrice.run(info.lastInsertRowid, getRetailer.get(r[0]).id, priceRows[idx][ri], "Demo listing", `${r[1]}${encodeURIComponent(p[0])}`));
    });
  });
  seed();
}


// Add Home Appliances products
const homeAppliances = [
  {
    name: "Electric Kettle (1.5L)",
    brand: "Philips",
    description: "Electric kettle with stainless steel body and automatic shut-off.",
    image: "/product-images/electric-kettle.jpg",
    specs: {
      Capacity: "1.5 Litres",
      Power: "1500W",
      Material: "Stainless Steel",
      Safety: "Automatic shut-off"
    },
    prices: [1499, 1599, 1699, 1799]
  },
  {
    name: "Digital Air Fryer (4L)",
    brand: "Philips",
    description: "Air fryer designed for convenient cooking with adjustable temperature controls.",
    image: "/product-images/air-fryer.jpg",
    specs: {
      Capacity: "4 Litres",
      Power: "1400W",
      Controls: "Digital",
      Temperature: "Adjustable"
    },
    prices: [4999, 5299, 5499, 5799]
  },
  {
    name: "Convection Microwave Oven (28L)",
    brand: "LG",
    description: "Convection microwave oven for reheating, grilling and baking.",
    image: "/product-images/oven.jpg",
    specs: {
      Capacity: "28 Litres",
      Type: "Convection",
      Functions: "Heating, grilling and baking",
      Control: "Digital"
    },
    prices: [12999, 13499, 13999, 14499]
  },
  {
    name: "Glass Top Gas Stove (3 Burner)",
    brand: "Prestige",
    description: "Three-burner gas stove with a durable glass top and manual controls.",
    image: "/product-images/gas-stove.jpg",
    specs: {
      Burners: "3",
      Material: "Toughened Glass",
      Ignition: "Manual",
      Type: "Gas Stove"
    },
    prices: [3499, 3699, 3899, 4099]
  }
];




const homeRetailers = [
  ["Amazon India", "https://www.amazon.in/s?k="],
  ["Flipkart", "https://www.flipkart.com/search?q="],
  ["Croma", "https://www.croma.com/search/?text="],
  ["Reliance Digital", "https://www.reliancedigital.in/search?q="]
];

const ensureRetailer = db.prepare(
  "INSERT OR IGNORE INTO retailers(name, search_template) VALUES (?, ?)"
);

homeRetailers.forEach(r => ensureRetailer.run(...r));
const addHomeProduct = db.prepare(`
  INSERT INTO products (name, brand, category, description, image, specs)
  SELECT ?, ?, 'Home Appliances', ?, ?, ?
  WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE name = ?
  )
`);

const addHomePrice = db.prepare(`
  INSERT INTO prices
  (product_id, retailer_id, amount, availability, product_url, is_demo)
  VALUES (?, ?, ?, 'Demo listing', ?, 1)
`);

const getHomeRetailer = db.prepare(
  "SELECT id, search_template FROM retailers WHERE name = ?"
);

const addHomeAppliances = db.transaction(() => {
  homeAppliances.forEach(product => {
    const result = addHomeProduct.run(
      product.name,
      product.brand,
      product.description,
      product.image,
      JSON.stringify(product.specs),
      product.name
    );

    if (result.changes === 0) return;

    const productId = result.lastInsertRowid;

    homeRetailers.forEach((retailer, index) => {
      const retailerInfo = getHomeRetailer.get(retailer[0]);

      if (!retailerInfo) return;

      addHomePrice.run(
        productId,
        retailerInfo.id,
        product.prices[index],
        `${retailerInfo.search_template}${encodeURIComponent(product.name)}`
      );
    });
  });
});

addHomeAppliances();




const extraProducts = [
  // SMARTPHONES
  {
    name: "Samsung Galaxy S25 (256GB)",
    brand: "Samsung",
    category: "Smartphones",
    description: "Samsung flagship smartphone with advanced AI features.",
    image: "/product-images/galaxy-s25.jpg",
    specs: { Storage: "256GB", Display: "6.2-inch", Camera: "50MP" },
    prices: [74999, 76999, 78999, 79999]
  },
  {
    name: "iPhone 16 (128GB)",
    brand: "Apple",
    category: "Smartphones",
    description: "Apple smartphone with A18 chip and advanced camera system.",
    image: "/product-images/iphone-16.jpg",
    specs: { Storage: "128GB", Display: "6.1-inch", Chip: "A18" },
    prices: [69900, 71900, 72900, 73900]
  },
  {
    name: "OnePlus 13 (256GB)",
    brand: "OnePlus",
    category: "Smartphones",
    description: "Premium OnePlus smartphone with a high-performance processor.",
    image: "/product-images/oneplus-13.jpg",
    specs: { Storage: "256GB", Display: "6.82-inch", RAM: "12GB" },
    prices: [69999, 71999, 72999, 73999]
  },
  {
    name: "Google Pixel 9 (256GB)",
    brand: "Google",
    category: "Smartphones",
    description: "Google Pixel smartphone with AI-powered photography.",
    image: "/product-images/pixel-9.jpg",
    specs: { Storage: "256GB", Display: "6.3-inch", Camera: "50MP" },
    prices: [79999, 81999, 82999, 83999]
  },

  // LAPTOPS
  {
    name: "ASUS Vivobook 15",
    brand: "ASUS",
    category: "Laptops",
    description: "Everyday laptop designed for productivity and multitasking.",
    image: "/product-images/asus-vivobook-15.jpg",
    specs: { Display: "15.6-inch", RAM: "16GB", Storage: "512GB SSD" },
    prices: [52990, 54990, 55990, 56990]
  },
  {
    name: "HP Pavilion 14",
    brand: "HP",
    category: "Laptops",
    description: "Compact laptop for work, study and everyday computing.",
    image: "/product-images/hp-pavilion-14.jpg",
    specs: { Display: "14-inch", RAM: "16GB", Storage: "512GB SSD" },
    prices: [64990, 66990, 67990, 68990]
  },
  {
    name: "Lenovo IdeaPad Slim 5",
    brand: "Lenovo",
    category: "Laptops",
    description: "Slim laptop built for productivity and portability.",
    image: "/product-images/lenovo-ideapad-slim-5.jpg",
    specs: { Display: "14-inch", RAM: "16GB", Storage: "512GB SSD" },
    prices: [61990, 63990, 64990, 65990]
  },
  {
    name: "Dell Inspiron 14",
    brand: "Dell",
    category: "Laptops",
    description: "Versatile laptop for everyday work and entertainment.",
    image: "/product-images/dell-inspiron-14.jpg",
    specs: { Display: "14-inch", RAM: "16GB", Storage: "512GB SSD" },
    prices: [57990, 59990, 60990, 61990]
  },

  // AUDIO
  {
    name: "Apple AirPods Pro 2",
    brand: "Apple",
    category: "Audio",
    description: "Wireless earbuds with active noise cancellation.",
    image: "/product-images/airpods-pro-2.jpg",
    specs: { Type: "Wireless earbuds", Feature: "Active Noise Cancellation" },
    prices: [19900, 20900, 21900, 22900]
  },
  {
    name: "JBL Tune 770NC",
    brand: "JBL",
    category: "Audio",
    description: "Wireless over-ear headphones with noise cancellation.",
    image: "/product-images/jbl-tune-770nc.jpg",
    specs: { Type: "Over-ear", Feature: "Noise Cancelling", Battery: "Up to 70 hours" },
    prices: [5999, 6499, 6799, 6999]
  },
  {
    name: "boAt Rockerz 550",
    brand: "boAt",
    category: "Audio",
    description: "Wireless headphones designed for everyday listening.",
    image: "/product-images/boat-rockerz-550.jpg",
    specs: { Type: "Over-ear", Connectivity: "Bluetooth" },
    prices: [1799, 1899, 1999, 2099]
  },
  {
    name: "Sony WF-C700N",
    brand: "Sony",
    category: "Audio",
    description: "Compact wireless earbuds with noise cancellation.",
    image: "/product-images/sony-wf-c700n.jpg",
    specs: { Type: "Wireless earbuds", Feature: "Noise Cancelling" },
    prices: [6990, 7290, 7490, 7790]
  },

  // ELECTRONICS
  {
    name: "Samsung 27-inch Monitor",
    brand: "Samsung",
    category: "Electronics",
    description: "27-inch monitor for work, study and entertainment.",
    image: "/product-images/samsung-27-monitor.jpg",
    specs: { Display: "27-inch", Resolution: "Full HD" },
    prices: [10999, 11499, 11999, 12499]
  },
  {
    name: "Canon EOS R10",
    brand: "Canon",
    category: "Electronics",
    description: "Mirrorless camera for photography and video creation.",
    image: "/product-images/canon-eos-r10.jpg",
    specs: { Type: "Mirrorless", Sensor: "APS-C", Video: "4K" },
    prices: [89990, 91990, 93990, 95990]
  },
  {
    name: "Kindle Paperwhite",
    brand: "Amazon",
    category: "Electronics",
    description: "E-reader with a glare-free display.",
    image: "/product-images/kindle-paperwhite.jpg",
    specs: { Display: "7-inch", Storage: "16GB" },
    prices: [14999, 15499, 15999, 16499]
  },
  {
    name: "Logitech C920 Webcam",
    brand: "Logitech",
    category: "Electronics",
    description: "Full HD webcam for video calls and streaming.",
    image: "/product-images/logitech-c920.jpg",
    specs: { Resolution: "1080p", Feature: "Autofocus" },
    prices: [5495, 5795, 5995, 6195]
  },

  // FASHION
  {
    name: "Adidas Runfalcon 5",
    brand: "Adidas",
    category: "Fashion",
    description: "Comfortable running shoes for everyday activities.",
    image: "/product-images/adidas-runfalcon-5.jpg",
    specs: { Type: "Running shoes", Gender: "Unisex" },
    prices: [3999, 4199, 4399, 4599]
  },
  {
    name: "Puma Caven 2.0",
    brand: "Puma",
    category: "Fashion",
    description: "Classic casual sneakers with a retro-inspired design.",
    image: "/product-images/puma-caven-2.jpg",
    specs: { Type: "Casual sneakers", Style: "Low-top" },
    prices: [3499, 3699, 3899, 4099]
  },
  {
    name: "Levi's 511 Slim Fit Jeans",
    brand: "Levi's",
    category: "Fashion",
    description: "Slim-fit denim jeans for everyday wear.",
    image: "/product-images/levis-511-jeans.jpg",
    specs: { Fit: "Slim fit", Material: "Denim" },
    prices: [2999, 3199, 3399, 3599]
  },
  {
    name: "Fastrack Analog Watch",
    brand: "Fastrack",
    category: "Fashion",
    description: "Everyday analog wristwatch with a modern design.",
    image: "/product-images/fastrack-watch.jpg",
    specs: { Type: "Analog", Display: "Analog dial" },
    prices: [1795, 1895, 1995, 2095]
  }
];

const addExtraProduct = db.prepare(`
  INSERT INTO products (name, brand, category, description, image, specs)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const findExtraProduct = db.prepare(
  "SELECT id FROM products WHERE name = ?"
);

const addExtraProducts = db.transaction(() => {
  extraProducts.forEach((product) => {
    if (findExtraProduct.get(product.name)) return;

    const result = addExtraProduct.run(
      product.name,
      product.brand,
      product.category,
      product.description,
      product.image,
      JSON.stringify(product.specs)
    );

    const productId = result.lastInsertRowid;

    homeRetailers.forEach((retailer, index) => {
const retailerInfo = getHomeRetailer.get(retailer[0]);
      if (!retailerInfo) return;

      addHomePrice.run(
        productId,
        retailerInfo.id,
        product.prices[index],
        `${retailerInfo.search_template}${encodeURIComponent(product.name)}`
      );
    });
  });
});

addExtraProducts();





const findProductForPrice = db.prepare(
  "SELECT id FROM products WHERE name = ?"
);

const repairMissingPrice = db.prepare(`
  INSERT OR IGNORE INTO prices
  (product_id, retailer_id, amount, availability, product_url, is_demo)
  VALUES (?, ?, ?, 'Demo listing', ?, 1)
`);

const repairExtraPrices = db.transaction(() => {
  extraProducts.forEach((product) => {
    const productInfo = findProductForPrice.get(product.name);
    if (!productInfo) return;

    homeRetailers.forEach((retailer, index) => {
      const retailerInfo = getHomeRetailer.get(retailer[0]);
      if (!retailerInfo) return;

      repairMissingPrice.run(
        productInfo.id,
        retailerInfo.id,
        product.prices[index],
        `${retailerInfo.search_template}${encodeURIComponent(product.name)}`
      );
    });
  });
});

repairExtraPrices();


const admin = db.prepare("SELECT id FROM users WHERE email=?").get("admin@buywise.demo");
if (!admin) {
  const hash = bcrypt.hashSync("BuyWiseAdmin123!", 12);
  db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')").run("BuyWise Admin", "admin@buywise.demo", hash);
}

export default db;

