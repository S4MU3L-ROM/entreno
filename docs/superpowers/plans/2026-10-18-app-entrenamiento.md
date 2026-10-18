# App de entrenamiento – Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA instalable en Android que guía y registra el plan de 4 días (pesos, reps, temporizadores de superserie/HIIT, tiempo de caminadora) y muestra un semáforo de mejora por volumen.

**Architecture:** Archivos estáticos sin build. `logica.js` (funciones puras, probadas con `node:test`), `rutina.js` (datos del plan), `index.html` (UI + temporizador + almacenamiento en `localStorage`), `sw.js` + `manifest.json` para instalación y uso sin internet. Publicado en GitHub Pages.

**Tech Stack:** HTML/CSS/JS nativo (módulos ES), Web Audio, Vibration API, Wake Lock API, Service Worker, Node 24 (`node:test`) para pruebas, Python 3 (`http.server`) para servir en local, `gh` CLI para publicar.

**Spec:** `docs/superpowers/specs/2026-10-18-app-entrenamiento-design.md`

## Global Constraints

- Código limpio, sin sobrecodificación: sin frameworks, sin dependencias, sin build, sin abstracciones de una sola implementación, sin código "por si acaso".
- Nombres y textos de UI en español.
- Interfaz moderna, limpia e intuitiva: tema oscuro, tarjetas, tipografía del sistema, controles de al menos 48 px, siguiente serie resaltada, día que toca marcado.
- `UMBRAL = 0.02` · `PREP_SEG = 5` · ciclo `torso1 → pierna1 → torso2 → pierna2`.
- Claves `localStorage`: `entreno.historial`, `entreno.enCurso`. Fechas locales `YYYY-MM-DD`. Peso en kg (0 = sin peso).
- Pruebas: `node test.mjs` (Node 24, sin dependencias).
- Destino: Chrome Android, servido por HTTPS (GitHub Pages).
- El PDF nunca se versiona (`.gitignore` ya contiene `*.pdf`).
- Cada commit termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Peso con coma decimal** ("12,5" desde el teclado Android en español) → debe guardarse 12.5, no rechazarse. Prueba en Tarea 1 (`parseNumero`).
2. **✓ con reps vacías, 0 o decimales** → no marca la serie ni arranca el temporizador; avisa. Prueba en Tarea 1 (`serieValida`).
3. **Importar un archivo que no es un respaldo** (JSON roto, objeto, sesiones sin campos) → error y el historial queda intacto. Prueba en Tarea 1 (`validarRespaldo`); el manejo de JSON roto en Tarea 5.
4. **Tiempo de caminadora mal escrito** ("9:5", "abc", "0:00", "9:60") → se rechaza con mensaje. Prueba en Tarea 1 (`parseTiempo`).
5. **Rutina cambiada con historial o sesión en curso antiguos** (día o ejercicio que ya no existe) → no se rompe: `siguienteDia` vuelve a `torso1`, `anterior` devuelve `null`, la sesión en curso de un día inexistente se descarta. Pruebas en Tarea 1; guardas en Tarea 3.

---

## Estructura de archivos

| Archivo | Tarea | Responsabilidad |
|---|---|---|
| `logica.js` | 1 | Funciones puras: números, series, volumen, semáforo, historial, tiempos, pasos de temporizador, fecha |
| `test.mjs` | 1, 2 | Pruebas con `node:test` |
| `rutina.js` | 2 | `export const RUTINA` con los 4 días |
| `index.html` | 3, 4, 5, 6 | UI, temporizador, historial, respaldo, registro del SW |
| `icono-192.png`, `icono-512.png`, `manifest.json`, `sw.js` | 6 | PWA |

---

### Task 1: Lógica pura (`logica.js`) con pruebas

