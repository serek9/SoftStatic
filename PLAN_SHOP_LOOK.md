# Tienda: redibujado procedural cozy y misterio rural

**Fecha:** 2026-11-13. **Estado:** fases 117–121 implementadas; 122–123 en curso.

La petición es cambiar todo el lenguaje visual de la tienda usando el sistema de
dibujo que ya tiene SoftStatic. Las ilustraciones generadas son referencias de
formas y ambiente. El resultado debe ser una escena del juego dibujada por código,
con movimiento e interacción reales. El usuario autorizó comenzar la integración el
2026-11-13: se ha ejecutado la fase 117. Las siguientes fases conservan su inicio
por indicación del usuario.

Las fases 115 y 116 se revierten: se retiran tanto la recoloración inicial como el
renderer con imágenes, sus PNG, atlas, precargas y pruebas específicas. La base vuelve
a ser la tienda procedural anterior a esos cambios. El caché del service worker pasa
a v2 para retirar las copias de esos recursos de los clientes que instalaron la versión anterior.

## 1. Dirección visual acordada

**Sensación principal:** una pequeña tienda de pesca remota, cálida por dentro y
rodeada de un paisaje húmedo, silencioso y algo extraño. Acogedora y recogida,
con carácter de maqueta, sin convertir personajes y objetos en muñecos de grandes
cabezas o en una tienda excesivamente dulce.

**De las imágenes aprobadas:** escala íntima, siluetas compactas y cuidadas,
carpintería con volumen, alfombra tejida, lámparas que organizan la composición,
objetos reconocibles, perro y gato tranquilos, ventanas al lago violeta.

**Más influencia de Easy Delivery Co:** formas sencillas y algo toscas, materiales
mate, paleta contenida, verdes apagados y azules fríos, desgaste cotidiano, luz
cálida localizada y sensación de aislamiento. Su lenguaje de volúmenes se traduce
a masas de píxeles y planos de luz en el renderer actual.

**Conexión con la pesca en el lago:** misma hora, niebla, lluvia, familia de violetas,
verdes y teales y nivel de detalle. La madera recibe tonos ámbar cerca de las luces;
las esquinas conservan la temperatura fría del exterior. Los detalles extraños se
descubren al observar: reloj, reflejos, tarro sin etiqueta y figura lejana ya existentes.

## 2. Contrato técnico y visual

- Conservar canvas 640×360, cámara, perspectiva, encuadre y silueta general de la sala.
- Conservar la rejilla 12×8, T=32, TOP=44, OX/OY, MAP, OBJECTS, puerta, mostrador,
  posiciones de los muebles y los 59 bloqueos originales. Lo «mini» sale de las
  proporciones, las formas y la luz, manteniendo los recorridos existentes.
- Conservar compras, stock visible, diálogos, puntos de interacción, animaciones,
  atuendos, razas, reloj, tiempo, guardado y eventos discretos.
- Dibujar geometría, materiales, sprites y efectos con `paint`, `pix`, `bake` y
  `roomKit`. Los canvases generados por código siguen siendo la caché de dibujo.
- Las referencias generadas quedan fuera del runtime y del paquete del juego.
  El renderer no cargará ilustraciones, texturas, spritesheets ni atlas externos.
- Colores declarados en `sprites.js`; 3–6 tonos principales por material, con
  agrupaciones claras. Contornos selectivos y coloreados, textura escasa y dirigida.
- Cada cambio debe afectar formas, planos y materiales, además del color.
- Preparar geometría, variantes y luces amplias al entrar o precalentar. Mantener
  `draw` sin lecturas de píxeles, regeneración de arte, aleatoriedad de simulación
  ni asignaciones nuevas en sus rutas frecuentes.
- Aislar los cambios de la tienda mediante opciones y cachés propias. Conservar
  el aspecto de la cabaña, los escenarios exteriores y la selección de colores de `shift`.

## 3. Fases de implementación

Se ejecutan en orden. Cada fase termina con captura real del juego, comprobaciones,
actualización de PLAN.md §8/HANDOFF.md y un commit. El usuario ha autorizado ejecutar todas las fases restantes en esta iteración. Si una captura no cumple el criterio visual, se corrige dentro
de esa fase antes de ampliarla al resto de la tienda.

### Fase 117 — Fijar el lenguaje visual en píxeles nativos

**Implementada (2026-11-13).** Muestra procedural de pared/suelo, lámpara de lino,
esquina del mostrador y monstera. Comparativas del renderer original y nuevo en
el mismo estado, más referencias del lago a tres horas. Se ajustó el contraste
del suelo al revisar la toma nocturna. Pendiente del comentario visual del usuario.

**Archivos:** `js/gfx/sprites.js`, `js/ui/shop_room.js`; opciones acotadas en
`js/ui/room_kit.js` si hacen falta.

