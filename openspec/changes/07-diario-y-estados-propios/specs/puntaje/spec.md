## MODIFIED Requirements

### Requirement: Cómo se muestra el puntaje
El sistema SHALL mostrar el puntaje con su número y un decimal. Solo si el usuario activó «Mostrar etiqueta del puntaje» en Ajustes, el sistema SHALL mostrar al lado la etiqueta de su rango.

#### Scenario: Puntaje alto
- **WHEN** un juego tiene 9.8 y «Mostrar etiqueta del puntaje» está apagado
- **THEN** su tarjeta y su ficha muestran «9.8», sin «Excelente» ni otra etiqueta

#### Scenario: Puntaje con etiqueta
- **WHEN** un juego tiene 9.8 y «Mostrar etiqueta del puntaje» está prendido
- **THEN** su tarjeta y su ficha muestran «9.8 · Excelente»

## ADDED Requirements

### Requirement: Etiquetas por rango
Los rangos de las etiquetas SHALL ser fijos, y cada uno arranca con su etiqueta por defecto: 0.0–1.9 Horrible, 2.0–2.9 Muy malo, 3.0–3.9 Malo, 4.0–4.9 Flojo, 5.0–5.9 Regular, 6.0–6.9 Pasable, 7.0–7.9 Bueno, 8.0–8.9 Muy bueno, 9.0–9.9 Excelente y 10.0 Obra maestra.

#### Scenario: Obra maestra
- **WHEN** las etiquetas están prendidas y un juego tiene 10.0
- **THEN** su etiqueta es «Obra maestra»

#### Scenario: Borde de un rango
- **WHEN** las etiquetas están prendidas y un juego tiene 8.9 y otro 9.0
- **THEN** el primero dice «Muy bueno» y el segundo, «Excelente»

#### Scenario: Puntaje cero
- **WHEN** las etiquetas están prendidas y un juego tiene 0.0
- **THEN** su etiqueta es «Horrible»

### Requirement: Mostrar etiqueta del puntaje
Ajustes SHALL tener el interruptor «Mostrar etiqueta del puntaje», apagado por defecto. La elección se guarda en la cuenta del usuario y vale en todos sus dispositivos.

#### Scenario: Usuario nuevo
- **WHEN** un usuario entra por primera vez
- **THEN** el interruptor está apagado y los puntajes se ven sin etiqueta

#### Scenario: Prender las etiquetas
- **WHEN** el usuario prende «Mostrar etiqueta del puntaje»
- **THEN** la biblioteca y las fichas muestran la etiqueta junto a cada puntaje, sin recargar la página

### Requirement: Renombrar las etiquetas
El sistema SHALL permitir cambiar desde Ajustes el nombre de la etiqueta de cada rango, sin cambiar el rango. Un nombre vacío vuelve a la etiqueta por defecto. Cada nombre tiene hasta 20 caracteres.

#### Scenario: Renombrar «Excelente»
- **WHEN** el usuario cambia «Excelente» por «Joya»
- **THEN** un juego con 9.4 muestra «9.4 · Joya»

#### Scenario: Volver a la etiqueta por defecto
- **WHEN** el usuario borra el nombre «Joya» y guarda
- **THEN** la etiqueta de 9.0–9.9 vuelve a ser «Excelente»

#### Scenario: Nombre demasiado largo
- **WHEN** el usuario escribe un nombre de más de 20 caracteres
- **THEN** ve «La etiqueta puede tener hasta 20 caracteres» y no se guarda
