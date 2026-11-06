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
        signal: request.signal,
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
        error: 'El servidor está iniciando o no está disponible. Volvé a intentar en un momento.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } },
    );
  }
}

// Only public metadata is cached. Cookies, sessions and API responses never enter this cache.
export async function publicSeoData(
  request,
  env,
  endpoint,
  upstreamFetch = fetch,
  cache = typeof caches === 'undefined' ? undefined : caches.default,
) {
  const incoming = new URL(request.url);
  const frontend = new URL(env.PUBLIC_FRONTEND_URL);
  const backend = new URL(env.BACKEND_ORIGIN);
  if (
    incoming.origin !== frontend.origin ||
    frontend.protocol !== 'https:' ||
    backend.protocol !== 'https:' ||
    backend.origin === frontend.origin ||
    backend.username ||
    backend.password ||
    backend.pathname !== '/'
  )
    throw new Error('Invalid SEO origin');
  const key = new Request(new URL('/__public-seo/' + encodeURIComponent(endpoint), frontend));
  try {
    const hit = await cache?.match(key);
    if (hit) return await hit.json();
  } catch {
    /* A cache error must not prevent an origin read. */
  }
  const headers = new Headers({ Accept: 'application/json' });
  for (const name of ['User-Agent', 'Accept-Language', 'CF-Connecting-IP']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  let body;
  try {
    const response = await proxyApi(
      new Request(new URL(endpoint, frontend), { headers, signal: controller.signal }),
      env,
      upstreamFetch,
    );
    if (!response.ok || !/application\/json/i.test(response.headers.get('Content-Type') ?? ''))
      throw new Error('SEO_HTTP_' + response.status);
    body = await response.text();
  } finally {
    clearTimeout(timeout);
  }
  if (body.length > 131072) throw new Error('SEO payload exceeds limit');
  const data = JSON.parse(body);
  if (cache) {
    try {
      await cache.put(
        key,
        new Response(body, {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
        }),
      );
    } catch {
      /* Cache availability must not affect navigation. */
    }
  }
  return data;
}
export const escapeSeo = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
export function seoHead(data, path) {
  const tag = (name, value, property = false) =>
    '<meta ' +
    (property ? 'property' : 'name') +
    '="' +
    name +
    '" content="' +
    escapeSeo(value) +
    '">';
  return (
    tag('description', data.description) +
    tag('robots', data.indexable ? 'index, follow' : 'noindex, nofollow') +
    '<link rel="canonical" href="' +
    escapeSeo(data.canonical) +
    '">' +
    tag('og:type', 'website', true) +
    tag('og:title', data.shareTitle, true) +
    tag('og:description', data.shareDescription, true) +
    tag('og:url', data.canonical, true) +
    tag('og:site_name', data.siteName, true) +
    tag('og:locale', data.locale, true) +
    (data.image ? tag('og:image', data.image, true) : '') +
    tag('twitter:card', data.image ? 'summary_large_image' : 'summary') +
    tag('twitter:title', data.shareTitle) +
    tag('twitter:description', data.shareDescription) +
    (data.image ? tag('twitter:image', data.image) : '') +
    tag('taurus-seo-path', path)
  );
}
export function rewriteSeo(response, data, path) {
  const rewriter = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(data.title, { html: false });
      },
    })
    .on('head', {
      element(element) {
        element.append(seoHead(data, path), { html: true });
      },
    });
  for (const selector of [
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[property^="og:"]',
    'meta[name^="twitter:"]',
    'link[rel="canonical"]',
    'meta[name="taurus-seo-path"]',
  ]) {
    rewriter.on(selector, {
      element(element) {
        element.remove();
      },
    });
  }
  return rewriter.transform(response);
}
export async function seoNavigation(
  request,
  env,
  upstreamFetch = fetch,
  rewrite = rewriteSeo,
  cache,
) {
  const incoming = new URL(request.url);
  const path = incoming.pathname === '/index.html' ? '/' : incoming.pathname;
  const assetHeaders = new Headers(request.headers);
  assetHeaders.delete('If-None-Match');
  assetHeaders.delete('If-Modified-Since');
  let seoStatus = 'unavailable';
  const [asset, metadata] = await Promise.all([
    env.ASSETS.fetch(new Request(request, { headers: assetHeaders })),
    publicSeoData(
      request,
      env,
      '/api/seo?path=' + encodeURIComponent(path),
      upstreamFetch,
      cache,
    ).catch((error) => {
      seoStatus = /^SEO_HTTP_\d{3}$/.test(error.message) ? error.message : 'unavailable';
      return null;
    }),
  ]);
  // SEO failure must never prevent the application from loading or trigger a browser challenge.
  if (!metadata || !asset.ok || !/text\/html/i.test(asset.headers.get('Content-Type') ?? '')) {
    const fallback = new Response(asset.body, asset);
    fallback.headers.set('X-SEO-Status', seoStatus);
    return fallback;
  }
  try {
    const canonical = new URL(metadata.canonical);
    if (
      canonical.origin !== incoming.origin ||
      canonical.pathname !== path ||
      typeof metadata.indexable !== 'boolean' ||
      ![
        'title',
        'description',
        'shareTitle',
        'shareDescription',
        'siteName',
        'locale',
        'image',
      ].every((key) => typeof metadata[key] === 'string' && metadata[key].length <= 2000)
    )
      return asset;
  } catch {
    return asset;
  }
  const response = new Response(asset.body, asset);
  response.headers.set('Cache-Control', 'no-cache');
  response.headers.set('X-SEO-Status', 'rendered');
  response.headers.delete('ETag');
  response.headers.delete('Content-Length');
  response.headers.set('X-Robots-Tag', metadata.indexable ? 'index, follow' : 'noindex, nofollow');
  try {
    return rewrite(response, metadata, path);
  } catch {
    return response;
  }
}
export async function seoDiscovery(request, env, upstreamFetch = fetch, cache) {
  const incoming = new URL(request.url);
  try {
    const origin = new URL(env.PUBLIC_FRONTEND_URL).origin;
    if (incoming.pathname === '/robots.txt') {
      const seo = await publicSeoData(request, env, '/api/seo?path=%2F', upstreamFetch, cache);
      const rules = seo.indexable
        ? 'Allow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /cuenta\nDisallow: /setup\nDisallow: /start\nDisallow: /business/'
        : 'Disallow: /';
      return new Response('User-agent: *\n' + rules + '\n\nSitemap: ' + origin + '/sitemap.xml\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }
    const sitemap = await publicSeoData(request, env, '/api/seo/sitemap', upstreamFetch, cache);
    if (!Array.isArray(sitemap.urls) || sitemap.urls.length > 1001)
      throw new Error('Invalid sitemap');
    const urls = sitemap.urls.filter((value) => {
      const url = new URL(value);
      return (
        url.origin === origin &&
        !url.search &&
        !url.hash &&
        (url.pathname === '/' || /^\/producto\/[a-f\d]{24}$/.test(url.pathname))
      );
    });
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        urls.map((url) => '<url><loc>' + escapeSeo(url) + '</loc></url>').join('') +
        '</urlset>',
      {
        headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-cache' },
      },
    );
  } catch (error) {
    return new Response('SEO temporalmente no disponible.', {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': '30',
        'X-SEO-Status': /^SEO_HTTP_\d{3}$/.test(error.message) ? error.message : 'unavailable',
      },
    });
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) return proxyApi(request, env);
    if (pathname === '/robots.txt' || pathname === '/sitemap.xml')
      return seoDiscovery(request, env);
    if (
      pathname === '/' ||
      pathname === '/index.html' ||
      /^\/producto\/[a-f\d]{24}$/.test(pathname)
    )
      return seoNavigation(request, env);
    const response = await env.ASSETS.fetch(request);
    if (/\.(?:js|css)$/.test(pathname)) {
      // A conditional cache hit is valid and intentionally has no body or MIME header.
      // Preserve it so the browser can reuse the module it already downloaded.
      if (response.status === 304) return response;
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
    if (/^\/(?:admin|cuenta|setup|start|business)(?:\/|$)/.test(pathname)) {
      const privatePage = new Response(response.body, response);
      privatePage.headers.set('X-Robots-Tag', 'noindex, nofollow');
      privatePage.headers.set('Cache-Control', 'no-store');
      return privatePage;
    }
    return response;
  },
};
