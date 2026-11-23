import db from "./db.js";

const imagePath = "/product-images/iphone-15-pro.png";
const result = db.prepare(`
  UPDATE products
  SET image = ?
  WHERE name = 'iPhone 15 Pro (128GB)'
`).run(imagePath);

if (result.changes === 0) {
  console.log("No matching iPhone 15 Pro (128GB) product was found. No records changed.");
} else {
  console.log(`Updated ${result.changes} iPhone image record(s).`);
}
console.log(`New image path: ${imagePath}`);
db.close();
