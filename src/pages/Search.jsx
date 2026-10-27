import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import FriendActions from '../components/FriendActions'

export default function Search() {
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  async function buscar(e) {
    e.preventDefault()
    // Quitamos caracteres que rompen el filtro de PostgREST
    const term = q.trim().replace(/[%,()]/g, '')
    if (!term) return
    setBusy(true)
    setError('')
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio')
      .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
      .neq('id', user.id)
      .order('username')
      .limit(20)
    setBusy(false)
    setSearched(true)
    if (error) return setError(error.message)
    setResults(data ?? [])
  }

  return (
    <main className="feed">
      <h1>Buscar personas</h1>
      <form className="search" onSubmit={buscar}>
        <input
          placeholder="Nombre de usuario o nombre a mostrar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={50}
        />
        <button type="submit" disabled={busy}>{busy ? 'Buscando...' : 'Buscar'}</button>
      </form>

      {error && <p className="error">{error}</p>}
      {searched && results.length === 0 && <p className="muted">No encontramos a nadie con ese nombre.</p>}

      {results.map((p) => (
        <div key={p.id} className="user-row">
          <div>
            <Link to={`/u/${p.username}`}><strong>{p.display_name}</strong></Link>
            <div className="muted">@{p.username}</div>
            {p.bio && <div className="small">{p.bio}</div>}
          </div>
          <FriendActions otherId={p.id} />
        </div>
      ))}
    </main>
  )
}
