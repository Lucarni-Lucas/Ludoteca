## Purpose

Mostrar la biblioteca del usuario y permitir recorrerla con filtros combinables, rangos libres y distintos órdenes, dejando afuera los juegos marcados «Sin interés».

## ADDED Requirements

### Requirement: Vista de la biblioteca
En pantallas de 768 px o más, el sistema SHALL mostrar la biblioteca como grilla de portadas; en pantallas más angostas, como lista. Cada juego muestra portada, título, puntaje si tiene, estado, horas jugadas y sus copias por tienda.

#### Scenario: Grilla en la PC
- **WHEN** el usuario abre la Biblioteca en 1440 px
- **THEN** ve una grilla de portadas con el título, el puntaje, el estado y las tiendas de cada juego

#### Scenario: Lista en el celu
- **WHEN** el usuario abre la Biblioteca en 390 px
- **THEN** ve una lista con el título, el estado, las horas y las tiendas de cada juego

### Requirement: Copias en la tarjeta
Cada tarjeta SHALL mostrar sus copias como etiquetas: solo la tienda si la copia es Comprado; tienda y detalle si es Otro con detalle; tienda y tipo en los demás casos; y tachada si ya no la tiene. Un juego en «Quiero jugarlo» sin copias muestra «Sin comprar».

#### Scenario: Copia de suscripción
- **WHEN** un juego tiene una copia Suscripción en Game Pass
- **THEN** su etiqueta dice «Game Pass · Suscripción»

#### Scenario: Copia de otro tipo
- **WHEN** Celeste tiene una copia Otro en Steam con el detalle «Regalo»
- **THEN** su etiqueta dice «Steam · Regalo»

#### Scenario: Juego sin copias
- **WHEN** un juego en «Quiero jugarlo» no tiene copias
- **THEN** su tarjeta muestra «Sin comprar» y la portada con borde punteado

### Requirement: Resumen de la biblioteca
Arriba de la biblioteca el sistema SHALL mostrar cuántos juegos tiene el usuario, en cuántas tiendas, cuántos hay en «Quiero jugarlo» y cuántos ya no tiene. Los juegos «Sin interés» no se cuentan.

#### Scenario: Resumen
- **WHEN** el usuario tiene 14 juegos con copias vigentes en 7 tiendas, 1 en «Quiero jugarlo» y 1 sin copias vigentes
- **THEN** ve «14 juegos en 7 tiendas · 1 en «Quiero jugarlo» · 1 que ya no tenés»

### Requirement: Filtro por estado
El sistema SHALL mostrar los estados agrupados por grupo, cada uno con su cantidad de juegos. El usuario puede elegir varios estados a la vez o un grupo entero; «Todos» quita el filtro.

#### Scenario: Grupo entero
- **WHEN** el usuario elige el grupo «Dejado»
- **THEN** ve solo los juegos en «Abandonado» y «Lo probé»

#### Scenario: Varios estados
- **WHEN** el usuario elige «Quiero jugarlo» y «Pendiente»
- **THEN** ve los juegos que están en cualquiera de los dos

### Requirement: Filtros combinables
Todos los filtros SHALL combinarse entre sí: un juego se muestra solo si cumple todos los filtros activos. Dentro de un mismo filtro, elegir varias opciones muestra los juegos que cumplen cualquiera de ellas.

#### Scenario: Tienda y estado
- **WHEN** el usuario elige la tienda «Steam» y el grupo «Terminado»
- **THEN** ve solo los juegos terminados que tienen al menos una copia en Steam

### Requirement: Rango de duración estimada
El sistema SHALL filtrar por duración estimada con «desde» y «hasta» libres, en horas. Los atajos (menos de 5 h, 5–15 h, 15–40 h, más de 40 h) solo completan esos números. Con este filtro activo, los juegos sin duración quedan afuera.

#### Scenario: Rango libre
- **WHEN** el usuario escribe desde 3 hasta 8 h
- **THEN** ve los juegos cuya duración estimada está entre 3 y 8 h, ambas incluidas

#### Scenario: Atajo
- **WHEN** el usuario toca el atajo «5–15 h»
- **THEN** los campos quedan en 5 y 15 y se aplica ese rango

#### Scenario: Juegos sin fin
- **WHEN** el filtro de duración está activo
- **THEN** los juegos sin fin y los de duración desconocida no aparecen

