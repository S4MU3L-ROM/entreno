# App de entrenamiento – Diseño

Fecha: 2026-10-18 · Plan base: BeastGym "Recomposición corporal" (07-10-2026, próxima valoración 14-12-2026)

## Objetivo

Webapp instalable (PWA) para Android que guía y registra el plan de 4 días del PDF:
pesos y reps por serie, temporizadores guiados de superserie/descanso/HIIT, y un
semáforo que dice si cada ejercicio mejoró respecto a la vez anterior.

Éxito = llegar al 14-12-2026 con el historial completo de cargas y ver la tendencia por ejercicio.

## Principios

- **Código limpio, sin sobrecodificación:** lo mínimo que cumple el diseño. Sin frameworks,
  sin abstracciones de una sola implementación, sin configuración para valores que no cambian,
  sin código "por si acaso". Nombres claros en español, funciones cortas, comentarios solo
  donde el porqué no es obvio.
- **Interfaz moderna, limpia e intuitiva:** tema oscuro, tarjetas con bordes suaves, tipografía
  del sistema, botones y campos de al menos 48 px (uso con una mano y dedos sudados), la
  siguiente serie pendiente resaltada, el día que toca marcado ("Te toca"), y colores
  consistentes por fase y por semáforo. Nada que haya que aprender: cada pantalla tiene una
  acción principal evidente.

## Alcance

**Dentro:** 1 usuario, 1 celular Android, rutina fija en un archivo, funciona sin internet,
respaldo manual por JSON.

**Fuera (YAGNI):** servidor, login, sincronización, editor de rutina en la app,
cronómetro de sesión completa, métricas del HIIT (calorías/distancia), soporte iPhone,
temporizadores en segundo plano (requeriría app nativa).

## Arquitectura

Archivos estáticos, sin dependencias ni build. Publicados en GitHub Pages (HTTPS, requisito
para instalar la PWA y para el service worker).

| Archivo | Responsabilidad |
|---|---|
| `index.html` | UI: pantallas, estilos, temporizadores, almacenamiento |
| `rutina.js` | Datos de los 4 días (módulo ES, `export const RUTINA`) |
| `logica.js` | Funciones puras: volumen, semáforo, siguiente día, formato mm:ss |
| `test.mjs` | Pruebas de `logica.js` con `node:assert` (`node test.mjs`) |
| `sw.js` | Service worker cache-first; constante `VERSION` para invalidar caché |
| `manifest.json`, `icono-192.png`, `icono-512.png` | Instalación en pantalla de inicio (Chrome Android exige 192 y 512 px) |

El PDF no se versiona (`.gitignore`): contiene datos personales y el repo será público.

## Datos

### Rutina (`rutina.js`)

```js
{ id: 'torso1', nombre: 'Torso 1', enfasis: 'Pecho y espalda – cuidado de muñecas',
  ejercicios: [
    { id: 'press-plano', nombre: 'Press plano mancuernas agarre neutro', series: 3, reps: '12-15',
      cardio: 'Skipping bajo en piso', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
  ],
  final: { tipo: 'hiit', nombre: 'Bicicleta estática', trabajoSeg: 30, pausaSeg: 30, minutos: 10 } }
```

- `final.tipo`: `'hiit'` (solo guía) o `'distancia'` (se registra el tiempo; menos = mejor).
- `cardioBloques: 2` para cardios "por cada pierna" (2 bloques de 45 s, cada uno con su preparación).
- Descanso "1-1.5 min" → 90 s; "1 min" → 60 s.

Contenido a transcribir (del PDF, orden de ciclo `torso1 → pierna1 → torso2 → pierna2`):

**Torso 1** – Pecho y espalda (cuidado de muñecas). Final: HIIT bicicleta estática 10 min, 30/30.
| Ejercicio | Series × reps | Cardio 45 s | Descanso |
|---|---|---|---|
| Press plano con mancuernas agarre neutro | 3 × 12-15 | Skipping bajo en piso | 90 s |
| Remo en polea agarre neutro | 3 × 12-15 | Jumping jacks | 90 s |
| Elevaciones laterales con mancuernas | 3 × 15 | Skipping bajo en piso | 60 s |
| Jalón al pecho en polea agarre supino | 3 × 12-15 | Step-ups básicos (45 s por pierna, 2 bloques) | 60 s |

**Pierna 1** – Cuádriceps y glúteo (bajo impacto en rodillas). Final: HIIT airbike 10 min, 20/40.
| Ejercicio | Series × reps | Cardio 45 s | Descanso |
|---|---|---|---|
| Prensa (pies en V, rango cómodo) | 3 × 12-15 | Jabs de boxeo alternos | 90 s |
| Hip thrust con barra | 3 × 12-15 | Lazo de batida alterno | 60 s |
| Extensión de rodilla unilateral | 3 × 15 | Trote suave | 60 s |
| Elevación de talones de pie con mancuerna | 3 × 15-20 | Escaladoras | 60 s |

**Torso 2** – Hombros y brazos (protección articular). Final: caminadora 1 km (tipo `distancia`).
| Ejercicio | Series × reps | Cardio 45 s | Descanso |
|---|---|---|---|
| Press de hombro de pie con barra corta | 3 × 12-15 | Escaladoras | 90 s |
| Face pull con banda | 3 × 15 | Jumping jacks de bajo impacto | 60 s |
| Extensión de tríceps en polea agarre V | 3 × 12-15 | Skipping bajo en el sitio | 60 s |
| Curl de bíceps en polea baja con barra recta | 3 × 12-15 | Talones al glúteo suave | 60 s |

