import { ItemEvaluacion360 } from '../types';

// Equipment Presets
export const EQUIPOS_INCINERADOR = [
  { id: 'INC-01', nombre: 'Incinerador Pirolítico Industrial 01', modelo: 'Thermax Pyrolizer 1200', serie: 'TX-2022-098', ubicacion: 'Nave de Tratamiento Térmico DSH' },
  { id: 'INC-02', nombre: 'Horno Incinerador Secundario 02', modelo: 'PyroClean Dual-Chamber', serie: 'PC-2023-441', ubicacion: 'Área de Destrucción Térmica' }
];

export const EQUIPOS_TUNEL_LAVADO = [
  { id: 'TUN-01', nombre: 'Túnel Hidro-Lavador Automático 01', modelo: 'HydroWash Bioclean 360', serie: 'HW-2021-303', ubicacion: 'Patio Central de Desinfección de Contenedores' },
  { id: 'TUN-02', nombre: 'Túnel de Lavado Roll-Off 02', modelo: 'CleanTunnel HeavyDuty 5000', serie: 'CT-2024-112', ubicacion: 'Rampa de Descontaminación Norte' }
];

export const EQUIPOS_COMPACTADORA = [
  { id: 'COMP-01', nombre: 'Compactadora Hidráulica Vertical 01', modelo: 'Balemaster AutoPress 400', serie: 'BM-2022-771', ubicacion: 'Área de Ensilado y Pacas DSH' },
  { id: 'COMP-02', nombre: 'Prensa Compactadora Horizontal 02', modelo: 'MaxPack H-500 Pro', serie: 'MP-2023-529', ubicacion: 'Nave de Reducción de Volumen' }
];

export const EQUIPOS_TRITURADORA = [
  { id: 'TRIT-01', nombre: 'Trituradora Shredder Industrial Doble Eje 01', modelo: 'Shred-X DualShaft 750', serie: 'SX-2021-665', ubicacion: 'Nave de Triturado y Molienda DSH' },
  { id: 'TRIT-02', nombre: 'Trituradora de Alto Torque 02', modelo: 'BioShredder Heavy 900HD', serie: 'BS-2023-810', ubicacion: 'Línea de Procesamiento 02' }
];

// Default Evaluation Items per Equipment Type

