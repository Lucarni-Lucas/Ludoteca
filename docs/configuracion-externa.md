# Ludoteca: configuración externa

Lo que tenés que hacer vos, fuera del código, en cada etapa: crear cuentas, sacar claves y tocar paneles web. Claude Code no puede entrar a esos paneles. Cuando una tarea lo necesite, va a frenar y te va a remitir a esta guía (está en la regla de `openspec/config.yaml`).

Revisado el 6 de noviembre de 2026. Los paneles cambian seguido: si algo no coincide, buscá la opción equivalente o preguntale a Claude.

## Reglas para las claves

- **Ninguna clave va al repo**, que es público. Van en `.env.local` en tu PC (que git ignora) y en las variables de entorno de Vercel.
- **Los nombres exactos de las variables los define `.env.example`**, que crea la tarea 1.1 de `01-base`. Esta guía dice de dónde sale cada valor; `.env.example`, con qué nombre va.
- Guardá cada clave en un gestor de contraseñas apenas la generes: varios paneles la muestran una sola vez.
- Si una clave se filtra (por ejemplo, la pegaste en un chat o en un commit), generá una nueva y borrá la vieja.

## Resumen

| Etapa | Qué hacés vos | Cuándo |
|---|---|---|
| `01-base` | Supabase, Google, Vercel y SonarQube Cloud | Supabase y Google antes del `/opsx:apply`; Vercel y SonarQube cuando llegues a las tareas 9.x |
| `02-nucleo-biblioteca` | App de Twitch para IGDB | Antes del `/opsx:apply` |
| `03-importacion` | Clave de Steam, privacidad del perfil y export de Playnite | Antes del `/opsx:propose`, porque el diseño necesita ver el formato real |
| `04-tiendas-y-steam` | Un secreto para el cron | Cuando lo pida la tarea |
| `05`, `06` | Nada | — |
| `07-pwa` | Nada; al final, instalar la app en el celu para probarla | Al terminar |
| `08-suscripciones-y-avisos` | Cuenta de Resend | Antes del `/opsx:apply` |

---

## Etapa 01-base

El orden importa: los pasos 1 a 6 antes de `/opsx:apply`; el 7, cuando el agente llegue a la tarea 9.3; el 8 y el 9, en la 9.4; el 10, en la 9.5.

### 1. Supabase: crear el proyecto

