# ⚖️ FairLens: Enterprise AI Fairness & Compliance Platform

FairLens is a production-ready, PhD-level bias detection and mitigation platform. It transforms raw datasets into boardroom-ready compliance audits. By bridging the gap between deep machine learning mathematics and executive-level regulatory compliance, FairLens allows companies to instantly audit their models, uncover hidden proxy variables, and quantify precise legal financial exposure before a lawsuit happens.

Built for seamless integration, FairLens is designed to proactively protect businesses against EEOC, CFPB, and Title VII compliance violations.

## 🚀 Key Features

* **Causal Root Cause Engine**: Move beyond simple correlation. FairLens builds a causal pathway graph using Scikit-learn to instantly identify the *exact* proxy variable (e.g., ZIP code, technical score) driving the discrimination, rather than blaming the protected attribute itself.
* **Legal Risk Dollar Estimator**: Translates abstract statistical bias into concrete USD financial exposure. Maps dataset violations directly to Title VII and Four-Fifths 80% Rule penalties based on historical averages.
* **Verifiable Fairness Certificate**: Auto-generates an immutable, audit-ready compliance certificate detailing disparate impact failures and overall Fairness Scores across the dataset.
* **LLM-Powered executive Summaries**: Integrates **Google Gemini 2.0 Flash** to instantly translate massive matrices of statistical compliance data into a plain-English, C-suite ready PDF report.
* **Synthetic Bias-Free Generator**: Creates highly dense, statistically equivalent, perfectly balanced datasets safe for downstream model training. 
* **Bias Provenance Tracker**: Uses machine-learning influence functions to surgically pinpoint the exact localized rows causing algorithmic skew.

## 🛠️ Technology Stack

**Frontend (Client Layer)**
* React 19 + Vite (Performance UI)
* Recharts (Complex Data Visualizations)
* React Markdown (Secure report rendering)
* Vanilla CSS (Premium "Midnight & Aurora" aesthetics)

**Backend (Processing Layer)**
* Python 3.11 + FastAPI (High-performance API)
* Pandas & NumPy (Core statistical parity math)
* Scikit-learn (RandomForest classifiers for Causal inference & active mitigation)
* Google GenAI SDK (Interface for Gemini AI model)

**Infrastructure & Cloud**
* Docker (Multi-stage containerized routing)
* Render / Google Cloud Run (Serverless scalable host)

## 📦 Local Installation

To run this project locally, ensure you have Python 3.11+ and Node.js v20+ installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dhruv-9927/Fairlens.git
   cd Fairlens
   ```

2. **Setup the Backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   ```
   *Create a `.env` file inside the `backend/` directory and add your key:*
   `GEMINI_API_KEY=your_api_key_here`

3. **Setup the Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run the Application:**
   Open two terminal windows:
   ```bash
   # Terminal 1 (Backend)
   cd backend
   python -m uvicorn main:app --port 8000 --reload

   # Terminal 2 (Frontend)
   cd frontend
   npm run dev
   ```

## ☁️ Cloud Deployment
This repository is pre-configured with a Production `Dockerfile` that packages both the Vite frontend and FastAPI backend into a single image. 
It supports instant zero-configuration deployment to **Render.com** or **Google Cloud Run**.

Simply link this GitHub repository to Render as a "Web Service", set the `GEMINI_API_KEY` in your environment variables, and hit Deploy!

## 🤝 The Hackathon Case
FairLens was built to solve the black-box AI compliance problem. Companies are increasingly getting sued for algorithmic bias, but data scientists don't speak Legal, and lawyers don't speak Python. FairLens sits exactly in the middle.