1. Capturar la tienda original y el lago a las 12:00, 19:12 y 23:30, con semilla y
   tiempos de animación fijos. Registrar mapa, bloqueos y puntos interactivos.
2. Definir rampas locales para madera, metal pintado, tela, papel, plantas y luz.
3. Dibujar por código una muestra del nuevo lenguaje: tramo de pared/suelo,
   lámpara, esquina de mostrador y planta, en sus posiciones reales.
4. Fijar grosor de contorno, tamaño de las masas de píxeles, proporciones y textura.

**Criterio de cierre:** la muestra se reconoce como una nueva dirección visual
cozy/rural incluso en escala de grises. A tamaño de juego se aprecian siluetas y
volumen distintos; la paleta encaja con el lago. Se presenta esa prueba nativa
antes de extender el estilo a todos los objetos.

### Fase 118 — Arquitectura, suelo, paredes y alfombra

**Implementada (2026-11-13):** The wall/floor material study now covers the entire original room. Native timber beams, broad boards, recessed joins, cut-away wall tops, a thick woven terracotta/ochre rug and door mat replace the striped shell. Map, OX/OY/TOP and all 59 blocked tiles are unchanged; cabin painters are untouched.

**Verificación:** validate OK (0 warnings); controlled renderer captures at 12:00, 19:12 and 23:30 inspected; no page errors.

**Archivos:** `js/ui/shop_room.js`, opciones locales en `js/ui/room_kit.js`.

1. Redibujar vigas, zócalos, marcos y cantos con planos de luz legibles y uniones
   redondeadas por escalones de píxeles, conservando dimensiones y huecos.
2. Dar masa a las tablas: menos rayas y clavos repetidos, vetas elegidas y variación
   por pieza. Separar claramente superficie iluminada, lateral y junta.
3. Dibujar la alfombra como tejido con grosor, borde y flecos; reducir el patrón
   de ruido que compite con los personajes.
4. Preparar sombras de contacto y zonas para la luz, sin ocultar los pasos libres.

**Criterio de cierre:** la habitación completa tiene profundidad y sensación de
refugio antes de añadir efectos. Se conserva exactamente el mapa de colisiones.

### Fase 119 — Redibujar todos los muebles y objetos

**Implementada (2026-11-13):** Repainted every shop fitting procedurally: shelves, rod rack, bait station, counter, freezer, radio, guitar, amplifier and window frames. Original anchors and collision geometry retained.

**Verificación:** Native captures at noon, dusk and night; validate OK, zero warnings.

**Archivos:** `js/ui/shop_room.js`, `js/ui/room_kit.js`, paleta local cuando proceda.

1. Muebles principales: mostrador en L, estanterías, expositor de cañas, vitrinas,
   congelador y nevera. Mantener su huella, puntos de apoyo y elementos interactivos.
2. Objetos de trabajo: carretes, botes, cajas, señuelos, pecera y jaula. Simplificar
   siluetas y darles materiales distintos y un desgaste deliberado.
3. Objetos personales: radio, guitarra, amplificador, pantalla, taza, calendario,
   reloj, cartel de peces y trofeo. Deben parecer partes del mismo mundo.
4. Plantas y gato: masas orgánicas agrupadas, hojas con planos claros, macetas con
   peso y gato dormido; conservar sus estados y acciones existentes.

**Criterio de cierre:** inventario visual completo, sin muebles antiguos pendientes
de adaptar. A 1× se distingue madera de tela, cristal, metal y hojas. El stock que
desaparece o se anima sigue reflejando el estado de la tienda.

### Fase 120 — Pescador, Rusty y perro en el nuevo lenguaje

**Implementada (2026-11-13):** Fresh native shop-only geometry for the fisher, Rusty and four dog breeds, with all facings, walking poses and shopkeeper gestures. Cosmetic coats, hats and breed silhouettes retained; original cabin painters unchanged.

**Verificación:** Three-hour native captures without browser errors; all active figures prebaked on shop entry.

**Archivos:** `js/ui/room.js`, `js/ui/shop_room.js`; `data/looks.js` solo si requiere
un campo visual, sin alterar preferencias guardadas ni jugabilidad.

1. Añadir un estilo procedural específico de tienda, compartiendo las reglas de
   movimiento y las definiciones de apariencia existentes.
2. Ajustar proporciones con moderación: formas compactas, ropa con volumen, caras
   legibles y manos/pies claros, coherentes con los personajes del lago.
3. Rehacer Rusty y sus gestos: quietud, parpadeo, habla, bebida y giro hacia la pared.
4. Rehacer perro sentado y caminando en las cuatro direcciones, con sus cuatro razas.
   Revisar todos los atuendos, sombreros y fotogramas del pescador.

