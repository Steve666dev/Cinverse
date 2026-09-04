export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  
  if (!path) {
    return new Response('Missing path', { status: 400 });
  }

  // Pass through all other query params
  url.searchParams.delete('path');
  const append = url.searchParams.get('append');
  if (append) {
    url.searchParams.set('append_to_response', append);
    url.searchParams.delete('append');
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return new Response('Server configuration error: Missing API Key', { status: 500 });
  }

  url.searchParams.set('api_key', apiKey);

  const targetUrl = `https://api.themoviedb.org/3${path}?${url.searchParams.toString()}`;
  
  const response = await fetch(targetUrl);
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
