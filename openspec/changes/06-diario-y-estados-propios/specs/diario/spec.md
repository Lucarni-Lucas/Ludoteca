## Purpose

Llevar el diario de cada juego (sesiones jugadas y cambios de estado) y calcular las horas jugadas de forma única, sin contar dos veces.

## ADDED Requirements

### Requirement: Diario del juego
La ficha de cada juego SHALL mostrar su diario, del más reciente al más viejo, con sesiones y cambios de estado, y un encabezado con la cantidad de sesiones y sus horas.

#### Scenario: Diario de Disco Elysium
- **WHEN** el usuario abre la ficha de Disco Elysium
- **THEN** ve «Diario · 9 sesiones · 18 h» y las entradas ordenadas de la más nueva a la más vieja

### Requirement: Registrar una sesión
El sistema SHALL permitir registrar una sesión con fecha (por defecto hoy), duración y una nota opcional, y después editarla o borrarla.

#### Scenario: Sesión nueva
- **WHEN** el usuario registra hoy una sesión de 2 h 10 min con la nota «Me cuesta dejar de leer cada diálogo»
- **THEN** la sesión aparece arriba de todo en el diario

#### Scenario: Duración inválida
- **WHEN** el usuario intenta registrar una sesión de 0 min
- **THEN** ve «La sesión tiene que durar al menos 1 minuto» y no se guarda

### Requirement: Cambios de estado en el diario
Cada cambio de estado SHALL aparecer en el diario con su fecha y el estado nuevo, junto con lo que se haya anotado en el formulario del cambio.

#### Scenario: Cambio con motivo
- **WHEN** el usuario pasó Elden Ring a «Lo probé» con el motivo «Muy difícil» a las 3 h
- **THEN** el diario muestra «Pasó a Lo probé · Muy difícil · a las 3 h» con la fecha

### Requirement: Horas jugadas
Las horas jugadas de un juego SHALL ser: el total cargado a mano si existe; si no, la suma de las horas que informan sus tiendas; si ninguna tienda informa horas, la suma de las sesiones del diario.

#### Scenario: Total a mano
- **WHEN** el usuario cargó a mano 70 h para Hades, que en Steam tiene 64 h
- **THEN** Hades muestra 70 h

#### Scenario: Horas de la tienda
- **WHEN** Hades tiene 64 h en Steam, no tiene total a mano y el usuario anotó sesiones por 5 h
- **THEN** Hades muestra 64 h, y las sesiones quedan solo como notas del diario

#### Scenario: Suma de sesiones
- **WHEN** Stardew Valley solo tiene una copia física de Switch y sesiones de 2 h 10 min y 3 h 05 min
- **THEN** Stardew Valley muestra 5 h 15 min

### Requirement: Total a mano
El sistema SHALL permitir cargar, cambiar y borrar el total de horas a mano de un juego. Al borrarlo, vuelve a aplicarse la regla de horas jugadas.

#### Scenario: Borrar el total a mano
- **WHEN** el usuario borra el total a mano de Hades
- **THEN** Hades vuelve a mostrar las 64 h de Steam
