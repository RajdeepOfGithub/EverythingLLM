import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, FileText, MessageSquare, Brain, BookOpen } from 'lucide-react'
import { useRecommenderStore } from '../../store/recommenderStore'
import { useTypewriter } from '../../hooks/useTypewriter'
import type { UseCase } from '../../../../shared/contracts/backend_api'
import './recommender.css'

interface UseCaseEntry {
  id: UseCase
  label: string
  desc: string
  Icon: React.ElementType
}

const USE_CASES: UseCaseEntry[] = [
  { id: 'coding', label: 'Coding', desc: 'Code generation, review & debugging', Icon: Code2 },
  { id: 'documentation', label: 'Writing', desc: 'Long-form content & summarization', Icon: FileText },
  { id: 'chat', label: 'Chat', desc: 'Conversational AI & Q&A', Icon: MessageSquare },
  { id: 'reasoning', label: 'Reasoning', desc: 'Complex multi-step tasks', Icon: Brain },
  { id: 'explanation', label: 'Explanation', desc: 'Teaching & concept breakdown', Icon: BookOpen },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const EASE_CUBIC: [number, number, number, number] = [0.4, 0, 0.2, 1]

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_CUBIC } },
}

export default function Step1UseCase() {
  const { useCase, setUseCase, setStep, setHardware, hardware } = useRecommenderStore()
  const { displayed } = useTypewriter('What do you need a model for?', { speed: 26 })
  const [detecting, setDetecting] = useState(true)

  useEffect(() => {
    fetch('http://localhost:7878/api/v1/hardware')
      .then(r => r.json())
      .then((data) => {
        setHardware(data)
        setDetecting(false)
      })
      .catch(() => {
        // agent offline — graceful degrade, hardware stays null
        setDetecting(false)
      })
  }, [setHardware])

  return (
    <div className="step-container">
      <div className="step-hero">
        <h1 className="step-headline">{displayed}<span className="tw-cursor">_</span></h1>
        <p className="step-subtitle">
          Select your primary use case. We'll score models based on what matters most for your workflow.
        </p>

        <AnimatePresence mode="wait">
          {detecting ? (
            <motion.div
              key="detecting"
              className="hw-badge hw-badge--detecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="hw-badge__dot hw-badge__dot--pulse" />
              Detecting hardware...
            </motion.div>
          ) : hardware !== null ? (
            <motion.div
              key="detected"
              className="hw-badge hw-badge--detected"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="hw-badge__dot hw-badge__dot--green" />
              {hardware.gpu.name ?? 'GPU detected'} · {hardware.gpu.vram_total_gb ?? '?'}GB VRAM
            </motion.div>
          ) : (
            <motion.div
              key="not-detected"
              className="hw-badge hw-badge--missing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="hw-badge__dot hw-badge__dot--orange" />
              Hardware not detected — recommendations unfiltered
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="usecase-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {USE_CASES.map(({ id, label, desc, Icon }) => (
          <motion.button
            key={id}
            className={`usecase-card${useCase === id ? ' selected' : ''}`}
            variants={cardVariants}
            onClick={() => setUseCase(id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="usecase-icon">
              <Icon size={20} strokeWidth={1.5} />
            </div>
            <span className="usecase-label">{label}</span>
            <span className="usecase-desc">{desc}</span>
          </motion.button>
        ))}
      </motion.div>

      <motion.button
        className="cta-button"
        disabled={!useCase}
        onClick={() => setStep(2, 1)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Continue →
      </motion.button>
    </div>
  )
}
