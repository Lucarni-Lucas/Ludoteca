## Purpose

Permitir que el usuario puntúe cada juego de 0.0 a 10.0 con un decimal y mostrar una etiqueta de texto según el rango.

## ADDED Requirements

### Requirement: Escala del puntaje
El puntaje SHALL ir de 0.0 a 10.0 con un decimal y es opcional. Un juego sin puntaje MUST distinguirse de un juego con 0.0.

#### Scenario: Juego sin puntuar
- **WHEN** un juego no tiene puntaje
- **THEN** no muestra número ni etiqueta de puntaje

#### Scenario: Puntaje cero
- **WHEN** el usuario le pone 0.0 a un juego
- **THEN** el juego muestra «0.0 · Horrible»

#### Scenario: Más de un decimal
- **WHEN** el usuario escribe 9.35
- **THEN** el puntaje se guarda como 9.4

### Requirement: Etiqueta por rango
El sistema SHALL mostrar junto al puntaje la etiqueta de su rango: 0.0–1.9 Horrible, 2.0–2.9 Muy malo, 3.0–3.9 Malo, 4.0–4.9 Flojo, 5.0–5.9 Regular, 6.0–6.9 Pasable, 7.0–7.9 Bueno, 8.0–8.9 Muy bueno, 9.0–9.9 Excelente y 10.0 Obra maestra.

#### Scenario: Excelente
- **WHEN** un juego tiene 9.8
- **THEN** su etiqueta es «Excelente»

#### Scenario: Obra maestra
- **WHEN** un juego tiene 10.0
- **THEN** su etiqueta es «Obra maestra»

### Requirement: Controles del puntaje
El sistema SHALL permitir cargar el puntaje con un número grande, una barra deslizable y botones de −0.1 y +0.1 que no pasan de 0.0 ni de 10.0.

#### Scenario: Tope superior
- **WHEN** el puntaje es 10.0 y el usuario toca +0.1
- **THEN** el puntaje sigue en 10.0

### Requirement: Quitar el puntaje
El sistema SHALL permitir dejar un juego sin puntaje después de haberlo puntuado.

#### Scenario: Quitar
- **WHEN** el usuario quita el puntaje de un juego que tenía 7.0
- **THEN** el juego queda sin puntaje
