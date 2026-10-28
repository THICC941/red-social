import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import Search from './pages/Search'
import Friends from './pages/Friends'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import Nav from './components/Nav'
import Notifier from './components/Notifier'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="center">Cargando...</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Pantallas que requieren sesión: comparten la barra de navegación y los avisos
function Layout() {
  return (
    <RequireAuth>
      <Nav />
      <Notifier />
      <Outlet />
    </RequireAuth>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Feed />} />
            <Route path="/buscar" element={<Search />} />
            <Route path="/amigos" element={<Friends />} />
            <Route path="/mensajes" element={<Messages />} />
            <Route path="/mensajes/:id" element={<Chat />} />
            <Route path="/u/:username" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
