export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    return new Response('Server configuration error: Missing API Key', { status: 500 });
  }

  url.searchParams.set('apikey', apiKey);

  const targetUrl = `https://www.omdbapi.com/?${url.searchParams.toString()}`;
  
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
