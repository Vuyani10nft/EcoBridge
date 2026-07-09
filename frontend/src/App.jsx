import { useState } from 'react';

const API_BASE = '/api';

const initialMerchant = {
  merchant_name: 'Thabo Mbeki',
  business_name: 'Mdantsane Mini Market',
  email: 'thabo@mdantsanemarket.co.za',
  phone: '071 234 5678',
};

const steps = ['Register', 'Connect', 'Consent', 'BridgeID'];

function App() {
  const [step, setStep] = useState(1);
  const [merchant, setMerchant] = useState(initialMerchant);
  const [bankConnected, setBankConnected] = useState(false);
  const [posConnected, setPosConnected] = useState(false);
  const [consent, setConsent] = useState({ bank_consent: false, pos_consent: false });
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const handleRegister = (event) => {
    event.preventDefault();
    setStep(2);
  };

  const connectBank = async () => {
    setError('');
    const response = await fetch(`${API_BASE}/connect-bank`, { method: 'POST' });
    if (response.ok) {
      setBankConnected(true);
      if (posConnected) setStep(3);
      return;
    }
    setError('Could not connect Open Banking data.');
  };

  const connectPos = async () => {
    setError('');
    const response = await fetch(`${API_BASE}/connect-pos`, { method: 'POST' });
    if (response.ok) {
      setPosConnected(true);
      if (bankConnected) setStep(3);
      return;
    }
    setError('Could not import Yoco POS data.');
  };

  const handleConsent = async () => {
    setError('');
    await fetch(`${API_BASE}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consent),
    });
    setStep(4);
  };

  const generateProfile = async () => {
    setLoading(true);
    setError('');

    try {
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

      if (!response.ok) throw new Error('Profile generation failed');
      const result = await response.json();
      setProfile(result);
    } catch {
      setError('BridgeID generation failed. Check that the FastAPI backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">EcoBridge EC</p>
          <h1>Building trusted financial identities for South Africa's informal economy.</h1>
          <p className="hero-copy">
            Create a portable BridgeID from consented Open Banking data and Yoco POS sales.
            EcoBridge does not lend money; it helps merchants prove business credibility.
          </p>
        </div>
      </header>

      <nav className="progress" aria-label="Demo progress">
        {steps.map((label, index) => (
          <span className={step >= index + 1 ? 'active' : ''} key={label}>{label}</span>
        ))}
      </nav>

      {error ? <div className="alert">{error}</div> : null}

      <main className="card-grid">
        <section className="card">
          <p className="section-label">Step 1</p>
          <h2>Register Merchant</h2>
          <form onSubmit={handleRegister}>
            <input placeholder="Merchant Name" value={merchant.merchant_name} onChange={(event) => setMerchant({ ...merchant, merchant_name: event.target.value })} required />
            <input placeholder="Business Name" value={merchant.business_name} onChange={(event) => setMerchant({ ...merchant, business_name: event.target.value })} required />
            <input type="email" placeholder="Email" value={merchant.email} onChange={(event) => setMerchant({ ...merchant, email: event.target.value })} required />
            <input placeholder="Phone" value={merchant.phone} onChange={(event) => setMerchant({ ...merchant, phone: event.target.value })} required />
            <button type="submit">Save Merchant</button>
          </form>
        </section>

        <section className="card">
          <p className="section-label">Step 2</p>
          <h2>Connect Data Sources</h2>
          <div className="step-row">
            <span>Open Banking</span>
            <button onClick={connectBank} disabled={bankConnected || step < 2}>{bankConnected ? 'Connected' : 'Connect Bank'}</button>
          </div>
          <div className="step-row">
            <span>Yoco POS</span>
            <button onClick={connectPos} disabled={posConnected || step < 2}>{posConnected ? 'Imported' : 'Import Sales'}</button>
          </div>
          {bankConnected && posConnected && (
            <div className="consent-card">
              <p className="section-label">Step 3</p>
              <label>
                <input type="checkbox" checked={consent.bank_consent} onChange={() => setConsent({ ...consent, bank_consent: !consent.bank_consent })} />
                Bank transactions
              </label>
              <label>
                <input type="checkbox" checked={consent.pos_consent} onChange={() => setConsent({ ...consent, pos_consent: !consent.pos_consent })} />
                POS sales
              </label>
              <button onClick={handleConsent} disabled={!consent.bank_consent || !consent.pos_consent}>Grant Consent</button>
            </div>
          )}
        </section>

        <section className="card outcome-card">
          <p className="section-label">Step 4</p>
          <h2>BridgeID Outcome</h2>
          {step < 4 ? (
            <p className="muted">Complete registration, data connection, and consent to generate a merchant profile.</p>
          ) : (
            <>
              {loading ? <div className="loader">Generating BridgeID...</div> : null}
              {!loading && profile ? (
                <div className="dashboard">
                  <div className="pill">BridgeID {profile.bridge_id}</div>
                  <h3>{profile.business_name}</h3>
                  <div className="score-ring">
                    <span>{profile.eco_score}</span>
                    <small>EcoScore</small>
                  </div>
                  <div className="stats">
                    <div><strong>Monthly Revenue</strong><span>R {profile.monthly_revenue.toLocaleString()}</span></div>
                    <div><strong>Merchant Stability</strong><span>{profile.merchant_stability}</span></div>
                    <div><strong>Business Credibility</strong><span>{profile.business_credibility}</span></div>
                    <div><strong>Loan Readiness</strong><span>{profile.loan_readiness}</span></div>
                    <div><strong>Cash Flow Forecast</strong><span>R {profile.cash_flow_forecast.toLocaleString()}</span></div>
                    <div><strong>Risk Level</strong><span>{profile.risk_level}</span></div>
                  </div>
                  <button onClick={generateProfile}>Refresh Profile</button>
                </div>
              ) : (
                <button onClick={generateProfile}>Generate BridgeID</button>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
