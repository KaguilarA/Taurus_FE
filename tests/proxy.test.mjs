import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { proxyApi } from '../public/_worker.js';

const env = { BACKEND_ORIGIN: 'https://api.example', PUBLIC_FRONTEND_URL: 'https://bar.example' };

test('los módulos ausentes devuelven 404 y nunca el HTML del fallback SPA', async () => {
  for (const path of ['/chunk-OLD.js', '/main-OLD.js', '/styles-OLD.css']) {
    const response = await worker.fetch(new Request(`https://bar.example${path}`), {
      ASSETS: {
        fetch: () =>
          new Response('<html>Angular</html>', { headers: { 'Content-Type': 'text/html' } }),
      },
    });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(response.headers.get('content-type'), /html/);
  }
  const response = await worker.fetch(new Request('https://bar.example/chunk-CURRENT.js'), {
    ASSETS: {
      fetch: () =>
        new Response('export{}', { headers: { 'Content-Type': 'application/javascript' } }),
    },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'export{}');
});

test('el proxy conserva cookies, ruta, query y cuerpo; evita cachear respuestas privadas', async () => {
  const request = new Request('https://bar.example/api/auth/login?source=menu', {
    method: 'POST',
    body: JSON.stringify({ username: 'owner' }),
    headers: {
      Origin: env.PUBLIC_FRONTEND_URL,
      Cookie: 'sid=private',
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.8',
      'X-Forwarded-For': 'forged',
      'X-Forwarded-Host': 'forged.example',
    },
  });
  const response = await proxyApi(request, env, async (upstream) => {
    assert.equal(upstream.url, 'https://api.example/api/auth/login?source=menu');
    assert.equal(upstream.headers.get('cookie'), 'sid=private');
    assert.equal(upstream.headers.get('origin'), env.PUBLIC_FRONTEND_URL);
    assert.equal(upstream.headers.get('x-forwarded-for'), '203.0.113.8');
    assert.equal(upstream.headers.has('x-forwarded-host'), false);
    assert.deepEqual(await upstream.json(), { username: 'owner' });
    return Response.json(
      { authenticated: true },
      {
        headers: {
          'Set-Cookie': 'sid=new; Secure; HttpOnly; SameSite=Lax',
          'Cache-Control': 'public',
        },
      },
    );
  });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.deepEqual(await response.json(), { authenticated: true });
});

test('orígenes ajenos y previews no autorizados no llegan a la API', async () => {
  const never = () => {
    throw new Error('No debe contactar al backend');
  };
  const foreign = await proxyApi(
    new Request('https://bar.example/api/auth/login', {
      headers: { Origin: 'https://attacker.example' },
    }),
    env,
    never,
  );
  assert.equal(foreign.status, 403);
  const preview = await proxyApi(new Request('https://preview.example/api/public'), env, never);
  assert.equal(preview.status, 503);
  for (const BACKEND_ORIGIN of [
    'http://api.example',
    'https://api.example/path',
    'https://bar.example',
    'https://user:pass@api.example',
  ]) {
    const result = await proxyApi(
      new Request('https://bar.example/api/public'),
      { ...env, BACKEND_ORIGIN },
      never,
    );
    assert.equal(result.status, 503);
  }
});

test('el handshake WebSocket conserva el túnel y la cookie de sesión', async () => {
  const handshake = { status: 101, webSocket: {} };
  const response = await proxyApi(
    new Request('https://bar.example/api/socket.io/?EIO=4&transport=websocket', {
      headers: { Origin: env.PUBLIC_FRONTEND_URL, Upgrade: 'websocket', Cookie: 'sid=staff' },
    }),
    env,
    async (upstream) => {
      assert.equal(upstream.headers.get('upgrade'), 'websocket');
      assert.equal(upstream.headers.get('cookie'), 'sid=staff');
      return handshake;
    },
  );
  assert.equal(response, handshake);
});

test('el fallo del backend es recuperable y las rutas Angular se sirven desde Pages', async () => {
  const unavailable = await proxyApi(
    new Request('https://bar.example/api/public'),
    env,
    async () => {
      throw new Error('private connection detail');
    },
  );
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('retry-after'), '15');
  assert.doesNotMatch(await unavailable.text(), /private connection/);
  const response = await worker.fetch(new Request('https://bar.example/admin'), {
    ASSETS: { fetch: () => new Response('Angular') },
  });
  assert.equal(await response.text(), 'Angular');
});

test('el HTML de arranque y los bloqueos del proveedor nunca se aceptan como datos de API', async () => {
  for (const upstream of [
    new Response('<html>Starting</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('<html>Challenge</html>', {
      status: 429,
      headers: { 'Content-Type': 'text/html', 'cf-mitigated': 'challenge' },
    }),
    new Response('Too Many Requests', { status: 429, headers: { 'Content-Type': 'text/plain' } }),
  ]) {
    const response = await proxyApi(
      new Request('https://bar.example/api/setup/status'),
      env,
      async () => upstream,
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '15');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const payload = await response.json();
    assert.equal(typeof payload.error, 'string');
    assert.doesNotMatch(payload.error, /<html>|Challenge/);
  }
  const limited = await proxyApi(
    new Request('https://bar.example/api/auth/status'),
    env,
    async () =>
      Response.json({ error: 'Rate limit' }, { status: 429, headers: { 'Retry-After': '60' } }),
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
});

test('la revalidación de módulos en caché conserva el 304 aunque no incluya Content-Type', async () => {
  for (const path of [
    '/chunk-CURRENT.js',
    '/main-CURRENT.js',
    '/styles-CURRENT.css',
    '/startup.js',
  ]) {
    const response = await worker.fetch(
      new Request('https://bar.example' + path, { headers: { 'If-None-Match': '"current"' } }),
      {
        ASSETS: {
          fetch: (request) => {
            assert.equal(request.headers.get('if-none-match'), '"current"');
            return new Response(null, {
              status: 304,
              headers: {
                ETag: '"current"',
                'Cache-Control': 'public, max-age=0, must-revalidate',
                Vary: 'Accept-Encoding',
              },
            });
          },
        },
      },
    );
    assert.equal(response.status, 304);
    assert.equal(response.headers.get('etag'), '"current"');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.equal(response.headers.get('vary'), 'Accept-Encoding');
    assert.equal(response.headers.has('content-type'), false);
    assert.equal(await response.text(), '');
  }
});
