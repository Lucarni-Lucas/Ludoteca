## Purpose

Permitir que el usuario puntúe cada juego de 0.0 a 10.0 con un decimal, al agregarlo o después.

## ADDED Requirements

### Requirement: Escala del puntaje
El puntaje SHALL ir de 0.0 a 10.0 con un decimal y es opcional. Un juego sin puntaje MUST distinguirse de un juego con 0.0.

#### Scenario: Juego sin puntuar
- **WHEN** un juego no tiene puntaje
- **THEN** no muestra número ni etiqueta de puntaje

#### Scenario: Puntaje cero
- **WHEN** el usuario le pone 0.0 a un juego
- **THEN** el juego muestra «0.0»

#### Scenario: Más de un decimal
- **WHEN** el usuario escribe 9.35
- **THEN** el puntaje se guarda como 9.4

### Requirement: Cómo se muestra el puntaje
El sistema SHALL mostrar el puntaje con su número y un decimal, sin una etiqueta de texto al lado.

#### Scenario: Puntaje alto
- **WHEN** un juego tiene 9.8
- **THEN** su tarjeta y su ficha muestran «9.8», sin «Excelente» ni otra etiqueta

### Requirement: Controles del puntaje
El sistema SHALL permitir cargar el puntaje con un número grande, una barra deslizable y botones de −0.1 y +0.1 que no pasan de 0.0 ni de 10.0.

#### Scenario: Tope superior
- **WHEN** el puntaje es 10.0 y el usuario toca +0.1
- **THEN** el puntaje sigue en 10.0

### Requirement: Puntaje al agregar
El formulario para agregar un juego, desde IGDB o a mano, SHALL permitir cargarle el puntaje con los mismos controles de la ficha. El puntaje es opcional y el formulario arranca sin puntaje.

#### Scenario: Agregar con puntaje
- **WHEN** el usuario agrega Hades desde IGDB con 9.5 de puntaje
- **THEN** Hades aparece en su biblioteca con 9.5

#### Scenario: Agregar sin tocar el puntaje
- **WHEN** el usuario agrega Outer Wilds sin tocar el puntaje
- **THEN** Outer Wilds queda sin puntaje, no con 0.0

### Requirement: Quitar el puntaje
El sistema SHALL permitir dejar un juego sin puntaje después de haberlo puntuado.

#### Scenario: Quitar
- **WHEN** el usuario quita el puntaje de un juego que tenía 7.0
- **THEN** el juego queda sin puntaje
