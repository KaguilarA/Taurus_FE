import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, realpath, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, basename, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyModules } from './verify-modules.mjs';

test('deployment verification traverses lazy imports and rejects HTML modules', async () => {
  const pages = new Map([
    ['/', ['text/html', '<script src="main-ABC.js" type="module"></script>']],
    ['/main-ABC.js', ['application/javascript', 'import(`./chunk-LAZY.js`)']],
    ['/chunk-LAZY.js', ['application/javascript', 'export{}']],
  ]);
  const request = async (url) => {
    const [type, body] = pages.get(new URL(url).pathname);
    return new Response(body, { headers: { 'Content-Type': type } });
  };
  assert.equal(await verifyModules('https://bar.example', request), 2);
  pages.set('/chunk-LAZY.js', ['text/html', '<html>fallback</html>']);
  await assert.rejects(verifyModules('https://bar.example', request), /Missing JavaScript module/);
});

test('publishes only validated artifacts, preserves production history and rejects private files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'taurus-deploy-test-'));
  try {
    const workspace = join(root, 'source');
    const remote = join(root, 'remote.git');
    const runner = join(root, 'runner');
    await mkdir(workspace);
    await mkdir(runner);
    const git = (...args) => execFileSync('git', args, { cwd: workspace, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    git('init', '--bare', remote);
    git('init', '--initial-branch=master');
    git('config', 'user.name', 'Deployment test');
    git('config', 'user.email', 'deployment@test.invalid');
    await writeFile(join(workspace, 'source.txt'), 'source remains untouched');
    git('add', 'source.txt');
    git('commit', '-m', 'Source');
    const sourceSha = git('rev-parse', 'HEAD');
    git('remote', 'add', 'origin', remote);
    git('push', 'origin', 'master');
    const artifact = join(workspace, 'dist');
    await mkdir(artifact);
    await writeFile(join(artifact, 'index.html'), '<h1>Ready</h1>');
    const env = { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_REF: 'refs/heads/master', GITHUB_SHA: sourceSha, GITHUB_WORKSPACE: workspace, RUNNER_TEMP: runner, ARTIFACT_DIR: 'dist', GITHUB_STEP_SUMMARY: '' };
    const publish = () => spawnSync(process.execPath, [fileURLToPath(new URL('./publish-production.mjs', import.meta.url))], { env, cwd: workspace, encoding: 'utf8' });
    let result = publish();
    assert.equal(result.status, 0, result.stderr);
    const first = git('rev-parse', 'refs/remotes/origin/production');
    const names = git('ls-tree', '--name-only', first).split('\n');
    assert.deepEqual(names, ['asset-generations.json', 'deployment.json', 'index.html']);
    assert.equal(JSON.parse(git('show', `${first}:deployment.json`)).sourceSha, sourceSha);
    assert.equal(git('rev-parse', 'HEAD'), sourceSha);
    assert.equal(git('diff', '--cached'), '');
    await writeFile(join(artifact, 'index.html'), '<h1>Next revision</h1>');
    result = publish();
    assert.equal(result.status, 0, result.stderr);
    const second = git('rev-parse', 'refs/remotes/origin/production');
    assert.equal(git('rev-parse', `${second}^`), first);
    let latest = second;
    for (let generation = 1; generation <= 4; generation++) {
      for (const name of git('ls-tree', '--name-only', latest).split('\n').filter((name) => /^chunk-/.test(name)))
        await unlink(join(artifact, name)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
      await writeFile(join(artifact, `chunk-G${generation}.js`), `export const revision=${generation};`);
      result = publish();
      assert.equal(result.status, 0, result.stderr);
      latest = git('rev-parse', 'refs/remotes/origin/production');
    }
    const retained = git('ls-tree', '--name-only', latest).split('\n').filter((name) => /^chunk-/.test(name));
    assert.deepEqual(retained, ['chunk-G2.js', 'chunk-G3.js', 'chunk-G4.js']);
    await writeFile(join(artifact, '.env'), 'PRIVATE_VALUE=test-only');
    result = publish();
    assert.notEqual(result.status, 0);
    assert.equal(git('rev-parse', 'refs/remotes/origin/production'), latest);
  } finally {
    const target = await realpath(root);
    assert.equal(dirname(target), await realpath(tmpdir()));
    assert.ok(basename(target).startsWith('taurus-deploy-test-'));
    await rm(target, { recursive: true, force: true });
  }
});


test('deployment verification checks cached module responses as well as fresh downloads', async () => {
  let broken = false;
  let validations = 0;
  const request = async (url, options) => {
    if (new URL(url).pathname === '/') return new Response('<script src="/main-CURRENT.js"></script>', { headers: { 'Content-Type': 'text/html' } });
    if (options?.headers?.['If-None-Match']) {
      validations++;
      return new Response(null, { status: broken ? 404 : 304 });
    }
    return new Response('export{}', { headers: { 'Content-Type': 'application/javascript', ETag: '"current"' } });
  };
  assert.equal(await verifyModules('https://bar.example', request), 1);
  assert.equal(validations, 1);
  broken = true;
  await assert.rejects(verifyModules('https://bar.example', request), /Broken cached JavaScript module/);
});
