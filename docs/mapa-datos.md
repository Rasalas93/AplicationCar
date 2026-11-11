# Mapa de datos de un coche (genérico)

T1625 · 11 nov 2026 · solo diseño. Amplía el modelo de T1621 (`Vehiculo`, `FichaTecnica`, `Dato<T>` con fuente, `PlantillaTarea`, `Registro`, `Documento`); no lo sustituye.

- **O / R**: **O** = obligatorio (lo exige la ley, ver `requisitos-dgt.md`, o la app no puede calcular sin él) · **R** = recomendado (mejora los avisos).
- **Intervalos**: los de la sección C son **genéricos** (RACE, fuentes [M1]-[M11], consultadas el 11/11/2026) y solo orientan. **Manda el manual del coche («según manual»)**. En la app entran con un tipo de fuente nuevo, `orientativo`: se pintan «orientativo · según manual» y nunca dan un «al día» firme (T1621 no ponía cifra genérica; ahora la hay, pero marcada).
- **Zona**: cada tarea lleva una zona del coche (`motor`, `frenos`, `ruedas`, `suspension`, `electrico`, `luces`, `vision`, `habitaculo`) para pintar las zonas rojas que pide T1624. Es un campo nuevo de `PlantillaTarea`.

## 1. Lista genérica: qué necesita cualquier coche

