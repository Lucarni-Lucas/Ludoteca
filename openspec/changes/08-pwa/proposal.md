# Proposal

## Why

El caso de uso principal es consultar «¿Lo tengo?» con el celu en la mano, a veces con mala señal. Además, las notificaciones de la etapa siguiente necesitan la app instalada, sobre todo en iPhone.

## What Changes

- App instalable en el celu y en la PC, con nombre, ícono y colores de Ludoteca.
- Lectura sin conexión de la biblioteca, las fichas y «¿Lo tengo?», con los últimos datos descargados.
- Las acciones que guardan cambios se deshabilitan sin conexión, con un aviso.
- Al volver la conexión, los datos se actualizan solos.

## Capabilities

### New Capabilities
- `pwa`: instalación de la app y funcionamiento sin conexión.

### Modified Capabilities
Ninguna.

## Impact

- Manifest y service worker en la app de Next.js.
- Copia local de la biblioteca en el dispositivo.
- Base para Web Push en `09-suscripciones-y-avisos`.
