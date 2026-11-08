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

Los e2e corren contra un servidor de Auth falso y PGlite, así que no usan Google ni Supabase. La primera vez hay que instalar el navegador:

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
