# Proposal

## Why

Es el problema que dio origen a Ludoteca: con juegos repartidos en muchas tiendas, se olvida dónde está cada uno y se termina comprando dos veces el mismo juego. Además, «lo jugué» se confunde con «es mío» en los juegos de suscripción o de la familia. Con la biblioteca ya cargada, ahora se puede responder bien.

## What Changes

- Buscador «¿Lo tengo?» que responde con un veredicto: «Ya lo tenés», «Prestado por tu familia», «Por suscripción», «Ya no lo tenés» o «No lo tenés».
- Aviso cuando un juego está dos veces, con la opción «Fue a propósito», y aviso antes de agregar algo que ya tenés.
- «Dónde comprarlo» para los juegos que no tenés: tienda, link, precio, moneda y fecha en que lo viste.

## Capabilities

### New Capabilities
- `lo-tengo`: responder si el usuario ya tiene un juego y de qué forma.
- `duplicados`: detectar y avisar los juegos repetidos.
- `donde-comprarlo`: guardar dónde y a cuánto se vio un juego que el usuario no tiene.

### Modified Capabilities
Ninguna.

## Impact

- Lógica de dominio que también corre en el navegador (más adelante, sin conexión).
- Referencias de diseño: `design/Escritorio-LoTengo.dc.html`, `design/Movil-LoTengo.dc.html` y el aviso de duplicado y «dónde comprarlo» en `design/Main.dc.html`.
