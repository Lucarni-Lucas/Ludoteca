## RENAMED Requirements

- FROM: `### Requirement: Textos en español rioplatense`
- TO: `### Requirement: Textos en el idioma elegido`

## MODIFIED Requirements

### Requirement: Textos en el idioma elegido
Todos los textos de la interfaz SHALL estar en el idioma elegido. En español, SHALL usar el rioplatense, con voseo.

#### Scenario: Llamado a la acción
- **WHEN** la app está en español e invita a cargar un juego
- **THEN** usa formas como «Agregá» o «Cargalo», no «Agrega» ni «Añade»

#### Scenario: Llamado a la acción en inglés
- **WHEN** la app está en inglés e invita a cargar un juego
- **THEN** usa el mismo mensaje en inglés, por ejemplo «Add a game»
