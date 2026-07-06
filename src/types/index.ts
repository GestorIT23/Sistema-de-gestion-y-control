export type UserRole = 'Administrador' | 'Supervisor' | 'Operador/Llenador';

export interface Usuario {
  id?: string;
  email: string;
  nombre: string;
  rol: UserRole;
  fechaCreacion?: string;
  modulosAcceso?: string[];
}

export interface BaseBitacora {
  id?: string;
  fechaRegistro: string; // ISO date of creation
  fecha: string; // Fecha del proceso/formulario
  responsable: string;
  observaciones: string;
  elaboro?: string; // e.g., "Gerente Comercial Industrial"
  reviso?: string; // e.g., "Comité ISO"
  aprobo?: string; // e.g., "Gerente General"
  cambioControl: {
    version: string;
    fecha: string;
    seccion: string;
    cambio: string;
    solicitante: string;
  }[];
}

// 1. Bitacora Inventarios e Insumos
export interface FilaInventario {
  hora: string;
  producto: string;
  cantidad: number;
  firma: string;
}

export interface BitacoraInventarios extends BaseBitacora {
  turno: string;
  area: string;
  filas: FilaInventario[];
}

// 2. Bitacora Entrega de Contenedores Rojos
export interface FilaEntregaContenedor {
  ruta: string;
  cantidad: number;
  firmaRecibe: string;
}

export interface BitacoraEntregaContenedores extends BaseBitacora {
  totalContenedores: number;
  filas: FilaEntregaContenedor[];
  estadoGeneral: {
    tapaderaBuenEstado: boolean;
    cuerpoBuenEstado: boolean;
    llantasBuenEstado: boolean;
    haladorBuenEstado: boolean;
  };
}

// 3. Bitacora Disposición Final de RPBI a Pirólisis
export interface FilaDisposicionPirolisis {
  proceso: string; // Proceso 01 to Proceso 11
  pacas: number;
  noPaseTraslado: string;
  firmaRecibe: string;
}

export interface BitacoraDisposicionPirolisis extends BaseBitacora {
  totalLibras: number;
  totalPacas: number;
  filas: FilaDisposicionPirolisis[];
}

// 4. Bitacora Disposición Final de RPBI a Vertedero
export interface FilaDisposicionVertedero {
  camion: string; // Camion 01 to Camion 11
  placa: string;
  noPaseSalida: string;
  cantidadPacas: number;
  pesaje?: number;
  horaSalida?: string;
  nombrePiloto?: string;
  correlativoPacas?: string;
}

export interface BitacoraDisposicionVertedero extends BaseBitacora {
  totalViajes: number;
  totalPacas: number;
  totalPesaje?: number;
  filas: FilaDisposicionVertedero[];
}

// 5. Bitacora Control de Incineración
export interface FilaControlIncineracion {
  ingreso: string; // Ingreso 01 to Ingreso 07
  libras: number;
}

export interface BitacoraControlIncineracion extends BaseBitacora {
  incinerador: string;
  duracionProceso: string;
  totalLibras: number;
  horaInicio: string;
  horaFin: string;
  tempCombustion: number; // Grados Celsius
  tempPostCombustion: number; // Grados Celsius
  cantidadPolvoFin: number;
  combustibleUsado: string;
  combustibleCantidad: number;
  filas: FilaControlIncineracion[];
}

// 6. Bitacora Control de Cuarto Frío y Congeladores
export interface BitacoraCuartoFrio extends BaseBitacora {
  cuartoFrio: string;
  horaInspeccion: string;
  cantidadCongeladoresActivos: number;
  tempEntrada: number;
  tempSalida: number;
  tempCongeladores: {
    congelador01: number;
    congelador02: number;
    congelador03: number;
    congelador04: number;
    congelador05: number;
    congelador06: number;
  };
  inspeccion: {
    limpiezaParedesExteriores: boolean;
    limpiezaParedesInteriores: boolean;
    limpiezaPiso: boolean;
    funcionamientoEvaporadores: boolean;
    funcionamientoCondensadores: boolean;
    funcionamientoLucesInteriores: boolean;
    limpiezaTecho: boolean;
    limpiezaExteriorTecho: boolean;
    residuoOrdenado: boolean;
  };
}