**Files:**
- Create: `logica.js`
- Test: `test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces (todas exportadas desde `logica.js`):
  - `UMBRAL: number` (0.02), `PREP_SEG: number` (5), `CICLO: string[]`
  - `parseNumero(texto: string) → number | null` (acepta coma decimal; ≥ 0)
  - `serieValida(s: {peso, reps}) → boolean` (peso ≥ 0, reps entero > 0)
  - `volumen(series: {peso, reps}[]) → number`
  - `semaforo(hoy: number|null, anterior: number|null, menosEsMejor = false) → 'verde'|'amarillo'|'rojo'|'gris'`
  - `anterior(historial, ejId: string) → {peso, reps}[] | null`
  - `cardioAnterior(historial, diaId: string) → number | null`
  - `siguienteDia(historial) → string`
  - `parseTiempo(texto: string) → number | null` (segundos, formato `m:ss`)
  - `formatoTiempo(seg: number) → string` (`m:ss`)
  - `validarRespaldo(datos: unknown) → boolean`
  - `pasosSuperserie(ej) → {fase, seg, texto}[]`
  - `pasosHiit(final) → {fase, seg, texto}[]`
  - `fechaLocal(d = new Date()) → 'YYYY-MM-DD'`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from './logica.js';

test('parseNumero acepta coma decimal y rechaza basura', () => {
  assert.equal(L.parseNumero('12,5'), 12.5);
  assert.equal(L.parseNumero(' 14 '), 14);
  assert.equal(L.parseNumero('0'), 0);
  assert.equal(L.parseNumero(''), null);
  assert.equal(L.parseNumero('abc'), null);
  assert.equal(L.parseNumero('-3'), null);
});

test('serieValida exige peso >= 0 y reps entero > 0', () => {
  assert.equal(L.serieValida({ peso: 14, reps: 12 }), true);
  assert.equal(L.serieValida({ peso: 0, reps: 15 }), true);
  assert.equal(L.serieValida({ peso: 14, reps: null }), false);
  assert.equal(L.serieValida({ peso: 14, reps: 0 }), false);
  assert.equal(L.serieValida({ peso: 14, reps: 12.5 }), false);
  assert.equal(L.serieValida({ peso: null, reps: 12 }), false);
});

test('volumen suma peso × reps de las series válidas', () => {
  assert.equal(L.volumen([{ peso: 14, reps: 12 }, { peso: 14, reps: 13 }, { peso: 14, reps: 12 }]), 518);
  assert.equal(L.volumen([{ peso: 14, reps: 12 }, { peso: 14, reps: null }]), 168);
  assert.equal(L.volumen([]), 0);
});

test('volumen sin peso suma repeticiones', () => {
  assert.equal(L.volumen([{ peso: 0, reps: 15 }, { peso: 0, reps: 18 }]), 33);
});

test('semaforo compara contra la sesión anterior con umbral del 2 %', () => {
  assert.equal(L.semaforo(588, 504), 'verde');
  assert.equal(L.semaforo(505, 504), 'amarillo');
  assert.equal(L.semaforo(102, 100), 'amarillo');
  assert.equal(L.semaforo(480, 504), 'rojo');
  assert.equal(L.semaforo(0, 504), 'rojo');
});

test('semaforo sin referencia es gris', () => {
  assert.equal(L.semaforo(100, null), 'gris');
  assert.equal(L.semaforo(100, 0), 'gris');
  assert.equal(L.semaforo(null, 500), 'gris');
});

test('semaforo invertido: menos tiempo es mejor', () => {
  assert.equal(L.semaforo(540, 600, true), 'verde');
  assert.equal(L.semaforo(660, 600, true), 'rojo');
  assert.equal(L.semaforo(600, 600, true), 'amarillo');
});

const historial = [
  { fecha: '2026-10-20', dia: 'torso1', ejercicios: { 'press-plano': [{ peso: 12, reps: 12 }] }, cardioSeg: null },
  { fecha: '2026-10-22', dia: 'torso2', ejercicios: { 'face-pull': [{ peso: 0, reps: 15 }] }, cardioSeg: 600 },
  { fecha: '2026-10-27', dia: 'torso1', ejercicios: { 'press-plano': [{ peso: 14, reps: 12 }] }, cardioSeg: null },
  { fecha: '2026-10-29', dia: 'torso2', ejercicios: { 'face-pull': [] }, cardioSeg: null },
];

test('anterior devuelve la última sesión con series válidas de ese ejercicio', () => {
  assert.deepEqual(L.anterior(historial, 'press-plano'), [{ peso: 14, reps: 12 }]);
  assert.deepEqual(L.anterior(historial, 'face-pull'), [{ peso: 0, reps: 15 }]);
  assert.equal(L.anterior(historial, 'no-existe'), null);
  assert.equal(L.anterior([], 'press-plano'), null);
});

test('cardioAnterior devuelve el último tiempo registrado de ese día', () => {
  assert.equal(L.cardioAnterior(historial, 'torso2'), 600);
  assert.equal(L.cardioAnterior(historial, 'torso1'), null);
});

test('siguienteDia sigue el ciclo y tolera días desconocidos', () => {
  assert.equal(L.siguienteDia([]), 'torso1');
  assert.equal(L.siguienteDia([{ dia: 'torso1' }]), 'pierna1');
  assert.equal(L.siguienteDia([{ dia: 'pierna2' }]), 'torso1');
  assert.equal(L.siguienteDia([{ dia: 'dia-viejo' }]), 'torso1');
});

test('parseTiempo lee m:ss y rechaza formatos inválidos', () => {
  assert.equal(L.parseTiempo('9:05'), 545);
  assert.equal(L.parseTiempo(' 12:30 '), 750);
  assert.equal(L.parseTiempo('9:5'), null);
  assert.equal(L.parseTiempo('9:60'), null);
  assert.equal(L.parseTiempo('abc'), null);
  assert.equal(L.parseTiempo('0:00'), null);
});

test('formatoTiempo escribe m:ss', () => {
  assert.equal(L.formatoTiempo(545), '9:05');
  assert.equal(L.formatoTiempo(59.6), '1:00');
  assert.equal(L.formatoTiempo(0), '0:00');
  assert.equal(L.formatoTiempo(-3), '0:00');
});

test('validarRespaldo acepta solo arrays de sesiones', () => {
  assert.equal(L.validarRespaldo(historial), true);
  assert.equal(L.validarRespaldo([]), true);
  assert.equal(L.validarRespaldo({}), false);
  assert.equal(L.validarRespaldo(null), false);
  assert.equal(L.validarRespaldo([{ fecha: '2026-10-20' }]), false);
  assert.equal(L.validarRespaldo([{ fecha: '2026-10-20', dia: 'torso1', ejercicios: null }]), false);
});

test('pasosSuperserie: preparación, cardio y descanso', () => {
  const ej = { cardio: 'Skipping', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 };
  assert.deepEqual(L.pasosSuperserie(ej), [
    { fase: 'prep', seg: 5, texto: 'Prepárate: Skipping' },
    { fase: 'cardio', seg: 45, texto: 'Skipping' },
    { fase: 'descanso', seg: 90, texto: 'Descanso' },
  ]);
});

test('pasosSuperserie con 2 bloques repite preparación y cardio', () => {
  const ej = { cardio: 'Step-ups', cardioSeg: 45, cardioBloques: 2, descansoSeg: 60 };
  assert.deepEqual(L.pasosSuperserie(ej).map(p => p.texto), [
    'Prepárate: Step-ups (1/2)', 'Step-ups (1/2)', 'Prepárate: Step-ups (2/2)', 'Step-ups (2/2)', 'Descanso',
  ]);
});

test('pasosHiit: preparación + rondas de trabajo y pausa', () => {
  const pasos = L.pasosHiit({ nombre: 'Airbike', trabajoSeg: 20, pausaSeg: 40, minutos: 10 });
  assert.equal(pasos.length, 21);
  assert.deepEqual(pasos[0], { fase: 'prep', seg: 5, texto: 'Prepárate: Airbike' });
  assert.deepEqual(pasos[1], { fase: 'trabajo', seg: 20, texto: 'Ronda 1/10 · ¡Fuerte!' });
  assert.deepEqual(pasos[20], { fase: 'pausa', seg: 40, texto: 'Ronda 10/10 · Moderado' });
});

test('fechaLocal usa la fecha local en formato YYYY-MM-DD', () => {
  assert.equal(L.fechaLocal(new Date(2026, 9, 5, 23, 30)), '2026-10-05');
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node test.mjs`
Expected: error `Cannot find module '.../logica.js'`.

- [ ] **Step 3: Implementar `logica.js`**

