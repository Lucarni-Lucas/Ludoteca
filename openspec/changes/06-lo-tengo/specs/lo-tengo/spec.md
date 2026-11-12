## Purpose

Responder en segundos, antes de comprar, si el usuario ya tiene un juego, de qué forma lo tiene y si es realmente suyo.

## ADDED Requirements

### Requirement: Búsqueda en la biblioteca
El buscador «¿Lo tengo?» SHALL buscar a partir de 2 letras en toda la biblioteca del usuario, sin distinguir mayúsculas ni acentos, incluyendo los juegos «Sin interés» y los que ya no tiene.

#### Scenario: Búsqueda corta
- **WHEN** el usuario escribe «civ»
- **THEN** ve el resultado de Civilization VI

#### Scenario: Una sola letra
- **WHEN** el usuario escribió una sola letra
- **THEN** ve «Escribí al menos 2 letras del nombre»

### Requirement: Regla de propiedad
Un juego SHALL contar como propio si tiene al menos una copia vigente de tipo Comprado, Gratis, Físico u Otro.

#### Scenario: Gratis cuenta como propio
- **WHEN** un juego tiene solo una copia vigente «Epic Games · Gratis»
- **THEN** cuenta como propio

#### Scenario: Otro cuenta como propio
- **WHEN** Celeste tiene solo una copia vigente de tipo Otro en Steam, con el detalle «Regalo»
- **THEN** cuenta como propio y el veredicto es «Ya lo tenés»

### Requirement: Veredicto
El sistema SHALL responder con el primer veredicto que corresponda: «Ya lo tenés» si es propio; «Prestado por tu familia» si tiene una copia Familia vigente; «Por suscripción» si tiene una copia Suscripción vigente; «Ya no lo tenés» si solo tiene copias marcadas; «No lo tenés» si no tiene copias.

#### Scenario: Propio
- **WHEN** el usuario busca Hades, que tiene en Steam comprado
- **THEN** el veredicto es «Ya lo tenés», en verde lima

#### Scenario: Prestado por la familia
- **WHEN** el usuario busca Portal 2, que solo tiene por la familia de Steam
- **THEN** el veredicto es «Prestado por tu familia», en ámbar, con la nota «Es de alguien de tu familia de Steam. Si salís de la familia, lo perdés.»

#### Scenario: Por suscripción
- **WHEN** el usuario busca Forza Horizon 5, que solo tiene por Game Pass
- **THEN** el veredicto es «Por suscripción», en ámbar, con la nota «Lo jugás con Game Pass, pero no es tuyo: si cancelás la suscripción, lo perdés.»

#### Scenario: Ya no lo tiene
- **WHEN** el usuario busca Ori and the Will of the Wisps, cuya única copia de Game Pass está marcada «Ya no lo tengo»
- **THEN** el veredicto es «Ya no lo tenés», con la nota «Lo jugaste con Game Pass. Tu puntaje y tus horas siguen guardados.»

#### Scenario: Está en la wishlist
- **WHEN** el usuario busca Frostpunk, que está en «Quiero jugarlo» sin copias
- **THEN** el veredicto es «No lo tenés», con la nota «Está en «Quiero jugarlo».»

### Requirement: Detalle de las copias
Cada resultado SHALL listar sus copias con tienda, tipo y fecha, mostrando tachadas las que ya no tiene.

#### Scenario: Copias de Civilization VI
- **WHEN** el usuario busca Civilization VI
- **THEN** ve «Epic Games · Gratis · may 2020» y «Steam · Comprado · ago 2023»

### Requirement: Juegos «Sin interés»
Un juego marcado «Sin interés» SHALL aparecer en «¿Lo tengo?» con su veredicto normal y una nota que lo indique.

#### Scenario: Juego sin interés
- **WHEN** el usuario busca 8BitMMO, que tiene en Steam y marcó «Sin interés»
- **THEN** el veredicto es «Ya lo tenés» con la nota «Lo marcaste sin interés»

### Requirement: Juego que no está en la biblioteca
Si la búsqueda no encuentra nada, el sistema SHALL decirlo y ofrecer «Agregar a «Quiero jugarlo»» y «Ya lo tengo en otro lado».

#### Scenario: Sin resultados
- **WHEN** el usuario busca «Hades II» y no está en su biblioteca
- **THEN** ve «“Hades II” no está en tu biblioteca», con las dos opciones

#### Scenario: Ya lo tiene en otro lado
- **WHEN** el usuario toca «Ya lo tengo en otro lado»
- **THEN** va a agregar el juego con el título buscado y una copia para completar

### Requirement: Búsquedas recientes
El sistema SHALL mostrar las últimas 4 búsquedas, guardadas en el dispositivo, para repetirlas con un toque.

#### Scenario: Repetir una búsqueda
- **WHEN** el usuario toca «Frostpunk» en «Búsquedas recientes»
- **THEN** ve otra vez el resultado de Frostpunk

### Requirement: Dónde buscamos
En pantallas anchas, el sistema SHALL mostrar al costado en qué fuentes se busca (cada tienda, las suscripciones, la familia de Steam y los juegos a mano) con cuántos juegos aporta cada una.

#### Scenario: Fuentes de búsqueda
- **WHEN** el usuario abre «¿Lo tengo?» en la PC
- **THEN** ve, por ejemplo, «Steam 6 · Familia de Steam 1 · itch.io 1 · a mano»