// 7. Bitacora Proceso de Reducción de Volumen y Control de Pacas
export interface BitacoraReduccionVolumen extends BaseBitacora {
  noTrituradora: string;
  tiempoProceso: string;
  noProceso: string;
  pesoEntrada: number;
  pesoSalida: number;
  cantidadPacas: number;
  estadoTrituradora: boolean;
  estadoCajasReductoras: boolean;
  estadoFajas: boolean;
  estadoElevadorCarros: boolean;
  estadoBandaTransportadora?: boolean;
  estadoCompactadora: boolean;
  anotacionesEspeciales: string;
  horaInicio?: string;
  horaFin?: string;
  lineaUtilizada?: string;
}

// 8. Bitacora Control Químico / Biológico de Autoclaves
export interface BitacoraControlAutoclaves extends BaseBitacora {
  noAutoclave: string;
  pesoProceso: number;
  noProceso: string;
  lineaUtilizada?: string;
  tipoIndicador: {
    biologico: boolean;
    quimico: boolean;
  };
  identificacionIndicador: string;
  resultadoIndicador: string;
  noLoteFabricante: string;
  tempIncubacion: string;
  cintaTestigoColor?: 'verde' | 'cafe';
  parametrosOperacion: {
    temperatura: boolean;
    presion: boolean;
    tiempoProceso: boolean;
    bombaVacio?: boolean;
  };
  firmaSupervisor: string;
  firmaCoordinador: string;
  observacionesGeneralesProceso: string;
}

// 9. Bitacora Generación y Almacenamiento Temporal de RPBI
export interface FilaGeneracionTicket {
  noTicketInterno: string;
  tipoResiduo?: string;
  tipoEmbalaje?: string;
  cantidad?: number;
  peso: number;
}

export interface BitacoraGeneracionAlmacenamiento extends BaseBitacora {
  enteGenerador: string;
  pesoTicketBascula: number;
  ubicacion: string;
  noTicketBascula: string;
  tipoResiduo: {
    inorganico: boolean;
    punzoCortante: boolean;
    patologico: boolean;
  };
  tipoEmbalaje: {
    contenedor: boolean;
    tonelMetalico: boolean;
    congelador: boolean;
  };
  filasLeft: FilaGeneracionTicket[];
  filasRight: FilaGeneracionTicket[];
  totalPesoTickets: number;
}

// 10. Bitacora de Lavado de Baños y Area Administrativa
export interface BitacoraLavadoBanos extends BaseBitacora {
  turno: string;
  ubicacionBanos: string; // e.g. "Planta Alta", "Planta Baja", "Oficinas"
  checklistBanos: {
    lavadoSanitarios: boolean;
    lavadoLavamanos: boolean;
    barridoTrapeado: boolean;
    limpiezaEspejos: boolean;
    limpiezaVidrios: boolean;
    desinfeccionSuperficies: boolean;
    vaciadoPapeleras: boolean;
  };
  abastecimientoBanos: {
    papelHigienico: boolean;
    jabonManos: boolean;
    toallasPapel: boolean;
    sanitizante: boolean;
  };
  desinfectanteUsado: string;
}

// 11. Insumos Quimicos y Plasticos
export interface FilaInsumoQuimico {
  producto: string;
  unidadMedida: string;
  stockInicial: number;
  unidadesRecibidas: number;
  unidadesConsumidas: number;
  stockFinal: number;
  noLoteProveedor: string;
}

export interface BitacoraInsumosQuimicos extends BaseBitacora {
  turno: string;
  filas: FilaInsumoQuimico[];
}

// 12. Bitácora Inventarios e Insumos SGI
export interface FilaInventarioSGI {
  codigoInsmo: string;
  descripcion: string;
  medida: string;
  stockMinimo: number;
  existenciaReal: number;
  estadoEmpaque: 'Buen estado' | 'Dañado' | 'Por vencer';
}