```js
export const UMBRAL = 0.02;
export const PREP_SEG = 5;
export const CICLO = ['torso1', 'pierna1', 'torso2', 'pierna2'];

export function parseNumero(texto) {
  const limpio = String(texto ?? '').trim().replace(',', '.');
  const n = Number(limpio);
  return limpio !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

export function serieValida(s) {
  return s != null && s.peso != null && s.peso >= 0 && Number.isInteger(s.reps) && s.reps > 0;
}

export function volumen(series) {
  const hechas = series.filter(serieValida);
  const sinPeso = hechas.every(s => s.peso === 0);
  return hechas.reduce((total, s) => total + (sinPeso ? s.reps : s.peso * s.reps), 0);
}

export function semaforo(hoy, anterior, menosEsMejor = false) {
  if (!anterior || hoy == null) return 'gris';
  const delta = ((hoy - anterior) / anterior) * (menosEsMejor ? -1 : 1);
  if (delta > UMBRAL) return 'verde';
  if (delta < -UMBRAL) return 'rojo';
  return 'amarillo';
}

export function anterior(historial, ejId) {
  for (let i = historial.length - 1; i >= 0; i--) {
    const series = historial[i].ejercicios[ejId];
    if (series?.some(serieValida)) return series;
  }
  return null;
}

export function cardioAnterior(historial, diaId) {
  for (let i = historial.length - 1; i >= 0; i--) {
    if (historial[i].dia === diaId && historial[i].cardioSeg > 0) return historial[i].cardioSeg;
  }
  return null;
}

export function siguienteDia(historial) {
  const ultimo = CICLO.indexOf(historial.at(-1)?.dia);
  return ultimo === -1 ? CICLO[0] : CICLO[(ultimo + 1) % CICLO.length];
}

export function parseTiempo(texto) {
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(String(texto).trim());
  const seg = m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  return seg > 0 ? seg : null;
}

export function formatoTiempo(seg) {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function validarRespaldo(datos) {
  return Array.isArray(datos) && datos.every(s =>
    s && typeof s.fecha === 'string' && typeof s.dia === 'string' && s.ejercicios && typeof s.ejercicios === 'object');
}

export function pasosSuperserie(ej) {
  const pasos = [];
  const bloques = ej.cardioBloques ?? 1;
  for (let b = 1; b <= bloques; b++) {
    const sufijo = bloques > 1 ? ` (${b}/${bloques})` : '';
    pasos.push({ fase: 'prep', seg: PREP_SEG, texto: `Prepárate: ${ej.cardio}${sufijo}` });
    pasos.push({ fase: 'cardio', seg: ej.cardioSeg, texto: `${ej.cardio}${sufijo}` });
  }
  pasos.push({ fase: 'descanso', seg: ej.descansoSeg, texto: 'Descanso' });
  return pasos;
}

export function pasosHiit(final) {
  const rondas = Math.round((final.minutos * 60) / (final.trabajoSeg + final.pausaSeg));
  const pasos = [{ fase: 'prep', seg: PREP_SEG, texto: `Prepárate: ${final.nombre}` }];
  for (let r = 1; r <= rondas; r++) {
    pasos.push({ fase: 'trabajo', seg: final.trabajoSeg, texto: `Ronda ${r}/${rondas} · ¡Fuerte!` });
    pasos.push({ fase: 'pausa', seg: final.pausaSeg, texto: `Ronda ${r}/${rondas} · Moderado` });
  }
  return pasos;
}

export function fechaLocal(d = new Date()) {
  const dos = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node test.mjs`
Expected: `# pass 17`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add logica.js test.mjs
git commit -m "Lógica del semáforo, tiempos y pasos del temporizador

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Datos de la rutina (`rutina.js`)

**Files:**
- Create: `rutina.js`
- Modify: `test.mjs` (añadir al final)

**Interfaces:**
- Consumes: `CICLO` de `logica.js`.
- Produces: `RUTINA: { id, nombre, enfasis, ejercicios: { id, nombre, series, reps, cardio, cardioSeg, cardioBloques, descansoSeg }[], final: { tipo: 'hiit', nombre, trabajoSeg, pausaSeg, minutos } | { tipo: 'distancia', nombre } }[]`

- [ ] **Step 1: Escribir las pruebas que fallan**

Añadir al principio de `test.mjs`, debajo de `import * as L from './logica.js';`:

```js
import { RUTINA } from './rutina.js';
```

Añadir al final de `test.mjs`:

```js
test('RUTINA tiene los 4 días en el orden del ciclo', () => {
  assert.deepEqual(RUTINA.map(d => d.id), L.CICLO);
});

test('RUTINA: 16 ejercicios con ids únicos y campos completos', () => {
  const ejercicios = RUTINA.flatMap(d => d.ejercicios);
  assert.equal(ejercicios.length, 16);
  assert.equal(new Set(ejercicios.map(ej => ej.id)).size, 16);
  for (const ej of ejercicios) {
    assert.equal(ej.series, 3, ej.id);
    assert.match(ej.reps, /^\d+(-\d+)?$/, ej.id);
    assert.equal(ej.cardioSeg, 45, ej.id);
    assert.ok([1, 2].includes(ej.cardioBloques), ej.id);
    assert.ok([60, 90].includes(ej.descansoSeg), ej.id);
    assert.ok(ej.nombre && ej.cardio, ej.id);
  }
});

test('RUTINA: finales de cada día', () => {
  assert.deepEqual(RUTINA.map(d => d.final.tipo), ['hiit', 'hiit', 'distancia', 'hiit']);
  for (const d of RUTINA.filter(d => d.final.tipo === 'hiit')) {
    assert.equal(d.final.minutos, 10);
    assert.equal(d.final.trabajoSeg + d.final.pausaSeg, 60);
  }
  assert.equal(RUTINA[0].ejercicios.find(ej => ej.id === 'jalon-supino').cardioBloques, 2);
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node test.mjs`
Expected: error `Cannot find module '.../rutina.js'`.

- [ ] **Step 3: Crear `rutina.js`**

