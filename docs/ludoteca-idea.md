# Ludoteca: idea del proyecto

> **Nombre provisorio.** Este documento resume la idea y las decisiones de **producto y diseño** que ya se tomaron. Las decisiones **técnicas** (stack, modelo de datos final, APIs concretas) quedan abiertas para la próxima etapa.
>
> Diseño visual (lienzo con todas las pantallas, privado en claude.ai): https://claude.ai/code/artifact/2b191eed-bfa8-40d9-a1bb-bff0f638a914

---

## 1. Qué es

Una **web personal, responsive e instalable en el celular** (PWA) para:

1. Llevar la **biblioteca de videojuegos** que juego, con **puntaje, estado y diario**. Es como Simkl (que es para películas y series), pero para juegos.
2. Saber **en qué tienda tengo cada juego**, para no comprar el mismo juego dos veces en tiendas distintas.
3. Seguir mis **suscripciones** (lo que pago por mes y lo que se vence).

Más adelante, si hace falta, se empaqueta como app móvil con un wrapper (por ejemplo, Capacitor).

**Restricciones:**
- Es de uso personal.
- **Costo cero**: solo servicios con plan gratis (Vercel, Render, Supabase o similares).

## 2. Problemas que resuelve

| Problema | Cómo lo resuelve |
|---|---|
| Tengo juegos repartidos en Steam, Epic, Microsoft Store, GOG, etc., me olvido dónde están y termino comprando duplicados. | La búsqueda **¿Lo tengo?** revisa todas las tiendas. Además hay un aviso cuando un juego aparece dos veces. |
| Confundo "lo jugué" con "es mío" (por ejemplo, juegos de Game Pass o de la familia de Steam). | Cada copia tiene un **tipo** (comprado, gratis, suscripción, familia, físico o ya no lo tengo). Las copias de suscripción o de familia se muestran como "lo tenés, pero no es tuyo". |
| Quiero jugar algo más adelante y no me acuerdo dónde estaba barato (por ejemplo, Frostpunk en Microsoft Store a ARS 400). | Cada juego en "Quiero jugarlo" puede guardar **dónde comprarlo**: tienda, link, precio y fecha en que lo vi. |
| Las suscripciones se acumulan sin que me dé cuenta, o se vencen sin aviso (por ejemplo, Trackmania se paga un año y no se renueva). | Hay una **pestaña de Suscripciones** con el total por mes en cada moneda, más avisos antes de cada cobro y de cada vencimiento. |
| Las categorías clásicas (completado, abandonado, por jugar) son demasiado rígidas. | Los **estados son editables** y se agrupan en grupos fijos. Al pausar o dejar un juego se puede anotar cuánto jugué y por qué lo dejé. |
| Algunos juegos indie (de itch.io, game jams o mods) no aparecen en ningún catálogo. | Se pueden **cargar a mano**. |

## 3. Conceptos del dominio

### 3.1 Juego
- **Origen:** viene de **IGDB**, con una búsqueda que sugiere juegos desde las 2 o 3 letras (por ejemplo, "Hol" → Hollow Knight). Si no aparece, se **carga a mano**.
- **Juegos cargados a mano:** quedan marcados como "agregado a mano". Más adelante se pueden **vincular** a IGDB sin perder el puntaje ni el diario.
- **Datos:** título, año, desarrollador, portada, duración estimada y link.
- **Duración estimada:** sale de IGDB y siempre se puede **editar a mano**. Los juegos sin final no tienen duración.
- **Portada:** se usa la real cuando existe (de IGDB, de Steam, de SteamGridDB o subida por mí). Si no hay, se muestra un bloque de color con las iniciales del juego.

### 3.2 Copia ("cómo lo tengo")
Un juego puede tener **varias copias**. Cada copia tiene:

- **Tienda:** Steam, Epic Games, GOG, Microsoft Store, Game Pass, Nintendo Switch, itch.io, PlayStation, EA app, Ubisoft Connect, Battle.net, Amazon Games u otra.
- **Tipo:**
  - **Comprado**
  - **Gratis**: lo reclamé, por ejemplo en los gratis semanales de Epic.
  - **Suscripción**: Game Pass, etc. No es mío.
  - **Familia**: me lo presta alguien de mi familia de Steam (se guarda de quién). No es mío.
  - **Físico**
  - **Ya no lo tengo**: queda como historial. Pasa cuando salgo de la familia de Steam, se termina la suscripción o vendo el juego. El juego conserva su puntaje, sus horas y su diario.
