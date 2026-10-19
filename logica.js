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

// Los pesos se guardan siempre en kg; lb solo existe al mostrar y al escribir.
export const KG_POR_LB = 0.45359237;
export const aKg = (valor, unidad) => unidad === 'lb' ? valor * KG_POR_LB : valor;
export const aUnidad = (kg, unidad) => unidad === 'lb' ? kg / KG_POR_LB : kg;
export const formatoPeso = (kg, unidad) => kg == null ? '' : String(+aUnidad(kg, unidad).toFixed(2));

// Volumen en la unidad del ejercicio; sin peso son repeticiones y no se convierte.
export function volumenEn(series, unidad) {
  const conPeso = series.some(s => serieValida(s) && s.peso > 0);
  return conPeso ? aUnidad(volumen(series), unidad) : volumen(series);
}

export function semaforo(hoy, anterior, menosEsMejor = false) {
  if (!anterior || hoy == null) return 'gris';
  const delta = ((hoy - anterior) / anterior) * (menosEsMejor ? -1 : 1);
  if (delta > UMBRAL) return 'verde';
  if (delta < -UMBRAL) return 'rojo';
  return 'amarillo';
}

// puntos: [{ v, ...lo que sea }] en orden cronológico → añade antes y color contra el punto previo.
export function tendencia(puntos, menosEsMejor = false) {
  return puntos.map((p, i) => ({
    ...p,
    antes: puntos[i - 1]?.v ?? null,
    color: semaforo(p.v, puntos[i - 1]?.v, menosEsMejor),
  }));
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

// Estricta a propósito: estos datos se pintan con innerHTML y pueden venir de un archivo importado.
const esNumero = v => typeof v === 'number' && Number.isFinite(v);

export function validarRespaldo(datos) {
  return Array.isArray(datos) && datos.every(s =>
    s && typeof s.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.fecha)
    && typeof s.dia === 'string'
    && (s.cardioSeg == null || esNumero(s.cardioSeg))
    && s.ejercicios && typeof s.ejercicios === 'object'
    && Object.values(s.ejercicios).every(series =>
      Array.isArray(series) && series.every(x => x && esNumero(x.peso) && esNumero(x.reps))));
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
