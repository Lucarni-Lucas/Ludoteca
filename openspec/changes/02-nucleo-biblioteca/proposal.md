# Proposal

## Why

Es el corazón de Ludoteca: tener los juegos en un solo lugar, con dónde los tenés, en qué estado están y cuánto te gustaron. Sin esto no hay nada que importar, buscar ni filtrar.

## What Changes

- Buscar juegos en IGDB mientras escribís y agregarlos; cargar a mano los que no están; vincular después un juego cargado a mano con IGDB.
- Catálogo compartido y biblioteca de cada usuario, con correcciones propias (duración, sin fin, portada).
- Copias: varias por juego, con tienda, tipo y fecha opcional; marca «Ya no lo tengo» que conserva todo el historial.
- Estados en cuatro grupos fijos, con los estados por defecto (incluido el nuevo «Jugado») y el registro de cada cambio de estado.
- Biblioteca en grilla (PC) y lista (celu), con filtros combinables de selección múltiple, rangos libres y orden.
- Puntaje de 0.0 a 10.0 con etiquetas por rango.
- Marca «Sin interés» para juegos que tenés pero no pensás jugar.
- Aislamiento entre usuarios: cada usuario ve y cambia solo sus datos. Viene de `01-base`, donde todavía no había datos de usuario para probarlo.

## Capabilities

### New Capabilities
- `catalogo`: buscar y agregar juegos desde IGDB o a mano, sus datos y las correcciones de cada usuario.
- `copias`: cómo tiene el usuario cada juego (tienda, tipo, fecha) y la marca «Ya no lo tengo».
- `estados`: grupos fijos, estados por defecto, el estado de cada juego y el registro de sus cambios.
- `biblioteca`: la vista de la biblioteca, sus filtros, su orden y la marca «Sin interés».
- `puntaje`: el puntaje de cada juego y su etiqueta.

### Modified Capabilities
- `acceso`: suma el aislamiento de los datos de cada usuario.

## Impact

- Integración con IGDB desde el servidor (credenciales de Twitch).
- Primeras tablas de datos: catálogo, biblioteca, copias, tiendas, estados y registro de cambios de estado.
- Referencias de diseño: `design/Main.dc.html`, `design/Movil-Biblioteca.dc.html`, `design/Movil-Filtros.dc.html`, `design/Escritorio-Agregar.dc.html`, `design/Movil-Agregar.dc.html`, `design/Movil-AgregarManual.dc.html`, `design/Escritorio-Juego.dc.html` y `design/Movil-Juego.dc.html`.
- Diferencias con el diseño ya decididas (ver `docs/decisiones.md` §5): filtros de PC con selección múltiple y rango de puntaje.
