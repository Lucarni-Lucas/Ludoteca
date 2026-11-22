# Proposal

## Why

Es el corazón de Ludoteca: tener los juegos en un solo lugar, con dónde los tenés, en qué estado están y cuánto te gustaron. Sin esto no hay nada que importar, buscar ni filtrar.

## What Changes

- Buscar juegos en IGDB mientras escribís y agregarlos; cargar a mano los que no están; vincular después un juego cargado a mano con IGDB.
- Catálogo compartido y biblioteca de cada usuario, con correcciones propias (duración, sin fin, portada).
- Copias: varias por juego, con tienda, tipo (incluido «Otro», que cuenta como propio) y fecha opcional; marca «Ya no lo tengo» que conserva todo el historial.
- Formulario de agregar con varias copias (una fila por copia, con «Agregar otra copia»), puntaje y horas jugadas opcionales y «Año de lanzamiento» validado. Los campos opcionales lo dicen.
- Horas jugadas cargadas a mano desde la ficha. Las horas de Steam llegan en `05-tiendas-y-steam` y las de las sesiones del diario, en `07-diario-y-estados-propios`.
- Estados en cuatro grupos fijos, con los estados por defecto (incluido el nuevo «Jugado») y el registro de cada cambio de estado.
- Biblioteca en grilla (PC) y lista (celu), con filtros combinables de selección múltiple, rangos libres y orden.
- Puntaje de 0.0 a 10.0, que se muestra solo con el número. Las etiquetas por rango pasan a `07-diario-y-estados-propios`, como opción de Ajustes.
- Marca «Sin interés» para juegos que tenés pero no pensás jugar.
- Quitar un juego de la biblioteca (por ejemplo, uno agregado por error), con confirmación y sin vuelta atrás.
- Ayuda «?» junto a los términos propios de Ludoteca (Sin interés, Familia, Otro, A mano, Ya no lo tengo, Sin fin, Año de lanzamiento, Duración).
- Si la base de datos no responde, aviso con «Reintentar» en menos de 15 segundos, en lugar de quedarse cargando hasta el límite de Vercel.
- Aislamiento entre usuarios: cada usuario ve y cambia solo sus datos. Viene de `01-base`, donde todavía no había datos de usuario para probarlo.

## Capabilities

### New Capabilities
- `catalogo`: buscar y agregar juegos desde IGDB o a mano, sus datos y las correcciones de cada usuario.
- `copias`: cómo tiene el usuario cada juego (tienda, tipo, fecha) y la marca «Ya no lo tengo».
- `estados`: grupos fijos, estados por defecto, el estado de cada juego y el registro de sus cambios.
- `biblioteca`: la vista de la biblioteca, sus filtros, su orden y la marca «Sin interés».
- `puntaje`: el puntaje de cada juego.

### Modified Capabilities
- `acceso`: suma el aislamiento de los datos de cada usuario.
- `navegacion`: suma la ayuda «?» y el aviso cuando los datos no cargan.

## Impact

- Integración con IGDB desde el servidor (credenciales de Twitch).
- Primeras tablas de datos: catálogo, biblioteca, copias, tiendas, estados y registro de cambios de estado.
- Referencias de diseño: `design/Main.dc.html`, `design/Movil-Biblioteca.dc.html`, `design/Movil-Filtros.dc.html`, `design/Escritorio-Agregar.dc.html`, `design/Movil-Agregar.dc.html`, `design/Movil-AgregarManual.dc.html`, `design/Escritorio-Juego.dc.html` y `design/Movil-Juego.dc.html`.
- Diferencias con el diseño ya decididas (ver `docs/decisiones.md` §5): filtros de PC con selección múltiple y rango de puntaje; formulario de agregar con varias copias y puntaje; puntaje sin etiqueta de texto.
- Conexión a la base preparada para las funciones de Vercel, que se suspenden entre pedidos: con tiempos máximos de espera, para que una conexión trabada no deje colgada la app.

## Fuera de alcance

- Notas del diario, también desde el formulario de agregar (`07-diario-y-estados-propios`).
- Etiquetas del puntaje y sus nombres (`07-diario-y-estados-propios`).
- Textos en inglés (`03-idiomas`).
