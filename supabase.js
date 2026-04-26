const cfg = window.EVZA || {};
export const isConfigured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
const createClient = window.supabase?.createClient;
export const supabase = isConfigured
  ? createClient?.(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 3 } }
    })
  : null;

export function driveUrl(fileId) {
  return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w2000` : '';
}

export function extractDriveId(url = '') {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/
  ];
  const hit = patterns.map((rx) => String(url).match(rx)?.[1]).find(Boolean);
  return hit || (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim()) ? url.trim() : '');
}

export function storageUrl(path = '') {
  if (!supabase || !path) return '';
  return supabase.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl || '';
}

export function resolveUrl(item = {}) {
  if (item.storage_path) return storageUrl(item.storage_path) || item.src_url || '';
  if (item.drive_file_id) return driveUrl(item.drive_file_id);
  return item.src_url || '';
}

export function resolvePoster(item = {}) {
  if (item.poster_path) return storageUrl(item.poster_path);
  if (item.poster_url) {
    const id = extractDriveId(item.poster_url);
    return id ? driveUrl(id) : item.poster_url;
  }
  return item.type === 'video' ? 'assets/placeholder.svg' : resolveUrl(item);
}
