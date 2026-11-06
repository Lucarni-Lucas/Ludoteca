## Purpose

Avisar al usuario, por notificación o por mail, de cobros, vencimientos y juegos deseados que están gratis, según cómo lo configure.

## ADDED Requirements

### Requirement: Configuración de avisos
El sistema SHALL permitir elegir cuántos días antes de cada cobro avisar (por defecto 3), cuántos días antes de cada vencimiento (por defecto 7) y por qué medio: Notificación (por defecto), Mail o Las dos.

#### Scenario: Cambiar el medio
- **WHEN** el usuario elige «Las dos»
- **THEN** los avisos siguientes le llegan por notificación y por mail

### Requirement: Aviso de cobro
El sistema SHALL avisar una sola vez por cada cobro, el día que falten los días configurados.

#### Scenario: Tres días antes
- **WHEN** el aviso de cobro es de 3 días y Game Pass cobra el 18 nov
- **THEN** el 15 nov llega «Game Pass te cobra en 3 días» y no se repite

### Requirement: Aviso de vencimiento
El sistema SHALL avisar una sola vez por cada vencimiento de una suscripción que no se renueva, el día que falten los días configurados.

#### Scenario: Siete días antes
- **WHEN** el aviso de vencimiento es de 7 días y Ubisoft+ vence el 22 nov
- **THEN** el 15 nov llega «Ubisoft+ vence en 7 días y no se renueva»

### Requirement: Precisión de los avisos
Los avisos SHALL revisarse una vez por día: llegan el día que corresponde, pero no a una hora exacta.

#### Scenario: Hora del aviso
- **WHEN** corresponde avisar un cobro un día dado
- **THEN** el aviso llega en algún momento de ese día

### Requirement: Interruptores de avisos
El sistema SHALL ofrecer interruptores para «Antes de comprar algo que ya tenés» y «Juegos de «Quiero jugarlo» que estén gratis», los dos prendidos por defecto. «Bajadas de precio» MUST verse deshabilitado, con la etiqueta «Próximamente».

#### Scenario: Apagar un aviso
- **WHEN** el usuario apaga «Antes de comprar algo que ya tenés»
- **THEN** al agregar una copia de un juego que ya tiene no se le pide confirmación

### Requirement: Juegos deseados gratis en Epic
Una vez por día, el sistema SHALL revisar los juegos gratis de Epic Games y avisar si alguno está en «Quiero jugarlo», una sola vez por cada promoción.

#### Scenario: Juego deseado gratis
- **WHEN** Frostpunk está en «Quiero jugarlo» y aparece entre los gratis de la semana de Epic
- **THEN** llega «Frostpunk está gratis en Epic Games» una sola vez

### Requirement: Permiso de notificaciones
Para avisar por notificación, el sistema SHALL pedir permiso en el dispositivo. Si el permiso se niega o el dispositivo no lo permite, MUST explicarlo y sugerir el mail.

#### Scenario: iPhone sin instalar
- **WHEN** el usuario elige «Notificación» en un iPhone sin haber instalado la app
- **THEN** ve que en iPhone las notificaciones solo funcionan con la app instalada, y la sugerencia de usar el mail

### Requirement: Mails
Los avisos por mail SHALL enviarse al mail de la cuenta del usuario.

#### Scenario: Aviso por mail
- **WHEN** el medio elegido es «Mail» y corresponde un aviso de cobro
- **THEN** el aviso llega al mail con el que el usuario ingresa