**Pierna 2** – Isquios, glúteo y zona media. Final: HIIT airbike 10 min, 20/40.
| Ejercicio | Series × reps | Cardio 45 s | Descanso |
|---|---|---|---|
| Curl femoral acostado | 3 × 12-15 | Jabs de boxeo alternos | 90 s |
| Peso muerto rumano con mancuerna rusa | 3 × 12-15 | Step-ups alternos rodilla arriba | 60 s |
| Abducción de cadera en máquina | 3 × 15-20 | Skipping en trampolín | 60 s |
| Crunch abdominal en colchoneta | 3 × 15-20 | Trote suave | 60 s |

### Almacenamiento (`localStorage`)

- `entreno.historial`: array de sesiones guardadas.
- `entreno.enCurso`: sesión en progreso (o ausente). Se escribe tras cada serie marcada.

```js
{ fecha: '2026-10-20', dia: 'torso1',
  ejercicios: { 'press-plano': [ {peso: 14, reps: 12}, {peso: 14, reps: 13}, {peso: 14, reps: 12} ] },
  cardioSeg: null }   // número solo en días con final.tipo === 'distancia'
```

Fechas en formato local `YYYY-MM-DD`. Peso en kg (0 = sin peso / banda).

### Respaldo

- **Exportar:** descarga `entreno-respaldo-YYYY-MM-DD.json` con el historial.
- **Importar:** valida que sea un array y que cada elemento tenga `fecha`, `dia` y `ejercicios`;
  si no, muestra error y no toca nada. Si es válido, pide confirmación y reemplaza el historial.

## Pantallas y flujo

1. **Inicio:** 4 botones de día; resalta el siguiente del ciclo según la última sesión guardada.
   Si existe `entreno.enCurso`, ofrece "Continuar sesión". Accesos a Historial y Respaldo.
2. **Sesión:** una tarjeta por ejercicio con nombre, rango de reps, valores de la sesión anterior
   ("Anterior: 14×12 · 14×13 · 14×12") y 3 filas `peso | reps | ✓`. El peso se prellena con el de
   la última vez. Al marcar ✓ arranca la secuencia de superserie.
3. **Secuencia de superserie:** preparación 5 s → cardio 45 s (× `cardioBloques`, cada bloque con
   su preparación) → descanso `descansoSeg`. Se ejecuta tras cada serie.
4. **Temporizador (pantalla completa):** cuenta regresiva grande, color por fase
   (preparación / cardio / descanso / trabajo / pausa), nombre de la actividad, botones Pausa y Saltar.
5. **Final HIIT:** preparación 5 s → rondas trabajo/pausa hasta completar `minutos`
   ("Ronda 3/10"). No registra nada.
6. **Final distancia (caminadora 1 km):** cronómetro Iniciar/Detener; el tiempo es editable a mano (mm:ss).
7. **Resumen:** semáforo por ejercicio (y del cardio si aplica) → Guardar (pasa de `enCurso` a `historial`).
8. **Historial:** por ejercicio, últimas sesiones con fecha, volumen y color.

### Temporizador – detalles

- Calcula el restante con `fin - Date.now()` (no acumula ticks), para no desfasarse si el
  navegador ralentiza `setInterval`.
- Pitidos con Web Audio en los últimos 3 s; `navigator.vibrate` al cambiar de fase.
- `navigator.wakeLock` activo durante la sesión (pantalla encendida). Si la app pasa a segundo
  plano el temporizador puede pausarse: limitación aceptada.

## Semáforo (`logica.js`)

```
volumen(series) = Σ peso × reps          // si todas las series tienen peso 0 → Σ reps
semaforo(hoy, anterior, menosEsMejor = false):
  anterior ausente o 0     → 'gris'
  delta = (hoy - anterior) / anterior     // invertido si menosEsMejor
  delta >  UMBRAL          → 'verde'
  delta < -UMBRAL          → 'rojo'
  si no                    → 'amarillo'
UMBRAL = 0.02
```

- "Anterior" = la última sesión del historial que contiene ese ejercicio (por `id`).
- Series no completadas no suman (una sesión incompleta puede salir roja: refleja la realidad).
- Caminadora: `semaforo(cardioSeg, cardioSegAnterior, true)`.
- `siguienteDia(historial)`: el que sigue al `dia` de la última sesión en el ciclo; `torso1` si vacío.

## Pruebas

`test.mjs` (Node 24, sin dependencias) cubre:
verde, amarillo, rojo, gris (sin referencia), volumen por reps cuando peso = 0,
caminadora invertida (menos tiempo = verde), y `siguienteDia` (vacío y vuelta de ciclo).

Manual en el Android: instalación, modo avión, temporizadores con sonido/vibración,
pantalla encendida, recuperación de sesión en curso tras cerrar el navegador, exportar/importar.

## Publicación

Repo en GitHub → GitHub Pages desde la rama principal. Cambio de rutina = editar `rutina.js`,
subir `VERSION` en `sw.js`, push; la app se actualiza al abrirla con internet.
