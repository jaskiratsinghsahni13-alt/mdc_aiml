# FreshStock AI — Frontend Starter

Bright, responsive React frontend prototype for the FreshStock AI perishable inventory project.

## Included pages
- Dashboard with demo KPIs and charts
- Inventory: search, risk filter, add/edit/delete, details, CSV export
- Demand forecast: product/horizon selectors and demo loading flow
- Waste risk analysis: filters, leftover estimates, create recommendation
- Recommendations: mark done, dismiss, view product
- Sales history and CSV export
- Reports and CSV export
- Settings and notification preferences

## Important
This starter uses illustrative demo data. The forecast button simulates a request; it does not yet call a trained ML model. Risk is estimated from stock, sample demand and known expiry dates. It is not a trained waste classifier or confirmation of actual waste.

## Run locally
Install Node.js (LTS), extract the ZIP, open the folder in VS Code, then run in the terminal:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually http://localhost:5173).

To check a production build:

```bash
npm run build
npm run preview
```

## Connect your backend later
1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL=http://127.0.0.1:8000` for local FastAPI development.
3. Replace demo operations in `src/App.jsx` with calls to your FastAPI endpoints.
4. Configure CORS on FastAPI to allow the frontend URL.

Suggested endpoints: `GET /products`, `GET /inventory`, `POST /inventory`, `PUT /inventory/{id}`, `DELETE /inventory/{id}`, `POST /predict`, `GET /recommendations`, `GET /sales`, `GET /reports/summary`.
