# Taurus frontend rules

1. **Angular ARIA primero.** Usar las directivas oficiales estables de `@angular/aria` para las interacciones que cubren, reutilizando los componentes compartidos antes de implementar teclado, foco, selección o estados ARIA manualmente. No usar APIs privadas o experimentales. Mantener HTML nativo accesible para patrones que ARIA no ofrece y comprobar la navegación por teclado antes de desplegar. Ver `docs/angular-aria.md`.

- Hacer más con menos: reuse existing components and domain logic across the public menu and administration. Split distinct responsibilities without duplicating implementations.
- Each component has its own folder, TypeScript file, external HTML template and `index.ts` barrel. Barrels use `export * from './file'`. Consume components through their leaf barrels, including `loadComponent` routes.
- Use Angular signals, native control-flow blocks, lazy feature routes and `@defer` for optional components, with loading and error states.
- Use Tailwind utilities and the central business theme. Create component CSS only when utilities cannot express the requirement cleanly.
- Self-close components with no projected content. Preserve traditional paired tags when they contain content.
- Keep business identity configurable and preserve API contracts, stored data, authentication and role restrictions.
- Declare visibility explicitly on component properties and methods; use private/protected for dependencies and internal behavior, public for the component API, and annotate every method return type (`void` or `Promise<void>` when appropriate).
- Keep each interface and type alias in its own file under `src/app/interfaces/`, exported through its barrel. Components must not declare domain interfaces inline.
- Never use the `void` operator before a method or function invocation. Handle promises explicitly; `void` remains valid as a return type.
