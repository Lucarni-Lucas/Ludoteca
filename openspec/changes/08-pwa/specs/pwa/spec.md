## Purpose

Que Ludoteca se pueda instalar como una app y que la biblioteca, las fichas y «¿Lo tengo?» se puedan consultar sin conexión.

## ADDED Requirements

### Requirement: App instalable
Ludoteca SHALL poder instalarse en Android, iPhone y la PC con el nombre «Ludoteca», su ícono y el fondo oscuro del tema, y abrirse sin la barra del navegador.

#### Scenario: Instalar en Android
- **WHEN** el usuario abre Ludoteca en Chrome de Android y elige «Instalar app»
- **THEN** aparece el ícono de Ludoteca en el inicio y al abrirlo no se ve la barra del navegador

#### Scenario: Instalar en iPhone
- **WHEN** el usuario elige «Agregar a inicio» en Safari
- **THEN** aparece el ícono de Ludoteca en el inicio

### Requirement: Lectura sin conexión
Sin conexión, el sistema SHALL mostrar la biblioteca, las fichas y «¿Lo tengo?» con los últimos datos descargados, y avisar desde cuándo son esos datos.

#### Scenario: «¿Lo tengo?» sin señal
- **WHEN** el usuario busca «civ» en «¿Lo tengo?» sin conexión
- **THEN** ve el veredicto de Civilization VI y el aviso «Sin conexión · datos de hace 2 h»

### Requirement: Acciones deshabilitadas sin conexión
Sin conexión, las acciones que guardan cambios SHALL quedar deshabilitadas, con un aviso que explique por qué.

#### Scenario: Cambiar estado sin conexión
- **WHEN** el usuario intenta cambiar el estado de un juego sin conexión
- **THEN** el botón está deshabilitado y ve «Necesitás conexión para guardar cambios»

### Requirement: Volver a estar en línea
Al recuperar la conexión, el sistema SHALL actualizar solo los datos y volver a habilitar las acciones.

#### Scenario: Vuelve la señal
- **WHEN** el celu recupera la conexión con la app abierta
- **THEN** los datos se actualizan, desaparece el aviso de sin conexión y las acciones vuelven a habilitarse
