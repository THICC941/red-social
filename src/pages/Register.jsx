import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export default function Register() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const user = username.trim().toLowerCase()
    if (!USERNAME_RE.test(user)) {
      setError('El usuario debe tener de 3 a 20 caracteres: letras minúsculas, números o guion bajo.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setBusy(true)
    const { data, error } = await signUp(email.trim(), password, user, displayName.trim() || user)
    setBusy(false)

    if (error) {
      setError(error.message.includes('duplicate') || error.message.includes('already')
        ? 'Ese usuario o email ya existe.'
        : error.message)
      return
    }
    // Con confirmación de email activa, la sesión llega recién después de confirmar.
    setDone(!data.session)
    if (data.session) window.location.assign('/')
  }

  if (done) {
    return (
      <main className="auth">
        <h1>Revisá tu email</h1>
        <p>Te mandamos un link para confirmar tu cuenta. Después podés <Link to="/login">iniciar sesión</Link>.</p>
      </main>
    )
  }

  return (
    <main className="auth">
      <h1>Crear cuenta</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Usuario (ej: juan_99)" value={username}
          onChange={(e) => setUsername(e.target.value)} required />
        <input placeholder="Nombre a mostrar" value={displayName}
          onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Creando...' : 'Registrarme'}</button>
      </form>
      <p>¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
    </main>
  )
}
