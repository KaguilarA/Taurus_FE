# Taurus · Carta pública y administración

Angular 22, TypeScript 6 y Tailwind CSS 4. La aplicación se conecta a la API Express del repositorio `../taurus-api`; no simula ventas ni guarda el inventario en localStorage.

## Inicio

Requiere Node.js 24 y npm 12.

```sh
npm ci
npm start
```

La API debe estar encendida en el puerto 4000. `proxy.conf.json` envía `/api` al backend. Abrí http://localhost:4200 para la página pública y http://localhost:4200/admin para administración.

En una base nueva se registra al administrador en `/setup` y luego se completa el perfil del negocio en `/business/setup`. Nombre y subtitulo de la marca provienen de Business. No se cargan cuentas de prueba.

## Pantallas

- Carta pública responsive: filtros de comidas/bebidas/snacks y botanas, medidas, especialidades, promociones y contacto.
- QR por mesa o posición: pedido sin registro, notas, cantidades, estado de preparación y cuenta compartida visible para el cliente.
- Pedidos en vivo: actualizaciones Socket.IO por WebSocket y suscripción solo con órdenes activas. Cocina prepara; mesero entrega y registra el pago.
- Mesas y códigos QR: crear posiciones, descargar PNG del QR y pausar nuevos pedidos.
- Equipo y roles: crear accesos de administrador, cocina y mesero; permisos aplicados por el servidor.
- Resumen: ingresos, ventas, productos favoritos y alertas.
- Punto de venta: cuenta o mesa, cantidades y tamaños; confirma la venta y descuenta inventario.
- Inventario: reposición por botellas o ml, unidades, mermas, mínimos y movimientos.
- Productos: altas, edición, precios por medida y archivado.
- Promociones: texto, imagen y fechas locales de vigencia.
- Reportes: períodos inclusivos en la zona horaria del navegador, ranking por comida/bebida/snacks y CSV. Solo se reconocen los pedidos pagados.
- Personalización: marca, imágenes, textos, moneda y ml de cada tamaño.

## Reutilizar para otro restaurante

Personalizá el negocio desde el panel. Las ilustraciones iniciales están en `public/images/` y son recursos vectoriales locales. Reemplazalas conservando sus nombres, o cambiá cada ruta por una imagen local o URL HTTPS desde el panel. Para fotografías JPG/WebP, poné los archivos en `public/images/` y guardá su nueva ruta (ej. `/images/burger.webp`). No es necesario modificar componentes. `scripts/generate-art.mjs` regenera únicamente las ilustraciones iniciales; no ejecutarlo sobre imágenes personalizadas con esos mismos nombres.

Las medidas son globales para cada negocio; el contenido de botella y los precios son por producto. Cambiar medidas afecta las próximas ventas, no las ventas históricas. Las comidas y snacks no descuentan inventario. El servidor valida las existencias y calcula los precios finales.

Para el servicio por QR, configurá `FRONTEND_URL` en el backend con el origen público HTTPS accesible desde los celulares y luego generá los QR en **Mesas y códigos QR**. El parámetro `?mesa=...` identifica el lugar; el servidor asigna una cuenta de visita con un identificador aleatorio. Se recuerda ese identificador en localStorage para recuperar la cuenta al recargar; precios, pedidos y pagos siempre residen en MongoDB. Todos los que escanean el mismo QR comparten el saldo de esa mesa. Tras pagar, el cliente puede iniciar otra visita desde el mismo QR, sin heredar consumos anteriores.

El mesero verifica el pago fuera del sistema y lo registra como **Efectivo**, **SIMPE** o **Tarjeta**, con referencia opcional. Todos los pedidos deben estar entregados. Se registra un pago completo de la cuenta; no hay pagos parciales, separación por persona, integración bancaria, cancelaciones QR ni devoluciones de cuentas pagadas. Las alertas son dentro del panel abierto. El proxy de producción debe permitir upgrade WebSocket en `/api/socket.io/`. No se requiere habilitar notificaciones del navegador.

## Verificación y despliegue

```sh
npm run build
npm test -- --watch=false
npm audit
```

Publicá `dist/taurus-ng-fe/browser` en un servidor estático con fallback a `index.html` para rutas de Angular. Configurá un proxy `/api` al backend bajo el mismo origen, HTTPS, y `FRONTEND_URL` con el origen real. El proxy de Angular es solo para desarrollo. El backend requiere MongoDB con transacciones. No se ha publicado automáticamente ni migrado la base antigua.