// 1. INCINERADOR
export const DEFAULT_ITEMS_INCINERADOR: {
  seguridad: ItemEvaluacion360[];
  mecanico: ItemEvaluacion360[];
  hidraulicoCombustion: ItemEvaluacion360[];
  electricoControl: ItemEvaluacion360[];
  bioseguridadLimpieza: ItemEvaluacion360[];
  operatividad: ItemEvaluacion360[];
} = {
  seguridad: [
    { codigo: 'INC-SEG-01', categoria: 'Seguridad y EPP', criterio: 'Parada de emergencia (seta de seguridad) operativa y accesible en panel y quemador', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-SEG-02', categoria: 'Seguridad y EPP', criterio: 'EPP térmico completo en uso (careta facial dorada, guantes aluminizados/carnaza, mandil)', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-SEG-03', categoria: 'Seguridad y EPP', criterio: 'Sistema de detección de llama y corte automático de combustible ante falla de fuego', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-SEG-04', categoria: 'Seguridad y EPP', criterio: 'Extintor PQS/CO2 tipo B/C vigente, rotulado y libre de obstáculos en radio menor a 5m', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-SEG-05', categoria: 'Seguridad y EPP', criterio: 'Señalización visible de alta temperatura (>800°C), riesgo eléctrico y no fumar', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  mecanico: [
    { codigo: 'INC-MEC-01', categoria: 'Integridad Mecánica', criterio: 'Estado de ladrillos refractarios y aislamiento de cámara primaria (sin fracturas graves)', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-MEC-02', categoria: 'Integridad Mecánica', criterio: 'Sellos y empaquetaduras de fibra cerámica en puerta de carga herméticos sin escape de humo', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-MEC-03', categoria: 'Integridad Mecánica', criterio: 'Bisagras, contrapesos y pestillos mecánicos de cierre de puerta principal firmes', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-MEC-04', categoria: 'Integridad Mecánica', criterio: 'Carcasa metálica exterior sin puntos de sobrecalentamiento, abombamientos ni corrosión', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-MEC-05', categoria: 'Integridad Mecánica', criterio: 'Compuerta y solera de cenizas con ajuste correcto sin deformaciones estructurales', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  hidraulicoCombustion: [
    { codigo: 'INC-COMB-01', categoria: 'Combustión y Tiro', criterio: 'Quemador primario con atomización de combustible uniforme y chispa de encendido limpia', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-COMB-02', categoria: 'Combustión y Tiro', criterio: 'Quemador secundario de postcombustión mantiene régimen térmico nominal (>1,000 °C)', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-COMB-03', categoria: 'Combustión y Tiro', criterio: 'Línea de combustible (diésel/GLP) sin goteos, filtros limpios y manómetro con presión estable', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-COMB-04', categoria: 'Combustión y Tiro', criterio: 'Soplador de aire primario/secundario con flujo adecuado y sin vibraciones anormales', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-COMB-05', categoria: 'Combustión y Tiro', criterio: 'Tiro de chimenea y extracción de humos regulado, sin fugas ni corrosión en ductos', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  electricoControl: [
    { codigo: 'INC-ELEC-01', categoria: 'Eléctrico y Control', criterio: 'Pirómetros digitales y termocuplas tipo K/S calibradas con lectura continua visible', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-ELEC-02', categoria: 'Eléctrico y Control', criterio: 'Panel de control con selectores, pulsadores y pilotos indicadores en correcto estado', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-ELEC-03', categoria: 'Eléctrico y Control', criterio: 'Cableado canalizado en tubería corrugada/conduit metálica sin conductores expuestos', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-ELEC-04', categoria: 'Eléctrico y Control', criterio: 'Sistema de alarmas audibles y luminosas por sobretemperatura y falla de llama activas', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  bioseguridadLimpieza: [
    { codigo: 'INC-BIO-01', categoria: 'Bioseguridad y Cenizas', criterio: 'Envasado seguro de cenizas/escorias en contenedores o tambos herméticos rotulados', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-BIO-02', categoria: 'Bioseguridad y Cenizas', criterio: 'Área circundante limpia de derrames de combustible o cenizas volátiles (5S)', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-BIO-03', categoria: 'Bioseguridad y Cenizas', criterio: 'Bandeja de contención anti-derrame de hidrocarburos bajo tanque de combustible', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  operatividad: [
    { codigo: 'INC-OPR-01', categoria: 'Desempeño y Emisiones', criterio: 'Opacidad de chimenea dentro de límites (sin emisión de humo negro continuo escala Ringelmann)', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-OPR-02', categoria: 'Desempeño y Emisiones', criterio: 'Tasa de combustión y destrucción de residuo acorde a capacidad especificada (lbs/h)', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'INC-OPR-03', categoria: 'Desempeño y Emisiones', criterio: 'Bitácora oficial de incineración (F-OPR-05) diligenciada con datos de cada carga', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ]
};

// 2. TÚNEL DE LAVADO
export const DEFAULT_ITEMS_TUNEL_LAVADO: {
  seguridad: ItemEvaluacion360[];
  mecanico: ItemEvaluacion360[];
  hidraulicoCombustion: ItemEvaluacion360[];
  electricoControl: ItemEvaluacion360[];
  bioseguridadLimpieza: ItemEvaluacion360[];
  operatividad: ItemEvaluacion360[];
} = {
  seguridad: [
    { codigo: 'TUN-SEG-01', categoria: 'Seguridad y EPP', criterio: 'Setas de paro de emergencia en ingreso, cabina y salida del túnel 100% funcionales', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-SEG-02', categoria: 'Seguridad y EPP', criterio: 'Cortinas de flejes plásticos anti-salpicaduras en entrada y salida íntegras y limpias', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-SEG-03', categoria: 'Seguridad y EPP', criterio: 'EPP impermeable completo (careta, pechera/traje impermeable, botas de hule, guantes)', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-SEG-04', categoria: 'Seguridad y EPP', criterio: 'Pisos con pintura o rejilla antiderrapante y señalización de riesgo de caída y biológico', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  mecanico: [
    { codigo: 'TUN-MEC-01', categoria: 'Integridad Mecánica', criterio: 'Cadena de arrastre / transportador sin atascos, con tensión adecuada y sin eslabones rotos', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-MEC-02', categoria: 'Integridad Mecánica', criterio: 'Motorreductor de tracción lubricado, sin fugas de aceite ni calentamiento fuera de norma', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-MEC-03', categoria: 'Integridad Mecánica', criterio: 'Estructura de acero inoxidable del túnel libre de perforaciones, abolladuras o corrosión', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-MEC-04', categoria: 'Integridad Mecánica', criterio: 'Guías laterales y topes de centrado de contenedores firmemente anclados y alineados', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  hidraulicoCombustion: [
    { codigo: 'TUN-HID-01', categoria: 'Sistema Hidráulico y Presión', criterio: 'Bomba de alta presión operando en rango de diseño (PSI/Bar) sin pérdidas de carga', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-HID-02', categoria: 'Sistema Hidráulico y Presión', criterio: 'Boquillas y toberas de aspersión 360° (fondo, paredes, tapa) destapadas y con patrón uniforme', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-HID-03', categoria: 'Sistema Hidráulico y Presión', criterio: 'Tuberías hidráulicas, uniones, codos y mangueras sin fugas de agua o pérdida de presión', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-HID-04', categoria: 'Sistema Hidráulico y Presión', criterio: 'Filtros de succión y recirculación de agua limpios, sin sedimentos ni sarro acumulado', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  electricoControl: [
    { codigo: 'TUN-ELEC-01', categoria: 'Eléctrico y Automatización', criterio: 'Tablero eléctrico estanco grado IP65/IP66 contra ingreso de agua y humedad', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-ELEC-02', categoria: 'Eléctrico y Automatización', criterio: 'Sensores fotoeléctricos o fines de carrera de detección de contenedor operativos', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-ELEC-03', categoria: 'Eléctrico y Automatización', criterio: 'Temporizadores, variador de velocidad de cadena y contactores sin arqueos eléctricos', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-ELEC-04', categoria: 'Eléctrico y Automatización', criterio: 'Pulsadores de arranque, paro manual y ciclo automático con retroiluminación operativa', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  bioseguridadLimpieza: [
    { codigo: 'TUN-BIO-01', categoria: 'Bioseguridad y Desinfección', criterio: 'Bomba dosificadora de germicida/desinfectante inyecta concentración validada (ppm)', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-BIO-02', categoria: 'Bioseguridad y Desinfección', criterio: 'Canastilla / tamiz atrapa-sólidos en fosa de drenaje limpia y sin acumulación de residuos', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-BIO-03', categoria: 'Bioseguridad y Desinfección', criterio: 'Canal de desagüe hacia trampa de lodos/grasa sin estancamientos ni derrames exteriores', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  operatividad: [
    { codigo: 'TUN-OPR-01', categoria: 'Calidad del Lavado', criterio: 'Contenedores salen limpios, libres de lixiviados, manchas orgánicas y restos de etiquetas', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-OPR-02', categoria: 'Calidad del Lavado', criterio: 'Ciclo de escurrido / secado eficaz antes del traslado a zona limpia de despacho', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TUN-OPR-03', categoria: 'Calidad del Lavado', criterio: 'Cumplimiento de meta de unidades lavadas por turno y registro en bitácora SGI', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ]
};

// 3. COMPACTADORA
export const DEFAULT_ITEMS_COMPACTADORA: {
  seguridad: ItemEvaluacion360[];
  mecanico: ItemEvaluacion360[];
  hidraulicoCombustion: ItemEvaluacion360[];
  electricoControl: ItemEvaluacion360[];
  bioseguridadLimpieza: ItemEvaluacion360[];
  operatividad: ItemEvaluacion360[];
} = {
  seguridad: [
    { codigo: 'CMP-SEG-01', categoria: 'Seguridad y Enclavamientos', criterio: 'Paro de emergencia tipo hongo en tablero accesible con desenclavamiento manual', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-SEG-02', categoria: 'Seguridad y Enclavamientos', criterio: 'Microswitch / interlock de seguridad en puerta detiene el ciclo de prensa al abrirse', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-SEG-03', categoria: 'Seguridad y Enclavamientos', criterio: 'Guardas perimetrales y protecciones físicas en zonas de cizallamiento y atrapamiento', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-SEG-04', categoria: 'Seguridad y Enclavamientos', criterio: 'Señalética de peligro de aplastamiento, uso obligatorio de calzado de seguridad y guantes', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  mecanico: [
    { codigo: 'CMP-MEC-01', categoria: 'Estructura y Prensa', criterio: 'Placa prensadora nivelada, sin holguras excesivas en patines o guías de deslizamiento', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-MEC-02', categoria: 'Estructura y Prensa', criterio: 'Cámara de compresión sin fisuras, soldaduras reventadas o deformaciones en costillas', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-MEC-03', categoria: 'Estructura y Prensa', criterio: 'Cerrojo, manijas de cierre y pasadores de puerta frontal reforzados y sin juego axial', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-MEC-04', categoria: 'Estructura y Prensa', criterio: 'Sistema expulsor / volteador de pacas mecánico/hidráulico opera con suavidad', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  hidraulicoCombustion: [
    { codigo: 'CMP-HID-01', categoria: 'Sistema Hidráulico', criterio: 'Cilindro hidráulico principal sin rayaduras en vástago y retenes libres de fuga de aceite', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-HID-02', categoria: 'Sistema Hidráulico', criterio: 'Mangueras de alta presión sin deformaciones, roces con aristas o ampollas en cubierta', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-HID-03', categoria: 'Sistema Hidráulico', criterio: 'Nivel y temperatura de aceite hidráulico en visor del depósito dentro de rango óptimo', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-HID-04', categoria: 'Sistema Hidráulico', criterio: 'Válvula de alivio y distribuidor proporcional calibrados a la presión de trabajo especificada', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-HID-05', categoria: 'Sistema Hidráulico', criterio: 'Bomba hidráulica y motor operan sin cavitación, ruido de golpeteo ni vibraciones anormales', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  electricoControl: [
    { codigo: 'CMP-ELEC-01', categoria: 'Eléctrico y Mandos', criterio: 'Pulsadores bi-manuales o control de descenso sostenido funcionando según diseño', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-ELEC-02', categoria: 'Eléctrico y Mandos', criterio: 'Sensores de fin de carrera (carrera superior e inferior del pistón) ajustados y limpios', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-ELEC-03', categoria: 'Eléctrico y Mandos', criterio: 'Gabinete eléctrico cerrado con llave, sin polvo ni indicios de recalentamiento térmico', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-ELEC-04', categoria: 'Eléctrico y Mandos', criterio: 'Lámparas indicadoras de máquina energizada, en ciclo y falla operativas', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  bioseguridadLimpieza: [
    { codigo: 'CMP-BIO-01', categoria: 'Higiene y Lixiviados', criterio: 'Charola de retención inferior y canal de drenaje de lixiviados de compresión sin fuga', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-BIO-02', categoria: 'Higiene y Lixiviados', criterio: 'Limpieza periódica de fondo de cámara retirando acumulaciones de residuo compactado', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-BIO-03', categoria: 'Higiene y Lixiviados', criterio: 'Desinfección con agente químico al concluir el turno para control microbiológico', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  operatividad: [
    { codigo: 'CMP-OPR-01', categoria: 'Calidad de Pacas', criterio: 'Densidad y amarre de pacas consistente con fleje o alambre resistente sin reventones', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-OPR-02', categoria: 'Calidad de Pacas', criterio: 'Tiempo de ciclo de prensado y retorno dentro del tiempo estándar de producción', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'CMP-OPR-03', categoria: 'Calidad de Pacas', criterio: 'Registro completo en Bitácora de Reducción de Volumen y Control de Pacas (F-OPR-07)', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ]
};

// 4. TRITURADORA
export const DEFAULT_ITEMS_TRITURADORA: {
  seguridad: ItemEvaluacion360[];
  mecanico: ItemEvaluacion360[];
  hidraulicoCombustion: ItemEvaluacion360[];
  electricoControl: ItemEvaluacion360[];
  bioseguridadLimpieza: ItemEvaluacion360[];
  operatividad: ItemEvaluacion360[];
} = {
  seguridad: [
    { codigo: 'TRIT-SEG-01', categoria: 'Seguridad y Paros', criterio: 'Setas de parada de emergencia en pasarela, tolva y consola de mando 100% activas', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-SEG-02', categoria: 'Seguridad y Paros', criterio: 'Tolva de alimentación con altura de resguardo y deflectores anti-proyección de esquirlas', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-SEG-03', categoria: 'Seguridad y Paros', criterio: 'Enclavamiento de seguridad en tolva abatible impide arranque con cámara de corte abierta', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-SEG-04', categoria: 'Seguridad y Paros', criterio: 'EPP de protección facial contra proyección, protección auditiva y guantes anticorte', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  mecanico: [
    { codigo: 'TRIT-MEC-01', categoria: 'Ejes y Cuchillas', criterio: 'Cuchillas trituradoras con filo adecuado, sin fracturas, fisuras o pérdida de dientes', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-MEC-02', categoria: 'Ejes y Cuchillas', criterio: 'Espaciado y holgura axial entre cuchillas de ambos ejes dentro de tolerancias del fabricante', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-MEC-03', categoria: 'Ejes y Cuchillas', criterio: 'Peines rascadores o contra-cuchillas limpios y sin deformaciones por atasco mecánico', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-MEC-04', categoria: 'Ejes y Cuchillas', criterio: 'Chumaceras y rodamientos de apoyo de ejes lubricados con grasa especial sin holgura', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-MEC-05', categoria: 'Ejes y Cuchillas', criterio: 'Acoplamientos elásticos entre reductor y ejes con elementos de goma íntegros', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  hidraulicoCombustion: [
    { codigo: 'TRIT-RED-01', categoria: 'Transmisión y Reductor', criterio: 'Caja reductora planetaria o helicoidal sin ruidos extraños, golpeteos ni calentamiento', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-RED-02', categoria: 'Transmisión y Reductor', criterio: 'Nivel de aceite sintético de engranajes en visor de caja reductora adecuado y sin fugas', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-RED-03', categoria: 'Transmisión y Reductor', criterio: 'Fajas / cadenas de transmisión secundarias con alineación y tensión calibrada', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-RED-04', categoria: 'Transmisión y Reductor', criterio: 'Empujador hidráulico (si aplica) con avance suave sin goteos de mangueras', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  electricoControl: [
    { codigo: 'TRIT-ELEC-01', categoria: 'Control y Auto-Reverse', criterio: 'Función de inversión automática (auto-reverse) se activa de inmediato ante sobrecarga', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-ELEC-02', categoria: 'Control y Auto-Reverse', criterio: 'Relevadores térmicos y lectura de amperaje del motor dentro de parámetros de placa', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-ELEC-03', categoria: 'Control y Auto-Reverse', criterio: 'Consola con pulsador de reversa manual, marcha continua y parada de desatasco funcional', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-ELEC-04', categoria: 'Control y Auto-Reverse', criterio: 'Gabinete eléctrico protegido contra vibración, limpio de polvo de trituración', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  bioseguridadLimpieza: [
    { codigo: 'TRIT-BIO-01', categoria: 'Nebulización y Limpieza', criterio: 'Sistema de aspersión/nebulización de desinfectante en tolva para supresión de aerosoles', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-BIO-02', categoria: 'Nebulización y Limpieza', criterio: 'Tolva inferior y faja de descarga libres de acumulación de material desmenuzado apelmazado', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-BIO-03', categoria: 'Nebulización y Limpieza', criterio: 'Drenaje y charola de recolección de lixiviados desinfectada y sin obstrucciones', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ],
  operatividad: [
    { codigo: 'TRIT-OPR-01', categoria: 'Calidad de Triturado', criterio: 'Granulometría y tamaño de corte homogéneo de residuos según especificación (<50 mm)', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-OPR-02', categoria: 'Calidad de Triturado', criterio: 'Rendimiento y capacidad de trituración constante sin paradas frecuentes por atascamiento', ponderacion: 4, calificacion: 5, estado: 'Conforme', hallazgo: '' },
    { codigo: 'TRIT-OPR-03', categoria: 'Calidad de Triturado', criterio: 'Registro diario en Bitácora de Reducción de Volumen (F-OPR-07) con pesos y horas', ponderacion: 5, calificacion: 5, estado: 'Conforme', hallazgo: '' }
  ]
};

/**
 * Calculates score percentage for a list of items based on 1-5 qualification
 */
export function calculateCategoryScore(items: ItemEvaluacion360[]): number {
  if (!items || items.length === 0) return 100;
  const applicable = items.filter(i => i.estado !== 'N/A');
  if (applicable.length === 0) return 100;

  const totalPossible = applicable.reduce((acc, i) => acc + (i.ponderacion * 5), 0);
  const totalObtained = applicable.reduce((acc, i) => acc + (i.ponderacion * i.calificacion), 0);
  if (totalPossible === 0) return 100;
  return Math.round((totalObtained / totalPossible) * 100);
}

/**
 * Calculates global score and determines verdict & risk
 */
export function calculateEvaluationSummary(scores: {
  seguridad: number;
  mecanico: number;
  hidraulicoCombustion: number;
  electricoControl: number;
  bioseguridadLimpieza: number;
  operatividad: number;
}, itemsCritical: ItemEvaluacion360[]): {
  puntajeGlobal: number;
  veredictoOperacional: 'Aprobado para Operar' | 'Condicionado con Acciones' | 'Fuera de Servicio (Paro Inmediato)';
  nivelRiesgo: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
} {
  // Weighted Global Score
  // Weights: Seguridad (25%), Mecanico (20%), Hidraulico/Combustion (20%), Electrico (15%), Bioseguridad (10%), Operatividad (10%)
  const global = Math.round(
    (scores.seguridad * 0.25) +
    (scores.mecanico * 0.20) +
    (scores.hidraulicoCombustion * 0.20) +
    (scores.electricoControl * 0.15) +
    (scores.bioseguridadLimpieza * 0.10) +
    (scores.operatividad * 0.10)
  );

  const hasCriticalDefect = itemsCritical.some(i => i.estado === 'Crítico' || i.calificacion <= 2);

  let veredicto: 'Aprobado para Operar' | 'Condicionado con Acciones' | 'Fuera de Servicio (Paro Inmediato)';
  let riesgo: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';

  if (global < 70 || scores.seguridad < 70 || hasCriticalDefect) {
    veredicto = 'Fuera de Servicio (Paro Inmediato)';
    riesgo = 'Crítico';
  } else if (global < 85 || scores.seguridad < 85) {
    veredicto = 'Condicionado con Acciones';
    riesgo = global < 78 ? 'Alto' : 'Medio';
  } else {
    veredicto = 'Aprobado para Operar';
    riesgo = 'Bajo';
  }

  return {
    puntajeGlobal: global,
    veredictoOperacional: veredicto,
    nivelRiesgo: riesgo
  };
}
