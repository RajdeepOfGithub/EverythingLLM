import React from 'react'
import { motion, MotionConfig } from 'framer-motion'
import SpeculativeDecodingExplainer from '../components/animations/SpeculativeDecodingExplainer'
import './SpeculativeDecodingPage.css'

const SpeculativeDecodingPage: React.FC = () => (
  <MotionConfig reducedMotion="user">
    <div className="spec-page">
      <nav className="spec-nav">
        <span className="spec-nav-brand">EverythingLLM</span>
        <span className="spec-nav-module">Speculative Decoding</span>
      </nav>

      <div className="spec-content">
        {/* Coming soon card */}
        <motion.div
          className="spec-coming-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <span className="spec-phase-tag">Phase 05</span>
          <div className="spec-coming-body">
            <h1 className="spec-title">Speculative<br />Decoding<br />Advisor</h1>
            <p className="spec-desc">
              Full draft model benchmarking with live WebSocket metrics, animated
              token accept/reject streams, and optimal pairing recommendations.
            </p>
            <div className="spec-feature-list">
              <div className="spec-feature-item">
                <span className="spec-feature-bullet">▸</span>
                <span>Draft model pairing finder</span>
              </div>
              <div className="spec-feature-item">
                <span className="spec-feature-bullet">▸</span>
                <span>Live accept rate streaming</span>
              </div>
              <div className="spec-feature-item">
                <span className="spec-feature-bullet">▸</span>
                <span>Speedup vs VRAM cost analysis</span>
              </div>
            </div>
            <div className="spec-coming-badge">◎ FULL BENCHMARKING COMING IN PHASE 5</div>
          </div>
        </motion.div>

        {/* Explainer */}
        <motion.div
          className="spec-explainer-wrap"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        >
          <SpeculativeDecodingExplainer />
        </motion.div>
      </div>
    </div>
  </MotionConfig>
)

export default SpeculativeDecodingPage
