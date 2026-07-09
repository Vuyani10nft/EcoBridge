import json
import sqlite3
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from services.scoring import calculate_profile_metrics

MOCK_DIR = BASE_DIR / "mock"
DB_PATH = BASE_DIR / "ecobridge.db"

app = FastAPI(title="EcoBridge EC API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MerchantPayload(BaseModel):
    merchant_name: str
    business_name: str
    email: str
    phone: str


class GenerateProfilePayload(BaseModel):
    merchant: MerchantPayload
    transactions: List[Dict[str, Any]]
    pos_sales: Dict[str, Any]


class ConsentPayload(BaseModel):
    bank_consent: bool
    pos_consent: bool


def initialize_db() -> None:
    connection = sqlite3.connect(DB_PATH)
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS merchants (
                merchant_id TEXT PRIMARY KEY,
                merchant_name TEXT NOT NULL,
                business_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS consents (
                consent_id TEXT PRIMARY KEY,
                merchant_id TEXT NOT NULL,
                bank_consent INTEGER NOT NULL,
                pos_consent INTEGER NOT NULL,
                date_given TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                profile_id TEXT PRIMARY KEY,
                merchant_id TEXT NOT NULL,
                bridge_id TEXT NOT NULL UNIQUE,
                generated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scores (
                score_id TEXT PRIMARY KEY,
                profile_id TEXT NOT NULL,
                merchant_stability INTEGER NOT NULL,
                business_credibility INTEGER NOT NULL,
                loan_readiness TEXT NOT NULL,
                cash_flow_score INTEGER NOT NULL,
                cash_flow_forecast REAL NOT NULL,
                risk_level TEXT NOT NULL
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


initialize_db()


def load_mock_data(name: str) -> Dict[str, Any]:
    path = MOCK_DIR / name
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/connect-bank")
def connect_bank() -> Dict[str, Any]:
    payload = load_mock_data("bank.json")
    return {
        "message": "Open Banking sandbox connected",
        "balance": payload["account_balance"],
        "transactions": payload["transactions"],
    }


@app.post("/connect-pos")
def connect_pos() -> Dict[str, Any]:
    payload = load_mock_data("yoco.json")
    return {
        "message": "Yoco POS data imported",
        "sales": payload,
    }


@app.post("/consent")
def save_consent(payload: ConsentPayload) -> Dict[str, bool]:
    return {"bank_consent": payload.bank_consent, "pos_consent": payload.pos_consent}


@app.post("/generate-profile")
def generate_profile(payload: GenerateProfilePayload) -> Dict[str, Any]:
    merchant = payload.merchant
    profile_id = str(uuid.uuid4())
    merchant_id = str(uuid.uuid4())
    bridge_id = f"BRIDGE-{merchant.business_name[:3].upper()}-{str(uuid.uuid4())[:6]}"

    connection = sqlite3.connect(DB_PATH)
    try:
        connection.execute(
            "INSERT INTO merchants (merchant_id, merchant_name, business_name, email, phone) VALUES (?, ?, ?, ?, ?)",
            (merchant_id, merchant.merchant_name, merchant.business_name, merchant.email, merchant.phone),
        )
        connection.execute(
            "INSERT INTO profiles (profile_id, merchant_id, bridge_id) VALUES (?, ?, ?)",
            (profile_id, merchant_id, bridge_id),
        )
        connection.commit()
    finally:
        connection.close()

    metrics = calculate_profile_metrics(payload.transactions, payload.pos_sales, merchant.business_name)
    score_id = str(uuid.uuid4())

    connection = sqlite3.connect(DB_PATH)
    try:
        connection.execute(
            "INSERT INTO scores (score_id, profile_id, merchant_stability, business_credibility, loan_readiness, cash_flow_score, cash_flow_forecast, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                score_id,
                profile_id,
                metrics["merchant_stability"],
                metrics["business_credibility"],
                metrics["loan_readiness"],
                metrics["cash_flow_score"],
                metrics["cash_flow_forecast"],
                metrics["risk_level"],
            ),
        )
        connection.commit()
    finally:
        connection.close()

    return {
        "bridge_id": bridge_id,
        "merchant_name": merchant.merchant_name,
        "business_name": merchant.business_name,
        "eco_score": metrics["eco_score"],
        "merchant_stability": metrics["merchant_stability"],
        "business_credibility": metrics["business_credibility"],
        "loan_readiness": metrics["loan_readiness"],
        "cash_flow_score": metrics["cash_flow_score"],
        "cash_flow_forecast": metrics["cash_flow_forecast"],
        "risk_level": metrics["risk_level"],
        "monthly_revenue": metrics["monthly_revenue"],
        "status": "generated",
    }


@app.get("/profile/{bridge_id}")
def get_profile(bridge_id: str) -> Dict[str, Any]:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        profile = connection.execute(
            "SELECT * FROM profiles WHERE bridge_id = ?",
            (bridge_id,),
        ).fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        merchant = connection.execute(
            "SELECT * FROM merchants WHERE merchant_id = ?",
            (profile["merchant_id"],),
        ).fetchone()
        score = connection.execute(
            "SELECT * FROM scores WHERE profile_id = ?",
            (profile["profile_id"],),
        ).fetchone()
        if not merchant or not score:
            raise HTTPException(status_code=404, detail="Profile details incomplete")
        return {
            "bridge_id": bridge_id,
            "merchant_name": merchant["merchant_name"],
            "business_name": merchant["business_name"],
            "email": merchant["email"],
            "phone": merchant["phone"],
            "merchant_stability": score["merchant_stability"],
            "business_credibility": score["business_credibility"],
            "loan_readiness": score["loan_readiness"],
            "cash_flow_score": score["cash_flow_score"],
            "cash_flow_forecast": score["cash_flow_forecast"],
            "risk_level": score["risk_level"],
        }
    finally:
        connection.close()
