# Angular ARIA en Taurus

La regla número uno está en `AGENTS.md`: usar primero los patrones estables de Angular ARIA para las interacciones que cubren.

Angular ARIA es estable desde Angular 22. Este proyecto fija `@angular/aria` en `22.2.5`; npm incorpora su dependencia oficial de CDK compatible. ARIA aporta comportamiento accesible y no impone estilos. Tailwind y los componentes del proyecto siguen controlando el diseño.

## Dónde se usa

| Patrón               | Directivas oficiales                                                       | Implementación                                                                                                |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Lista de selección   | `Listbox`, `Option`                                                        | `shared/ui/choice-list`: filtros de carta, productos, inventario, punto de venta y gráficos                   |
| Selector desplegable | `Combobox`, `ComboboxPopup`, `ComboboxWidget`, `Listbox`, `Option`         | `shared/ui/select`: medidas en tarjetas y detalles; tipo, inventario y subcategoría en el editor de productos |
| Acordeón             | `AccordionGroup`, `AccordionTrigger`, `AccordionPanel`, `AccordionContent` | Dirección de imagen y medidas en la configuración inicial del negocio                                         |
| Barra de controles   | `Toolbar`, `ToolbarWidget`                                                 | Paginación compartida                                                                                         |
| Pestañas             | `Tabs`, `TabList`, `Tab`, `TabPanel`, `TabContent`                         | Gráficos por producto o categoría; el gráfico oculto se destruye para liberar recursos                        |

Son 16 directivas oficiales distintas. Usamos HTML nativo para formularios, fechas, archivos, botones, enlaces y diálogos: ARIA no ofrece sustitutos para todos esos elementos.

## Cómo funciona

En `choice-list.html`, `ngListbox` coordina el grupo y `ngOption` identifica cada alternativa. El componente recibe opciones y valor mediante signals. Cuando ARIA cambia la selección, `valueChange` actualiza el modelo; ese cambio llega al filtro existente. ARIA administra el foco, el rol `listbox`, los roles `option` y `aria-selected`.

En `select.html`, `ngCombobox` controla el disparador y `expanded`. `ngComboboxPopup` crea el contenido al abrir; `ngComboboxWidget` conecta el foco del desplegable con `ngListbox`. La aplicación aporta las etiquetas y el valor elegido; ARIA coordina las teclas y la relación accesible entre elementos. Elegir una opción cierra el desplegable.

Los tipos y modos de inventario del editor vienen de `ProductType` a través de la API. Las botellas se ingresan en litros, convertidos a mililitros enteros; el cliente no calcula ni guarda saldos de inventario.

Los acordeones enlazan automáticamente su disparador con el panel mediante `aria-controls` y `aria-expanded`. Los paneles cerrados se ocultan también visualmente; se preserva su contenido de formulario. Las pestañas enlazan cada tab con su panel y cargan solo la vista activa.

## Probar con el teclado

1. Usá Tab para llegar a un filtro, selector, acordeón, paginación o pestaña.
2. En listas horizontales, movete con las flechas. Confirmá con Espacio o Enter: recorrer opciones no dispara búsquedas automáticamente.
3. En selectores, abrí con la flecha abajo, recorré opciones y confirmá. Escape cierra y mantiene el foco en el selector.
4. En acordeones, Enter o Espacio abre/cierra el panel. En paginación, las flechas recorren controles y la activación solicita la página.
5. En gráficos, las pestañas anuncian la selección y el panel activo; las vistas ocultas no reciben foco.

`shared/ui/aria-interactions.spec.ts` comprueba interacción real, selección única, foco, controles deshabilitados, enlaces entre paneles y liberación del gráfico oculto. Ejecutá `npm test -- --watch=false` y `npm run build` antes de desplegar.

Documentación oficial: [estabilidad en Angular 22](https://angular.dev/events/v22), [Angular ARIA](https://angular.dev/guide/aria/overview), [Listbox](https://angular.dev/guide/aria/listbox), [Select](https://angular.dev/guide/aria/select), [Accordion](https://angular.dev/guide/aria/accordion), [Toolbar](https://angular.dev/guide/aria/toolbar), [Tabs](https://angular.dev/guide/aria/tabs).
