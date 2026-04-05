import React from 'react'
import { MotionConfig } from 'framer-motion'
import BenchmarkerExplainer from '../components/animations/BenchmarkerExplainer'
import './BenchmarkerPage.css'

const BenchmarkerPage: React.FC = () => (
  <MotionConfig reducedMotion="user">
    <div className="bench-page">
      <nav className="bench-nav">
        <span className="bench-nav-brand">EverythingLLM</span>
        <span className="bench-nav-module">Throughput Benchmarker</span>
      </nav>

      <div className="bench-layout">
        {/* Left — placeholder */}
        <div className="bench-placeholder">
          <div className="bench-placeholder-inner">
            <span className="bench-phase-tag">Phase 04</span>
            <h1 className="bench-title">Throughput<br />Benchmarker</h1>
            <p className="bench-desc">
              Connect your local agent, run llama.cpp parameter sweeps across
              batch sizes and thread counts, and visualize real throughput
              curves on your own hardware.
            </p>
            <div className="bench-feature-list">
              <div className="bench-feature-item">
                <span className="bench-feature-bullet">▸</span>
                <span>Local agent WebSocket stream</span>
              </div>
              <div className="bench-feature-item">
                <span className="bench-feature-bullet">▸</span>
                <span>Batch size × thread count sweep</span>
              </div>
              <div className="bench-feature-item">
                <span className="bench-feature-bullet">▸</span>
                <span>Live TPS chart with animated draw-on</span>
              </div>
              <div className="bench-feature-item">
                <span className="bench-feature-bullet">▸</span>
                <span>Optimal config auto-detection</span>
              </div>
            </div>
            <div className="bench-coming-badge">◎ COMING IN PHASE 4</div>
          </div>
        </div>

        {/* Right — explainer */}
        <div className="bench-explainer-col">
          <div className="bench-explainer-label">SWEEP VISUALIZED</div>
          <BenchmarkerExplainer />
        </div>
      </div>
    </div>
  </MotionConfig>
)

export default BenchmarkerPage
