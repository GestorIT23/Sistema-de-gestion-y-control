export type UserRole = 'Administrador' | 'Supervisor' | 'Operador/Llenador';

export interface Usuario {
  id?: string;
  email: string;
  nombre: string;
  rol: UserRole;
  fechaCreacion?: string;
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
}

export interface BitacoraDisposicionVertedero extends BaseBitacora {
  totalViajes: number;
  totalPacas: number;
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
  estadoBandaTransportadora: boolean;
  estadoCompactadora: boolean;
  anotacionesEspeciales: string;
}

// 8. Bitacora Control Químico / Biológico de Autoclaves
export interface BitacoraControlAutoclaves extends BaseBitacora {
  noAutoclave: string;
  pesoProceso: number;
  noProceso: string;
  tipoIndicador: {
    biologico: boolean;
    quimico: boolean;
  };
  identificacionIndicador: string;
  resultadoIndicador: string;
  noLoteFabricante: string;
  tempIncubacion: string;
  parametrosOperacion: {
    temperatura: boolean;
    presion: boolean;
    tiempoProceso: boolean;
  };
  firmaSupervisor: string;
  firmaCoordinador: string;
  observacionesGeneralesProceso: string;
}

// 9. Bitacora Generación y Almacenamiento Temporal de RPBI
export interface FilaGeneracionTicket {
  noTicketInterno: string;
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
  | { tipo: 'generacion_almacenamiento'; data: BitacoraGeneracionAlmacenamiento };
