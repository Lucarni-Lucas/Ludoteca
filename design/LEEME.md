# Ludoteca: diseño de pantallas

Este paquete tiene el diseño de todas las pantallas de Ludoteca, para usarlo como referencia al implementarlas.

- `ludoteca-idea.md`: la idea del proyecto, los conceptos, las decisiones tomadas y las preguntas abiertas. **Leerlo primero.**
- `project/canvas.json`: el índice. Lista cada pantalla con su título y el tamaño con que se diseñó: 1440 px de ancho las de escritorio y 390 px las de celular.
- `project/Escritorio-*.dc.html`, `project/Main.dc.html`: las pantallas de PC (`Main` es la biblioteca).
- `project/Movil-*.dc.html`: las pantallas de celular.

## Cómo leer los `.dc.html`

Cada archivo es **una pantalla** escrita en HTML con estilos inline. Ahí están los valores exactos: colores, tamaños, espaciados, tipografías y textos.

- `{{algo}}` es un valor que calcula el script del final del archivo.
- `<sc-for list="{{x}}" as="item">` repite un bloque por cada elemento de la lista.
- `<sc-if value="{{cond}}">` muestra un bloque solo si se cumple la condición.
- `<helmet>` carga las fuentes (Google Fonts: Inter, Space Grotesk y JetBrains Mono) y algunos estilos base.
- El `<script type="text/x-dc">` del final arma los **datos de ejemplo** y la interacción del prototipo, como filtros y estados. Los juegos, las fechas y las horas son inventados. Ese script sirve de referencia para el comportamiento; no es código para reutilizar.
- Los `href` que apuntan a otro `.dc.html` muestran la navegación entre pantallas.

## Tokens de diseño

| Uso | Valor |
|---|---|
| Fondo | `#0E1014` |
| Superficie | `#161A21` / `#1E232C` |
| Borde | `#2A303B` |
| Texto | `#ECEEF2` |
| Texto secundario | `#9AA3B2` |
| Acento (en curso, acciones principales) | `#C8F25A` |
| Aviso / "no es tuyo" / quiero jugarlo | `#FFC66B` |
| Terminado | `#8EC5FF` |
| Dejado | `#FF9C8A` |
| Títulos | Space Grotesk 700 |
| Texto | Inter 400–600 |
| Etiquetas y números | JetBrains Mono 500 |
| Zona táctil mínima | 44 px |
