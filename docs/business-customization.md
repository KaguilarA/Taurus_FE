# Reutilizar Taurus para otro negocio

El producto comparte modelos, API, permisos, inventario, pedidos y pagos. La identidad de Felos es la configuración del piloto, no una segunda aplicación ni una bifurcación de la lógica.

## Qué cambiar

- **Configuración del negocio:** nombre, subtítulo, frase, descripción, teléfonos, horarios, moneda, color principal e imagen de portada se administran en la configuración existente, almacenada en Business. Usar el catálogo, proveedores y usuarios propios del cliente.
- **Estilos de la marca:** `src/brand.css` contiene la paleta, las fuentes seleccionadas y las texturas. `src/theme.css` conserva las fuentes locales disponibles y el contrato de variables compartido; `src/styles.css` y los componentes implementan la interfaz reutilizable. Para otro negocio, cambiar los tokens de `brand.css` sin duplicar pantallas ni reglas de negocio.
- **Dominio y recursos del despliegue:** configurar los orígenes públicos y actualizar sitemap, imágenes, favicon y QR para el cliente correspondiente. Las credenciales permanecen en las variables privadas de cada proveedor.

Felos conserva Texas Tango, sus colores y sus datos actuales. Por ejemplo, otro restaurante podría seleccionar Bricolage Grotesque mediante `--business-font-brand`, y definir su propia paleta `--accent`, `--canvas`, `--surface`, `--surface-raised`, `--text`, `--text-muted`, `--text-warm` y `--border`. Mantener contraste legible y estados de foco en todos los temas.

## Aislamiento para vender instalaciones

La arquitectura actual usa un negocio principal por despliegue. Para un nuevo cliente, reutilizar la misma versión del código con un despliegue y una base de datos propios, configuración de Business propia y secretos de sesión independientes. No copiar la base de Felos para crear un cliente nuevo: conservar separados usuarios, sesiones, inventario, ventas y pagos.

Cambiar estilos no convierte una base compartida en multiempresa. Si en el futuro se decide atender varios negocios desde el mismo backend, hace falta diseñar y probar aislamiento de tenant en autenticación, todas las consultas, transacciones, índices, medios y sockets antes de habilitarlo. No se necesita ese rediseño para vender instalaciones independientes con el mismo código.

## Antes de entregar una instalación

Compilar y validar la matriz de `browser-compatibility.md`, comprobar recuperación de caché, configurar el negocio, revisar contraste y desbordamientos en teléfono/tablet, verificar QR y probar permisos y operaciones con datos de prueba. Las personalizaciones se mantienen en configuración y estilos; las correcciones del producto se comparten entre clientes.
