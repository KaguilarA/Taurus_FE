import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { seoHead, seoNavigation, seoDiscovery, publicSeoData } from '../public/_worker.js';
const env = { BACKEND_ORIGIN: 'https://api.example', PUBLIC_FRONTEND_URL: 'https://bar.example' };
const metadata = {
  title: 'Custom restaurant',
  description: 'Search description',
  shareTitle: 'Social title',
  shareDescription: 'Social description',
  image: 'https://images.example/share.png',
  canonical: 'https://bar.example/',
  siteName: 'Restaurant',
  locale: 'es_CR',
  indexable: true,
};
const html = () =>
  new Response('<html><head><title>Loading</title></head></html>', {
    headers: { 'Content-Type': 'text/html', ETag: '"static"', 'Content-Length': '61' },
  });

test('public HTML receives configured metadata without forwarding browser credentials', async () => {
  const request = new Request('https://bar.example/?mesa=private-table', {
    headers: { Cookie: 'sid=secret', Authorization: 'Bearer private', 'If-None-Match': '"old"' },
  });
  const response = await seoNavigation(
    request,
    {
      ...env,
      ASSETS: {
        fetch: async (assetRequest) => {
          assert.equal(assetRequest.headers.has('If-None-Match'), false);
          return html();
        },
      },
    },
    async (upstream) => {
      assert.equal(upstream.url, 'https://api.example/api/seo?path=%2F');
      assert.equal(upstream.headers.has('Cookie'), false);
      assert.equal(upstream.headers.has('Authorization'), false);
      return Response.json(metadata);
    },
    (asset, data, path) => {
      assert.equal(data.title, metadata.title);
      assert.equal(path, '/');
      assert.equal(asset.headers.has('ETag'), false);
      return new Response(seoHead(data, path), asset);
    },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-robots-tag'), 'index, follow');
  const body = await response.text();
  assert.match(body, /Social title/);
  assert.match(body, /rel="canonical" href="https:\/\/bar.example\/"/);
  assert.doesNotMatch(body, /private|sid=|mesa=/);
});

test('SEO HTML escapes admin text and image attributes', () => {
  const result = seoHead(
    {
      ...metadata,
      description: '"><script>alert(1)</script>',
      image: 'https://img.example/" onerror="alert(1)',
    },
    '/',
  );
  assert.doesNotMatch(result, /<script>|src=|<img/);
  assert.match(result, /&lt;script&gt;/);
  assert.match(result, /&quot; onerror=&quot;/);
});

test('invalid metadata and failed providers never prevent the app HTML from being served', async () => {
  for (const data of [
    null,
    {},
    { ...metadata, canonical: 'https://attacker.example/' },
    { ...metadata, indexable: 'false' },
  ]) {
    const response = await seoNavigation(
      new Request('https://bar.example/'),
      { ...env, ASSETS: { fetch: async () => html() } },
      async () => Response.json(data),
      () => {
        throw Error('Must not rewrite invalid metadata');
      },
    );
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Loading/);
  }
  const response = await seoNavigation(
    new Request('https://bar.example/'),
    { ...env, ASSETS: { fetch: async () => html() } },
    async () => {
      throw Error('Provider unavailable');
    },
  );
  assert.equal(response.status, 200);
});

test('metadata cache shares only public configuration, never cookie-based responses', async () => {
  const stored = new Map();
  let calls = 0;
  const cache = {
    match: async (key) => stored.get(key.url)?.clone(),
    put: async (key, response) => stored.set(key.url, response),
  };
  const upstream = async (request) => {
    calls++;
    assert.equal(request.headers.has('Cookie'), false);
    return Response.json(metadata);
  };
  await publicSeoData(
    new Request('https://bar.example/', { headers: { Cookie: 'user=one' } }),
    env,
    '/api/seo?path=%2F',
    upstream,
    cache,
  );
  await publicSeoData(
    new Request('https://bar.example/', { headers: { Cookie: 'user=two' } }),
    env,
    '/api/seo?path=%2F',
    upstream,
    cache,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    publicSeoData(
      new Request('https://preview.example/'),
      env,
      '/api/seo?path=%2F',
      upstream,
      cache,
    ),
  );
});

test('robots and sitemap use the configured origin and exclude private or foreign routes', async () => {
  const robots = await seoDiscovery(new Request('https://bar.example/robots.txt'), env, async () =>
    Response.json(metadata),
  );
  assert.match(await robots.text(), /Sitemap: https:\/\/bar.example\/sitemap.xml/);
  const blocked = await seoDiscovery(new Request('https://bar.example/robots.txt'), env, async () =>
    Response.json({ ...metadata, indexable: false }),
  );
  assert.match(await blocked.text(), /Disallow: \//);
  const map = await seoDiscovery(new Request('https://bar.example/sitemap.xml'), env, async () =>
    Response.json({
      urls: [
        'https://bar.example/',
        'https://bar.example/admin',
        'https://attacker.example/',
        'https://bar.example/?token=secret',
      ],
    }),
  );
  const xml = await map.text();
  assert.match(xml, /<loc>https:\/\/bar.example\/<\/loc>/);
  assert.doesNotMatch(xml, /admin|attacker|secret/);
});

test('private pages cannot be indexed and do not query public metadata', async () => {
  const response = await worker.fetch(new Request('https://bar.example/admin/seo'), {
    ASSETS: { fetch: async () => html() },
  });
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
