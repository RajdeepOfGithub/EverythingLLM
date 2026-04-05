import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './utils/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ModelRecommenderPage from './pages/ModelRecommenderPage'
import HardwarePlannerPage from './pages/HardwarePlannerPage'
import BenchmarkerPage from './pages/BenchmarkerPage'
import SpeculativeDecodingPage from './pages/SpeculativeDecodingPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/models"
      element={
        <RequireAuth>
          <ModelRecommenderPage />
        </RequireAuth>
      }
    />
    <Route element={<RequireAuth><Layout /></RequireAuth>}>
      <Route path="/hardware" element={<HardwarePlannerPage />} />
      <Route path="/benchmark" element={<BenchmarkerPage />} />
      <Route path="/speculative" element={<SpeculativeDecodingPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default App
