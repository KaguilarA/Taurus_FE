# SEO administrable

La sección **Negocio → SEO y enlaces compartidos** (`/admin/seo`) es independiente de Personalización. Solo administradores pueden acceder y guardar. Incluye título y descripción de búsqueda, título/descripción/imagen social, idioma y región, indexación y productos en el sitemap. Los textos vacíos heredan datos del negocio; la imagen social hereda logo o portada. No se modifica la descripción visible de la carta al editar SEO.

La configuración se conserva en `Business.seo` mediante OWL y los endpoints GET/PUT `/api/admin/seo`. No hay un segundo registro de modelos ni una colección nueva. Los campos originales de Business y sus datos permanecen intactos.

## HTML inicial y navegación

Cloudflare consulta `/api/seo?path=/` para la portada y admite `/producto/<id>` para productos activos. Inserta título, descripción, canonical, robots, Open Graph y Twitter Cards en el HTML inicial mediante HTMLRewriter. Así las vistas previas reciben los datos sin ejecutar Angular. Nunca se incluyen consultas de URL, sesiones o tokens en canonical ni en metadatos.

El servicio Angular `SeoService` actualiza las etiquetas al navegar entre rutas y elimina canonical y etiquetas sociales al entrar en páginas privadas. Reutiliza los metadatos del HTML inicial para evitar otra lectura durante el arranque, cancela consultas obsoletas y no vuelve a consultar al cambiar solamente un fragmento o presentación del mismo producto.

Los textos y atributos se escapan al generar HTML. No se permite configurar scripts, HTML sin escapar, orígenes arbitrarios del proxy ni credenciales. Los orígenes públicos/canónicos siguen procediendo de `FRONTEND_URL` y `PUBLIC_FRONTEND_URL`, configurados en el entorno de cada instalación.

## Disponibilidad y caché

Solo los metadatos públicos se cachean en el edge durante 30 segundos. Las solicitudes de metadatos no reenvían Cookie ni Authorization del visitante. El HTML, las respuestas privadas y las sesiones no se almacenan en ese caché. Una indisponibilidad de SEO no bloquea el HTML de la aplicación: la consulta al proveedor tiene un límite de 2,5 segundos y el router puede completar las etiquetas más tarde. El HTML genérico de recuperación empieza con noindex.

Un cambio guardado puede tardar hasta 30 segundos en reflejarse en otra ubicación del edge. Los buscadores y redes sociales mantienen sus propias cachés, fuera del control de la aplicación.

`robots.txt` y `sitemap.xml` se generan con la configuración y el origen de la instalación; no contienen una URL de Felos fija. El sitemap incluye portada y hasta 1000 productos activos de categorías activas. Si se desactiva indexación, robots bloquea el rastreo y el sitemap queda vacío. Panel, cuentas, registro y configuración permanecen con noindex; robots no sustituye los permisos de la API.

## Validación

Probar guardado y vistas previas, preservación de los datos de Business, usuarios sin permisos, productos inactivos, texto con caracteres HTML, metadatos iniciales sin JavaScript, rutas privadas, caché de metadatos y revalidación 304 de archivos. El formulario se carga bajo demanda. Bundle inicial tras esta funcionalidad: 356,84 kB / 96,12 kB estimados de transferencia; antes: 354,39 kB / 95,40 kB.
