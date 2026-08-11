export function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Defense-in-depth guard for externally supplied sprite URLs.
 * Only well-formed HTTPS URLs are allowed; anything else (non-strings,
 * unparsable URLs, http:, data:, javascript:, ...) is rejected so it can
 * never reach an <img src>. All PokeAPI sprites are served over https.
 */
export function safeSpriteUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
  } catch {
    return null
  }
  return url
}