Tailwind sigue la [integración oficial para Angular](https://tailwindcss.com/docs/installation/framework-guides/angular).

## Identidad y recursos locales

La carta utiliza la paleta #F5A623 / #D99B26 / #C26D38 sobre #121110, con detalles de madera y cartelería inspirados en las referencias de Felos Bar. El navegador muestra la marca como texto; la portada conserva la ilustración original. La imagen adjunta del negocio se conserva como recurso y no se muestra en el nav ni reemplaza la ilustración.

Las tres fuentes se sirven desde `public/fonts/`, sin Google Fonts ni CDN:

- Texas Tango para la marca y los titulares públicos.
- Bricolage Grotesque para titulares del panel.
- Space Grotesk para textos, controles y datos.

La versión pública de Texas Tango incluida es la muestra del autor para uso personal. Para publicar comercialmente, reemplazarla por el archivo cubierto por una licencia Website de Billy Argel. Se conserva el aviso original junto al archivo. Bricolage y Space Grotesk incluyen sus licencias OFL locales.

Los iconos Lucide se sirven como un único sprite SVG con solo 35 iconos seleccionados (aprox. 1,9 KB gzip); no se carga una fuente de iconos ni el JavaScript de Lucide en el navegador. `npm run assets:ui` regenera el sprite y los recursos abiertos desde las dependencias de desarrollo. Texas Tango permanece como archivo local independiente, sin conversiones. `scripts/generate-preview-art.mjs` crea las ilustraciones locales de productos de prueba; no es necesario ejecutarlo para iniciar la aplicación.

El acceso usa **usuario y contraseña**. Con la carga local de prueba: **admin / 12345678**. La configuración de MongoDB se mantiene en `.env` del backend; el frontend solo llama a `/api`.

## Eventos

El panel **Eventos** permite crear, editar y pausar publicaciones con título, tipo, descripción, imagen, lugar, entrada e inicio/fin. Las horas se ingresan en la zona del navegador; la agenda pública las presenta en hora de Costa Rica. Sin fechas se indica “Fecha por confirmar”. Los eventos vencidos o pausados se ocultan. Los ejemplos de música en vivo, karaoke y deportes están identificados como eventos de muestra; no anuncian fechas reales.

## Ciclo de suscripción de órdenes

El cliente conecta el socket cuando su cuenta abierta tiene pedidos, y lo cierra al pagar o abandonar la página. Cocina se conecta mientras hay pedidos sin entregar; el mesero sigue conectado hasta cobrar las cuentas. Cerrar sesión o salir del panel cierra la conexión. Una cuenta vacía o pagada no se puede suscribir, ni siquiera solicitándolo directamente al servidor.

Sin órdenes no se abre un socket: una consulta HTTP de actividad cada 5 segundos detecta el primer pedido (también los pedidos realizados desde otro celular en la misma mesa). Al aparecer, se recupera el estado y se abre la suscripción. Mientras el socket esté conectado no se realizan consultas periódicas de órdenes. Ante desconexiones se recupera el estado y se reintenta. Los pedidos, estados y pagos conservan las operaciones HTTP transaccionales; los cambios llegan mediante el socket.

El cliente Socket.IO se importa de forma diferida al necesitar una suscripción. La URL usa el origen actual y el canal relativo `/api/socket.io/`, sin host fijo; bajo HTTPS usa WSS. `proxy.conf.json` permite WebSockets con `ws: true`. Reiniciar `npm start` después de cambiar el proxy.

## Variante opcional de un único servicio

Desde `taurus-api`, `npm run bundle:production -- --combined` construye esta aplicación y la incorpora a un paquete portable junto con la API. El servidor Express sirve `web/`, `/api` y los sockets bajo la misma dirección HTTPS; no se necesitan URLs de API compiladas ni un servidor Angular de desarrollo en producción. El paquete incluye configuración para Render Free + Atlas y una guía de variables de entorno. Los secretos permanecen exclusivamente en el backend.

Las imágenes y fuentes locales se incluyen en el build. Para publicar comercialmente, reemplazar Texas Tango de muestra por la fuente con licencia web antes de generar el paquete final. El sitio puede probarse gratis en Render, cuyo plan Free tiene suspensión por inactividad y no garantiza servicio continuo.

## Publicación separada: Cloudflare Pages

La salida de `npm run build` es `dist/taurus-ng-fe/browser`. Publicarla en Pages con integración Git o Wrangler para que `_worker.js` quede activo. El gateway reenvía `/api` y `/api/socket.io` a la API alojada por separado en Render; las cookies permanecen en el origen de la carta y los sockets del personal comparten esa sesión.

Configurar `BACKEND_ORIGIN` y `PUBLIC_FRONTEND_URL` como variables del entorno de Pages Functions. La API usa `FRONTEND_URL` con la misma URL pública del frontend. Ver `.dev.vars.example`; no incluir secretos de MongoDB en este proyecto. `node --test tests/proxy.test.mjs` verifica el gateway.

La guía completa está en `../taurus-api/deploy/separate/README.md`. El script `npm run bundle:production` del backend genera los dos paquetes sin copiar la base local. Texas Tango requiere una licencia web para publicar el sitio comercial.


## Despliegues con GitHub Actions

El workflow `.github/workflows/deploy.yml` valida cada pull request y cada push a `main`. Solo los pushes a `main` o una ejecucion manual desde `main` pueden publicar. Si alguna prueba falla, no se actualiza produccion.

Actions publica un artefacto validado en la rama `production`, sin secretos ni dependencias instaladas. La rama conserva el historial de despliegues y contiene `deployment.json` con la revision fuente. El job de publicacion tiene `contents: write`; las pruebas solo tienen lectura. No se necesitan tokens personales ni claves de los proveedores en GitHub.

Configurar la variable de repositorio `DEPLOYMENT_URL` con el origen HTTPS publico. El workflow espera a que el proveedor sirva la misma revision y a que `/api/ready` responda correctamente. Un timeout marca el workflow como fallido; no se presenta una publicacion pendiente como exitosa.

Cloudflare Pages debe observar `production`, sin comando de build y con directorio de salida `.`. Angular se compila en Actions. Mantener `BACKEND_ORIGIN` y `PUBLIC_FRONTEND_URL` en las variables de produccion de Pages. `DEPLOYMENT_URL` en GitHub apunta al dominio publico del frontend.

La portada consulta la configuracion antes de activarse. Sin administrador abre `/setup`; con administrador y sin Business abre el inicio `/start`, que conduce al login o a `/business/setup`. Si la API no responde, `/start` muestra un error recuperable y la portada permanece bloqueada.
