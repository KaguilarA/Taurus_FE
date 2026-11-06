// Cloudflare Pages gateway. Business logic, sessions and sockets live in the API.
export async function proxyApi(request, env, upstreamFetch = fetch) {
  const incoming = new URL(request.url);
  let backend, frontend;
  try {
    backend = new URL(env.BACKEND_ORIGIN);
    frontend = new URL(env.PUBLIC_FRONTEND_URL);
    for (const url of [backend, frontend]) {
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      )
        throw new Error('Invalid origin');
    }
    if (backend.origin === frontend.origin || incoming.origin !== frontend.origin)
      throw new Error('Invalid deployment origin');
  } catch {
    return Response.json(
      { error: 'La conexión con el servidor todavía no está configurada.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const origin = request.headers.get('Origin');
  if (origin && origin !== frontend.origin)
    return Response.json(
      { error: 'Origen no permitido.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  const target = new URL(incoming.pathname + incoming.search, backend);
  const headers = new Headers(request.headers);
  headers.delete('Host');
  // Do not pass client-supplied forwarding headers to the API.
  headers.delete('Forwarded');
  headers.delete('X-Forwarded-Host');
  headers.delete('X-Forwarded-For');
  const clientIp = request.headers.get('CF-Connecting-IP');
  if (clientIp) headers.set('X-Forwarded-For', clientIp);
  headers.set('X-Forwarded-Proto', 'https');
  try {
    const upstream = await upstreamFetch(
      new Request(target, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual',
        duplex: 'half',
      }),
    );
    // Returning the original 101 response preserves Cloudflare's WebSocket tunnel.
    if (upstream.status === 101) return upstream;
    // Provider startup/challenge HTML is not an API payload and cannot be solved
    // under the frontend origin. Return a bounded, recoverable API error instead.
    const contentType = upstream.headers.get('Content-Type') ?? '';
    if (
      upstream.headers.get('cf-mitigated') === 'challenge' ||
      /text\/html/i.test(contentType) ||
      (upstream.status === 429 && !/application\/json/i.test(contentType))
    ) {
      await upstream.body?.cancel();
      return Response.json(
        {
          error:
            'El proveedor del servidor está temporalmente ocupado. Volvé a intentar en un momento.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } },
      );
    }
    const response = new Response(upstream.body, upstream);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return Response.json(
      {
        error:
          'El servidor está iniciando o no está disponible. Volvé a intentar en un momento.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } },
    );
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) return proxyApi(request, env);
    const response = await env.ASSETS.fetch(request);
    if (/\.(?:js|css)$/.test(pathname)) {
      const expected = pathname.endsWith('.js') ? /(?:javascript|ecmascript)/i : /text\/css/i;
      if (!response.ok || !expected.test(response.headers.get('Content-Type') ?? ''))
        return new Response(
          'Archivo no encontrado. Actualizá la página para cargar la versión vigente.',
          {
            status: 404,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
            },
          },
        );
    }
    return response;
  },
};
