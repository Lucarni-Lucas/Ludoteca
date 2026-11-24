# Pendientes de la interfaz

Lo que funciona pero no convence de la interfaz. No se arregla en cada etapa: es la entrada de `10-rediseno`, que se hace con todas las pantallas construidas.

Cómo anotar: una línea por cosa, en la sección de su pantalla, con qué pasa y por qué molesta. Si se te ocurre cómo arreglarlo, sumalo después de « → ». Lo que no funciona (un error, algo que no guarda) no va acá: eso se arregla en la etapa en curso.

## General

- Muchos botones no se entienden a primera vista: les falta una ayuda «?» o un nombre más claro.
- Textos en inglés que suenan forzados, por traducción literal. → Pasar todo `en.json` por una revisión de estilo. Ejemplos: «Add by hand» → «Add manually»; «BY HAND» → «MANUAL»; «Enter the hours played, from 0 up» → «Enter 0 or more hours».
- Al rediseñar, los e2e existentes pasan a leer sus textos del catálogo con t(), en vez de frases en español escritas a mano.
- La interfaz tiene que explicarse sola: cada grupo o sección, una pregunta corta; cada acción, un nombre que diga qué hace. Los usuarios leen poco: no depender de párrafos de explicación ni de «?» en todos lados.
- Nombre visible, ícono y dirección más propios. El proyecto y el repo siguen llamándose Ludoteca. → Si la dirección sigue siendo gratis, es un subdominio nuevo de `vercel.app`; un dominio propio se paga.

## Biblioteca (`/library`)

- No convence la organización general de la pantalla.

## Ficha de un juego (`/games/[id]`)

- «Editar» en la duración y «Editar» junto a «Actualizar datos» llevan al mismo lugar.
- «Actualizar datos» parece no hacer nada: no avisa si trajo algo nuevo o si ya estaba al día.
- Demasiados botones sueltos y poco explicativos.

## Importar (`/import`)

- Juegos con nombres muy largos o con muchas versiones: los candidatos se cortan o bajan de renglón y queda desprolijo. → Pensar candidatos en tarjetas o en una lista vertical.
- Los avisos de cada acción tienen que verse cerca de donde tocaste, no arriba de todo.

## Agregar juego (`/add`)

## Otras pantallas
