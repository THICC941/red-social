import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Friends() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(
        'id, status, requester_id, addressee_id, ' +
        'requester:profiles!requester_id(id, username, display_name), ' +
        'addressee:profiles!addressee_id(id, username, display_name)'
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setItems(data ?? [])
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function accionar(id, fn) {
    setBusyId(id)
    setError('')
    const { error } = await fn()
    setBusyId(null)
    if (error) setError(error.message)
    else cargar()
  }

  async function mensajear(otherId) {
    const { data, error } = await supabase.rpc('start_conversation', { other_user: otherId })
    if (error) return setError(error.message)
    navigate(`/mensajes/${data}`)
  }

  const recibidas = items.filter((f) => f.status === 'pending' && f.addressee_id === user.id)
  const enviadas = items.filter((f) => f.status === 'pending' && f.requester_id === user.id)
  const amigos = items.filter((f) => f.status === 'accepted')

  // Devuelve el perfil de la otra persona en la relación
  const otra = (f) => (f.requester_id === user.id ? f.addressee : f.requester)

  if (loading) return <main><p className="muted">Cargando...</p></main>

  return (
    <main className="feed">
      <h1>Amigos</h1>
      {error && <p className="error">{error}</p>}

      <section>
        <h2 className="section-title">Solicitudes recibidas ({recibidas.length})</h2>
        {recibidas.length === 0 && <p className="muted">No tenés solicitudes pendientes.</p>}
        {recibidas.map((f) => (
          <div key={f.id} className="user-row">
            <Link to={`/u/${otra(f)?.username}`}>
              <strong>{otra(f)?.display_name}</strong> <span className="muted">@{otra(f)?.username}</span>
            </Link>
            <div className="row-actions">
              <button disabled={busyId === f.id} onClick={() => accionar(f.id, () =>
                supabase.from('friendships').update({ status: 'accepted' }).eq('id', f.id)
              )}>Aceptar</button>
              <button className="secondary" disabled={busyId === f.id} onClick={() => accionar(f.id, () =>
                supabase.from('friendships').delete().eq('id', f.id)
              )}>Rechazar</button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="section-title">Solicitudes enviadas ({enviadas.length})</h2>
        {enviadas.length === 0 && <p className="muted">No enviaste solicitudes pendientes.</p>}
        {enviadas.map((f) => (
          <div key={f.id} className="user-row">
            <Link to={`/u/${otra(f)?.username}`}>
              <strong>{otra(f)?.display_name}</strong> <span className="muted">@{otra(f)?.username}</span>
            </Link>
            <button className="secondary" disabled={busyId === f.id} onClick={() => accionar(f.id, () =>
              supabase.from('friendships').delete().eq('id', f.id)
            )}>Cancelar</button>
          </div>
        ))}
      </section>

      <section>
        <h2 className="section-title">Tus amigos ({amigos.length})</h2>
        {amigos.length === 0 && <p className="muted">Todavía no tenés amigos. Buscá personas para agregarlas.</p>}
        {amigos.map((f) => (
          <div key={f.id} className="user-row">
            <Link to={`/u/${otra(f)?.username}`}>
              <strong>{otra(f)?.display_name}</strong> <span className="muted">@{otra(f)?.username}</span>
            </Link>
            <div className="row-actions">
              <button onClick={() => mensajear(otra(f).id)}>Mensaje</button>
              <button className="secondary" disabled={busyId === f.id} onClick={() => accionar(f.id, () =>
                supabase.from('friendships').delete().eq('id', f.id)
              )}>Eliminar</button>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
