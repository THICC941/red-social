import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Muestra y maneja la relación de amistad entre el usuario actual y otro usuario.
// Estados: none | outgoing (yo pedí) | incoming (me pidieron) | friends
export default function FriendActions({ otherId }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [friendship, setFriendship] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    const { data, error } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${otherId}),` +
        `and(requester_id.eq.${otherId},addressee_id.eq.${user.id})`
      )
      .maybeSingle()
    if (error) setError(error.message)
    setFriendship(data)
    setLoaded(true)
  }

  useEffect(() => {
    setLoaded(false)
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId, user.id])

  async function ejecutar(fn) {
    setBusy(true)
    setError('')
    const { error } = await fn()
    setBusy(false)
    if (error) setError(error.message)
    else await cargar()
  }

  if (!loaded) return null

  const estado = !friendship
    ? 'none'
    : friendship.status === 'accepted'
      ? 'friends'
      : friendship.requester_id === user.id
        ? 'outgoing'
        : 'incoming'

  async function mensajear() {
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('start_conversation', { other_user: otherId })
    setBusy(false)
    if (error) return setError(error.message)
    navigate(`/mensajes/${data}`)
  }

  return (
    <div className="friend-actions">
      {estado === 'none' && (
        <button disabled={busy} onClick={() => ejecutar(() =>
          supabase.from('friendships').insert({
            requester_id: user.id,
            addressee_id: otherId,
            status: 'pending',
          })
        )}>
          Agregar amigo
        </button>
      )}

      {estado === 'outgoing' && (
        <button className="secondary" disabled={busy} onClick={() => ejecutar(() =>
          supabase.from('friendships').delete().eq('id', friendship.id)
        )}>
          Cancelar solicitud
        </button>
      )}

      {estado === 'incoming' && (
        <>
          <button disabled={busy} onClick={() => ejecutar(() =>
            supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendship.id)
          )}>
            Aceptar
          </button>
          <button className="secondary" disabled={busy} onClick={() => ejecutar(() =>
            supabase.from('friendships').delete().eq('id', friendship.id)
          )}>
            Rechazar
          </button>
        </>
      )}

      {estado === 'friends' && (
        <>
          <button disabled={busy} onClick={mensajear}>Mensaje</button>
          <button className="secondary" disabled={busy} onClick={() => ejecutar(() =>
            supabase.from('friendships').delete().eq('id', friendship.id)
          )}>
            Eliminar amigo
          </button>
        </>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}
