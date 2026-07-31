import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;

export function extractYoutubeId(url) {
  const m = url.match(YOUTUBE_RE);
  return m ? m[1] : null;
}

/**
 * Fetch basic Open Graph / meta metadata for a given URL.
 * Returns { title, excerpt, thumbnail, type }
 */
export async function fetchUrlMetadata(url) {
  const youtubeId = extractYoutubeId(url);

  if (youtubeId) {
    // Use YouTube's public oEmbed endpoint - no API key required.
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(oembedUrl, { timeout: 8000 });
      if (res.ok) {
        const data = await res.json();
        return {
          type: 'youtube',
          title: data.title || 'YouTube video',
          excerpt: data.author_name ? `By ${data.author_name}` : '',
          thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        };
      }
    } catch (err) {
      // fall through to generic thumbnail
    }
    return {
      type: 'youtube',
      title: 'YouTube video',
      excerpt: '',
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  // Generic article: fetch and parse OpenGraph / meta tags.
  const res = await fetch(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeVaultBot/1.0)' },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').first().text() ||
    url;

  const excerpt =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';

  let thumbnail =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    '';

  // Resolve relative thumbnail URLs against the page origin.
  if (thumbnail && !/^https?:\/\//i.test(thumbnail)) {
    try {
      thumbnail = new URL(thumbnail, url).href;
    } catch {
      thumbnail = '';
    }
  }

  // Rough plain-text extraction of the main content for full-text search / reading.
  $('script, style, nav, footer, header, noscript').remove();
  const bodyText = $('article').text() || $('main').text() || $('body').text() || '';
  const content = bodyText.replace(/\s+/g, ' ').trim().slice(0, 20000);

  return {
    type: 'article',
    title: title.trim().slice(0, 500),
    excerpt: excerpt.trim().slice(0, 500),
    thumbnail,
    content,
  };
}