```js
// Plan BeastGym "Recomposición corporal" (07-10-2026). Al cambiar el plan, editar solo este archivo
// y subir VERSION en sw.js.
export const RUTINA = [
  {
    id: 'torso1', nombre: 'Torso 1', enfasis: 'Pecho y espalda · cuidado de muñecas',
    ejercicios: [
      { id: 'press-plano', nombre: 'Press plano con mancuernas agarre neutro', series: 3, reps: '12-15', cardio: 'Skipping bajo en piso', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'remo-polea', nombre: 'Remo en polea agarre neutro', series: 3, reps: '12-15', cardio: 'Jumping jacks', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'elev-laterales', nombre: 'Elevaciones laterales con mancuernas', series: 3, reps: '15', cardio: 'Skipping bajo en piso', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'jalon-supino', nombre: 'Jalón al pecho en polea agarre supino', series: 3, reps: '12-15', cardio: 'Step-ups básicos', cardioSeg: 45, cardioBloques: 2, descansoSeg: 60 },
    ],
    final: { tipo: 'hiit', nombre: 'Bicicleta estática', trabajoSeg: 30, pausaSeg: 30, minutos: 10 },
  },
  {
    id: 'pierna1', nombre: 'Pierna 1', enfasis: 'Cuádriceps y glúteo · bajo impacto en rodillas',
    ejercicios: [
      { id: 'prensa', nombre: 'Prensa (pies en V, rango cómodo)', series: 3, reps: '12-15', cardio: 'Jabs de boxeo alternos', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'hip-thrust', nombre: 'Hip thrust con barra', series: 3, reps: '12-15', cardio: 'Lazo de batida alterno', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'ext-rodilla', nombre: 'Extensión de rodilla unilateral', series: 3, reps: '15', cardio: 'Trote suave', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'talones', nombre: 'Elevación de talones de pie con mancuerna', series: 3, reps: '15-20', cardio: 'Escaladoras', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
    ],
    final: { tipo: 'hiit', nombre: 'Airbike', trabajoSeg: 20, pausaSeg: 40, minutos: 10 },
  },
  {
    id: 'torso2', nombre: 'Torso 2', enfasis: 'Hombros y brazos · protección articular',
    ejercicios: [
      { id: 'press-hombro', nombre: 'Press de hombro de pie con barra corta', series: 3, reps: '12-15', cardio: 'Escaladoras', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'face-pull', nombre: 'Face pull con banda', series: 3, reps: '15', cardio: 'Jumping jacks de bajo impacto', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'ext-triceps', nombre: 'Extensión de tríceps en polea agarre V', series: 3, reps: '12-15', cardio: 'Skipping bajo en el sitio', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'curl-biceps', nombre: 'Curl de bíceps en polea baja con barra recta', series: 3, reps: '12-15', cardio: 'Talones al glúteo suave', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
    ],
    final: { tipo: 'distancia', nombre: 'Caminadora 1 km' },
  },
  {
    id: 'pierna2', nombre: 'Pierna 2', enfasis: 'Isquios, glúteo y zona media · rodillas y lumbar',
    ejercicios: [
      { id: 'curl-femoral', nombre: 'Curl femoral acostado', series: 3, reps: '12-15', cardio: 'Jabs de boxeo alternos', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'peso-muerto-rumano', nombre: 'Peso muerto rumano con mancuerna rusa', series: 3, reps: '12-15', cardio: 'Step-ups alternos rodilla arriba', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'abduccion', nombre: 'Abducción de cadera en máquina', series: 3, reps: '15-20', cardio: 'Skipping en trampolín', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'crunch', nombre: 'Crunch abdominal en colchoneta', series: 3, reps: '15-20', cardio: 'Trote suave', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
    ],
    final: { tipo: 'hiit', nombre: 'Airbike', trabajoSeg: 20, pausaSeg: 40, minutos: 10 },
  },
];
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node test.mjs`
Expected: `# pass 20`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add rutina.js test.mjs
git commit -m "Rutina de 4 días del plan BeastGym

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Interfaz – inicio, sesión, resumen y guardado (`index.html`)

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: `RUTINA` (Tarea 2); `parseNumero`, `serieValida`, `volumen`, `semaforo`, `anterior`, `cardioAnterior`, `siguienteDia`, `parseTiempo`, `formatoTiempo`, `validarRespaldo`, `pasosSuperserie`, `pasosHiit`, `fechaLocal` (Tarea 1).
- Produces (dentro del `<script type="module">`, usado por Tareas 4–6): variables `historial`, `sesion`, `app`, constantes `K_HIST`, `K_CURSO`; funciones `escribir(clave, valor)`, `guardarCurso()`, `dia(id)`, `inicio()`, `pantallaSesion()`, `guardarSesion()`; delegación de eventos `click`/`change` sobre `#app` con `switch (b.dataset.accion)`; stub `temporizador(pasos)` que la Tarea 4 reemplaza.

- [ ] **Step 1: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0f1115">
<title>Entreno</title>
<style>
  :root {
    color-scheme: dark;
    --fondo: #0f1115; --superficie: #191c23; --borde: #2a2f3a; --texto: #f2f4f8; --sub: #8b93a5;
    --acento: #e5383b; --verde: #2ecc71; --amarillo: #f4c430; --rojo: #e5383b; --gris: #5c6370; --azul: #3a86ff;
    --radio: 16px;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--fondo); color: var(--texto); -webkit-tap-highlight-color: transparent; }
  main { max-width: 560px; margin: 0 auto; padding: 16px 16px 32px; }
  h1 { font-size: 1.8rem; margin: 12px 0 20px; }
  h2 { font-size: 1.3rem; margin: 0; }
  button { font: inherit; color: inherit; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; padding: 12px 16px; min-height: 48px; cursor: pointer; }
  button:active { transform: scale(.98); }
  .grande { display: block; width: 100%; margin: 0 0 12px; padding: 18px 20px; font-size: 1.15rem; font-weight: 600; text-align: left; border-radius: var(--radio); }
  .grande small { display: block; margin-top: 4px; color: var(--sub); font-size: .85rem; font-weight: 400; }
  .destacado { background: var(--acento); border-color: var(--acento); }
  .destacado small { color: #ffe3e3; }
  nav { display: flex; gap: 12px; margin-top: 8px; }
  nav button { flex: 1; }
  header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 12px; margin: -16px -16px 16px; padding: 12px 16px; background: color-mix(in srgb, var(--fondo) 85%, transparent); backdrop-filter: blur(8px); }
  .tarjeta { background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); padding: 16px; margin-bottom: 12px; }
  .tarjeta h3 { margin: 0 0 6px; font-size: 1.05rem; }
  .sub { color: var(--sub); margin: 2px 0; font-size: .85rem; }
  .fila { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .fila .n { width: 28px; color: var(--sub); font-size: .85rem; }
  .fila input { width: 0; flex: 1; min-height: 48px; font-size: 1.15rem; text-align: center; border-radius: 12px; border: 1px solid var(--borde); background: var(--fondo); color: var(--texto); }
  .fila input:focus { outline: 2px solid var(--azul); border-color: transparent; }
  .fila.siguiente input { border-color: var(--azul); }
  .fila.hecha input { border-color: var(--verde); color: var(--sub); }
  .fila.hecha button { background: var(--verde); border-color: var(--verde); color: #08130c; }
  .fila b { margin-left: auto; font-variant-numeric: tabular-nums; }
  .punto { width: 14px; height: 14px; border-radius: 50%; flex: none; }
  .verde { background: var(--verde); }
  .amarillo { background: var(--amarillo); }
  .rojo { background: var(--rojo); }
  .gris { background: var(--gris); }
</style>
</head>
<body>
<main id="app"></main>
<script type="module">
import { RUTINA } from './rutina.js';
import * as L from './logica.js';

const K_HIST = 'entreno.historial';
const K_CURSO = 'entreno.enCurso';
const app = document.getElementById('app');

function leer(clave, defecto) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? defecto; } catch { return defecto; }
}
const escribir = (clave, valor) => localStorage.setItem(clave, JSON.stringify(valor));

let historial = leer(K_HIST, []);
if (!L.validarRespaldo(historial)) historial = [];
let sesion = leer(K_CURSO, null);
const dia = id => RUTINA.find(d => d.id === id);
if (sesion && !dia(sesion.dia)) sesion = null;   // el día ya no existe en la rutina
const guardarCurso = () => escribir(K_CURSO, sesion);

// La Tarea 4 reemplaza esta función por el temporizador real.
function temporizador(pasos) { console.log('temporizador', pasos); }

function filasNuevas(ej) {
  const prev = L.anterior(historial, ej.id) ?? [];
  return Array.from({ length: ej.series }, (_, i) => ({ peso: prev[i]?.peso ?? prev.at(-1)?.peso ?? null, reps: null }));
}

