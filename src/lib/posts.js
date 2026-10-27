import { supabase } from './supabase'

// Columnas que necesita cada post para mostrarse completo
export const POST_SELECT =
  'id, body, media_url, media_type, created_at, author_id, ' +
  'author:profiles!author_id(username, display_name), ' +
  'likes(user_id), comments(id)'

const MAX_MEDIA_BYTES = 50 * 1024 * 1024 // 50 MB

// Sube una imagen o video al bucket público "media" dentro de la carpeta del usuario
export async function uploadMedia(file, userId) {
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  if (!isImage && !isVideo) throw new Error('Solo se pueden subir imágenes o videos.')
  if (file.size > MAX_MEDIA_BYTES) throw new Error('El archivo supera los 50 MB.')

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return { url: data.publicUrl, type: isImage ? 'image' : 'video' }
}

export function tiempoRelativo(fecha) {
  const seg = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000)
  if (seg < 60) return 'ahora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} d`
  return new Date(fecha).toLocaleDateString('es-AR')
}
