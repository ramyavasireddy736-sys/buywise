# BuyWise — Shop Smart. Spend Wise.

A full-stack product discovery and price-comparison starter application.

## Stack
- React + TypeScript + Vite
- Express API
- SQLite database (`better-sqlite3`)
- JWT authentication with bcrypt password hashing
- Recharts and Lucide icons

## Requirements
- Node.js 20 or newer
- npm

## Run locally
Open a terminal in this folder and run:

```bash
npm run install:all
npm run dev
```

Open the Vite URL printed in the terminal (usually http://localhost:5173).

The API runs at http://localhost:4000. The SQLite database is created automatically at
`server/data/buywise.db` and seeded with clearly labelled demonstration products/prices.

## Demo admin
A demo admin account is seeded:
- Email: `admin@buywise.demo`
- Password: `BuyWiseAdmin123!`

Change this password and `JWT_SECRET` before using this outside local development.
Create a `.env` file in `server/` based on `.env.example`.

## Important data notes
All retailer prices are demonstration data, not live prices. Retailer buttons use search URLs
where possible; they do not claim an exact verified product match. Live price monitoring,
retailer feeds, email/SMS notifications, production hosting, and security review are not
included in this starter.

## Main features
- Search, category filtering and sorting
- Product detail and retailer comparison
- Wishlist stored per account
- User registration/login
- Target-price alerts stored per account
- Admin product and retailer price management
- Responsive layout

## API overview
- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/DELETE /api/wishlist`
- `GET/POST/PATCH/DELETE /api/alerts`
- `POST /api/admin/products` (admin)
- `PATCH /api/admin/prices/:id` (admin)

This is a learning/MVP project. Review authorization, validation, rate limiting, backups,
privacy and retailer terms before public production use.
