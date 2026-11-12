# Proposal

## Why

Las suscripciones se acumulan sin darse cuenta o se vencen sin aviso, y cuando terminan se pierden juegos sin registrarlo. Además, los avisos (cobros, vencimientos, juegos deseados que están gratis) son lo que hace que Ludoteca trabaje por el usuario y no solo guarde datos.

## What Changes

- Suscripciones que se renuevan (precio, moneda, cada cuánto se cobran y próximo cobro) y suscripciones que no se renuevan (fecha de vencimiento).
- Total por mes en cada moneda, sin convertir; las anuales suman su precio dividido 12; las que no se renuevan no suman.
- Uso del mes de cada suscripción, según las sesiones del diario.
- Terminar una suscripción marca como «Ya no lo tengo» las copias que dependían de ella y la pasa al historial.
- Avisos configurables antes de cobros y vencimientos, por notificación, mail o los dos.
- Aviso cuando un juego de «Quiero jugarlo» está gratis en Epic.

## Capabilities

### New Capabilities
- `suscripciones`: registrar suscripciones, sus totales por moneda, su uso y su fin.
- `avisos`: configuración y envío de avisos por notificación y por mail.

### Modified Capabilities
Ninguna.

## Impact

- Cron diario de Vercel, Web Push (VAPID) y Resend.
- Endpoint público, no oficial, de los gratis de Epic: hay que confirmarlo con `/opsx:explore` al arrancar el cambio.
- Usa las sesiones del diario (`07-diario-y-estados-propios`) y la app instalable (`08-pwa`).
- Referencias de diseño: `design/Escritorio-Suscripciones.dc.html`, `design/Movil-Suscripciones.dc.html` y la sección de avisos de `design/Escritorio-Tiendas.dc.html`.
