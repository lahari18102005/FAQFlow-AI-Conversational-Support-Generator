import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Zap, Shield, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '-1px' }}>FAQFlow AI</h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={toggleTheme} className="glass-card" style={{ padding: '8px', border: 'none', cursor: 'pointer', display: 'flex' }}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => navigate('/login')} className="btn-primary">Get Started</button>
        </div>
      </nav>

      <main style={{ maxWidth: '1000px', margin: '60px auto', padding: '40px 20px', textAlign: 'center' }}>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '24px', color: 'var(--text)' }}
        >
          Transform Your Static FAQ into <br />
          <span style={{ color: 'var(--primary)' }}>Conversational Intelligence</span>
        </motion.h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '700px', margin: '0 auto 40px' }}>
          FAQFlow AI uses cutting-edge RAG technology to turn your support dataset into a 
          dynamic, empathetic assistant that helps your customers in real-time.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '60px' }}>
          <FeatureCard 
            icon={<Zap color="var(--primary)" />}
            title="Instant Retrieval"
            desc="Semantic search across thousands of FAQs in milliseconds using FAISS."
          />
          <FeatureCard 
            icon={<MessageSquare color="#10b981" />}
            title="AI Conversational"
            desc="Generates natural, context-aware responses instead of just showing raw data."
          />
          <FeatureCard 
            icon={<Shield color="#f59e0b" />}
            title="Secure & Private"
            desc="Enterprise-grade authentication and session management built-in."
          />
        </div>
      </main>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="glass-card" 
    style={{ padding: '40px', textAlign: 'left' }}
  >
    <div style={{ marginBottom: '20px' }}>{icon}</div>
    <h3 style={{ marginBottom: '10px' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)' }}>{desc}</p>
  </motion.div>
);

export default LandingPage;
