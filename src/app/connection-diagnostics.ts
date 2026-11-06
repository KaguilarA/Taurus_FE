// Local, bounded diagnostics only: never include bodies, query strings or credentials.
export function reportConnection(code: string, path = '', status = 0, ray = ''): void {
  const route = ['/setup/status', '/auth/status', '/public'].includes(path)
    ? '/api' + path
    : '/api';
  window.dispatchEvent(
    new CustomEvent('taurus:connection', {
      detail: {
        code,
        route,
        status,
        ray: /^[a-zA-Z0-9-]{1,80}$/.test(ray) ? ray : '',
        time: new Date().toISOString(),
      },
    }),
  );
}