function inicio() {
  const toca = L.siguienteDia(historial);
  app.innerHTML = `
    <h1>Entreno</h1>
    ${sesion ? `
      <button class="grande destacado" data-accion="continuar">
        ▶ Continuar ${dia(sesion.dia).nombre}<small>Sesión del ${sesion.fecha} sin guardar</small>
      </button>` : ''}
    ${RUTINA.map(d => `
      <button class="grande ${!sesion && d.id === toca ? 'destacado' : ''}" data-accion="empezar" data-dia="${d.id}">
        ${d.nombre}<small>${!sesion && d.id === toca ? 'Te toca · ' : ''}${d.enfasis}</small>
      </button>`).join('')}
    <nav>
      <button data-accion="historial">Historial</button>
      <button data-accion="respaldo">Respaldo</button>
    </nav>`;
}

function empezar(id) {
  if (sesion && !confirm(`Hay una sesión de ${dia(sesion.dia).nombre} sin guardar. ¿Descartarla y empezar ${dia(id).nombre}?`)) return;
  sesion = {
    fecha: L.fechaLocal(),
    dia: id,
    ejercicios: Object.fromEntries(dia(id).ejercicios.map(ej => [ej.id, filasNuevas(ej)])),
    cardioSeg: null,
  };
  guardarCurso();
  pantallaSesion();
}

function pantallaSesion() {
  const d = dia(sesion.dia);
  for (const ej of d.ejercicios) sesion.ejercicios[ej.id] ??= filasNuevas(ej);
  app.innerHTML = `
    <header><button data-accion="inicio" aria-label="Volver">←</button><h2>${d.nombre}</h2></header>
    ${d.ejercicios.map(tarjetaEjercicio).join('')}
    ${tarjetaFinal(d.final)}
    <button class="grande destacado" data-accion="resumen">Terminar sesión</button>`;
}

function tarjetaEjercicio(ej) {
  const prev = L.anterior(historial, ej.id);
  const filas = sesion.ejercicios[ej.id];
  const pendiente = filas.findIndex(s => !L.serieValida(s));
  return `
    <section class="tarjeta">
      <h3>${ej.nombre} <span class="sub">${ej.reps} reps</span></h3>
      <p class="sub">+ ${ej.cardio} ${ej.cardioSeg}s${ej.cardioBloques > 1 ? ' por pierna' : ''} · descanso ${ej.descansoSeg}s</p>
      <p class="sub">Anterior: ${prev ? prev.map(s => `${s.peso}×${s.reps}`).join(' · ') : '—'}</p>
      ${filas.map((s, i) => `
        <div class="fila ${L.serieValida(s) ? 'hecha' : i === pendiente ? 'siguiente' : ''}" data-ej="${ej.id}" data-i="${i}">
          <span class="n">S${i + 1}</span>
          <input data-campo="peso" inputmode="decimal" placeholder="kg" aria-label="Peso serie ${i + 1}" value="${s.peso ?? ''}">
          <input data-campo="reps" inputmode="numeric" placeholder="reps" aria-label="Repeticiones serie ${i + 1}" value="${s.reps ?? ''}">
          <button data-accion="serie" aria-label="Serie ${i + 1} hecha">✓</button>
        </div>`).join('')}
    </section>`;
}

function tarjetaFinal(f) {
  if (f.tipo === 'hiit') return `
    <section class="tarjeta">
      <h3>HIIT · ${f.nombre}</h3>
      <p class="sub">${f.minutos} min · ${f.trabajoSeg}s fuerte / ${f.pausaSeg}s moderado</p>
      <div class="fila"><button data-accion="hiit">Iniciar HIIT</button></div>
    </section>`;
  const prev = L.cardioAnterior(historial, sesion.dia);
  return `
    <section class="tarjeta">
      <h3>${f.nombre}</h3>
      <p class="sub">Anterior: ${prev ? L.formatoTiempo(prev) : '—'}</p>
      <div class="fila">
        <input id="tiempo" placeholder="m:ss" aria-label="Tiempo" value="${sesion.cardioSeg ? L.formatoTiempo(sesion.cardioSeg) : ''}">
        <button data-accion="crono" id="crono">Cronómetro</button>
      </div>
    </section>`;
}

function marcarSerie(fila) {
  const ejId = fila.dataset.ej;
  const i = Number(fila.dataset.i);
  const serie = {
    peso: L.parseNumero(fila.querySelector('[data-campo=peso]').value),
    reps: L.parseNumero(fila.querySelector('[data-campo=reps]').value),
  };
  if (!L.serieValida(serie)) return alert('Escribe el peso (0 si no usas peso) y las repeticiones.');
  const filas = sesion.ejercicios[ejId];
  filas[i] = serie;
  if (filas[i + 1] && filas[i + 1].peso == null) filas[i + 1].peso = serie.peso;
  guardarCurso();
  pantallaSesion();
  temporizador(L.pasosSuperserie(dia(sesion.dia).ejercicios.find(ej => ej.id === ejId)));
}

function pct(hoy, antes) {
  if (!antes || hoy == null) return '';
  const d = ((hoy - antes) / antes) * 100;
  return ` (${d > 0 ? '+' : ''}${d.toFixed(1)} %)`;
}

function pantallaResumen() {
  const d = dia(sesion.dia);
  const lineas = d.ejercicios.map(ej => {
    const hoy = L.volumen(sesion.ejercicios[ej.id]);
    const prev = L.anterior(historial, ej.id);
    const antes = prev && L.volumen(prev);
    return `<div class="fila"><span class="punto ${L.semaforo(hoy, antes)}"></span>${ej.nombre}<b>${+hoy.toFixed(1)}${pct(hoy, antes)}</b></div>`;
  });
  if (d.final.tipo === 'distancia') {
    const hoy = sesion.cardioSeg;
    const antes = L.cardioAnterior(historial, d.id);
    lineas.push(`<div class="fila"><span class="punto ${L.semaforo(hoy, antes, true)}"></span>${d.final.nombre}<b>${hoy ? L.formatoTiempo(hoy) : '—'}${pct(hoy, antes)}</b></div>`);
  }
  app.innerHTML = `
    <header><button data-accion="continuar" aria-label="Volver">←</button><h2>Resumen · ${d.nombre}</h2></header>
    <section class="tarjeta">${lineas.join('')}</section>
    <p class="sub">🟢 mejoró más de 2 % · 🟡 se mantuvo · 🔴 bajó más de 2 % · ⚪ sin referencia</p>
    <button class="grande destacado" data-accion="guardar">Guardar sesión</button>`;
}

function guardarSesion() {
  const ejercicios = Object.fromEntries(
    Object.entries(sesion.ejercicios).map(([id, series]) => [id, series.filter(L.serieValida)]));
  historial.push({ fecha: sesion.fecha, dia: sesion.dia, ejercicios, cardioSeg: sesion.cardioSeg });
  escribir(K_HIST, historial);
  localStorage.removeItem(K_CURSO);
  sesion = null;
  inicio();
}