### Requirement: Rango de horas jugadas
El sistema SHALL filtrar por horas jugadas con «desde» y «hasta» libres. Los atajos son Sin abrir (0 h), menos de 2 h, 2–20 h y más de 20 h. Con este filtro activo, los juegos sin copias quedan afuera.

#### Scenario: Sin abrir
- **WHEN** el usuario toca «Sin abrir»
- **THEN** ve los juegos que tiene y en los que jugó 0 h

#### Scenario: Juegos sin fin incluidos
- **WHEN** el usuario filtra más de 20 h jugadas
- **THEN** aparecen también los juegos sin fin que jugó más de 20 h

### Requirement: Rango de puntaje
El sistema SHALL filtrar por puntaje con «desde» y «hasta» entre 0.0 y 10.0. Con este filtro activo, los juegos sin puntaje quedan afuera.

#### Scenario: Puntaje alto
- **WHEN** el usuario filtra desde 9.0
- **THEN** ve solo los juegos con puntaje de 9.0 o más

### Requirement: Filtro por tienda y por tipo de copia
El sistema SHALL filtrar por tienda y por tipo de copia (Comprado, Gratis, Suscripción, Familia, Físico, Otro, Ya no lo tengo), con selección múltiple y la cantidad de juegos de cada opción.

#### Scenario: Tipo Otro
- **WHEN** el usuario elige el tipo «Otro»
- **THEN** ve los juegos que tienen al menos una copia de tipo Otro, tengan detalle o no

#### Scenario: Ya no lo tengo
- **WHEN** el usuario elige el tipo «Ya no lo tengo»
- **THEN** ve los juegos que tienen al menos una copia marcada «Ya no lo tengo»

### Requirement: Búsqueda por título
El sistema SHALL filtrar la biblioteca por título sin distinguir mayúsculas ni acentos.

#### Scenario: Búsqueda parcial
- **WHEN** el usuario escribe «civ» en la búsqueda de la biblioteca
- **THEN** ve Civilization VI

### Requirement: Orden
El sistema SHALL ordenar por agregados recientemente (por defecto), mi puntaje (de mayor a menor), horas jugadas (de mayor a menor), duración estimada (de menor a mayor) o título (A–Z). Los juegos sin el dato quedan al final.

#### Scenario: Orden por puntaje
- **WHEN** el usuario ordena por «Mi puntaje»
- **THEN** ve primero los de mayor puntaje y al final los que no tienen puntaje

#### Scenario: Orden por duración
- **WHEN** el usuario ordena por «Duración estimada»
- **THEN** ve primero los más cortos y al final los sin fin y los de duración desconocida

### Requirement: Filtros según el ancho
En pantallas de 1024 px o más, los filtros SHALL estar en una columna al costado; en pantallas más angostas, arriba. En el celu, los filtros están en una pantalla aparte con «Limpiar» y un botón que dice cuántos juegos se van a ver.

#### Scenario: Pantalla de filtros del celu
- **WHEN** el usuario elige filtros en el celu
- **THEN** el botón de abajo dice, por ejemplo, «Ver 5 juegos», con la cantidad que cumple los filtros

### Requirement: Sin resultados
Si ningún juego cumple los filtros, el sistema SHALL decirlo y ofrecer limpiar todos los filtros.

#### Scenario: Combinación vacía
- **WHEN** ningún juego cumple los filtros elegidos
- **THEN** ve «No hay juegos con esta combinación de filtros» y el botón «Limpiar filtros»

### Requirement: Marca «Sin interés»
El sistema SHALL permitir marcar y desmarcar juegos como «Sin interés», de a uno o varios a la vez. Esos juegos no aparecen en la biblioteca ni en los conteos, salvo que el usuario active el filtro «Mostrar sin interés».

#### Scenario: Ocultar un juego
- **WHEN** el usuario marca 8BitMMO como «Sin interés»
- **THEN** 8BitMMO deja de aparecer en la biblioteca y en la cantidad de «Pendiente»

#### Scenario: Ver los juegos sin interés
- **WHEN** el usuario activa «Mostrar sin interés»
- **THEN** ve también los juegos marcados, con la marca visible

#### Scenario: Marcar varios
- **WHEN** el usuario selecciona 20 juegos y los marca «Sin interés»
- **THEN** los 20 dejan de aparecer en la biblioteca
