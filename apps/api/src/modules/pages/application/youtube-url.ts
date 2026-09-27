export class YouTubeLinkInvalidError extends Error {}

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function normalizeYouTubeVideoId(value: string): string {
  const trimmed = value.trim();
  const hasScheme = /^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new YouTubeLinkInvalidError();
  }

  if (
    url.protocol !== 'https:' ||
    !ALLOWED_HOSTS.has(url.hostname.toLowerCase()) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.port.length > 0
  ) {
    throw new YouTubeLinkInvalidError();
  }

  const hostname = url.hostname.toLowerCase();
  let videoId: string | null = null;
  if (hostname === 'youtu.be') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 1) videoId = parts[0] ?? null;
  } else if (url.pathname === '/watch') {
    videoId = url.searchParams.get('v');
  } else if (url.pathname.startsWith('/shorts/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 2) videoId = parts[1] ?? null;
  }

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    throw new YouTubeLinkInvalidError();
  }
  return videoId;
}