app.addEventListener('click', e => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  switch (b.dataset.accion) {
    case 'inicio': return inicio();
    case 'continuar': return pantallaSesion();
    case 'empezar': return empezar(b.dataset.dia);
    case 'serie': return marcarSerie(b.closest('.fila'));
    case 'resumen': return pantallaResumen();
    case 'guardar': return guardarSesion();
    case 'hiit': return temporizador(L.pasosHiit(dia(sesion.dia).final));
  }
});

app.addEventListener('change', e => {
  const input = e.target;
  if (input.id === 'tiempo') {
    const seg = L.parseTiempo(input.value);
    if (input.value.trim() && seg == null) {
      alert('Escribe el tiempo como m:ss, por ejemplo 9:05');
      input.value = sesion.cardioSeg ? L.formatoTiempo(sesion.cardioSeg) : '';
      return;
    }
    sesion.cardioSeg = seg;
    return guardarCurso();
  }
  const fila = input.closest('.fila[data-ej]');
  if (!fila) return;
  sesion.ejercicios[fila.dataset.ej][fila.dataset.i][input.dataset.campo] = L.parseNumero(input.value);
  guardarCurso();
});

inicio();
</script>
</body>
</html>
```

- [ ] **Step 2: Servir en local y verificar a mano**

Run (en segundo plano, desde `C:\Programacion\Entrenamiento`): `python -m http.server 8080`
Abrir `http://localhost:8080` en Chrome con DevTools → modo dispositivo (Pixel 7). Comprobar:
1. Inicio: 4 botones; "Torso 1" destacado con "Te toca".
2. Torso 1 → 4 tarjetas, 3 filas cada una; la S1 de cada ejercicio con borde azul.
3. Escribir `12,5` kg y `12` reps en S1 de Press plano → ✓ → fila verde, S2 se prellena con 12.5; consola muestra `temporizador [...]` con 3 pasos.
4. ✓ en una fila con reps vacías → alerta, nada cambia.
5. Recargar la página → Inicio muestra "▶ Continuar Torso 1"; al entrar, la serie sigue registrada.
6. Terminar sesión → resumen con puntos grises (sin referencia) → Guardar → Inicio destaca "Pierna 1".
7. Repetir Torso 1 con más reps → resumen con punto verde y porcentaje positivo.
8. Torso 2 → campo de caminadora: `9:5` → alerta; `9:05` → se guarda.
9. Consola sin errores.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Interfaz: inicio, sesión, resumen con semáforo y guardado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Temporizador guiado, HIIT, cronómetro y pantalla encendida

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `L.formatoTiempo`, `L.pasosSuperserie`, `L.pasosHiit` (Tarea 1); `sesion`, `guardarCurso()`, `pantallaSesion()`, `guardarSesion()` (Tarea 3).
- Produces: `temporizador(pasos, alTerminar = () => {})`, `detenerTemporizador()`, `mantenerPantalla()`, `alternarCrono()`; variables `wake`, `crono`.

- [ ] **Step 1: Añadir estilos del temporizador**

En `index.html`, reemplazar `</style>` por:

```css
  #timer { position: fixed; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 16px; text-align: center; transition: background .3s; }
  #timer[hidden] { display: none; }
  #timer .texto { font-size: 1.5rem; font-weight: 600; }
  #timer .cuenta { font-size: min(32vw, 40vh); font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
  #timer .botones { display: flex; gap: 12px; }
  #timer button { min-width: 96px; background: rgba(0, 0, 0, .25); border-color: transparent; }
  .fase-prep { background: #c77d00; }
  .fase-cardio, .fase-trabajo { background: var(--rojo); }
  .fase-descanso { background: var(--azul); }
  .fase-pausa { background: #1f9d55; }
</style>
```

- [ ] **Step 2: Añadir el marcado del temporizador**

Reemplazar `<main id="app"></main>` por:

```html
<main id="app"></main>
<div id="timer" hidden>
  <div class="texto"></div>
  <div class="cuenta"></div>
  <div class="botones">
    <button data-t="pausa">Pausa</button>
    <button data-t="saltar">Saltar ⏭</button>
    <button data-t="cerrar" aria-label="Cerrar temporizador">✕</button>
  </div>
</div>
```

- [ ] **Step 3: Reemplazar el stub por el temporizador real**

Reemplazar estas dos líneas:

```js
// La Tarea 4 reemplaza esta función por el temporizador real.
function temporizador(pasos) { console.log('temporizador', pasos); }
```

por:

```js
// ---- Temporizador ----
const tEl = document.getElementById('timer');
let corriendo = null;   // { pasos, i, fin, pausa, ultimoSeg, intervalo, alTerminar }
let audio = null;
let wake = null;
let crono = null;       // { inicio, intervalo }

function pitido(frecuencia, segundos) {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const osc = audio.createOscillator();
    const vol = audio.createGain();
    osc.frequency.value = frecuencia;
    vol.gain.value = 0.3;
    osc.connect(vol).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + segundos);
  } catch { /* sin audio el temporizador sigue funcionando */ }
}
const vibrar = patron => navigator.vibrate?.(patron);

async function mantenerPantalla() {
  if (wake && !wake.released) return;
  try { wake = await navigator.wakeLock.request('screen'); } catch { wake = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && sesion) mantenerPantalla();
});

function temporizador(pasos, alTerminar = () => {}) {
  detenerTemporizador();
  corriendo = { pasos, i: -1, alTerminar };
  tEl.hidden = false;
  siguientePaso();
  if (corriendo) corriendo.intervalo = setInterval(tick, 200);
}

function siguientePaso() {
  const c = corriendo;
  if (!c) return;
  c.i++;
  if (c.i >= c.pasos.length) {
    detenerTemporizador();
    pitido(880, 0.6);
    vibrar([300, 100, 300]);
    return c.alTerminar();
  }
  const paso = c.pasos[c.i];
  c.fin = Date.now() + paso.seg * 1000;   // el restante se calcula con el reloj, no contando ticks
  c.pausa = null;
  c.ultimoSeg = null;
  tEl.className = `fase-${paso.fase}`;
  tEl.querySelector('.texto').textContent = paso.texto;
  tEl.querySelector('[data-t=pausa]').textContent = 'Pausa';
  pitido(660, 0.25);
  vibrar(200);
  tick();
}

function tick() {
  const c = corriendo;
  if (!c || c.pausa != null) return;
  const resta = Math.ceil((c.fin - Date.now()) / 1000);
  if (resta <= 0) return siguientePaso();
  if (resta === c.ultimoSeg) return;
  c.ultimoSeg = resta;
  tEl.querySelector('.cuenta').textContent = L.formatoTiempo(resta);
  if (resta <= 3) pitido(440, 0.12);
}

function pausar() {
  const c = corriendo;
  if (!c) return;
  if (c.pausa == null) {
    c.pausa = c.fin - Date.now();
  } else {
    c.fin = Date.now() + c.pausa;
    c.pausa = null;
  }
  tEl.querySelector('[data-t=pausa]').textContent = c.pausa == null ? 'Pausa' : 'Seguir';
}

function detenerTemporizador() {
  if (corriendo) clearInterval(corriendo.intervalo);
  corriendo = null;
  tEl.hidden = true;
}

tEl.addEventListener('click', e => {
  const accion = e.target.closest('[data-t]')?.dataset.t;
  if (accion === 'pausa') pausar();
  if (accion === 'saltar') siguientePaso();
  if (accion === 'cerrar') detenerTemporizador();
});

function alternarCrono() {
  if (!crono) {
    crono = { inicio: Date.now() };
    crono.intervalo = setInterval(() => {
      const campo = document.getElementById('tiempo');
      if (campo) campo.value = L.formatoTiempo(Math.floor((Date.now() - crono.inicio) / 1000));
    }, 250);
    document.getElementById('crono').textContent = 'Detener';
    return;
  }
  clearInterval(crono.intervalo);
  sesion.cardioSeg = Math.round((Date.now() - crono.inicio) / 1000);
  crono = null;
  guardarCurso();
  pantallaSesion();
}
```

