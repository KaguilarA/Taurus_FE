import assert from 'node:assert/strict';

// Walk the emitted Angular graph, including lazy imports, before accepting a deployment.
export async function verifyModules(base, request = fetch) {
  const root = new URL(base);
  const html = await request(root, { signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
  assert.ok(html.ok && /text\/html/i.test(html.headers.get('content-type') ?? ''), 'Invalid application HTML.');
  const entry = [...(await html.text()).matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/g)].map((match) => new URL(match[1], root));
  assert.ok(entry.length, 'No JavaScript entry points.');
  const seen = new Set();
  let pending = entry;
  while (pending.length) {
    assert.ok(seen.size + pending.length <= 500, 'Module graph exceeds the deployment bound.');
    const next = await Promise.all(pending.map(async (url) => {
      assert.equal(url.origin, root.origin, 'Unexpected external module.');
      if (seen.has(url.href)) return [];
      seen.add(url.href);
      const response = await request(url, { signal: AbortSignal.timeout(15000) });
      assert.ok(response.ok && /(?:javascript|ecmascript)/i.test(response.headers.get('content-type') ?? ''), `Missing JavaScript module: ${url.pathname}`);
      return [...(await response.text()).matchAll(/["'`](\.\/(?:chunk|main)-[A-Za-z0-9_-]+\.js)["'`]/g)].map((match) => new URL(match[1], url));
    }));
    pending = [...new Map(next.flat().filter((url) => !seen.has(url.href)).map((url) => [url.href, url])).values()];
  }
  return seen.size;
}
