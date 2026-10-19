// Plan BeastGym "Recomposición corporal" (07-10-2026). Al cambiar el plan, editar solo este archivo
// y subir VERSION en sw.js.
export const RUTINA = [
  {
    id: 'torso1', nombre: 'Torso 1', enfasis: 'Pecho y espalda · cuidado de muñecas',
    ejercicios: [
      { id: 'press-plano', musculos: { principal: ['pecho'], secundarios: ['triceps', 'hombros'] }, nombre: 'Press plano con mancuernas agarre neutro', series: 3, reps: '12-15', cardio: 'Skipping bajo en piso', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'remo-polea', musculos: { principal: ['espalda'], secundarios: ['biceps', 'hombros'] }, nombre: 'Remo en polea agarre neutro', series: 3, reps: '12-15', cardio: 'Jumping jacks', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'elev-laterales', musculos: { principal: ['hombros'], secundarios: ['trapecio'] }, nombre: 'Elevaciones laterales con mancuernas', series: 3, reps: '15', cardio: 'Skipping bajo en piso', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'jalon-supino', musculos: { principal: ['espalda'], secundarios: ['biceps'] }, nombre: 'Jalón al pecho en polea agarre supino', series: 3, reps: '12-15', cardio: 'Step-ups básicos', cardioSeg: 45, cardioBloques: 2, descansoSeg: 60 },
    ],
    final: { tipo: 'hiit', nombre: 'Bicicleta estática', trabajoSeg: 30, pausaSeg: 30, minutos: 10 },
  },
  {
    id: 'pierna1', nombre: 'Pierna 1', enfasis: 'Cuádriceps y glúteo · bajo impacto en rodillas',
    ejercicios: [
      { id: 'prensa', musculos: { principal: ['cuadriceps'], secundarios: ['gluteos'] }, nombre: 'Prensa (pies en V, rango cómodo)', series: 3, reps: '12-15', cardio: 'Jabs de boxeo alternos', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'hip-thrust', musculos: { principal: ['gluteos'], secundarios: ['isquios'] }, nombre: 'Hip thrust con barra', series: 3, reps: '12-15', cardio: 'Lazo de batida alterno', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'ext-rodilla', musculos: { principal: ['cuadriceps'], secundarios: [] }, nombre: 'Extensión de rodilla unilateral', series: 3, reps: '15', cardio: 'Trote suave', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'talones', musculos: { principal: ['gemelos'], secundarios: [] }, nombre: 'Elevación de talones de pie con mancuerna', series: 3, reps: '15-20', cardio: 'Escaladoras', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
    ],
    final: { tipo: 'hiit', nombre: 'Airbike', trabajoSeg: 20, pausaSeg: 40, minutos: 10 },
  },
  {
    id: 'torso2', nombre: 'Torso 2', enfasis: 'Hombros y brazos · protección articular',
    ejercicios: [
      { id: 'press-hombro', musculos: { principal: ['hombros'], secundarios: ['triceps', 'trapecio'] }, nombre: 'Press de hombro de pie con barra corta', series: 3, reps: '12-15', cardio: 'Escaladoras', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'face-pull', musculos: { principal: ['hombros'], secundarios: ['trapecio', 'espalda'] }, nombre: 'Face pull con banda', series: 3, reps: '15', cardio: 'Jumping jacks de bajo impacto', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'ext-triceps', musculos: { principal: ['triceps'], secundarios: [] }, nombre: 'Extensión de tríceps en polea agarre V', series: 3, reps: '12-15', cardio: 'Skipping bajo en el sitio', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'curl-biceps', musculos: { principal: ['biceps'], secundarios: ['antebrazos'] }, nombre: 'Curl de bíceps en polea baja con barra recta', series: 3, reps: '12-15', cardio: 'Talones al glúteo suave', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
    ],
    final: { tipo: 'distancia', nombre: 'Caminadora 1 km' },
  },
  {
    id: 'pierna2', nombre: 'Pierna 2', enfasis: 'Isquios, glúteo y zona media · rodillas y lumbar',
    ejercicios: [
      { id: 'curl-femoral', musculos: { principal: ['isquios'], secundarios: ['gemelos'] }, nombre: 'Curl femoral acostado', series: 3, reps: '12-15', cardio: 'Jabs de boxeo alternos', cardioSeg: 45, cardioBloques: 1, descansoSeg: 90 },
      { id: 'peso-muerto-rumano', musculos: { principal: ['isquios'], secundarios: ['gluteos', 'lumbar'] }, nombre: 'Peso muerto rumano con mancuerna rusa', series: 3, reps: '12-15', cardio: 'Step-ups alternos rodilla arriba', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'abduccion', musculos: { principal: ['gluteos'], secundarios: [] }, nombre: 'Abducción de cadera en máquina', series: 3, reps: '15-20', cardio: 'Skipping en trampolín', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
      { id: 'crunch', musculos: { principal: ['abdomen'], secundarios: [] }, nombre: 'Crunch abdominal en colchoneta', series: 3, reps: '15-20', cardio: 'Trote suave', cardioSeg: 45, cardioBloques: 1, descansoSeg: 60 },
    ],
    final: { tipo: 'hiit', nombre: 'Airbike', trabajoSeg: 20, pausaSeg: 40, minutos: 10 },
  },
];