- [ ] **Step 4: Conectar cronómetro, pantalla encendida y liberación**

4a. En `tarjetaFinal`, reemplazar:

```js
        <button data-accion="crono" id="crono">Cronómetro</button>
```

por:

```js
        <button data-accion="crono" id="crono">${crono ? 'Detener' : 'Cronómetro'}</button>
```

4b. En el `switch` de clics, reemplazar:

```js
    case 'hiit': return temporizador(L.pasosHiit(dia(sesion.dia).final));
```

por:

```js
    case 'hiit': return temporizador(L.pasosHiit(dia(sesion.dia).final));
    case 'crono': return alternarCrono();
```

4c. En `pantallaSesion`, reemplazar:

```js
  for (const ej of d.ejercicios) sesion.ejercicios[ej.id] ??= filasNuevas(ej);
```

por:

```js
  for (const ej of d.ejercicios) sesion.ejercicios[ej.id] ??= filasNuevas(ej);
  mantenerPantalla();
```

4d. En `guardarSesion`, reemplazar:

```js
  sesion = null;
  inicio();
```

por:

```js
  sesion = null;
  wake?.release();
  wake = null;
  inicio();
```

- [ ] **Step 5: Verificar a mano**

Con el servidor de la Tarea 3 corriendo, recargar `http://localhost:8080` (Ctrl+Shift+R). Comprobar:
1. ✓ en una serie → pantalla completa naranja "Prepárate: Skipping bajo en piso" 0:05 con pitidos en 3-2-1 → rojo 0:45 → azul "Descanso" 1:30 → se cierra con doble pitido.
2. Pausa congela la cuenta y el botón dice "Seguir"; Seguir continúa desde el mismo segundo.
3. Saltar pasa a la siguiente fase; ✕ cierra todo.
4. Jalón al pecho (Torso 1) → dos bloques "Step-ups básicos (1/2)" y "(2/2)", cada uno con su preparación.
5. Iniciar HIIT en Pierna 1 → "Ronda 1/10 · ¡Fuerte!" 0:20 / "Moderado" 0:40.
6. Torso 2 → Cronómetro corre en el campo; Detener guarda el tiempo y el botón vuelve a "Cronómetro".
7. DevTools → consola sin errores (la vibración y el wake lock pueden no hacer nada en PC: es normal).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Temporizador guiado, HIIT, cronómetro y pantalla encendida

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Historial y respaldo

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `historial`, `app`, `K_HIST`, `escribir`, `inicio` (Tarea 3); `L.volumen`, `L.semaforo`, `L.formatoTiempo`, `L.validarRespaldo`, `L.fechaLocal` (Tarea 1).
- Produces: `pantallaHistorial()`, `pantallaRespaldo()`, `exportar()`, `importar(archivo)`.

- [ ] **Step 1: Estilo del botón de importar**

Reemplazar `</style>` por:

```css
  label.grande { background: var(--superficie); border: 1px solid var(--borde); cursor: pointer; }
</style>
```

- [ ] **Step 2: Añadir las pantallas**

Reemplazar:

```js
inicio();
</script>
```

por:

