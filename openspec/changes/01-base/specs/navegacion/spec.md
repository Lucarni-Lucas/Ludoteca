## Purpose

Definir cómo se mueve el usuario entre las secciones de Ludoteca en la PC y en el celu, y el estilo visual y de accesibilidad que comparten todas las pantallas.

## ADDED Requirements

### Requirement: Menú en pantallas anchas
En pantallas de 768 px de ancho o más, el sistema SHALL mostrar arriba el logo, el menú de secciones, el buscador de «¿Lo tengo?», el botón «Agregar juego» y el acceso a Ajustes (avatar con la inicial del usuario).

#### Scenario: Encabezado en la PC
- **WHEN** el usuario abre la app en una ventana de 1440 px de ancho
- **THEN** ve el menú arriba y el botón «Agregar juego» y el avatar siempre visibles

### Requirement: Barra inferior en el celu
En pantallas de menos de 768 px de ancho, el sistema SHALL mostrar una barra fija abajo con las secciones Biblioteca, ¿Lo tengo?, Suscripciones y Tiendas, marcando la actual.

#### Scenario: Navegación en el celu
- **WHEN** el usuario abre la app en un celu de 390 px de ancho y toca una sección de la barra inferior
- **THEN** ve esa sección y la sección queda marcada en la barra

### Requirement: Acceso a Ajustes en el celu
El sistema SHALL ofrecer en el celu, arriba de la pantalla, un acceso a Ajustes (avatar con la inicial del usuario) visible desde cualquier sección de la barra inferior.

#### Scenario: Abrir Ajustes desde el celu
- **WHEN** el usuario toca el acceso a Ajustes estando en la Biblioteca en el celu
- **THEN** ve la pantalla de Ajustes

### Requirement: Secciones todavía sin construir
El sistema SHALL mostrar en el menú y en la barra inferior las secciones Biblioteca, ¿Lo tengo?, Suscripciones y Tiendas aunque todavía no estén construidas. Una sección sin construir SHALL mostrar su título y el aviso «Próximamente».

#### Scenario: Sección sin construir
- **WHEN** el usuario entra a una sección que todavía no está construida, por ejemplo Suscripciones antes de que exista
- **THEN** ve el título de la sección y el aviso «Próximamente»

### Requirement: Estadísticas oculta
La sección Estadísticas MUST quedar oculta en el menú hasta que exista.

#### Scenario: Estadísticas oculta
- **WHEN** el usuario mira el menú de la PC
- **THEN** no aparece la opción «Estadísticas»

### Requirement: Colores por significado
El sistema SHALL usar tema oscuro y colores con significado fijo: verde lima para lo que está en curso y las acciones principales, ámbar para avisos y para lo que tenés pero no es tuyo, azul para Terminado y coral para Dejado.

#### Scenario: Color de un estado terminado
- **WHEN** se muestra un juego con estado del grupo Terminado
- **THEN** su etiqueta de estado se ve en azul

### Requirement: Zonas táctiles mínimas
Todo botón, link o control que se pueda tocar SHALL tener una zona táctil de al menos 44 × 44 px.

#### Scenario: Botón chico
- **WHEN** se mide cualquier botón de una pantalla en un celu de 390 px
- **THEN** su zona táctil mide al menos 44 × 44 px

### Requirement: Uso desde 360 px
Todas las pantallas SHALL poder usarse desde 360 px de ancho sin desplazamiento horizontal.

#### Scenario: Pantalla angosta
- **WHEN** el usuario abre cualquier pantalla en 360 px de ancho
- **THEN** no aparece desplazamiento horizontal y todo el contenido es alcanzable

### Requirement: Navegación con teclado
Todo lo que se puede accionar SHALL ser un botón o un link, alcanzable con el teclado y con el foco visible.

#### Scenario: Recorrido con tabulador
- **WHEN** el usuario recorre una pantalla con la tecla Tab
- **THEN** cada control recibe el foco en orden y el foco se ve

### Requirement: Textos en español rioplatense
Todos los textos de la interfaz SHALL estar en español rioplatense, con voseo.

#### Scenario: Llamado a la acción
- **WHEN** la app invita a cargar un juego
- **THEN** usa formas como «Agregá» o «Cargalo», no «Agrega» ni «Añade»
