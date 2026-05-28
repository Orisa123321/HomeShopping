# Project Context & AI Instructions

## 🎯 About the Project

This is a smart grocery shopping list and pantry management app, designed for Israeli households. It features real-time family syncing, dynamic recipe generation, receipt scanning, and community-driven price comparisons.

## 🛠️ Technology Stack

- **Frontend:** React (Vite), JavaScript (ES6+)
- **Backend/Database:** Firebase (Firestore, Authentication, Cloud Functions)
- **Styling:** Standard CSS (`App.css`, `index.css`) with inline styles for dynamic rendering.
- **Animations:** `framer-motion`
- **AI Integration:** Google Generative AI (`@google/generative-ai`) for smart recipes and receipt analysis.
- **Other Tools:** `html5-qrcode` for barcode scanning.

## 📁 Project Architecture

- `src/App.jsx`: The main entry point and global state manager (Authentication, DB Subscriptions).
- `src/views/`: Contains major full-screen views (e.g., `ShoppingView.jsx`, `StatsView.jsx`, `ComparePricesView.jsx`).
- `src/components/`: Contains reusable UI components (e.g., `ItemCard.jsx`).
- `src/components/modals/`: Contains all popup modals (`CatalogModal.jsx`, `SmartSplitModal.jsx`, etc.).
- `src/utils/`: Contains helper functions and static data (e.g., `helpers.js`).
- `functions/`: Contains the Firebase Cloud Functions backend (Node.js).

## ✍️ Coding Guidelines & Preferences

When writing or modifying code, please adhere to the following rules:

1. **Modularity over "God Components":** - Avoid adding massive new features directly into `App.jsx`.
   - If a feature requires significant UI and logic, create a new Component in `src/components/` or a View in `src/views/`.

2. **State Management:**
   - Prefer passing props down for now, but keep prop drilling as clean as possible.
   - Use `useMemo` for heavy calculations (like sorting or grouping products).

3. **Safe Firebase Operations:**
   - When updating documents, always use `setDoc(docRef, { ... }, { merge: true })` instead of `updateDoc` if there is a chance the document doesn't exist yet, to prevent "No document to update" errors.
   - Always handle Firebase read/write errors gracefully with `try/catch` and user-friendly `alert()` or console warnings.

4. **Formatting & UI:**
   - Follow the existing modern, rounded, clean aesthetic (e.g., `borderRadius: 10px/12px`, soft box-shadows, gradients).
   - Use FontAwesome (`<i className="fas ..."></i>`) for standard icons, and native Emojis for food/categories.
   - Ensure the UI is responsive and looks good on mobile devices (the primary use case).

5. **Language:**
   - **All user-facing text, alerts, placeholders, and comments MUST be in Hebrew.**
   - Code variables, component names, and internal logic must be in English.

6. **Strict Code Modification Rule:**
   - NEVER truncate, omit, or replace existing, working logic with comments like `// ... existing code ...` unless explicitly instructed.
   - If you modify a file, ensure all existing imports, functions, and standard features remain intact so the app doesn't break upon pasting.