- **Fecha** en que lo conseguí.
- **Duplicado intencional:** una marca para cuando tengo dos copias a propósito (por ejemplo, una para PC y otra para la Switch). Con esa marca no salta el aviso de duplicado.

**Regla de "lo tengo":** un juego cuenta como mío si tiene al menos una copia Comprado, Gratis o Físico. Si solo tiene copias de Suscripción o de Familia, se muestra como "lo tenés, pero no es tuyo".

### 3.3 Dónde comprarlo (para juegos que no tengo)
- Se guarda **tienda, link, precio, moneda y la fecha en que lo vi**. Se carga a mano.
- Se muestra un aviso del tipo "precio de hace X meses, puede haber cambiado".
- **A futuro (opcional):** actualizar el precio solo, en las tiendas donde se pueda.

### 3.4 Estado
- Cada juego tiene **un solo estado**, y cada estado pertenece a un **grupo fijo**:

| Grupo | Estados por defecto |
|---|---|
| En curso | Jugando · En pausa · Sin fin (juegos que no terminan: Civilization, Sea of Thieves, Stardew Valley) |
| Sin empezar | Quiero jugarlo (no lo tengo; funciona como wishlist) · Pendiente (lo tengo y no lo empecé) |
| Terminado | Completado · 100% |
| Dejado | Abandonado · Lo probé |

- **Se pueden editar:** cambiar el nombre, el color y el orden; ocultar estados; y **crear estados nuevos** eligiendo a qué grupo pertenecen (por ejemplo, "Rejugando" dentro de En curso). Los grupos no se borran, porque las estadísticas y los filtros dependen de ellos.
- **Al pasar a En pausa, Abandonado o Lo probé** aparece un formulario opcional con:
  - horas jugadas
  - progreso en %
  - hasta dónde llegué (texto libre)
  - **motivos**, con selección múltiple. Los motivos también son editables: me aburrió, muy difícil, problemas técnicos, me falta tiempo, lo retomo después, sin gente para jugar.
  - una nota
- Cada cambio de estado queda registrado en el **diario**, con su fecha.

### 3.5 Puntaje
- Va de **0.0 a 10.0, con un decimal** (por ejemplo, 9.3). Es opcional.
- Cada rango tiene una etiqueta de texto: Horrible, Muy malo, Malo, Flojo, Regular, Pasable, Bueno, Muy bueno, Excelente u Obra maestra.
- En el celular se carga con un número grande, una barra deslizable y botones de −0.1 y +0.1.

### 3.6 Diario, reseña y etiquetas
- **Diario:** registra las sesiones (fecha, duración y nota) y los cambios de estado. Las horas totales salen de la tienda cuando están disponibles (por ejemplo, Steam) o se cargan a mano.
- **Reseña:** texto libre.
- **Etiquetas:** libres y varias por juego (por ejemplo, "Para jugar con amigos"). Son algo distinto del estado.

### 3.7 Suscripciones
- **Las que se renuevan solas** (Game Pass, Humble Choice, Nintendo Switch Online):
  - Se guarda nombre, precio, moneda, cada cuánto se cobra (mensual, anual, etc.) y el próximo cobro.
  - Muestran **cuánto las usé este mes**: las horas que jugué con juegos de esa suscripción.
- **Total por mes:**
  - Se calcula **por separado en cada moneda**, sin convertir (ARS por un lado y USD por el otro).
  - Las suscripciones anuales suman su precio dividido por 12.
- **Las que no se renuevan** (Trackmania 1 año, un mes de regalo):
  - Se guarda la fecha de vencimiento y se muestra una barra con el tiempo que queda.
  - Llevan la marca "Vence pronto" cuando falta poco.
  - **No suman** al total mensual.
- **Terminadas:** quedan en un historial, con los juegos que dejé de tener por eso.
- **Avisos configurables:** cuántos días antes de cada cobro, cuántos días antes de un vencimiento y por qué medio llegan (notificación, mail o los dos).

### 3.8 Tiendas
- **Se sincronizan solas** las tiendas que tienen API (Steam seguro; las demás hay que verificarlas).
- **Se importan o se cargan a mano** las tiendas que no tienen API: Epic, Switch, itch.io, etc.
- **Familia de Steam:** hay un botón "Salí de la familia" que pasa todos los juegos de la familia a "Ya no lo tengo", con opción de deshacer. Se avisa que Steam no te deja unirte a otra familia durante un año.