| Dato | Por qué | Fuente típica | O/R | Cómo lo usa la app |
|---|---|---|---|---|
| **A. Identidad** | | | | |
| Alias, marca, modelo, generación, versión | Saber qué coche es y qué plan le toca | Ficha técnica, permiso de circulación | O | Selector del garaje; propone el perfil de mantenimiento |
| Matrícula | Trámites, multas, citas de ITV | Permiso de circulación | O | Dato privado; nunca sale en capturas |
| Bastidor (VIN) | Llamadas a revisión, manual por bastidor, recambios | Ficha técnica | R | Dato privado; enlaza con consultas oficiales |
| Fecha de primera matriculación, país | Periodicidad de la ITV, distintivo | Permiso de circulación, informe DGT | O | Filtra las reglas normativas que aplican |
| Categoría (turismo, M1) y servicio (particular) | La norma cambia con la categoría | Ficha técnica, informe DGT | O | Ídem |
| Combustible, cilindrada, potencia (kW, CV) | Perfil de mantenimiento, distintivo | Ficha técnica | O | Elige perfil y tareas |
| Potencia fiscal (CVF) | Tramo del IVTM | Ficha técnica | O | Calcula el tramo del impuesto |
| Emisiones (CO₂, norma Euro) y distintivo | Acceso a ZBE | Informe DGT | R | Ficha de ZBE |
| Cambio, tracción, plazas, masas, dimensiones, remolque | Mantenimiento, carga, aparcamiento | Ficha técnica | R | Ficha de consulta |
| Odómetro (serie de pares fecha-km) | Todo vencimiento por km depende de él | Lectura a mano, ITV, taller, OBD | O | Motor de reglas; estima km al día para prever fechas |
| Municipio del domicilio fiscal y titular | Dónde y quién paga el IVTM | Informe DGT, permiso | O | Regla del IVTM; dato privado |
| Conductores y fecha de su permiso | Reglas de novel | Permiso de conducir | R | Avisos de novel por conductor |
| **B. Documentos** (alimentan el testigo «faltan N documentos») | | | | |
| Permiso de circulación | Obligatorio a bordo | DGT | O | Copia en la Guantera |
| Tarjeta ITV o ficha técnica | Obligatoria a bordo; medidas y reformas | Fabricante, estación ITV | O | Copia; origen de la ficha |
| Informes de ITV | Historial, defectos, serie de km | Estación ITV, informe DGT | R | Un registro por inspección |
| Póliza y recibo del seguro | Vencimiento, coberturas, teléfono de asistencia | Aseguradora | R | Aviso de vencimiento; contacto |
| Recibo del IVTM | Justifica el pago; se pide al vender | Ayuntamiento | R | Cierra el aviso anual |
| Informe de la DGT | Titulares, cargas, km, llamadas a revisión | DGT | R | Contrasta lo demás |
| Libro de mantenimiento y facturas | Prueba de lo hecho; intervalos del fabricante | Taller, concesionario | R | Cambia «verbal» por «documento» |
| Manual del propietario | Intervalos, presiones y especificaciones | Fabricante | R | Sustituye los intervalos orientativos |
| Contrato de compraventa e impuesto de transmisiones | Prueba de la compra | Vendedor, comunidad autónoma | R | Archivo |
| **C. Mantenimiento** (por tiempo o km, lo que llegue antes) | | | | |
| Revisión oficial del fabricante | Engloba inspección general | Manual, libro de servicio | R | Tarea principal del plan |
| Aceite y filtro de aceite: 1 año o 15.000 km; coches de más de 15 años, 1 año o 10.000 km [M1] | Desgaste del motor | Factura, libro | R | Tarea · zona `motor` |
| Filtro de aire: 1 año o 15.000 km [M2] | Consumo y motor | Factura | R | Tarea · `motor` |
| Filtro de habitáculo: 1 año o 15.000 km [M2] | Aire interior | Factura | R | Tarea · `habitaculo` |
| Líquido de frenos: cada 2 años [M3] | Pierde eficacia con el tiempo | Factura | R | Tarea · `frenos` |
| Pastillas de freno: entre 30.000 y 60.000 km [M4]; discos: por estado | Seguridad | Factura, ITV | R | Tarea · `frenos` |
| Correa de distribución (si lleva): 150.000 km o 10 años [M5] | Su rotura destroza el motor | Factura, libro | R | Tarea crítica · `motor` |
| Bujías (gasolina): cobre, unos 40.000 km; platino o iridio, unos 100.000 km [M6] | Encendido y consumo | Factura | R | Tarea · `motor` |
| Refrigerante: comprobar nivel al menos 1 vez al año [M7]; sustitución: según manual | Temperatura del motor | Factura, nivel | R | Tarea · `motor` |
| Amortiguadores: revisar cada 20.000 km; cambio entre 65.000 y 90.000 km [M8] | Estabilidad y frenada | Factura, ITV | R | Tarea · `suspension` |
| Batería de 12 V: por estado (intervalo sin verificar) | Arranque | Factura, tensión por OBD | R | Tarea · `electrico` |
| Embrague, aceite de la caja, líquido de dirección, gas del aire acondicionado, filtro de combustible | Averías caras | Manual, factura | R | Tareas sin cifra: «según manual» |
| **D. Consumibles** | | | | |
| Escobillas: 1 vez al año [M9] | Visibilidad | Factura, revisión visual | R | Tarea · `vision` |
| Lámparas y luces | Ver y ser visto; defecto de ITV | Revisión visual, ITV | R | Lista de comprobación · `luces` |
| Líquido lavaparabrisas, pila del mando | Uso diario | Revisión visual | R | Lista de comprobación |
| AdBlue (solo diésel con SCR) | Sin él no arranca | Testigo del cuadro | R | Tarea solo si el perfil la trae |
| **E. Neumáticos** | | | | |
| Medidas homologadas e índices | Otra medida es una reforma | Tarjeta ITV | O | Ficha; aviso al registrar otra medida |
| Dibujo: mínimo legal 1,6 mm (RACE aconseja 3 mm) [M10] | Legal y seguridad | Medición | O | Lista de comprobación · `ruedas` |
| Fecha de fabricación: revisión anual desde los 5 años; cambio a los 10 [M10][M11] | La goma envejece | Código del flanco | R | Tarea por fecha · `ruedas` |
| Km desde el montaje: orientativo 40.000-50.000 km; rotación cada 10.000-15.000 km [M10] | Desgaste | Factura | R | Tarea por km · `ruedas` |
| Presiones (delante, detrás, con carga) | Consumo y desgaste | Manual, pegatina del coche | R | Guía y lista mensual |
| Rueda de repuesto o kit | Dotación obligatoria | Maletero | O | Revisión anual de dotación |
| **F. Fluidos** (especificación y cantidad) | | | | |
| Aceite (norma y viscosidad), refrigerante, líquido de frenos (DOT), combustible admitido | Echar el correcto | Manual | R | Ficha de consulta en Taller |
| **G. Seguro** | | | | |
| Aseguradora, número de póliza, tipo de cobertura | Saber qué cubre | Póliza | O | Guantera y contacto |
| Fecha de vencimiento y prima | Renovar o cambiar a tiempo | Póliza, recibo | O | Aviso de vencimiento; gasto |
| Teléfono de asistencia en carretera | Avería o accidente | Póliza | R | Botón de llamada |
| **H. Impuestos y tasas** | | | | |
| IVTM: municipio, cuota, plazo, domiciliado sí o no | Pago anual | Ayuntamiento | O | Aviso anual; gasto |
| Tasa de ITV y otros gastos fijos (aparcamiento, peajes) | Coste real del coche | Recibos | R | Coste por km |
| **I. Multas** | | | | |
| Fecha de notificación, organismo, importe, puntos, estado | 20 días para pagar con reducción | Notificación | R | Cuenta atrás y archivo |
| **J. Incidencias** | | | | |
| Averías: fecha, km, síntoma, código OBD, reparación | Historial y patrones | Factura, OBD | R | Línea de tiempo; zona en rojo |
| Accidentes y partes al seguro | Reclamaciones | Parte amistoso | R | Archivo |
| Llamadas a revisión | Seguridad; reparación gratuita | DGT, fabricante | R | Aviso hasta resolver |
| Defectos anotados en la ITV | Lo que hay que reparar | Informe ITV | R | Tarea con plazo de 2 meses |
| **K. Contactos** | | | | |
| Taller, aseguradora, grúa, estación de ITV, concesionario | Tenerlos a mano | Usuario | R | Llamada en un toque |
| **L. Uso y gasto** | | | | |
| Repostajes: fecha, litros, importe, km, depósito lleno | Consumo real | Tique | R | L/100 km y €/km |
| Consumo homologado | Referencia | Ficha del fabricante | R | Comparación |
| **M. Dotación obligatoria** | | | | |
| Baliza V-16 conectada, chaleco reflectante | Lo exige el reglamento | Revisión visual | O | Revisión anual de dotación |

