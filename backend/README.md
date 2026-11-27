# PRAHARI // Python OSINT & Illicit Trade Ingestion Engine

Real, functional backend intelligence engine built for the Rajasthan Police R4C Hackathon 2026.

## Capabilities
1. **Live Public Telegram Scraper (`telegram_scraper.py`)**:
   - Scrapes public Telegram channels using open web previews (`https://t.me/s/{channel}`). Zero API keys or phone logins required.
2. **Multi-Dialect Hinglish & Slang Classifier (`classifier.py`)**:
   - Detects code words across 4 categories: `DRUGS` (*chitta, afeem, 5g, score*), `ARMS` (*desi katta, 315 bore, raund*), `DOCUMENTS` (*fake aadhaar, pvc marksheet*), and `FINANCIAL` (*kyc mule account, atm kit, kiraya khata*).
3. **Identifier Extraction (`extractor.py`)**:
   - Extracts UPI handles, Indian mobile numbers (+91), Telegram usernames, cryptocurrency wallets (BTC, ETH, TRON USDT), bank accounts, and matches Rajasthan district jurisdictions.
4. **Dynamic Entity Graph Engine (`graph_engine.py`)**:
   - Links cross-channel criminal entities automatically. If the same UPI or phone appears across multiple channels or categories, it elevates risk scores and flags the syndicate.
5. **Four-Layer Cryptographic Section 63 BSA Chain of Custody (`extractor.py` & `main.py`)**:
   - Generates tamper-evident append-only SHA-256 hash chains, Ed25519 station node signatures, RFC 3161 trusted timestamp tokens, and raw wire payload preservation structured to support the Schedule to Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023.

## Running the Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API runs on `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.