**Criterio de cierre:** personajes y decorado comparten grano y luz. Caminar, girar,
sentarse y hablar conservan anclajes estables y se leen sin deformar o escalar
fragmentos del sprite antiguo. La cabaña y las apariencias guardadas siguen funcionando.

### Fase 121 — Luz, ventanas y atmósfera del lago

**Implementada (2026-11-13):** Baked warm floor pools under furniture, cool translucent night shadow with local light falloff, muted warm string bulbs and matte timber. Original lake windows still follow actual game hour, rain and fog.

**Verificación:** No browser errors in noon, dusk and night captures. Floor light precedes sorted furniture and characters.

**Archivos:** `js/ui/shop_room.js`, opciones locales de `js/ui/room_kit.js`.

1. Establecer una luz dominante y focos secundarios: lámpara de pie, lámpara de
   mostrador, guirnalda y pantallas. Separar luz emitida de material iluminado.
2. Proyectar luz cálida sobre superficies y objetos por planos, con oclusión y
   sombras de contacto. Evitar manchas rectangulares y círculos que atraviesan muebles.
3. Hacer que ventanas, marcos y reflejos participen de la hora, niebla y lluvia
   reales del lago, conservando la legibilidad del interior de noche.
4. Afinar el equilibrio: ámbar en focos, madera mate, sombras frías y rincones
   misteriosos. Revisar junto a capturas de la escena de pesca.

**Criterio de cierre:** día gris, atardecer y noche se distinguen y pertenecen al
mismo escenario. La tienda es acogedora sin teñir toda la imagen de naranja ni
perder sus siluetas en negro. Las luces amplias se precalculan y se mide el coste.

### Fase 122 — Movimiento ambiental y misterio discreto

**Archivos:** `js/ui/shop_room.js`, `js/ui/room_kit.js`; `js/ui/shop.js` solo para
exponer estado visual existente si resulta necesario.

1. Integrar burbujas, pececillos, grillos, vapor, gato, lámpara de lava, plantas,
   reflejos y pantallas con el nuevo dibujo y con las existencias reales.
2. Dar ritmos lentos y distintos a cada elemento; animación localizada y silenciosa.
3. Adaptar visualmente el reloj inverso, la figura en la orilla y el tarro sin
   etiqueta, conservando condiciones, duración y frecuencia de los eventos actuales.
4. Ordenar capas para todas las posiciones del caminante y su perro, en especial
   junto a lámparas, mostrador, plantas, pecera y congelador.

**Criterio de cierre:** la tienda se siente viva al observarla. El misterio se
descubre al mirar, sin carteles, sustos ni elementos que interfieran con jugar.
Los efectos respetan la geometría y ningún fotograma modifica el guardado.

### Fase 123 — Integración, comparación final y entrega

**Archivos:** los anteriores, herramientas de comprobación necesarias y documentación.

1. Comparación A/B desde el mismo estado entre la tienda original y el nuevo
   renderer; comparar también con las ilustraciones y con las escenas del lago.
2. Revisar el conjunto a escala nativa, en PC y en pantalla pequeña: formas,
   saturación, densidad, personajes, luces y detalles tranquilos de misterio.
3. Recorrer todos los puntos interactivos, comprar, cambiar apariencias, salir y
   volver; revisar stock, profundidad de capas y guardado.
4. Medir precalentamiento y dibujo. Ejecutar validación, replay y pruebas de
   partidas; comprobar que no hay peticiones de imágenes ni atlas de tienda.

**Criterio de cierre:** se aprecia un redibujado de toda la tienda, con las
proporciones y calidez de las imágenes y el carácter rural, contenido y extraño
buscado. La revisión se hace con capturas y una secuencia del juego funcionando.

## 4. Comprobaciones y entregables

- `node tools/balance.js --validate`: sin errores ni avisos nuevos.
- `node tools/balance.js --replay 12345`: conservar hash `2848910695`, 18 capturas,
  21 lanzamientos, mientras los cambios sean visuales.
- `node tools/balance.js --saves`: partidas anteriores y rechazo de datos dañados.
- Comprobar los 59 bloqueos, acceso a todos los puntos de interacción, compra real,
  selección de aspecto, puerta, perro seguidor y estado del canvas tras dibujar.
- Capturas reales con la misma semilla a 12:00, 19:12 y 23:30, más una secuencia
  caminando y hablando con Rusty. Comparativas de escala nativa y ampliación entera.
- Cabaña y exteriores deben conservar su render y selección de colores. Si se
  reutiliza un helper, verificar sus llamadores antes de modificarlo.
- Medir el presupuesto en el mismo ejecutor, con sprites ya preparados. Mantener
  ausencia de arte regenerado durante `draw` y explicar cualquier coste adicional.

**Siguiente trabajo previsto:** fase 122. El usuario ha autorizado continuar con todas las fases.