## 3. Fuentes de los intervalos genéricos (RACE; acceso: 11/11/2026)

- [M1] Aceite: https://www.race.es/cuando-cambiar-aceite-coche · [M2] Filtros de aire y habitáculo: https://www.race.es/cuando-cambiar-filtro-aire
- [M3] Líquido de frenos: https://www.race.es/liquido-frenos-cuando-cambiarlo-precio · [M4] Pastillas: https://www.race.es/pastillas-freno-gastadas
- [M5] Correa de distribución: https://www.race.es/cadena-correa-distribucion-coche-funcionamiento-rotura
- [M6] Bujías: https://www.race.es/sintomas-bujias-mal-estado · [M7] Refrigerante: https://www.race.es/liquido-refrigerante
- [M8] Amortiguadores: https://www.race.es/cuando-cambiar-amortiguadores-coche · [M9] Escobillas: https://www.race.es/cada-cuanto-cambiar-limpiaparabrisas
- [M10] Neumáticos: https://www.race.es/cada-cuantos-kilometros-se-cambian-las-ruedas · [M11] Edad del neumático (ETRTO): https://www.race.es/caducidad-de-los-neumaticos

**Sin verificar (2)**: vida típica de la batería de 12 V; intervalo de sustitución del refrigerante. **Aviso**: [M5] da 150.000 km o 10 años como cifra general; el intervalo de este motor sigue «a verificar» en el libro de servicio (T1621).
