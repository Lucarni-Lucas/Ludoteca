# Proposal

## Why

Después de la carga inicial, la biblioteca tiene que mantenerse al día sola en lo que se pueda: las compras nuevas de Steam y las horas jugadas. Además, los juegos prestados por la familia de Steam se pierden todos juntos cuando se sale de la familia, y hoy no hay forma de reflejarlo.

## What Changes

- Pantalla de Tiendas: qué tiendas se sincronizan solas, cuáles se importan o se cargan a mano, y cuáles no están conectadas.
- Sincronización con Steam una vez por día y a pedido: actualiza horas y suma juegos nuevos.
- Panel de la familia de Steam con «Salí de la familia» y la opción de deshacer.

## Capabilities

### New Capabilities
- `tiendas`: la pantalla de Tiendas y el estado de cada tienda del usuario.
- `sincronizacion-steam`: mantener al día las copias de Steam y sus horas después de la carga inicial.
- `familia-steam`: copias prestadas por la familia de Steam y la salida de la familia.

### Modified Capabilities
Ninguna.

## Impact

- Steam Web API y cron diario de Vercel.
- La cuenta de Steam se conecta en `03-importacion`; este cambio la reutiliza.
- Referencias de diseño: `design/Escritorio-Tiendas.dc.html` y `design/Movil-Tiendas.dc.html`. Diferencia ya decidida: GOG y Microsoft Store no figuran como sincronizadas.
