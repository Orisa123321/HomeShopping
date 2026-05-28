import React from "react";
import { motion } from "framer-motion";
import "./LandingPage.css";

export default function LandingPage({ onLoginClick }) {
  // הגדרות אנימציה (Framer Motion)
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div className="landing-container">
      {/* אורות רקע מעוצבים */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      <nav className="landing-navbar">
        <motion.div
          className="logo"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          🛒 המשפחה קונה חכם
        </motion.div>
        <motion.button
          className="login-btn-outline"
          onClick={onLoginClick}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          התחברות
        </motion.button>
      </nav>

      <main className="hero-section">
        <motion.div
          className="hero-content"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="hero-badge" variants={fadeInUp}>
            <span className="badge-icon">✨</span>
            הדרך החדשה לקנות בסופר
          </motion.div>
          <motion.h1 variants={fadeInUp}>
            קניות חכמות,
            <br />
            <span className="text-gradient">מתחילות כאן.</span>
          </motion.h1>
          <motion.p variants={fadeInUp}>
            תשכחו מהודעות ווצאפ על "מה חסר בבית". נהלו רשימה משותפת, סרקו קבלות
            בקליק וחסכו זמן וכסף בסופר.
          </motion.p>
          <motion.div className="hero-actions" variants={fadeInUp}>
            <button
              className="primary-action-btn pulse-anim"
              onClick={onLoginClick}
            >
              התחילו עכשיו - זה בחינם 🚀
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-visuals"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <motion.div
            className="mockup-container"
            animate={{ y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            {/* הדמיה של הממשק (Glassmorphism) */}
            <div className="glass-mockup">
              <div className="mockup-header">
                <div className="mockup-title">רשימת קניות</div>
                <div className="mockup-users">
                  <div className="avatar a1"></div>
                  <div className="avatar a2"></div>
                </div>
              </div>
              <div className="mockup-list">
                <div className="mockup-item">
                  <div className="checkbox checked"></div>
                  <span>חלב תנובה 3%</span>
                </div>
                <div className="mockup-item">
                  <div className="checkbox"></div>
                  <span>לחם מחמצת</span>
                </div>
                <div className="mockup-item">
                  <div className="checkbox"></div>
                  <span>עגבניות שרי</span>
                </div>
                <div className="mockup-item">
                  <div className="checkbox"></div>
                  <span>קפה שחור עלית</span>
                </div>
              </div>
              <div className="mockup-add-btn">+</div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <section className="features-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2>למה תאהבו את האפליקציה שלנו?</h2>
          <p>כל הכלים שאתם צריכים לניהול המזווה והקניות במקום אחד.</p>
        </motion.div>

        <motion.div
          className="features-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon-wrapper f-ai">
              <span className="feature-icon">📸</span>
            </div>
            <h3>סריקת קבלות AI</h3>
            <p>
              פשוט מצלמים קבלה, והאפליקציה מפענחת ומוסיפה את כל המוצרים אוטומטית
              למערכת.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon-wrapper f-sync">
              <span className="feature-icon">🔄</span>
            </div>
            <h3>סנכרון משפחתי</h3>
            <p>
              כולם מחוברים לאותה רשימה ומעודכנים בזמן אמת, גם תוך כדי הקנייה
              בסופר.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon-wrapper f-inventory">
              <span className="feature-icon">📦</span>
            </div>
            <h3>מעקב מלאי מתקדם</h3>
            <p>
              דעו תמיד מה חסר בבית בלחיצת כפתור אחת, ואל תקנו סתם מוצרים שכבר יש
              לכם בארון.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <section className="how-it-works">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          איך זה עובד?
        </motion.h2>
        <div className="steps-container">
          <motion.div
            className="step"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="step-number">1</div>
            <h4>נרשמים</h4>
            <p>חיבור מהיר ומאובטח עם גוגל</p>
          </motion.div>
          <div className="step-divider"></div>
          <motion.div
            className="step"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="step-number">2</div>
            <h4>משתפים</h4>
            <p>מזמינים את בני הבית לרשימה</p>
          </motion.div>
          <div className="step-divider"></div>
          <motion.div
            className="step"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <div className="step-number">3</div>
            <h4>קונים חכם</h4>
            <p>חוסכים זמן, כסף וריבים מיותרים</p>
          </motion.div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <h2>מוכנים לשדרג את חוויית הקניות?</h2>
          <p>הצטרפו למשפחות שכבר נהנות מסדר במזווה ובסופר.</p>
          <button className="primary-action-btn" onClick={onLoginClick}>
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              style={{
                width: "20px",
                height: "20px",
                marginLeft: "10px",
                background: "white",
                borderRadius: "50%",
                padding: "2px",
              }}
            />
            התחברות עם Google
          </button>
        </div>
        <div className="footer-bottom">
          <p>v2.0 — Beta | כל הזכויות שמורות</p>
        </div>
      </footer>
    </div>
  );
}
