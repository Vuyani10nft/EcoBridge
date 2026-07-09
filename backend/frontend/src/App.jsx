import { useState } from 'react';

const API_BASE = '/api';

function App() {
  const [step, setStep] = useState(1);
  const [merchant, setMerchant] = useState({
    merchant_name: '',
    business_name: '',
    email: '',
    phone: '',
  });
  const [bankConnected, setBankConnected] = useState(false);
  const [posConnected, setPosConnected] = useState(false);
  const [consent, setConsent] = useState({ bank_consent: false, pos_consent: false });
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  const handleRegister = (e) => {
    e.preventDefault();
    setStep(3);
  };

  const connectBank = async () => {
    const response = await fetch(`${API_BASE}/connect-bank`, { method: 'POST' });
    if (response.ok) {
      setBankConnected(true);
      setStep(4);
    }
  };

  const connectPos = async () => {
    const response = await fetch(`${API_BASE}/connect-pos`, { method: 'POST' });
    if (response.ok) {
      setPosConnected(true);
      setStep(5);
    }
  };

  const handleConsent = async () => {
    await fetch(`${API_BASE}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consent),
    });
    setStep(6);
  };

  const generateProfile = async () => {
    setLoading(true);
    const bankResponse = await fetch(`${API_BASE}/connect-bank`, { method: 'POST' });
    const posResponse = await fetch(`${API_BASE}/connect-pos`, { method: 'POST' });
    const bankPayload = await bankResponse.json();
    const posPayload = await posResponse.json();

    const response = await fetch(`${API_BASE}/generate-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant,
        transactions: bankPayload.transactions,
        pos_sales: posPayload.sales,
      }),
    });

    const result = await response.json();
    setProfile(result);
    setLoading(false);
    setStep(7);
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">EcoBridge EC</p>
          <h1>Building trusted financial identities for South Africa's informal economy.</h1>
          <p className="hero-copy">Create a portable digital business identity from your bank and POS history in minutes.</p>
        </div>
      </header>

      <main className="card-grid">
        <section className="card">
          <h2>1. Merchant Details</h2>
          <form onSubmit={handleRegister}>
            <input placeholder="Merchant Name" value={merchant.merchant_name} onChange={(e) => setMerchant({ ...merchant, merchant_name: e.target.value })} required />
            <input placeholder="Business Name" value={merchant.business_name} onChange={(e) => setMerchant({ ...merchant, business_name: e.target.value })} required />
            <input type="email" placeholder="Email" value={merchant.email} onChange={(e) => setMerchant({ ...merchant, email: e.target.value })} required />
            <input placeholder="Phone" value={merchant.phone} onChange={(e) => setMerchant({ ...merchant, phone: e.target.value })} required />
            <button type="submit">Continue</button>
          </form>
        </section>

        <section className="card">
          <h2>2. Connect Data Sources</h2>
          <div className="step-row">
            <span>Open Banking</span>
            <button onClick={connectBank} disabled={bankConnected}>{bankConnected ? 'Connected ✓' : 'Connect Bank'}</button>
          </div>
          <div className="step-row">
            <span>Yoco POS</span>
            <button onClick={connectPos} disabled={posConnected}>{posConnected ? 'Connected ✓' : 'Import Yoco Data'}</button>
          </div>
          {step >= 5 && (
            <div className="consent-card">
              <label>
                <input type="checkbox" checked={consent.bank_consent} onChange={() => setConsent({ ...consent, bank_consent: !consent.bank_consent })} />
                Bank transactions
              </label>
              <label>
                <input type="checkbox" checked={consent.pos_consent} onChange={() => setConsent({ ...consent, pos_consent: !consent.pos_consent })} />
                POS sales
              </label>
              <button onClick={handleConsent} disabled={!consent.bank_consent || !consent.pos_consent}>Approve</button>
            </div>
          )}
        </section>

        <section className="card">
          <h2>3. BridgeID Outcome</h2>
          {step < 6 ? (
            <p className="muted">Complete the flow to generate your merchant profile.</p>
          ) : (
            <>
              {loading ? <div className="loader">Generating BridgeID…</div> : null}
              {!loading && profile ? (
                <div className="dashboard">
                  <div className="pill">BridgeID {profile.bridge_id}</div>
                  <h3>{profile.business_name}</h3>
                  <div className="stats">
                    <div><strong>Monthly Revenue</strong><span>R {profile.monthly_revenue.toLocaleString()}</span></div>
                    <div><strong>Merchant Stability</strong><span>{profile.merchant_stability}</span></div>
                    <div><strong>Business Credibility</strong><span>{profile.business_credibility}</span></div>
                    <div><strong>Loan Readiness</strong><span>{profile.loan_readiness}</span></div>
                    <div><strong>Cash Flow Forecast</strong><span>R {profile.cash_flow_forecast.toLocaleString()}</span></div>
                    <div><strong>Risk Level</strong><span>{profile.risk_level}</span></div>
                  </div>
                  <button onClick={generateProfile}>Generate Profile</button>
                </div>
              ) : (
                <button onClick={generateProfile}>Generate Profile</button>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
