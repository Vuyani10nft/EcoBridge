# EcoBridge EC

Building trusted financial identities for South Africa's informal economy.

EcoBridge EC is a hackathon MVP that creates a portable merchant identity called a BridgeID. It uses consented Open Banking transaction data and mock Yoco POS sales data to generate simple business credibility metrics.

EcoBridge does not lend money. The MVP demonstrates how open finance data can help informal merchants prove trading activity, cash flow, and readiness for financial services.

## Demo Flow

1. Register a merchant.
2. Connect Open Banking data.
3. Import Yoco POS sales.
4. Grant consent for both data sources.
5. Generate a BridgeID and EcoScore profile.

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI
- Demo data: local JSON mock data
- Local storage: SQLite, generated automatically when the API starts

## Run Locally

Start the backend:

```bash
python -m uvicorn backend.app:app --reload
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## API Endpoints

- `GET /health`
- `POST /connect-bank`
- `POST /connect-pos`
- `POST /consent`
- `POST /generate-profile`
- `GET /profile/{bridge_id}`
