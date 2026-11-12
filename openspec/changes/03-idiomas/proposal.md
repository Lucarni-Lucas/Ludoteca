# Proposal

## Why

Ludoteca está pensada para varios usuarios y no todos hablan español. Conviene resolverlo ahora, con solo dos etapas construidas: cada pantalla nueva con los textos escritos sueltos en los componentes es una pantalla más para rehacer después. Desde esta etapa, cada texto nuevo nace en los dos idiomas.

## What Changes

- Dos idiomas: español rioplatense (con voseo, como hasta ahora) e inglés.
- Todos los textos de la interfaz pasan a catálogos de mensajes, uno por idioma, incluidos los de `01-base` y `02-nucleo-biblioteca`: pantallas, botones, avisos, errores, ayudas «?» y nombres por defecto (estados, tipos de copia, motivos de pérdida).
- Idioma por defecto según el navegador: español si el navegador está en español, en cualquier variante; inglés en cualquier otro caso. Vale también en la pantalla de ingreso.
- Selector de idioma en Ajustes, guardado en la cuenta: se respeta en todos los dispositivos y manda sobre el navegador.
- Fechas en el formato de cada idioma.
- Lo que escribe el usuario (tiendas propias, detalles de copias, notas) y los datos de IGDB (títulos, desarrolladores) no se traducen.

## Capabilities

### New Capabilities
- `idiomas`: los idiomas disponibles, cómo se elige el idioma y qué se traduce.

### Modified Capabilities
- `navegacion`: los textos de la interfaz salen en el idioma elegido; en español, siguen en rioplatense con voseo.

## Impact

- Primeros ajustes guardados en la cuenta del usuario. `07-diario-y-estados-propios` los reutiliza para las etiquetas del puntaje.
- Una dependencia de internacionalización para Next.js, sin prefijo de idioma en las URL (ver `docs/decisiones.md` §2). Se justifica en el diseño.
- Los nombres por defecto que hoy se guardan en la base (por ejemplo, los estados) se tienen que poder mostrar en el idioma elegido sin perder el nombre que el usuario les ponga después.
- Tests: los dos catálogos tienen las mismas claves, y los e2e de las pantallas existentes corren también en inglés.
- No cambia el diseño visual: las pantallas son las de `design/`, con textos más largos o más cortos según el idioma, sin desplazamiento horizontal desde 360 px.

## Fuera de alcance

- Otros idiomas y otras variantes del español.
- URL distintas por idioma (`/en/...`) y posicionamiento en buscadores.
- Traducir los datos del catálogo de IGDB o lo que escribe el usuario.
