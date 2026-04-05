import React from 'react'
import { MotionConfig } from 'framer-motion'
import HardwarePlannerExplainer from '../components/animations/HardwarePlannerExplainer'
import './HardwarePlannerPage.css'

const HardwarePlannerPage: React.FC = () => (
  <MotionConfig reducedMotion="user">
    <div className="hw-page">
      <nav className="hw-nav">
        <span className="hw-nav-brand">EverythingLLM</span>
        <span className="hw-nav-module">Hardware Planner</span>
      </nav>

      <div className="hw-layout">
        {/* Left — placeholder */}
        <div className="hw-placeholder">
          <div className="hw-placeholder-inner">
            <span className="hw-phase-tag">Phase 03</span>
            <h1 className="hw-title">Hardware<br />Planner</h1>
            <p className="hw-desc">
              Calculate exact VRAM and RAM requirements for any model.
              Get buy-vs-rent cost estimates before committing to hardware.
            </p>
            <div className="hw-feature-list">
              <div className="hw-feature-item">
                <span className="hw-feature-bullet">▸</span>
                <span>VRAM requirement calculator</span>
              </div>
              <div className="hw-feature-item">
                <span className="hw-feature-bullet">▸</span>
                <span>KV cache scaling analysis</span>
              </div>
              <div className="hw-feature-item">
                <span className="hw-feature-bullet">▸</span>
                <span>Buy vs rent cost estimator</span>
              </div>
              <div className="hw-feature-item">
                <span className="hw-feature-bullet">▸</span>
                <span>Multi-GPU memory planning</span>
              </div>
            </div>
            <div className="hw-coming-badge">◎ COMING IN PHASE 3</div>
          </div>
        </div>

        {/* Right — explainer */}
        <div className="hw-explainer-col">
          <div className="hw-explainer-label">HOW VRAM FILLS UP</div>
          <HardwarePlannerExplainer />
        </div>
      </div>
    </div>
  </MotionConfig>
)

export default HardwarePlannerPage
