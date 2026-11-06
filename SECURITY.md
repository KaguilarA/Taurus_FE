# Seguridad

La auditoría conjunta del frontend y backend está en el repositorio Taurus_API:
[informe del 6 de noviembre de 2026](https://github.com/KaguilarA/Taurus_API/blob/master/docs/security-audit-2026-11-06.md).

No incluir contraseñas, credenciales de servicios, facturas ni tokens de clientes en
issues, frontend, logs o artefactos. Las credenciales pertenecen al entorno del backend.
Comunicar hallazgos al propietario mediante un canal privado.

CI bloquea vulnerabilidades altas/críticas conocidas y Dependabot propone revisiones
semanales. La publicación comprueba el grafo JavaScript completo y conserva dos versiones
anteriores de módulos con hash para pestañas abiertas. Las facturas se mantienen solo
en memoria de la página durante la revisión y se descartan al confirmar o cerrar.
