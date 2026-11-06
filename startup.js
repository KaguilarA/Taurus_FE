// Runs without Angular, including when a module fails to download or execute.
(function () {
  'use strict';
  var panel = document.getElementById('connection-diagnostic');
  if (!panel) return;
  var title = document.getElementById('connection-title');
  var message = document.getElementById('connection-message');
  var details = document.getElementById('connection-details');
  var toggle = document.getElementById('connection-toggle');
  var last = {
    code: 'STARTUP_WAIT',
    route: '/',
    status: 0,
    ray: '',
    time: new Date().toISOString(),
  };
  var ready = false;
  var failed = false;
  var waiting = false;
  var timer;

  function show() {
    panel.hidden = false;
    title.textContent = failed ? 'No pudimos completar la carga' : 'La carga está tardando';
    message.textContent = failed
      ? 'Podés volver a cargar la página. Si vuelve a fallar, abrí los detalles y compartí ese código.'
      : 'Estamos esperando la aplicación o el servidor. No hace falta cerrar esta página.';
    details.value = [
      'Código: ' + last.code,
      'HTTP: ' + (last.status || 'sin respuesta'),
      'Ruta: ' + last.route,
      'Referencia: ' + (last.ray || 'no disponible'),
      'Hora: ' + last.time,
      'Navegador: ' + navigator.userAgent.slice(0, 240),
    ].join('\n');
  }

  timer = setTimeout(function () {
    waiting = true;
    show();
  }, 12000);

  window.addEventListener('taurus:connection', function (event) {
    var detail = event.detail;
    if (!detail || typeof detail.code !== 'string') return;
    if (detail.code === 'READY') {
      ready = true;
      clearTimeout(timer);
      if (!failed) panel.hidden = true;
      return;
    }
    if (detail.code === 'API_OK') {
      if (last.route === detail.route && last.code.indexOf('API_') === 0) {
        failed = false;
        if (ready) panel.hidden = true;
      }
      return;
    }
    last = {
      code: /^[A-Z_]{1,40}$/.test(detail.code) ? detail.code : 'LOAD_ERROR',
      route:
        ['/api/setup/status', '/api/auth/status', '/api/public'].indexOf(detail.route) >= 0
          ? detail.route
          : '/api',
      status: Number(detail.status) || 0,
      ray: /^[a-zA-Z0-9-]{1,80}$/.test(detail.ray) ? detail.ray : '',
      time: new Date().toISOString(),
    };
    failed = detail.code !== 'API_RETRY';
    if (failed || waiting) show();
  });

  window.addEventListener(
    'error',
    function (event) {
      // Do not display arbitrary exception messages, URLs or stacks.
      if (ready || (event.target !== window && event.target.tagName !== 'SCRIPT')) return;
      last.code =
        event.target && event.target.tagName === 'SCRIPT' ? 'MODULE_DOWNLOAD' : 'BOOT_ERROR';
      last.time = new Date().toISOString();
      failed = true;
      show();
    },
    true,
  );
  window.addEventListener('unhandledrejection', function () {
    if (ready) return;
    last.code = 'BOOT_ERROR';
    last.time = new Date().toISOString();
    failed = true;
    show();
  });
  document.getElementById('connection-reload').addEventListener('click', function () {
    var url = new URL(window.location.href);
    if (url.searchParams.has('connection')) {
      url.searchParams.delete('connection');
      window.location.replace(url.href);
    } else {
      window.location.reload();
    }
  });
  toggle.addEventListener('click', function () {
    details.hidden = !details.hidden;
    toggle.setAttribute('aria-expanded', String(!details.hidden));
    if (!details.hidden) {
      details.focus();
      details.select();
    }
  });
})();
