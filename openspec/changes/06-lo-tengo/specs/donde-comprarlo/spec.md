## Purpose

Guardar dónde y a qué precio vio el usuario un juego que todavía no tiene, para recordarlo cuando lo quiera comprar.

## ADDED Requirements

### Requirement: Guardar un precio visto
El sistema SHALL permitir guardar, para un juego, uno o varios precios vistos, cada uno con tienda, link, precio, moneda y la fecha en que se vio (por defecto, hoy).

#### Scenario: Precio de Frostpunk
- **WHEN** el usuario guarda Frostpunk en Microsoft Store a ARS 400, con su link
- **THEN** el juego muestra «Microsoft Store · ARS 400 · Visto el 5 nov»

### Requirement: Moneda
La moneda SHALL ser un código de 3 letras (ISO 4217), con ARS y USD como sugerencias. Un código con otro formato MUST rechazarse.

#### Scenario: Moneda inválida
- **WHEN** el usuario escribe «pesos» como moneda
- **THEN** ve «Usá el código de 3 letras de la moneda, por ejemplo ARS o USD» y no se guarda

### Requirement: Mostrar dónde comprarlo
Los juegos sin copias propias vigentes que tengan precios guardados SHALL mostrar el precio visto más recientemente en la biblioteca, en «¿Lo tengo?» y en la ficha.

#### Scenario: Tarjeta de la biblioteca
- **WHEN** el usuario mira Frostpunk en la biblioteca
- **THEN** la tarjeta muestra «Dónde comprarlo: Microsoft Store · ARS 400»

### Requirement: Aviso de precio viejo
Si el precio mostrado tiene más de 30 días, el sistema SHALL avisar que puede haber cambiado, indicando hace cuánto se vio.

#### Scenario: Precio de hace dos meses
- **WHEN** el precio de Frostpunk se vio hace 2 meses
- **THEN** se muestra «Precio de hace 2 meses, puede haber cambiado»

### Requirement: Ir a la tienda y editar
Cada precio SHALL ofrecer «Ir a la tienda», que abre su link, y la opción de editarlo o borrarlo.

#### Scenario: Actualizar el precio
- **WHEN** el usuario edita el precio de Frostpunk a ARS 350
- **THEN** se guarda con la fecha de hoy y desaparece el aviso de precio viejo
