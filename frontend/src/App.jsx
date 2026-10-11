import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ProtectedRoute, { SessionLoader } from './components/ProtectedRoute'

// "/" -> /dashboard when authenticated, otherwise /register
function IndexRedirect() {
  const { token, loading } = useAuth()
  if (loading) return <SessionLoader />
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/register" replace />
}

// "/register" -> /dashboard when already authenticated
function RegisterRoute() {
  const { token, loading } = useAuth()
  if (loading) return <SessionLoader />
  return token ? <Navigate to="/dashboard" replace /> : <Register />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
