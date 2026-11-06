## Purpose

Permitir que el usuario escriba su opinión sobre cada juego y lo clasifique con etiquetas libres, distintas del estado.

## ADDED Requirements

### Requirement: Reseña
Cada juego SHALL poder tener una reseña en texto libre, opcional, que el usuario puede escribir, editar y borrar desde la ficha.

#### Scenario: Escribir la reseña
- **WHEN** el usuario escribe su reseña de Hollow Knight y la guarda
- **THEN** la ficha de Hollow Knight muestra la reseña en «Tu reseña»

### Requirement: Etiquetas
Cada juego SHALL poder tener varias etiquetas libres. Al escribir una etiqueta, el sistema sugiere las que el usuario ya usó.

#### Scenario: Etiqueta nueva
- **WHEN** el usuario agrega la etiqueta «Para jugar con amigos» a Sea of Thieves
- **THEN** la ficha de Sea of Thieves muestra esa etiqueta

#### Scenario: Sugerencia
- **WHEN** el usuario escribe «Para» en las etiquetas de otro juego
- **THEN** se le sugiere «Para jugar con amigos»

### Requirement: Quitar etiquetas
El sistema SHALL permitir quitar una etiqueta de un juego. Una etiqueta que ya no usa ningún juego deja de sugerirse.

#### Scenario: Última etiqueta
- **WHEN** el usuario quita «Narrativo» del único juego que la tenía
- **THEN** «Narrativo» ya no se sugiere
