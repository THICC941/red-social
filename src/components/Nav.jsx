import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Nav() {
  const { profile, user, signOut } = useAuth()

  return (
    <nav className="topnav">
      <div className="topnav-inner">
        <Link to="/" className="brand">Red Social</Link>
        <div className="links">
          <NavLink to="/" end>Para ti</NavLink>
          <NavLink to="/buscar">Buscar</NavLink>
          <NavLink to="/amigos">Amigos</NavLink>
          <NavLink to="/mensajes">Mensajes</NavLink>
          {profile && <NavLink to={`/u/${profile.username}`}>@{profile.username}</NavLink>}
        </div>
        <button className="secondary small" onClick={() => signOut()}>Salir</button>
      </div>
      {!profile && user && <span className="muted small">Cargando perfil...</span>}
    </nav>
  )
}
