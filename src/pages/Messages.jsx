import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Lista de chats: una fila por conversación, con el nombre de la otra persona
export default function Messages() {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      const { data: mias, error } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id)
      if (error) {
        if (!cancelado) setError(error.message)
        return
      }
      const ids = (mias ?? []).map((m) => m.conversation_id)
      if (ids.length === 0) {
        if (!cancelado) {
          setChats([])
          setLoading(false)
        }
        return
      }

      const { data: otros, error: err2 } = await supabase
        .from('conversation_members')
        .select('conversation_id, other:profiles!user_id(id, username, display_name)')
        .in('conversation_id', ids)
        .neq('user_id', user.id)
      if (cancelado) return
      if (err2) setError(err2.message)
      setChats(otros ?? [])
      setLoading(false)
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [user.id])

  return (
    <main className="feed">
      <h1>Mensajes</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Cargando...</p>}
      {!loading && chats.length === 0 && (
        <p className="muted">No tenés chats todavía. Abrí un chat desde la lista de <Link to="/amigos">amigos</Link>.</p>
      )}
      {chats.map((c) => (
        <Link key={c.conversation_id} to={`/mensajes/${c.conversation_id}`} className="user-row chat-row">
          <div>
            <strong>{c.other?.display_name}</strong>
            <div className="muted">@{c.other?.username}</div>
          </div>
          <span className="muted">Abrir →</span>
        </Link>
      ))}
    </main>
  )
}
