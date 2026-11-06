import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../public/startup.js', import.meta.url), 'utf8');
function setup() {
  const dom = new JSDOM(html, {
    url: 'https://bar.example/?token=private',
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const { window } = dom;
  let deadline;
  window.setTimeout = (callback) => {
    deadline = callback;
    return 1;
  };
  window.clearTimeout = () => {};
  window.fetch = () => {
    throw Error('Diagnostics must not contact any server');
  };
  window.eval(script);
  return {
    dom,
    window,
    document: window.document,
    expire: () => deadline(),
    event: (detail) =>
      window.dispatchEvent(new window.CustomEvent('taurus:connection', { detail })),
  };
}

test('a module that never bootstraps gets a visible retry and readable mobile diagnostics', () => {
  const view = setup();
  try {
    assert.equal(view.document.getElementById('connection-diagnostic').hidden, true);
    view.expire();
    assert.equal(view.document.getElementById('connection-diagnostic').hidden, false);
    view.document.getElementById('connection-toggle').click();
    const details = view.document.getElementById('connection-details');
    assert.equal(details.hidden, false);
    assert.match(details.value, /STARTUP_WAIT/);
    assert.doesNotMatch(details.value, /private|token=/);
    assert.equal(
      view.document.getElementById('connection-toggle').getAttribute('aria-expanded'),
      'true',
    );
  } finally {
    view.dom.window.close();
  }
});

test('the panel survives Angular rendering and clears after the failed endpoint recovers', () => {
  const view = setup();
  try {
    view.document.querySelector('app-root').innerHTML = '<main>Application</main>';
    view.event({ code: 'API_HTTP', status: 503, route: '/api/setup/status', ray: 'abcd-SJO' });
    view.event({ code: 'READY' });
    assert.equal(view.document.getElementById('connection-diagnostic').hidden, false);
    assert.match(view.document.getElementById('connection-details').value, /HTTP: 503/);
    view.event({ code: 'API_OK', route: '/api/setup/status' });
    assert.equal(view.document.getElementById('connection-diagnostic').hidden, true);
  } finally {
    view.dom.window.close();
  }
});

test('diagnostics never expose injected paths, exception messages, or query parameters', () => {
  const view = setup();
  try {
    view.event({
      code: 'API_HTTP',
      route: '/api/account/private?password=secret',
      ray: '<script>secret</script>',
      status: 503,
    });
    const value = view.document.getElementById('connection-details').value;
    assert.match(value, /Ruta: \/api/);
    assert.doesNotMatch(value, /secret|private|password|<script>/);
    view.window.dispatchEvent(new view.window.ErrorEvent('error', { message: 'password=secret' }));
    assert.doesNotMatch(view.document.getElementById('connection-details').value, /secret/);
  } finally {
    view.dom.window.close();
  }
});

test('an initial module download failure triggers at most one reload per two minutes', () => {
  const view = setup();
  try {
    view.event({ code: 'MODULE_DOWNLOAD' });
    const first = view.window.sessionStorage.getItem('taurus-module-reload');
    assert.ok(Number(first) > 0);
    view.window.sessionStorage.setItem('taurus-module-reload', String(Date.now() - 1000));
    const previous = view.window.sessionStorage.getItem('taurus-module-reload');
    view.event({ code: 'MODULE_DOWNLOAD' });
    assert.equal(view.window.sessionStorage.getItem('taurus-module-reload'), previous);
    assert.equal(view.document.getElementById('connection-diagnostic').hidden, false);
  } finally {
    view.dom.window.close();
  }
});

test('a module failure after opening a page never reloads an active order or form', () => {
  const view = setup();
  try {
    view.event({ code: 'READY' });
    view.event({ code: 'MODULE_DOWNLOAD' });
    assert.equal(view.window.sessionStorage.getItem('taurus-module-reload'), null);
    assert.equal(view.document.getElementById('connection-diagnostic').hidden, false);
  } finally {
    view.dom.window.close();
  }
});
