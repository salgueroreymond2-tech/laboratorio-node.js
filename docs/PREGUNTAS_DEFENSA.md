# Preguntas para la defensa de SecureVault

Respuestas adaptadas al estado real del proyecto. La palabra «pendiente» indica que no debe demostrarse como función terminada.

## Node.js

**¿Qué aporta Node.js?** Ejecuta JavaScript del lado del servidor; el arranque está en src/server.js.

**¿Qué sucede ante una promesa rechazada?** El servidor registra un error genérico e inicia el cierre; falta comprobar el ciclo completo de producción.

## Express

**¿Qué hace Express en SecureVault?** Compone las rutas locales en src/app.js; actualmente solo están / y /health.

**¿Cómo se limita el tamaño de JSON?** express.json limita el cuerpo a 16 KB; tests/security/http.test.js verifica 413.

## Sequelize

**¿Por qué usar Sequelize?** Configura la conexión y el pool MySQL en src/config/database.js; aún no hay modelos de negocio.

**¿Se usa sync alter o force?** No; las estructuras se manejan mediante archivos en migrations/.

## MySQL

**¿Por qué MySQL?** El proyecto exige MySQL y relaciones con claves foráneas; ver docs/adr/0001-database-mysql-sequelize.md.

**¿Qué hace una migración?** Registra cambios reproducibles de esquema; scripts/migrate.js bloquea producción por ahora.

**¿Cómo se aíslan las pruebas?** La integración usa securevault_test_db y requiere NODE_ENV=test y host local; un túnel local aún debe descartarse.

## Autenticación

**¿Está implementado el registro?** No. Solo existe la utilidad bcrypt; no debe afirmarse que exista inicio de sesión.

**¿Cómo se protegerán intentos repetidos?** Rate limiting y bloqueo progresivo están pendientes; no hay evidencia de un 429 de login.

## Autorización

**¿Qué es IDOR?** Es acceder a un recurso cambiando su identificador sin autorización; el control por propietario está pendiente.

**¿Puede un administrador leer notas ajenas?** El diseño lo prohíbe, pero aún no existen notas ni controles que permitan demostrarlo.

## OWASP 2025

**¿Cómo se demuestra una categoría?** Con una mitigación integrada y una evidencia verificable; actualmente ninguna categoría está completamente cerrada.

**¿Dónde está el modelo de amenazas?** En docs/threat-model.md; muchas mitigaciones descritas son previstas, no existentes.

## Hash

**¿Qué algoritmo protege contraseñas?** src/lib/password.js usa bcrypt costo 12; el usuario eligió bcrypt y el laboratorio permite esa opción.

**¿Qué límite tiene bcrypt?** Se rechazan más de 72 bytes UTF-8 para evitar truncamiento; no equivale necesariamente a 72 caracteres.

**¿Por qué usar sal?** Una sal aleatoria hace diferentes hashes para contraseñas iguales; tests/unit/password.test.js comprueba ese comportamiento.

## Cifrado

**¿Qué es AES-GCM?** Es cifrado autenticado; src/lib/crypto.js usa una llave de 32 bytes, IV de 12 y tag de 16.

**¿Qué protege el AAD?** Vincula el cifrado de nota con propietario, identificador y campo; se prueba en tests/unit/crypto.test.js.

**¿Qué ocurre si se pierde la llave?** Los datos cifrados no se recuperan sin otra copia válida; la gestión y rotación de llaves aún están pendientes.

## Sesiones

**¿Hay sesiones persistentes?** No. Existe una tabla prevista, pero falta integrar y verificar el almacén de sesiones.

**¿Qué es fijación de sesión?** Ocurre si se acepta una sesión conocida antes de autenticar; regenerar el ID al entrar está pendiente.

## Cookies

**¿Qué hace HttpOnly?** Impide a JavaScript acceder al valor de la cookie; todavía no hay cookies de sesión implementadas.

**¿Qué hacen Secure y SameSite?** Secure limita envío a HTTPS y SameSite limita ciertos envíos entre sitios; falta verificar cookies reales.

## CSRF

**¿Qué es CSRF?** Una página externa induce una acción con la sesión de otra persona; la protección para formularios está pendiente.

**¿Por qué 404 no demuestra protección CSRF?** Porque las rutas mutadoras de negocio aún no existen; debe probarse un token en una ruta real.

## CSP

**¿Qué controla CSP?** Restringe recursos que el navegador puede cargar; Helmet configura cabeceras en src/app.js.

**¿Se permiten scripts inline?** La CSP local probada restringe script-src a self y deshabilita atributos de script; verificar producción sigue pendiente.

## HMAC

**¿Para qué sirve HMAC?** Autentica datos con una llave compartida; tests/unit/crypto.test.js detecta alteración sintética.

**¿Detecta el borrado de una fila?** Una firma individual no garantiza detectar la eliminación completa de un evento.

## TLS

**¿Es HTTPS lo mismo que cifrar en MySQL?** No; HTTPS protege el tránsito al servidor, y AES-GCM protege datos almacenados. TLS público aún está pendiente.

## Docker

**¿Está probado Docker?** No. El daemon no estaba disponible; se comprobó solo la configuración y sintaxis local.

**¿Dónde se guardan contraseñas de inicialización?** Compose exige variables de entorno y no tiene valores predeterminados; un volumen existente no rota sus credenciales.

## CI/CD

**¿Qué hace el workflow?** Propone lint, tests, MySQL aislado y escaneo; no se ha ejecutado en GitHub y bloquea la liberación.

**¿Por qué npm audit puede salir con código 0 y alertas?** Con --audit-level=high no falla por moderadas; en esta revisión se reportaron dos moderadas.

## Despliegue

**¿Hay URL pública?** No hay una URL de aplicación verificada; el servidor solo escucha localmente y rechaza producción.

**¿Qué hace trust proxy?** Indica qué proxies se consideran confiables; la configuración debe depender de la topología real, no está implementada.

## Secretos

**¿Se deben enviar credenciales por Git?** No. .env y .env.app se ignoran; no se deben mostrar datos reales en capturas o documentación.

**¿Garantiza Gitleaks ausencia total de secretos?** No. Encontró cero detecciones en la revisión previa pero no detectó contraseñas de desarrollo que se identificaron manualmente.
