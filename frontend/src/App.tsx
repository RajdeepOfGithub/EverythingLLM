import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './utils/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ModelRecommenderPage from './pages/ModelRecommenderPage'
import HardwarePlannerPage from './pages/HardwarePlannerPage'
import BenchmarkerPage from './pages/BenchmarkerPage'
import SpeculativeDecodingPage from './pages/SpeculativeDecodingPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

const App: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <RequireAuth>
          <Layout />
        </RequireAuth>
      }
    >
      <Route index element={<Navigate to="/models" replace />} />
      <Route path="models" element={<ModelRecommenderPage />} />
      <Route path="hardware" element={<HardwarePlannerPage />} />
      <Route path="benchmark" element={<BenchmarkerPage />} />
      <Route path="speculative" element={<SpeculativeDecodingPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default App
