# Proposal

## Why

Las categorías clásicas son rígidas: el usuario quiere nombrar sus propios estados, anotar por qué pausó o dejó un juego, y llevar un diario de lo que juega. Además, las horas jugadas de los juegos que ninguna tienda informa (Switch, itch.io, Game Pass) solo pueden salir de lo que el usuario anote.

## What Changes

- Diario de cada juego: sesiones (fecha, duración y nota), notas sueltas (fecha y texto) y cambios de estado, con la entrada más nueva arriba. Nota opcional también desde el formulario de agregar.
- Regla única de horas jugadas: total a mano, o lo que informen las tiendas, o la suma de las sesiones.
- Estados editables (renombrar, color, orden, ocultar, crear) dentro de los grupos fijos, y motivos editables.
- Formulario opcional al pausar o dejar un juego: horas, progreso, hasta dónde llegó, motivos y nota.
- Reseña y etiquetas libres.
- Etiquetas del puntaje: rangos fijos con nombres editables y un interruptor en Ajustes para mostrarlas, apagado por defecto.

## Capabilities

### New Capabilities
- `diario`: sesiones, notas, historial de cambios de estado y cálculo de las horas jugadas.
- `estados-propios`: personalizar estados y motivos, y el formulario al pausar o dejar un juego.
- `resena-y-etiquetas`: reseña en texto libre y etiquetas por juego.

### Modified Capabilities
- `puntaje`: la etiqueta de cada rango, opcional y con nombre editable.

## Impact

- Usa el registro de cambios de estado que se guarda desde `02-nucleo-biblioteca` y los ajustes de la cuenta que crea `03-idiomas`.
- Referencias de diseño: `design/Escritorio-Juego.dc.html`, `design/Movil-Juego.dc.html`, `design/Escritorio-Estado.dc.html`, `design/Movil-Estado.dc.html`, `design/Escritorio-Estados.dc.html` y `design/Movil-Estados.dc.html`.
