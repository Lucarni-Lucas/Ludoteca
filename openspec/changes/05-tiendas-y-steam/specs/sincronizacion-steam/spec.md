## Purpose

Mantener al día las copias de Steam del usuario y sus horas jugadas sin que tenga que cargarlas, una vez hecha la carga inicial.

## ADDED Requirements

### Requirement: Sincronización diaria y a pedido
Con la cuenta de Steam conectada, el sistema SHALL sincronizar una vez por día y cada vez que el usuario toque «Sincronizar ahora».

#### Scenario: Sincronizar a pedido
- **WHEN** el usuario toca «Sincronizar ahora» en la tarjeta de Steam
- **THEN** la sincronización corre y la tarjeta muestra «hace un momento»

### Requirement: Horas jugadas al día
Cada sincronización SHALL actualizar las horas jugadas de todas las copias de Steam.

#### Scenario: Horas nuevas
- **WHEN** el usuario jugó 3 h más a Hades desde la última sincronización
- **THEN** después de sincronizar la copia de Steam de Hades suma esas 3 h

### Requirement: Juegos nuevos de Steam
Un juego que aparece en Steam y no está en la biblioteca SHALL sumarse con una copia «Steam · Comprado»: en «Jugando» si se jugó en las últimas dos semanas y en «Pendiente» si no. El usuario MUST ver un aviso con los juegos sumados.

#### Scenario: Compra nueva sin jugar
- **WHEN** el usuario compró Celeste en Steam y no lo abrió
- **THEN** después de sincronizar Celeste aparece en «Pendiente» y ve «Sumamos 1 juego nuevo de Steam: Celeste»

#### Scenario: Compra nueva ya jugada
- **WHEN** el usuario compró un juego en Steam y lo jugó 2 h esta semana
- **THEN** el juego aparece en «Jugando»

### Requirement: No pisar lo que cambió el usuario
La sincronización MUST NOT cambiar el tipo de una copia, el estado, el puntaje ni la marca «Sin interés» que haya puesto el usuario.

#### Scenario: Tipo cambiado a mano
- **WHEN** el usuario cambió su copia de Steam de Team Fortress 2 a «Gratis» y después se sincroniza
- **THEN** la copia sigue siendo «Gratis»

### Requirement: Juegos que desaparecen de Steam
Si una copia de Steam deja de aparecer en la cuenta, el sistema MUST NOT marcarla sola; SHALL avisar al usuario y ofrecer marcarla «Ya no lo tengo».

#### Scenario: Reembolso
- **WHEN** un juego que el usuario reembolsó deja de aparecer en Steam
- **THEN** ve el aviso «Elden Ring ya no aparece en tu cuenta de Steam» con la opción de marcarlo «Ya no lo tengo»

### Requirement: Falla de Steam
Si Steam no responde o devuelve un error, la sincronización MUST NOT cambiar nada y SHALL informar que no se pudo sincronizar.

#### Scenario: Steam caído
- **WHEN** Steam no responde durante la sincronización
- **THEN** la biblioteca queda igual y la tarjeta de Steam dice «No se pudo sincronizar, probamos de nuevo mañana»
