# Ludoteca

Web personal (PWA) para llevar la biblioteca de videojuegos, en qué tienda está cada juego y las suscripciones.

Las decisiones están en [`docs/decisiones.md`](docs/decisiones.md) y las convenciones de código en [`CLAUDE.md`](CLAUDE.md).

## Correr el proyecto

Necesitás Node 24.

1. Instalá las dependencias:

   ```bash
   npm install
   ```

2. Creá tu archivo de variables y completalo. De dónde sale cada valor está en [`docs/configuracion-externa.md`](docs/configuracion-externa.md).

   ```bash
   cp .env.example .env.local
   ```

3. Levantá la app en <http://localhost:3000>:

   ```bash
   npm run dev
   ```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | App en modo desarrollo. |
| `npm run build` y `npm start` | Build de producción y servidor. |
| `npm run lint` | ESLint, con las reglas de capas. |
| `npm run typecheck` | Chequeo de tipos. |
| `npm test` | Tests de modelo, servicio, repositorios y componentes. No necesitan base ni cuentas. |
| `npm run test:e2e` | Playwright a 390 y 1440 px. |
| `npm run db:generate` | Genera una migración a partir de las tablas de `src/persistence/sql/`. |
| `npm run db:migrate` | Aplica las migraciones, usando `DATABASE_MIGRATION_URL`. |

Los e2e corren contra servidores falsos de Auth, Twitch e IGDB y contra PGlite, así que no usan Google, Supabase ni IGDB. La primera vez hay que instalar el navegador:

```bash
npx playwright install chromium
```

## Puesta en marcha

El detalle de cada panel está en [`docs/configuracion-externa.md`](docs/configuracion-externa.md). **El orden importa:**

1. Creá el proyecto de Supabase y el cliente OAuth de Google. Activá el proveedor Google, cargá las URLs permitidas y apagá la Data API.
2. Con `DATABASE_MIGRATION_URL` en `.env.local`, aplicá las migraciones:

   ```bash
   npm run db:migrate
   ```

3. En el SQL Editor de Supabase, insertá tu mail en minúsculas. No va en el repo, que es público:

   ```sql
   insert into public.allowed_email (email) values ('tu-mail@gmail.com');
   ```

4. **Recién después**, en Authentication › Hooks, activá «Before User Created» de tipo Postgres con la función `public.before_user_created_hook`. Si lo activás antes de insertar tu mail, tampoco vas a poder entrar vos.
5. Creá el proyecto de Vercel conectado al repo y cargá las variables de `.env.example`, salvo `DATABASE_MIGRATION_URL`, que solo se usa en tu PC.
6. Activá el análisis automático en SonarQube Cloud.

Para sumar a alguien más, insertá su mail en `allowed_email`. Sacarlo de la lista no corta una sesión ya abierta: para eso hay que borrar su usuario en Supabase.

### Biblioteca (`02-nucleo-biblioteca`)

Esta etapa suma IGDB y las portadas subidas. Sin estas variables la biblioteca sigue andando, pero no se puede buscar en IGDB ni subir imágenes.

| Variable | Para qué | De dónde sale |
|---|---|---|
| `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` | Consultar IGDB desde el servidor. | La app de Twitch. |
| `SUPABASE_SECRET_KEY` | Subir portadas al bucket `covers`. Solo servidor, nunca con prefijo `NEXT_PUBLIC_`. | Project Settings › API Keys de Supabase. |
| `IGDB_API_URL` y `TWITCH_TOKEN_URL` | Opcionales: solo las cambian los e2e. | — |
| `DATABASE_POOL_MAX` | Opcional, 10 por defecto: cuántas conexiones abre cada instancia hacia el transaction pooler. | — |

La app se conecta con `pg` y no espera para siempre: corta a los 5 s si no puede conectarse y a los 8 s si una consulta no responde, y avisa «No pudimos cargar tus datos. Probá de nuevo.» con «Reintentar». Para que la base también corte esas consultas, sus tiempos máximos van en el rol `postgres` (paso 3).

**El orden importa: primero la migración y después el deploy**, porque el código nuevo consulta las tablas nuevas, el tipo de copia «Otro» y la columna `kind_detail`.

1. Creá la app de Twitch y el bucket público `covers`, y copiá la secret key.
2. Cargá las variables en `.env.local` y en Vercel (Production y Preview).
3. Configurá los tiempos máximos del rol `postgres` y verificalos a través del pooler, como dice [la guía de configuración externa](docs/configuracion-externa.md#tiempos-máximos-de-la-base).
4. Con `DATABASE_MIGRATION_URL` en `.env.local`, aplicá las migraciones:

   ```bash
   npm run db:migrate
   ```

5. Desplegá. Los estados por defecto se crean solos la primera vez que cada usuario abre la biblioteca.

Si hay que volver atrás, en Vercel se puede volver al deploy anterior: ignora las tablas nuevas, la columna `kind_detail` y el valor `other` (mientras no haya copias de tipo Otro), así que no hace falta revertir la migración.
