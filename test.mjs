import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from './logica.js';
import { RUTINA } from './rutina.js';

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
