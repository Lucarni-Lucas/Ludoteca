## Purpose

Seguir lo que el usuario paga en suscripciones de juegos, lo que está por vencer y cuánto las usa, y registrar qué juegos pierde cuando una termina.

## ADDED Requirements

### Requirement: Suscripciones que se renuevan
El sistema SHALL permitir cargar una suscripción que se renueva con nombre, precio, moneda (código de 3 letras), cada cuánto se cobra (mensual, trimestral, semestral o anual) y fecha del próximo cobro.

#### Scenario: Game Pass mensual
- **WHEN** el usuario carga Game Pass a ARS 1000 por mes, con próximo cobro el 18 nov
- **THEN** aparece en «Se renuevan solas» con «Cobra el 18 nov»

### Requirement: Próximo cobro automático
Cuando pasa la fecha de cobro de una suscripción que se renueva, el sistema SHALL mover el próximo cobro un período hacia adelante.

#### Scenario: Pasó el cobro
- **WHEN** pasa el 18 nov y Game Pass es mensual
- **THEN** el próximo cobro de Game Pass pasa a ser el 18 dic

### Requirement: Total por mes en cada moneda
El sistema SHALL mostrar el total por mes de las suscripciones activas que se renuevan, por separado en cada moneda y sin convertir. Cada suscripción suma su precio dividido la cantidad de meses de su período.

#### Scenario: Mensual más anual
- **WHEN** el usuario tiene Game Pass a ARS 1000 por mes y Nintendo Switch Online a ARS 12000 por año
- **THEN** ve «Por mes en ARS: ARS 2000»

#### Scenario: Dos monedas
- **WHEN** además tiene Humble Choice a USD 12 por mes
- **THEN** ve por separado «ARS 2000» y «USD 12»

#### Scenario: Precio sin cargar
- **WHEN** una suscripción en USD no tiene precio cargado
- **THEN** el total en USD dice «Cargá el precio en la lista»

### Requirement: Suscripciones que no se renuevan
El sistema SHALL permitir cargar una suscripción que no se renueva con nombre, descripción y fecha de vencimiento. Muestra una barra con el tiempo que queda y MUST NOT sumar al total por mes.

#### Scenario: Trackmania por un año
- **WHEN** el usuario carga «Trackmania · Club», pagado una vez por un año, que vence el 14 ene 2027
- **THEN** aparece en «No se renuevan» con «Vence el 14 ene 2027 · faltan 70 días» y no suma al total

### Requirement: Vence pronto
Una suscripción que no se renueva SHALL mostrar «Vence pronto» cuando faltan tantos días como los del aviso de vencimiento o menos.

#### Scenario: Faltan pocos días
- **WHEN** el aviso de vencimiento es de 7 días y a Ubisoft+ le faltan 5 días
- **THEN** Ubisoft+ muestra «Vence pronto» y su barra en ámbar

### Requirement: Resumen de suscripciones
Arriba de la pantalla, el sistema SHALL mostrar el total por mes de cada moneda, el próximo cobro y la próxima suscripción en vencer.

#### Scenario: Tarjetas de resumen
- **WHEN** el usuario abre Suscripciones
- **THEN** ve el total por moneda, «Próximo cobro: Game Pass · 18 nov» y «Próximo vencimiento: Ubisoft+ · 22 nov»

### Requirement: Copias de una suscripción
Una copia de tipo Suscripción SHALL poder vincularse a una suscripción del usuario.

#### Scenario: Vincular una copia
- **WHEN** el usuario vincula la copia de Forza Horizon 5 a su suscripción Game Pass
- **THEN** Forza Horizon 5 figura entre los juegos de Game Pass

### Requirement: Uso del mes
Cada suscripción que se renueva SHALL mostrar cuántas horas jugó el usuario este mes con sus juegos vinculados, según las sesiones del diario. Si no jugó nada, MUST decirlo en ámbar.

#### Scenario: Uso con sesiones
- **WHEN** este mes el usuario registró sesiones por 6 h en juegos de Game Pass
- **THEN** Game Pass muestra «Este mes jugaste 6 h con juegos de Game Pass»

#### Scenario: Sin uso
- **WHEN** este mes no hay sesiones en juegos de Humble Choice
- **THEN** Humble Choice muestra en ámbar «Este mes no jugaste nada de lo que te dio»

### Requirement: Terminar una suscripción
Al terminar una suscripción, o al pasar la fecha de vencimiento de una que no se renueva, el sistema SHALL marcar sus copias vinculadas como «Ya no lo tengo» con el motivo «Terminó la suscripción» y pasarla a «Terminadas».

#### Scenario: Cancelar Game Pass
- **WHEN** el usuario termina Game Pass y Ori tenía una copia vinculada
- **THEN** la copia de Ori queda marcada «Ya no lo tengo» y Game Pass aparece en «Terminadas» con «1 juego que ya no tenés»

#### Scenario: Vence una prepaga
- **WHEN** pasa la fecha de vencimiento de Ubisoft+
- **THEN** Ubisoft+ pasa a «Terminadas» y sus copias vinculadas quedan marcadas

### Requirement: Reactivar una suscripción
El sistema SHALL permitir reactivar una suscripción terminada, que vuelve a dejar vigentes las copias que su fin había marcado.

#### Scenario: Volver a Game Pass
- **WHEN** el usuario reactiva Game Pass
- **THEN** la copia de Ori vuelve a estar vigente
