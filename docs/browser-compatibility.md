# Compatibilidad del producto

El build de producción usa Angular 22, Tailwind 4 y ES modules. La política está fijada en `.browserslistrc`: Baseline ampliamente disponible al 7 de mayo de 2026, con Firefox 128 como mínimo por Tailwind. No se limita a las últimas dos versiones.

| Motor / navegador | Objetivo mínimo |
| --- | --- |
| Chrome y Edge | 119 |
| Firefox | 128 |
| Safari y navegadores en iOS/iPadOS | 17 |
| Chrome Android, WebView y navegadores basados en Chromium | Motor equivalente a Chrome 119 o superior |

El sistema operativo o el modelo del dispositivo no determina por sí solo la compatibilidad. Android 10 con Chrome actualizado, por ejemplo, puede cumplir el objetivo. Navegadores integrados en otras apps pueden usar un WebView distinto; para operar el restaurante conviene abrir la URL directamente en un navegador actualizado.

`npm run compatibility:check` verifica los mínimos efectivos usando la misma configuración Browserslist que lee Angular CLI. CI bloquea cambios accidentales del objetivo. Esto comprueba el objetivo de compilación; no reemplaza las pruebas reales de los distintos motores. No se declara soporte para Internet Explorer, Safari anterior a 17 ni motores Chromium anteriores a 119. Bajar solamente TypeScript a ES5 no añade las APIs de DOM, CSS y accesibilidad que requieren Angular y Tailwind.

## Verificación de una versión

1. Ejecutar `npm run compatibility:check`, `npm test -- --watch=false`, `node --test tests/*.test.mjs scripts/deployment.test.mjs` y `npm run build`.
2. Revisar el bundle inicial, manteniendo rutas y reportes diferidos. Referencia antes de separar la marca: 354.39 kB, 95.40 kB estimados de transferencia. `startup.js` es un recurso adicional independiente, no incluido en ese total de Angular.
3. Probar en Chromium de escritorio y Android, Firefox y Safari de iPhone/iPad: apertura, menú, búsqueda, teclado, diálogos, inicio/cierre de sesión y recuperación de conexión. Cambiar el tamaño de Chrome verifica el diseño responsive, pero no equivale a ejecutar Safari o un dispositivo físico.
4. Comprobar caché fría y caliente, recargas, rutas directas y módulos diferidos. `verifyModules` valida tanto descargas 200 como revalidaciones ETag 304. No borrar los datos del usuario para ocultar un problema de caché.
5. Probar pedidos, permisos y pagos en un entorno separado con datos de prueba; nunca reintentar automáticamente escrituras de negocio.

No se cargan polyfills generales ni servicios externos por defecto. Si se añade una API más reciente que estos mínimos, debe proporcionarse un fallback acotado o revisarse explícitamente la política. Mantener las primitivas criptográficas y los límites de autenticación: no sustituir `crypto.randomUUID()` por `Math.random()`.

Fuentes oficiales: https://angular.dev/reference/versions#browser-support y https://tailwindcss.com/docs/compatibility.