En [supabase.com/dashboard](https://supabase.com/dashboard), «New project»:

| Campo | Qué poner | Por qué |
|---|---|---|
| Organization | La tuya, plan Free | — |
| Project name | `ludoteca` | — |
| Database password | Generá una de **solo letras y números**, y guardala | Va dentro de la URL de conexión; con símbolos hay que codificarlos y es fuente de errores |
| Region | **South America (São Paulo)** | Es la más cercana a Argentina. **No se puede cambiar después** (habría que crear otro proyecto) |
| «Automatically expose new tables» (o «…and functions») | **Desmarcado** | La app no usa la Data API; así ninguna tabla queda accesible por ese camino |
| «Enable Data API», si aparece | **Desmarcado** | Ídem. Si no aparece, se apaga en el paso 3 |
| «Enable automatic RLS» | **Marcado** | Activa RLS en cada tabla nueva. Es el mismo «segundo cinturón» que pide el diseño de 01-base. A Ludoteca no la afecta, porque Drizzle se conecta como dueño de las tablas y el dueño no queda alcanzado por RLS |

**Si ya lo creaste con otras opciones, no pasa nada:** la Data API se apaga en el paso 3 y las migraciones activan RLS en cada tabla igual. Lo único que no se arregla es la región. Si elegiste otra, en el paso 8 poné Vercel en la misma región que Supabase.

### 2. Supabase: datos para `.env.local`

En el proyecto, botón **Connect** (arriba):

- **URL del proyecto** (`https://<ref>.supabase.co`) y **publishable key** (`sb_publishable_…`). Son públicas por diseño: el navegador las usa para el login.
- **Connection string › Transaction pooler** (puerto **6543**): la que usa la app en Vercel.
- **Connection string › Session pooler** (puerto **5432**): la que usa drizzle-kit para las migraciones.
- En las dos, reemplazá `[YOUR-PASSWORD]` por la contraseña del paso 1. El usuario tiene la forma `postgres.<ref>`: copialo tal cual del diálogo, no lo armes a mano.
- **No uses «Direct connection»:** en el plan Free es solo IPv6, y muchas conexiones de casa en Argentina son solo IPv4.
- La **secret key** (`sb_secret_…`) no hace falta en esta etapa. Si alguna vez la usás, va solo en el servidor y nunca en una variable `NEXT_PUBLIC_`.

### 3. Supabase: apagar la Data API

**Integrations › Data API**, y desactivá **«Enable Data API»**. El login con Google no la usa, así que sigue funcionando.

### 4. Google: cliente OAuth

En [console.cloud.google.com](https://console.cloud.google.com):

1. Creá un proyecto nuevo llamado `Ludoteca`.
2. Entrá a **Google Auth Platform** (en el buscador de arriba, «Google Auth Platform» u «OAuth»).
3. **Branding:** nombre de la app `Ludoteca` y tu mail de soporte. **No subas logo:** si lo subís, Google pide verificar la marca y tarda días.
4. **Audience:** tipo **External**. Dejala en **Testing** y, en **Test users**, agregá tu Gmail. En modo Testing solo los mails de esa lista pasan la pantalla de Google: es una traba más al registro cerrado, además de la de Ludoteca.
5. **Data Access:** agregá el alcance `openid`. El mail y el perfil ya vienen incluidos.
6. **Clients › Create client:**
   - Application type: **Web application**. Nombre: `Ludoteca web`.
   - **Authorized JavaScript origins:** `http://localhost:3000`. Cuando tengas la URL de Vercel (paso 8), volvé y sumá `https://<tu-proyecto>.vercel.app`.
   - **Authorized redirect URIs:** la **Callback URL** que muestra Supabase en el paso 5 (tiene la forma `https://<ref>.supabase.co/auth/v1/callback`).
   - **Create**, y guardá el **Client ID** y el **Client secret**.

El aviso de Google sobre que los tokens de los usuarios de prueba vencen a los 7 días se refiere a las APIs de Google. No afecta tu sesión en Ludoteca, que maneja Supabase.

### 5. Supabase: activar Google

**Authentication › Sign In / Providers › Google**:

- Copiá la **Callback URL** que aparece ahí y pegala en Google (paso 4.6).
- Activá el proveedor, pegá el **Client ID** y el **Client secret** de Google y guardá.

Las credenciales de Google viven solo en Supabase: no van en `.env.local` ni en Vercel.

### 6. Supabase: URLs permitidas

**Authentication › URL Configuration**:

- **Site URL:** `http://localhost:3000` por ahora. Cuando tengas la de Vercel, cambiala por `https://<tu-proyecto>.vercel.app`.
- **Redirect URLs:**
  - `http://localhost:3000/**`
  - `https://<tu-proyecto>.vercel.app/**` (cuando la tengas)
  - `https://*-<tu-usuario-de-vercel>.vercel.app/**`, para los deploys de preview de cada PR

### 7. Migraciones, tu mail y el hook (tarea 9.3, en este orden)

1. Con la URL del **session pooler** en `.env.local`, corré `npm run db:migrate`.
2. En **SQL Editor**, insertá tu mail en la tabla `allowed_email` con el `insert` que te pase el agente. Escribilo en minúsculas.
3. **Recién después**, en **Authentication › Hooks**, agregá el hook **«Before User Created»**, elegí el tipo **SQL** (Postgres) y seleccioná la función que creó la migración. Guardá.

Si activás el hook antes de insertar tu mail, ni vos vas a poder entrar. Si pasa, desactivá el hook, insertá el mail y volvé a activarlo.

### 8. Vercel

En [vercel.com](https://vercel.com), ingresando con GitHub (plan Hobby):

1. **Add New › Project** e importá el repo `Ludoteca`. Detecta Next.js solo: no toques la configuración de build.
2. En **Environment Variables**, cargá las variables de `.env.example` con los valores reales, para **Production** y **Preview**:
   - URL del proyecto y publishable key de Supabase.
   - La URL del **transaction pooler** (6543) como conexión de la app.
   - Si `.env.example` incluye la URL del session pooler, solo hace falta en tu PC para las migraciones: no la cargues en Vercel salvo que el agente lo pida.
3. **Deploy.** Anotá la URL (`https://<tu-proyecto>.vercel.app`) y volvé a sumarla en Google (paso 4.6) y en Supabase (paso 6).
4. **Settings › Functions › Function Regions:** elegí **São Paulo (`gru1`)**, o la misma región que tenga tu proyecto de Supabase. Vercel arranca en Washington por defecto, y cada consulta a la base cruzaría el continente. El plan Hobby permite una sola región, y alcanza.

### 9. SonarQube Cloud

1. En [sonarcloud.io](https://sonarcloud.io), **Start now** y entrá con **GitHub**.
2. Instalá la app de SonarQube Cloud en tu cuenta de GitHub. Podés limitarla al repo `Ludoteca`.
3. Creá la organización con el plan **Free**: alcanza porque el repo es público.
4. Importá `Ludoteca` y elegí **análisis automático**. Así lo define el diseño de 01-base: no hace falta workflow ni secretos en GitHub.

### 10. Prueba manual del registro cerrado (tarea 9.5)

Como Google está en modo Testing, un mail que no esté en sus Test users se frena en Google y nunca llega al hook de Supabase. Para probar el hook de verdad:

1. Sumá temporalmente un segundo Gmail tuyo a **Test users** en Google.
2. Ingresá con ese mail: tenés que ver «Esta cuenta no tiene acceso a Ludoteca», y en **Authentication › Users** de Supabase no tiene que aparecer ningún usuario nuevo.
3. Sacá ese mail de Test users.

---

## Etapa 02-nucleo-biblioteca

### Twitch, para acceder a IGDB

IGDB es de Twitch y se accede con una app registrada ahí. Es gratis para uso no comercial.

1. Entrá a [twitch.tv](https://www.twitch.tv) con tu cuenta (o creá una).
2. Activá la **verificación en dos pasos** en **Settings › Security and Privacy**. Pide un número de celular. Sin esto, Twitch no te deja registrar apps.
3. En [dev.twitch.tv/console](https://dev.twitch.tv/console), **Applications › Register Your Application**:
   - **Name:** tiene que ser único en todo Twitch, por ejemplo `ludoteca-<algo tuyo>`.
   - **OAuth Redirect URLs:** `http://localhost` (no se usa, pero es obligatorio).
   - **Category:** Application Integration.
   - **Client Type:** **Confidential**.
4. **Create**, después **Manage**: copiá el **Client ID** y tocá **New Secret** para generar el **Client Secret**.
5. Cargalos en `.env.local` y en Vercel (Production y Preview).

### Portadas subidas

Si el diseño de esta etapa guarda las portadas que subís en Supabase Storage, el agente te va a pedir crear un bucket o la **secret key** del paso 2 de 01-base. La secret key va solo en el servidor (`.env.local` y Vercel), nunca en una variable `NEXT_PUBLIC_`.

---

## Etapa 03-importacion

Hacé esto **antes del `/opsx:propose 03-importacion`**: el diseño del importador necesita ver archivos reales.

### Clave de la Steam Web API

1. En [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey), con tu cuenta de Steam. Pide una cuenta no limitada (que haya gastado al menos USD 5); con tu biblioteca, la tenés.
2. **Domain name:** la URL de Vercel sin `https://`. Es solo informativo.
3. Copiá la clave a `.env.local` y a Vercel. Es secreta.

### Privacidad del perfil de Steam

En Steam, **tu perfil › Editar perfil › Privacidad**:

- **Detalles del juego:** **Público**. Si no, la API no devuelve tus juegos.
- Desmarcá **«Mantener siempre privado mi tiempo de juego total»**. Si no, las horas llegan en cero.

Tené a mano el link de tu perfil o tu SteamID64: lo vas a pegar en Ludoteca al conectar Steam.

### Playnite, para Epic y GOG

1. Bajá Playnite de [playnite.link](https://playnite.link) e instalalo (es para Windows).
2. **Add-ons** (F9) › **Libraries**: configurá **Epic Games** y **GOG** e iniciá sesión en cada una con tu cuenta.
3. Menú principal › **Update game library**. Esperá a que aparezcan tus 211 juegos de Epic.
4. Instalá el exportador **PlayniteLibraryExport**: de [su repo](https://github.com/Dawnflare/PlayniteLibraryExport), bajá el archivo `.pext` de la carpeta `dist`, cerrá Playnite y hacé doble clic en el `.pext`.
5. Abrí Playnite y andá a **Extensions › Playnite Library Exporter › Export library now**. Elegí JSON.
6. Abrí el archivo y fijate que cada juego traiga la tienda (Epic, GOG) y el ID del juego en esa tienda. Es un proyecto chico: si le falta algo, avisale a Claude antes de seguir y buscamos otra forma de exportar.

### Muestras para los tests

- El archivo de Playnite **no va al repo**. Para los tests alcanza con una muestra de unos 5 juegos.
- El export de IGN está en el proyecto Ludoteca de claude.ai (`datos/ign-export.json`). Pedile a Claude una muestra de unos 5 juegos que cubra los casos raros: Beat, Quit, Backlog, sin ID de Steam y con dos estados.

---

## Etapa 04-tiendas-y-steam

### Secreto del cron

La sincronización diaria con Steam la dispara un cron de Vercel.

1. Generá una cadena al azar de **al menos 16 caracteres, solo letras y números** (sin símbolos ni espacios: viaja en un encabezado HTTP).
2. Cargala en Vercel como `CRON_SECRET`, en **Production**. Vercel la manda sola al llamar al cron, y la app rechaza cualquier llamada sin ella.

Para saber:

- Los crons **solo corren en producción**, no en los deploys de preview.
- En el plan Hobby corren una vez por día y en cualquier minuto dentro de la hora configurada.
- Si cambiás `CRON_SECRET`, vale recién desde el próximo deploy.

---

## Etapas 05, 06 y 07

Nada externo. Al terminar la `07-pwa`, instalá la app en el celu para probarla: en Android, desde Chrome, «Instalar app»; en iPhone, desde Safari, «Agregar a inicio».

---

## Etapa 08-suscripciones-y-avisos

### Resend, para los mails

1. Creá la cuenta en [resend.com](https://resend.com) **con el mismo mail con el que entrás a Ludoteca**. Sin un dominio propio, Resend manda desde `onboarding@resend.dev` y **solo al mail de tu cuenta de Resend**. Para una app personal alcanza y sobra.
2. **API Keys › Create API Key**, con permiso **Sending access**.
3. Copiala a `.env.local` y a Vercel. Es secreta.

### Notificaciones

- Las claves de las notificaciones (VAPID) las genera Claude Code con un comando. La **privada** la cargás en Vercel como secreta; la pública puede ir en una variable `NEXT_PUBLIC_`.
- En iPhone, las notificaciones solo funcionan con la app instalada (etapa 07).
- Los juegos gratis de Epic salen de una dirección pública: no hace falta cuenta.

---

## Dónde va cada clave

| Clave | Etapa | `.env.local` | Vercel | Pública |
|---|---|---|---|---|
| URL y publishable key de Supabase | 01 | Sí | Sí | Sí, por diseño |
| URL del transaction pooler (con contraseña) | 01 | Sí | Sí | **No** |
| URL del session pooler (con contraseña) | 01 | Sí | Solo si el agente lo pide | **No** |
| Client ID y secret de Google | 01 | No | No | **No**: van solo en Supabase |
| Client ID y secret de Twitch | 02 | Sí | Sí | **No** |
| Secret key de Supabase (si se usa) | 02 | Sí | Sí | **No** |
| Clave de la Steam Web API | 03 | Sí | Sí | **No** |
| `CRON_SECRET` | 04 | No hace falta | Sí (Production) | **No** |
| API key de Resend | 08 | Sí | Sí | **No** |
| Clave privada VAPID | 08 | Sí | Sí | **No** |

## Fuentes

- [Supabase: login con Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase: conectarse a Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: claves de la API](https://supabase.com/docs/guides/api/api-keys)
- [Supabase: proteger la API (apagar la Data API)](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase: tablas que ya no se exponen solas (2026)](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Supabase: auth hooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [Supabase: URLs de redirección](https://supabase.com/docs/guides/auth/redirect-urls)
- [Vercel: región de las funciones](https://vercel.com/docs/functions/configuring-functions/region)
- [Vercel: manejo de cron jobs y `CRON_SECRET`](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [SonarQube Cloud: empezar con GitHub](https://docs.sonarsource.com/sonarqube-cloud/getting-started/github/)
- [Generar claves de IGDB en Twitch (guía de RomM)](https://docs.romm.app/3.9.0/Getting-Started/Generate-API-Keys/)
- [Clave de la Steam API: requiere cuenta completa](https://easyadmin.readthedocs.io/en/latest/steamapikey/)
- [PlayniteLibraryExport](https://github.com/Dawnflare/PlayniteLibraryExport)
- [Resend: límite del dominio resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
