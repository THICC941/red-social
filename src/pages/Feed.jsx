import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { POST_SELECT } from '../lib/posts'
import { useAuth } from '../context/AuthContext'
import Composer from '../components/Composer'
import PostCard from '../components/PostCard'

export default function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargarPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) setError(error.message)
    else setPosts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargarPosts()
  }, [cargarPosts])

  return (
    <main className="feed">
      <h1>Para ti</h1>

      <Composer userId={user.id} onPosted={cargarPosts} />

      {loading && <p className="muted">Cargando...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && posts.length === 0 && <p className="muted">Todavía no hay publicaciones. ¡Sé el primero!</p>}

      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          userId={user.id}
          onDeleted={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))}
        />
      ))}
    </main>
  )
}
