## ADDED Requirements

### Requirement: Aislamiento entre usuarios
El sistema MUST mostrar y modificar solo los datos del usuario con la sesión iniciada. Pedir un dato de otro usuario MUST responder igual que si no existiera.

#### Scenario: Juego de otro usuario
- **WHEN** el usuario A abre el link de un juego de la biblioteca del usuario B
- **THEN** ve «No encontramos este juego», igual que con un juego que no existe

#### Scenario: Cambio sobre datos ajenos
- **WHEN** el usuario A intenta cambiar el estado de un juego del usuario B
- **THEN** el cambio se rechaza y el juego de B queda igual
