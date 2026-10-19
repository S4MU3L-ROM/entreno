export const MUSCULOS = {
  pecho: 'Pecho', hombros: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', antebrazos: 'Antebrazos',
  abdomen: 'Abdomen', cuadriceps: 'Cuádriceps', gemelos: 'Gemelos', espalda: 'Espalda',
  trapecio: 'Trapecio', lumbar: 'Lumbar', gluteos: 'Glúteos', isquios: 'Isquios',
};

// Silueta estilizada: frente centrado en x=50, espalda en x=150.
export function svgCuerpo(principales = [], secundarios = []) {
  const c = m => principales.includes(m) ? 'm p' : secundarios.includes(m) ? 'm s' : 'm';
  const lista = [...principales, ...secundarios].map(m => MUSCULOS[m]).join(', ') || 'ninguno';
  return `
<svg class="cuerpo" viewBox="0 0 200 172" role="img" aria-label="Músculos trabajados: ${lista}">
  <g class="base">
    <circle cx="50" cy="13" r="9"/><rect x="46" y="21" width="8" height="7" rx="2"/>
    <rect x="38" y="74" width="24" height="7" rx="3"/>
    <circle cx="23" cy="86" r="4"/><circle cx="77" cy="86" r="4"/>
    <circle cx="43.5" cy="118" r="4"/><circle cx="56.5" cy="118" r="4"/>
    <ellipse cx="43.5" cy="153" rx="5" ry="3"/><ellipse cx="56.5" cy="153" rx="5" ry="3"/>
    <circle cx="150" cy="13" r="9"/><rect x="146" y="21" width="8" height="7" rx="2"/>
    <circle cx="123" cy="86" r="4"/><circle cx="177" cy="86" r="4"/>
    <circle cx="143.5" cy="119" r="3.5"/><circle cx="156.5" cy="119" r="3.5"/>
    <ellipse cx="143.5" cy="153" rx="5" ry="3"/><ellipse cx="156.5" cy="153" rx="5" ry="3"/>
  </g>
  <ellipse class="${c('hombros')}" cx="31" cy="36" rx="7" ry="7"/><ellipse class="${c('hombros')}" cx="69" cy="36" rx="7" ry="7"/>
  <rect class="${c('pecho')}" x="37" y="30" width="12.5" height="16" rx="4"/><rect class="${c('pecho')}" x="50.5" y="30" width="12.5" height="16" rx="4"/>
  <rect class="${c('abdomen')}" x="40" y="48" width="20" height="25" rx="4"/>
  <ellipse class="${c('biceps')}" cx="27" cy="52" rx="5" ry="9"/><ellipse class="${c('biceps')}" cx="73" cy="52" rx="5" ry="9"/>
  <ellipse class="${c('antebrazos')}" cx="24" cy="72" rx="4.5" ry="9"/><ellipse class="${c('antebrazos')}" cx="76" cy="72" rx="4.5" ry="9"/>
  <rect class="${c('cuadriceps')}" x="38" y="82" width="11" height="32" rx="5"/><rect class="${c('cuadriceps')}" x="51" y="82" width="11" height="32" rx="5"/>
  <rect class="${c('gemelos')}" x="39.5" y="123" width="8" height="26" rx="4"/><rect class="${c('gemelos')}" x="52.5" y="123" width="8" height="26" rx="4"/>
  <polygon class="${c('trapecio')}" points="141,27 159,27 167,34 150,45 133,34"/>
  <ellipse class="${c('hombros')}" cx="131" cy="37" rx="7" ry="7"/><ellipse class="${c('hombros')}" cx="169" cy="37" rx="7" ry="7"/>
  <rect class="${c('espalda')}" x="136" y="39" width="13" height="26" rx="5"/><rect class="${c('espalda')}" x="151" y="39" width="13" height="26" rx="5"/>
  <rect class="${c('lumbar')}" x="142" y="66" width="16" height="10" rx="3"/>
  <ellipse class="${c('triceps')}" cx="127" cy="52" rx="5" ry="9"/><ellipse class="${c('triceps')}" cx="173" cy="52" rx="5" ry="9"/>
  <ellipse class="${c('antebrazos')}" cx="124" cy="72" rx="4.5" ry="9"/><ellipse class="${c('antebrazos')}" cx="176" cy="72" rx="4.5" ry="9"/>
  <ellipse class="${c('gluteos')}" cx="143.5" cy="85" rx="6.5" ry="7.5"/><ellipse class="${c('gluteos')}" cx="156.5" cy="85" rx="6.5" ry="7.5"/>
  <rect class="${c('isquios')}" x="138" y="94" width="11" height="22" rx="5"/><rect class="${c('isquios')}" x="151" y="94" width="11" height="22" rx="5"/>
  <ellipse class="${c('gemelos')}" cx="143.5" cy="134" rx="5" ry="12"/><ellipse class="${c('gemelos')}" cx="156.5" cy="134" rx="5" ry="12"/>
  <text x="50" y="168">Frente</text><text x="150" y="168">Espalda</text>
</svg>`;
}