```js
function pantallaHistorial() {
  const bloques = RUTINA.flatMap(d => d.ejercicios).map(ej => {
    const puntos = historial
      .filter(s => s.ejercicios[ej.id]?.length)
      .map(s => ({ fecha: s.fecha, v: L.volumen(s.ejercicios[ej.id]) }));
    return tarjetaHistorial(ej.nombre, puntos, false, v => +v.toFixed(1));
  });
  for (const d of RUTINA.filter(d => d.final.tipo === 'distancia')) {
    const puntos = historial
      .filter(s => s.dia === d.id && s.cardioSeg > 0)
      .map(s => ({ fecha: s.fecha, v: s.cardioSeg }));
    bloques.push(tarjetaHistorial(d.final.nombre, puntos, true, L.formatoTiempo));
  }
  app.innerHTML = `
    <header><button data-accion="inicio" aria-label="Volver">←</button><h2>Historial</h2></header>
    ${bloques.join('') || '<p class="sub">Todavía no hay sesiones guardadas.</p>'}`;
}

// Últimas 5 sesiones, la más reciente arriba; cada una coloreada contra la anterior.
function tarjetaHistorial(titulo, puntos, menosEsMejor, formato) {
  if (!puntos.length) return '';
  const filas = puntos
    .map((p, i) => ({ ...p, color: L.semaforo(p.v, puntos[i - 1]?.v, menosEsMejor) }))
    .slice(-5)
    .reverse()
    .map(p => `<div class="fila"><span class="punto ${p.color}"></span>${p.fecha}<b>${formato(p.v)}</b></div>`);
  return `<section class="tarjeta"><h3>${titulo}</h3>${filas.join('')}</section>`;
}

function pantallaRespaldo() {
  app.innerHTML = `
    <header><button data-accion="inicio" aria-label="Volver">←</button><h2>Respaldo</h2></header>
    <p class="sub">${historial.length} sesiones guardadas en este celular. Si se borran los datos del navegador se pierden: exporta cada semana y guarda el archivo en Drive o WhatsApp.</p>
    <button class="grande" data-accion="exportar">Exportar respaldo (.json)</button>
    <label class="grande">Importar respaldo<input id="archivo" type="file" accept=".json,application/json" hidden></label>`;
}

function exportar() {
  const blob = new Blob([JSON.stringify(historial, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `entreno-respaldo-${L.fechaLocal()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importar(archivo) {
  let datos;
  try { datos = JSON.parse(await archivo.text()); } catch { return alert('El archivo no es un JSON válido. No se cambió nada.'); }
  if (!L.validarRespaldo(datos)) return alert('El archivo no es un respaldo de esta app. No se cambió nada.');
  if (!confirm(`¿Reemplazar tu historial (${historial.length} sesiones) por el del archivo (${datos.length} sesiones)?`)) return;
  historial = datos;
  escribir(K_HIST, historial);
  alert('Respaldo importado.');
  inicio();
}

inicio();
</script>
```

- [ ] **Step 3: Conectar eventos**

3a. En el `switch` de clics, reemplazar:

```js
    case 'guardar': return guardarSesion();
```

por:

```js
    case 'guardar': return guardarSesion();
    case 'historial': return pantallaHistorial();
    case 'respaldo': return pantallaRespaldo();
    case 'exportar': return exportar();
```

3b. En el listener de `change`, reemplazar:

```js
  const input = e.target;
```

por:

```js
  const input = e.target;
  if (input.id === 'archivo') {
    const archivo = input.files[0];
    input.value = '';   // permite volver a elegir el mismo archivo
    return archivo && importar(archivo);
  }
```

- [ ] **Step 4: Verificar a mano**

Recargar `http://localhost:8080` (Ctrl+Shift+R). Comprobar:
1. Historial con las sesiones de las pruebas anteriores: cada ejercicio muestra fechas y volumen, la más reciente arriba con su color; la caminadora muestra tiempos.
2. Historial vacío (DevTools → Application → Local Storage → borrar `entreno.historial`, recargar) → "Todavía no hay sesiones guardadas."
3. Respaldo → Exportar descarga `entreno-respaldo-<fecha de hoy>.json`.
4. Importar ese archivo → confirmación con los dos conteos → "Respaldo importado." → el historial vuelve.
5. Importar un `.json` con `{"hola": 1}` → "no es un respaldo de esta app", historial intacto.
6. Importar un archivo `.json` con contenido `abc` → "no es un JSON válido", historial intacto.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Historial por ejercicio y respaldo exportar/importar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: PWA – íconos, manifest y service worker

**Files:**
- Create: `icono-192.png`, `icono-512.png`, `manifest.json`, `sw.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: archivos de las Tareas 1–5.
- Produces: `VERSION` en `sw.js` (se sube en cada cambio publicado).

- [ ] **Step 1: Generar los íconos (PowerShell, desde `C:\Programacion\Entrenamiento`)**

```powershell
Add-Type -AssemblyName System.Drawing
foreach ($t in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $t, $t
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(229, 56, 59))
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $fuente = New-Object System.Drawing.Font 'Segoe UI', ($t * 0.5), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $formato = New-Object System.Drawing.StringFormat
  $formato.Alignment = 'Center'; $formato.LineAlignment = 'Center'
  $g.DrawString('E', $fuente, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 0, $t, $t), $formato)
  $bmp.Save("$PWD\icono-$t.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
```

Expected: existen `icono-192.png` y `icono-512.png` (fondo rojo, "E" blanca).

- [ ] **Step 2: Crear `manifest.json`**

```json
{
  "name": "Entreno",
  "short_name": "Entreno",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f1115",
  "theme_color": "#0f1115",
  "icons": [
    { "src": "icono-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icono-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 3: Crear `sw.js`**

```js
// Subir VERSION en cada cambio publicado: la app se actualiza la siguiente vez que se abre.
const VERSION = 'v1';
const ARCHIVOS = ['./', './index.html', './rutina.js', './logica.js', './manifest.json', './icono-192.png', './icono-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(claves =>
    Promise.all(claves.filter(c => c !== VERSION).map(c => caches.delete(c)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r ?? fetch(e.request)));
});
```

- [ ] **Step 4: Enlazar manifest y registrar el SW en `index.html`**

4a. Reemplazar:

```html
<meta name="theme-color" content="#0f1115">
```

por:

```html
<meta name="theme-color" content="#0f1115">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icono-192.png">
```

4b. Reemplazar:

```js
inicio();
</script>
```

por:

```js
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
inicio();
</script>
```

- [ ] **Step 5: Verificar a mano**

Recargar `http://localhost:8080` (Ctrl+Shift+R). En DevTools → Application:
1. Manifest: nombre "Entreno", ambos íconos visibles, sin errores de instalabilidad.
2. Service workers: `sw.js` "activated and is running".
3. Network → marcar "Offline" → recargar → la app carga y funciona (inicio, sesión, temporizador).
4. Desmarcar "Offline". Ejecutar `node test.mjs` → `# pass 20`, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add icono-192.png icono-512.png manifest.json sw.js index.html
git commit -m "PWA: íconos, manifest y service worker para uso sin internet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Publicar en GitHub Pages y probar en el Android

**Files:** ninguno nuevo.

**Interfaces:**
- Consumes: repo completo de las Tareas 1–6; `gh` autenticado como `S4MU3L-ROM`.
- Produces: URL pública `https://s4mu3l-rom.github.io/entreno/`.

- [ ] **Step 1: Confirmar con el usuario antes de publicar**

Crear un repo **público** es una acción externa. Confirmar con el usuario el nombre del repo (`entreno`) y la visibilidad antes de seguir. Verificar que `git ls-files` no lista ningún `.pdf`.

- [ ] **Step 2: Crear el repo y subir**

```bash
git branch -M main
gh repo create entreno --public --source=. --remote=origin --push
```

Expected: `✓ Created repository S4MU3L-ROM/entreno` y push de `main`.

- [ ] **Step 3: Activar GitHub Pages**

```bash
gh api -X POST repos/S4MU3L-ROM/entreno/pages -f "source[branch]=main" -f "source[path]=/"
gh api repos/S4MU3L-ROM/entreno/pages --jq .html_url
```

Expected: `https://s4mu3l-rom.github.io/entreno/`. Esperar 1–2 minutos y abrir la URL en el PC para confirmar que carga.

- [ ] **Step 4: Prueba en el Android (usuario)**

1. Abrir la URL en Chrome → menú ⋮ → "Instalar app" / "Agregar a pantalla de inicio" → aparece el ícono "Entreno".
2. Abrir desde el ícono (sin barra del navegador).
3. Activar modo avión → cerrar y reabrir la app → funciona.
4. Hacer una serie → el temporizador suena, vibra al cambiar de fase y la pantalla no se apaga.
5. Cerrar la app a mitad de sesión → reabrir → "Continuar" conserva lo registrado.
6. Respaldo → Exportar → el archivo aparece en Descargas; Importar ese archivo funciona.

- [ ] **Step 5: Publicar cambios futuros**

Cada cambio (p. ej. nueva rutina el 14-12-2026): editar `rutina.js`, subir `VERSION` en `sw.js` (`'v2'`, …), `node test.mjs`, commit y `git push`. La app toma la nueva versión al abrirla con internet y la aplica en la siguiente apertura.
