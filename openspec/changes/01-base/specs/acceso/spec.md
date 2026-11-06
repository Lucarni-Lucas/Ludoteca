## Purpose

Permitir que solo las personas autorizadas entren a Ludoteca y que cada una vea y cambie únicamente sus propios datos.

## ADDED Requirements

### Requirement: Ingreso con Google
El sistema SHALL permitir ingresar con una cuenta de Google y, al terminar, llevar al usuario a la Biblioteca o a la pantalla que había pedido.

#### Scenario: Ingreso de un usuario permitido
- **WHEN** un usuario cuyo mail está en la lista de permitidos ingresa con Google
- **THEN** entra a la Biblioteca con su sesión iniciada

#### Scenario: Vuelve a la pantalla pedida
- **WHEN** un usuario sin sesión abre el link de la ficha de un juego e ingresa con Google
- **THEN** después de ingresar ve esa ficha

### Requirement: Registro cerrado
El sistema MUST rechazar el ingreso de cualquier mail que no esté en la lista de mails permitidos, sin crear datos para esa cuenta.

#### Scenario: Mail no permitido
- **WHEN** alguien ingresa con un mail de Google que no está en la lista de permitidos
- **THEN** ve el mensaje «Esta cuenta no tiene acceso a Ludoteca»
- **AND** no se crea ningún dato para esa cuenta

### Requirement: Sesión obligatoria
El sistema MUST pedir el ingreso para ver cualquier pantalla o dato, salvo la pantalla de ingreso.

#### Scenario: Acceso sin sesión
- **WHEN** alguien sin sesión abre cualquier pantalla de la app
- **THEN** ve la pantalla de ingreso

### Requirement: Cerrar sesión
El sistema SHALL permitir cerrar la sesión desde Ajustes, en la sección Cuenta.

#### Scenario: Cierre de sesión
- **WHEN** el usuario toca «Cerrar sesión» en Ajustes › Cuenta
- **THEN** la sesión se cierra y ve la pantalla de ingreso

### Requirement: Aislamiento entre usuarios
El sistema MUST mostrar y modificar solo los datos del usuario con la sesión iniciada. Pedir un dato de otro usuario MUST responder igual que si no existiera.

#### Scenario: Juego de otro usuario
- **WHEN** el usuario A abre el link de un juego de la biblioteca del usuario B
- **THEN** ve «No encontramos este juego», igual que con un juego que no existe

#### Scenario: Cambio sobre datos ajenos
- **WHEN** el usuario A intenta cambiar el estado de un juego del usuario B
- **THEN** el cambio se rechaza y el juego de B queda igual