export interface BitacoraInventariosSGI extends BaseBitacora {
  areaFisica: string;
  filas: FilaInventarioSGI[];
}

// 13. Bitacora Control de Uniformes de Planta
export interface FilaControlUniforme {
  colaborador: string;
  puesto: string;
  tallaCamisa: string;
  tallaPantalon: string;
  tallaBotas: string;
  tieneMandil: boolean;
  tieneGuantes: boolean;
  tieneCareta: boolean;
  motivoDotacion: string;
  firmaRecibido: string;
  usaUniformeCompleto?: boolean;
  usaBotasSeguridad?: boolean;
  cumpleLimpieza?: boolean;
  observacionAuditoria?: string;
  estadoGeneralConforme?: boolean;
}

export interface BitacoraControlUniformes extends BaseBitacora {
  responsableEntrega: string;
  filas: FilaControlUniforme[];
}

// 14. Bitacora Control de Horas de Trabajo - Cargador Frontal
export interface BitacoraControlHorasCargador extends BaseBitacora {
  turno: string;
  noReporte: string;
  
  // Equipo
  codigoUnidad: string;
  marcaModelo: string;
  anio: string;

  // Operador
  nombreOperador: string;
  codigoEmpleado: string;
  areaAsignada: string;
  supervisorCargo: string;

  // Horas
  lecturaInicialHorometro: number;
  lecturaFinalHorometro: number;
  totalOperadoHoras: number;
  horaInicio: string;
  horaTermino: string;
  horasPausaInactividad: number;
  horasTrabajoCalculadas?: number;

  // Actividades
  tipoActividadPrincipal: string;
  tipoMaterialTrabajado: string;
  descripcionActividades: string;

  // Combustible
  nivelCombustibleInicio: string;
  litrosCargados: number;
  nivelCombustibleFinal: string;

  // Estado Equipo
  estadoEquipo: 'Bueno — sin novedades' | 'Falla leve — operativo' | 'Falla grave — revisión' | 'Equipo parado';
  descripcionFallasObservaciones: string;

  // Checklist
  checklistPrevia: {
    nivelAceiteMotor: boolean;
    nivelRefrigerante: boolean;
    presionLlantas: boolean;
    estadoCucharaBalde: boolean;
    lucesSenales: boolean;
    frenos: boolean;
    cinturonSeguridad: boolean;
    bocinaAlarmaReversa: boolean;
    extintorAbordo: boolean;
    documentosEquipo: boolean;
  };

  // Firmas
  firmaOperador: string;
  firmaSupervisor: string;
}

// Unified Union type for all log entries
export type BitacoraEntry =
  | { tipo: 'inventarios'; data: BitacoraInventarios }
  | { tipo: 'entrega_contenedores'; data: BitacoraEntregaContenedores }
  | { tipo: 'disposicion_pirolisis'; data: BitacoraDisposicionPirolisis }
  | { tipo: 'disposicion_vertedero'; data: BitacoraDisposicionVertedero }
  | { tipo: 'control_incineracion'; data: BitacoraControlIncineracion }
  | { tipo: 'cuarto_frio'; data: BitacoraCuartoFrio }
  | { tipo: 'reduccion_volumen'; data: BitacoraReduccionVolumen }
  | { tipo: 'control_autoclaves'; data: BitacoraControlAutoclaves }
  | { tipo: 'generacion_almacenamiento'; data: BitacoraGeneracionAlmacenamiento }
  | { tipo: 'lavado_banos'; data: BitacoraLavadoBanos }
  | { tipo: 'insumos_quimicos'; data: BitacoraInsumosQuimicos }
  | { tipo: 'inventarios_sgc'; data: BitacoraInventariosSGI }
  | { tipo: 'control_uniformes'; data: BitacoraControlUniformes }
  | { tipo: 'control_horas_cargador'; data: BitacoraControlHorasCargador };
