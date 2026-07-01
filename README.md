# 🛒 Smart Grocery Shopping List & Pantry Manager

A state-of-the-art Progressive Web Application (PWA) designed to revolutionize household grocery shopping and pantry management. Featuring real-time family synchronization, predictive stock analytics, receipt parsing, dynamic recipe generation, community price comparisons, and a smart WhatsApp integration.

---

## 🚀 Key Features

*   **Real-time Family Syncing:** Seamless multi-user synchronization powered by Firebase Firestore, ensuring all family members see live updates.
*   **AI WhatsApp Bot:** Add items, view lists, record purchases, and import recipes directly from WhatsApp chats using natural language.
*   **Pantry & Predictive Analytics:** Smart tracking of pantry stock with background predictions forecasting when grocery items will run out based on consumption frequency.
*   **Receipt Scanner (OCR & AI):** Upload receipts to automatically parse store names, items, quantities, and prices. Log price history, calculate savings, and update pantry stock in one click.
*   **Zero-Waste Food Rescue:** Dynamic recipe generator using Gemini API that recommends dishes based on ingredients in the pantry that are close to their expiration date.
*   **Smart Basket Nutritional Analysis:** Real-time health scoring, calorie estimation, and protein profiling of the shopping list with personalized nutritional tips.
*   **Community Price Comparison:** Aggregate store prices to calculate the cheapest store for the current basket and show potential savings.
*   **Progressive Web App (PWA):** Installable on iOS/Android, featuring offline resilience, standalone display, and push notifications.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Core** | React 19, TypeScript, Vite |
| **Styling & Motion** | Custom CSS (Modern Dark/Light Themes), Framer Motion |
| **Backend & Auth** | Firebase Authentication, Cloud Firestore, Cloud Functions |
| **Artificial Intelligence** | Google Generative AI (Gemini 2.5 Flash), Groq API (Llama 3.3/3.2 Vision) |
| **Mobile & PWA** | Workbox, `vite-plugin-pwa`, `html5-qrcode` (Barcode Scanner) |
| **Backend Environment** | Node.js (Firebase Admin SDK), Twilio API (WhatsApp Gateway) |

---

## 📂 Project Architecture

```
shopping-list/
├── api/                   # Serverless API endpoints (e.g., WhatsApp integration)
│   └── whatsapp.js        # Twilio WhatsApp webhook handling NLP with Gemini
├── functions/             # Firebase Cloud Functions (Background Workers)
│   └── index.js           # Scheduled tasks for VIP item price syncing
├── public/                # Static assets and PWA service worker configurations
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── modals/        # Specialized modals (Nutrition, Splits, App Guides)
│   │   └── LandingPage.jsx# Interactive landing page for unauthenticated users
│   ├── utils/             # Core utilities and AI prompt handlers
│   │   ├── aiService.js   # Gemini and Groq fallback wrapper
│   │   └── helpers.ts     # Formatting, notifications, and logic helpers
│   ├── views/             # Primary app view controllers
│   │   ├── ShoppingView.jsx # Main shopping list layout and list actions
│   │   ├── PantryView.jsx   # Pantry stock tracker, predictions, and recipes
│   │   └── StatsView.jsx    # Analytics dashboard, budget tracking, and charts
│   ├── App.jsx            # State coordinator, subscriptions, and layout wrapper
│   ├── index.css          # Design system, CSS variables, and layout resets
│   └── main.tsx           # Entry point and StrictMode wrapper
├── tsconfig.json          # TypeScript configurations
└── vite.config.js         # Vite bundler and PWA generator settings
```

---

## ⚡ Getting Started

### Prerequisites
*   **Node.js** (v18 or higher recommended)
*   **npm** or **yarn**
*   **Firebase Project** with Firestore, Authentication, and Cloud Functions enabled.

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/your-username/shopping-list.git
cd shopping-list
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# AI Gateways
VITE_GEMINI_API_KEY=your_google_gemini_api_key
VITE_GROQ_API_KEY=your_groq_api_key

# WhatsApp Webhook Integration
FIREBASE_CLIENT_EMAIL=your_firebase_admin_email
FIREBASE_PRIVATE_KEY="your_firebase_admin_private_key"
```

### 3. Running Locally
Launch the Vite development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 4. Build for Production
To bundle the frontend with assets and PWA service workers:
```bash
npm run build
```
This generates a production-ready bundle in the `dist` folder.

---

## 🤖 WhatsApp Integration Webhook
The serverless endpoint at `api/whatsapp.js` is designed to run on a Vercel/Node.js host. Configure Twilio with the public webhook URL pointing to your deployed API handler. The incoming messages are parsed into actions (`add`, `read`, `bought`, `delete`, `update_stock`, `import_recipe`) using **Gemini 2.5 Flash** to maintain your household shopping list dynamically over WhatsApp.
