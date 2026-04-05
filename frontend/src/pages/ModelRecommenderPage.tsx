import React from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useRecommenderStore } from '../store/recommenderStore'
import Step1UseCase from '../components/recommender/Step1UseCase'
import Step2Sliders from '../components/recommender/Step2Sliders'
import Step3Results from '../components/recommender/Step3Results'
import ModelRecommenderExplainer from '../components/animations/ModelRecommenderExplainer'
import './ModelRecommenderPage.css'

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

const EASE_CUBIC: [number, number, number, number] = [0.4, 0, 0.2, 1]
const transition = { duration: 0.28, ease: EASE_CUBIC }

const STEPS = ['Use Case', 'Priorities', 'Results']

export default function ModelRecommenderPage() {
  const { step, direction } = useRecommenderStore()

  return (
    <MotionConfig reducedMotion="user">
      <div className="recommender-page">
        {/* Nav */}
        <nav className="rec-nav">
          <span className="rec-nav-brand">EverythingLLM</span>
          <div className="rec-step-indicator">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div
                  className={`rec-step-pill${step === i + 1 ? ' active' : step > i + 1 ? ' done' : ''}`}
                >
                  <span className="rec-step-dot" />
                  <span className="rec-step-label">{label}</span>
                </div>
                {i < 2 && (
                  <div className={`rec-step-line${step > i + 1 ? ' done' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="rec-nav-right" />
        </nav>

        {/* Two-column layout */}
        <div className="recommender-layout">
          {/* Wizard — 60% */}
          <div className="recommender-content">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
                className="rec-step-wrapper"
              >
                {step === 1 && <Step1UseCase />}
                {step === 2 && <Step2Sliders />}
                {step === 3 && <Step3Results />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Explainer sidebar — 38% — hidden on mobile */}
          <aside className="recommender-sidebar">
            <ModelRecommenderExplainer />
          </aside>
        </div>
      </div>
    </MotionConfig>
  )
}