### 3.9 Avisos generales (se prenden y apagan)
- Antes de agregar o comprar un juego que ya tengo.
- Cuando un juego de "Quiero jugarlo" está gratis (por ejemplo, en los gratis semanales de Epic).
- Bajadas de precio, en las tiendas donde se pueda seguir el precio solo.

## 4. Filtros y orden

- **Todos los filtros se combinan entre sí.** Cuanto más flexibles, mejor.
- **Rangos numéricos libres (desde / hasta):**
  - **Duración estimada**, con atajos: menos de 5 h, 5–15 h, 15–40 h y más de 40 h.
  - **Horas que jugué**, con atajos: sin abrir, menos de 2 h, 2–20 h y más de 20 h.
  - **Mi puntaje**, de 0.0 a 10.0.
  - Los atajos **solo completan los números**; se puede escribir cualquier rango (por ejemplo, de 3 a 8 h).
  - Los juegos "Sin fin" no tienen duración, así que quedan afuera del filtro de duración.
- **Otros filtros:**
  - Estado (varios a la vez) o grupo completo
  - Tienda (varias a la vez)
  - Tipo de copia (varios a la vez)
  - Búsqueda por título
- **Orden:** agregados recientemente, mi puntaje, horas jugadas, duración estimada o título.

## 5. Pantallas (todas están en el lienzo)

**Escritorio.** El menú de arriba tiene Biblioteca, ¿Lo tengo?, Suscripciones, Tiendas y Estadísticas. El botón "Agregar juego" y el acceso a Ajustes (avatar) están siempre visibles.
1. **Biblioteca:**
   - Muestra la grilla de portadas.
   - Tiene los filtros en una barra lateral (en PC no hay pantalla de filtros aparte) y los estados agrupados arriba.
   - Muestra el aviso de duplicado.
   - Los juegos que no tengo muestran "dónde comprarlo".
2. **¿Lo tengo?:** buscador grande con resultados anchos (veredicto, copias por tienda, dónde comprarlo). Al costado: búsquedas recientes y en qué tiendas se busca.
3. **Agregar juego:** en una sola pantalla, la búsqueda en IGDB a la izquierda y el formulario para cargar a mano a la derecha.
4. **Ficha del juego:** portada, copias y datos en una columna; a la derecha estado, puntaje, etiquetas, diario y reseña.
5. **Cambiar estado:** ventana emergente sobre la ficha, con los estados agrupados a la izquierda y el formulario de motivo a la derecha.
6. **Ajustes de estados:** los cuatro grupos como tarjetas editables, más los motivos. Tiene un menú lateral de ajustes.
7. **Suscripciones:** tarjetas de resumen (total por moneda, próximo cobro, vence pronto), la lista de las que se renuevan, las prepagas, y a la derecha avisos y terminadas.
8. **Tiendas y avisos:** tarjetas por tienda (sincronizadas e importadas o a mano), tiendas sin conectar, y a la derecha la familia de Steam y los avisos.

**Móvil.** La barra inferior tiene 4 secciones: Biblioteca, ¿Lo tengo?, Suscripciones y Tiendas.
1. **Biblioteca:** lista con chips para cada grupo de estados, botón de filtros y botón para agregar.
2. **Filtros:** todos los filtros de la sección 4, con rangos libres.
3. **Ficha del juego:** estado, puntaje con decimal, duración estimada, dónde lo tengo, diario y reseña.
4. **Cambiar estado:** estados agrupados y el formulario opcional al pausar o dejar un juego.
5. **Editar estados:** renombrar, cambiar color, ocultar, crear estados y editar los motivos.
6. **¿Lo tengo?:** un buscador que responde con uno de estos veredictos:
   - "Ya lo tenés"
   - "Prestado por tu familia"
   - "Por suscripción"
   - "Ya no lo tenés"
   - "No lo tenés", y en ese caso muestra dónde comprarlo
7. **Agregar juego:** búsqueda en IGDB con sugerencias desde las 2 o 3 letras.
8. **Agregar a mano:** formulario para juegos que no están en IGDB.
9. **Suscripciones:** totales por moneda, las que se renuevan, las que no, avisos y terminadas.
10. **Tiendas y avisos:** tiendas sincronizadas, importadas o a mano; familia de Steam; tiendas sin conectar; y avisos.

## 6. Estilo visual
- Tema **oscuro**, con colores por significado:
  - Acento verde lima `#C8F25A`
  - Ámbar `#FFC66B` para avisos y para lo que tengo pero no es mío
  - Azul `#8EC5FF` para Terminado
  - Coral `#FF9C8A` para Dejado
