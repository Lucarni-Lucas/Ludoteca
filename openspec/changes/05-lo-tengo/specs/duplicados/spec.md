## Purpose

Avisar cuando un juego está repetido en la biblioteca y antes de agregar o comprar algo que el usuario ya tiene, respetando los duplicados intencionales.

## ADDED Requirements

### Requirement: Qué es un duplicado
Un juego SHALL considerarse duplicado cuando tiene dos o más copias vigentes propias (Comprado, Gratis o Físico) que no están marcadas como duplicado intencional.

#### Scenario: Gratis en Epic y comprado en Steam
- **WHEN** Civilization VI tiene una copia vigente «Epic Games · Gratis» y otra «Steam · Comprado»
- **THEN** Civilization VI es un duplicado

#### Scenario: Duplicado intencional
- **WHEN** Stardew Valley tiene una copia en Steam y otra física de Switch marcada como intencional
- **THEN** Stardew Valley no es un duplicado

#### Scenario: Copias que no son propias
- **WHEN** un juego tiene una copia Comprado y otra Suscripción
- **THEN** no es un duplicado

### Requirement: Aviso en la biblioteca
Por cada juego duplicado, la biblioteca SHALL mostrar un aviso con dónde y cuándo consiguió cada copia, y las opciones «Ver el juego» y «Fue a propósito». La portada del juego muestra la marca «2 COPIAS».

#### Scenario: Aviso de Civilization VI
- **WHEN** el usuario abre la biblioteca con Civilization VI duplicado
- **THEN** ve «Civilization VI está dos veces en tu biblioteca» con la explicación de cada copia

### Requirement: Fue a propósito
Elegir «Fue a propósito» SHALL marcar como intencional la copia más nueva del juego, y el aviso desaparece.

#### Scenario: Descartar el aviso
- **WHEN** el usuario toca «Fue a propósito» en el aviso de Civilization VI
- **THEN** la copia de Steam, que es la más nueva, queda marcada como intencional y el aviso desaparece

#### Scenario: Tercera copia
- **WHEN** después el usuario agrega una tercera copia propia de Civilization VI
- **THEN** vuelve a aparecer el aviso

### Requirement: Marcar a mano un duplicado intencional
El sistema SHALL permitir marcar o desmarcar cualquier copia como duplicado intencional desde la ficha del juego.

#### Scenario: Desmarcar
- **WHEN** el usuario desmarca como intencional la copia de Switch de Stardew Valley
- **THEN** Stardew Valley pasa a ser un duplicado y aparece su aviso

### Requirement: Aviso antes de agregar algo que ya tenés
Mientras el aviso «Antes de comprar algo que ya tenés» esté prendido (lo está por defecto), al agregar una copia propia de un juego que ya es propio, o al agregar a «Quiero jugarlo» un juego propio, el sistema SHALL avisar dónde lo tiene y pedir confirmación.

#### Scenario: Agregar algo que ya tiene
- **WHEN** el usuario agrega una copia de Epic a Hades, que ya tiene comprado en Steam
- **THEN** ve «Ya tenés Hades en Steam (comprado, nov 2021). ¿Lo agregás igual?» y puede confirmar o cancelar

#### Scenario: Confirmar igual
- **WHEN** el usuario confirma que lo agrega igual
- **THEN** la copia se agrega y Hades pasa a ser un duplicado