- **Tipografías:** Space Grotesk para títulos, Inter para texto y JetBrains Mono para etiquetas y números.
- **Botones y zonas táctiles de 44 px como mínimo.**
- En PC el diseño es responsive: los filtros pasan arriba cuando la pantalla es angosta.

## 7. Costo cero: qué se investigó (hay que confirmarlo en la etapa técnica)

| Necesidad | Opción gratis | Contras y notas |
|---|---|---|
| Catálogo, portadas y duración | **IGDB API** (gratis con cuenta de Twitch; tiene endpoint de "time to beat") | Tiene menos datos de juegos chicos |
| Duración (alternativa) | HowLongToBeat | No tiene API oficial y el scraping es frágil. Conviene usarlo solo como link "Ver en HLTB" |
| Más portadas | SteamGridDB (API gratis con clave) e imágenes de la tienda de Steam | |
| Biblioteca de Steam | Steam Web API (oficial, con clave gratis) | Por lo que sé, no devuelve los juegos de la familia. Esos se marcan a mano |
| Epic, GOG, Xbox / Microsoft Store, PlayStation | APIs no oficiales o importación manual | Hay que verificar cada una |
| itch.io | Carga manual | No hay endpoint documentado para listar la biblioteca propia |
| Precios | IsThereAnyDeal API | En los países que no cubre muestra precios de EE.UU. Para precios en pesos (por ejemplo, Microsoft Store en Argentina), mejor la carga manual |
| Juegos gratis de Epic | Endpoint público de Epic (no oficial) | |
| Tareas diarias (avisos y precios) | Cron de Vercel en el plan Hobby | Corre **una vez por día**, con una precisión de ±59 min. Alcanza para avisos de cobros y vencimientos |
| Hosting | Vercel Hobby | Un backend aparte en el plan gratis de Render se apaga cuando no se usa, y la primera consulta tarda |
| Base de datos, login y archivos | Supabase (plan gratis) | Puede pausar proyectos que no se usan por un tiempo |
| Mails | Resend (plan gratis) | |
| Notificaciones | Web push (gratis) | En iPhone solo funcionan si la web está instalada en la pantalla de inicio |
| Extensión de navegador (opcional, a futuro) | Cargarla sin publicar en Chrome (gratis) | Publicarla en la Chrome Web Store cuesta un pago único de USD 5 |
| Compartir un link de una tienda a la app (opcional) | Web Share Target | Solo funciona con la web instalada en Android |

## 8. Fuera de alcance por ahora (ideas futuras)
- Extensión de navegador que avise "ya lo tenés" en la página de la tienda.
- Estadísticas y resumen del año.
- "¿Qué juego juego?": un sorteo entre los pendientes, usando los filtros.
- Seguimiento automático de precios.
- Perfil público o compartir listas.
- Varios usuarios.

## 9. Preguntas abiertas para la etapa técnica
1. ¿Qué stack conviene: Next.js en Vercel con Supabase, o un backend propio?
2. ¿Cuál es el modelo de datos exacto? Incluye juego, copia, estado, grupo, sesión, cambio de estado, motivo, suscripción y precio visto.
3. ¿Qué tiendas se pueden sincronizar solas y con qué API (oficial o no)?
4. ¿La app es solo para mí, o conviene prepararla para varios usuarios aunque al principio sea uno solo?
5. ¿La PWA tiene que funcionar sin conexión?
6. ¿Cómo se carga la biblioteca inicial (CSV, importación por tienda)?
7. ¿Las monedas son una lista fija (ARS, USD) o libre?

## Fuentes consultadas
- [Chrome Web Store: registro de desarrollador](https://developer.chrome.com/docs/webstore/register) y [el monto de USD 5 (Computerworld)](https://www.computerworld.com/article/1554628/google-makes-chrome-devs-dig-into-pockets.html)
- [Vercel: límites del cron en el plan Hobby](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Reglas de Steam Families (GamesRadar)](https://www.gamesradar.com/games/steam-says-you-officially-only-get-one-family-per-year-as-its-new-game-sharing-feature-goes-live)
- [Documentación de la API de itch.io](https://itch.io/docs/api/serverside)
- [Preguntas frecuentes de IsThereAnyDeal](https://isthereanydeal.com/faq)
- [Librería de IGDB con el endpoint de duración](https://git.nite07.com/nite/go-igdb/src/branch/main/endpoint/game_time_to_beats.go)
- [Scraper no oficial de HowLongToBeat](https://pypi.org/project/howlongtobeat-scraper/)
