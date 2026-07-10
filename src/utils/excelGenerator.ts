import * as XLSX from 'xlsx';
import { sanitizeBiotrashObject } from './textSanitizer';

function formatHoraRegistro(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const parts = isoString.split('T');
    if (parts.length > 1) {
      const timePart = parts[1].split(/[Z\-+.]/)[0];
      return timePart;
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return '—';
  }
}

/**
 * Highly polished Excel generation utility for SGI BIOTRASH S.A.
 * Translates operational data into beautiful spreadsheet grids.
 */
export function generateAndDownloadExcel(tipo: string, data: any): void {
  // Sanitize data to ensure "basura bio" is replaced with BIOTRASH
  data = sanitizeBiotrashObject(data);

  // If we receive multiple results for a specific form type, redirect to consolidate generator
  if (tipo !== 'reporte_general' && data && data.results && Array.isArray(data.results)) {
    generateConsolidatedFormExcel(tipo, data.results);
    return;
  }

  // Create Worksheet array
  const wsRows: any[][] = [];

  // Define metadata title mapping
  const titles: Record<string, { code: string; name: string }> = {
    inventarios: { code: 'F-OPR-01', name: 'BITÁCORA DE INGRESO DE DESECHOS A PLANTA' },
    entrega_contenedores: { code: 'F-OPR-02', name: 'BITÁCORA DE ENTREGA DE CONTENEDORES ROJOS' },
    disposicion_pirolisis: { code: 'F-OPR-03', name: 'BITÁCORA DE DISPOSICIÓN FINAL DE RPBI A PIRÓLISIS' },
    disposicion_vertedero: { code: 'F-OPR-04', name: 'BITÁCORA DE DISPOSICIÓN FINAL DE RPBI A VERTEDERO' },
    control_incineracion: { code: 'F-OPR-05', name: 'BITÁCORA DE CONTROL DE INCINERACIÓN' },
    cuarto_frio: { code: 'F-OPR-06', name: 'BITÁCORA DE CONTROL DE CUARTO FRÍO Y CONGELADORES' },
    reduccion_volumen: { code: 'F-OPR-07', name: 'BITÁCORA DE REDUCCIÓN DE VOLUMEN Y CONTROL DE PACAS' },
    control_autoclaves: { code: 'F-OPR-08', name: 'BITÁCORA DE CONTROL QUÍMICO / BIOLÓGICO DE AUTOCLAVES' },
    generacion_almacenamiento: { code: 'F-OPR-09', name: 'BITÁCORA DE GENERACIÓN Y ALMACENAMIENTO TEMPORAL DE RPBI' },
    lavado_banos: { code: 'F-OPR-10', name: 'BITÁCORA DE LAVADO DE BAÑOS Y ÁREA ADMINISTRATIVA' },
    insumos_quimicos: { code: 'F-OPR-11', name: 'BITÁCORA DE INSUMOS QUÍMICOS Y PLÁSTICOS' },
    inventarios_sgc: { code: 'F-OPR-12', name: 'BITÁCORA DE CONTROL DE INVENTARIO SGI' },
    control_uniformes: { code: 'F-OPR-13', name: 'BITÁCORA DE CONTROL DE UNIFORMES DE PLANTA' },
    control_horas_cargador: { code: 'F-OPR-000-14', name: 'CONTROL DE HORAS DE TRABAJO - CARGADOR FRONTAL' },
    reporte_general: { code: 'SGI-REP-GENERAL', name: 'REPORTE GENERAL INTEGRADO SGI - ISO 14001 / ISO 9001' }
  };

  const meta = titles[tipo] || { code: 'F-OPR-SGI', name: 'BITÁCORA DE GESTIÓN OPERACIONAL SGI' };

  // --- Header metadata ---
  wsRows.push(['BIOTRASH S.A.', '', '', '', '']);
  wsRows.push(['SISTEMA DE GESTIÓN INTEGRAL (SGI)', '', '', '', '']);
  wsRows.push([`DISEÑO DE INFORME OFICIAL: ${meta.name}`, '', '', '', '']);
  wsRows.push([`CÓDIGO FORMATO: ${meta.code}`, '', `VERSIÓN SGI: 4.2`, '', '']);
  wsRows.push([]); // Blank separator

  if (tipo === 'reporte_general') {
    wsRows.push(['--- DATOS DEL REPORTE INTEGRADO ---']);
    wsRows.push([
      'Fecha Proceso',
      'Hora Captura',
      'Tipo de Bitácora',
      'Código Formato',
      'Responsable SGI',
      'Observaciones Generales',
      'Turno',
      'Área',
      'Total Contenedores',
      'Total Pacas',
      'Libras Tratadas',
      'Equipo Incinerador',
      'Duración Proceso',
      'Temp Combustión (°C)',
      'Temp Post-Combustión (°C)',
      'Cantidad Polvo Fin (lbs)',
      'Combustible Tipo',
      'Combustible Cantidad (Gls)',
      'Cuarto Frío ID',
      'Hora Inspección',
      'Temp Entrada Cuarto Frío (°C)',
      'Temp Salida Cuarto Frío (°C)',
      'Congeladores Activos',
      'Código Trituradora Shredder',
      'Nº Proceso',
      'Tiempo Proceso / Trituración',
      'Peso Entrada Shredder (lbs)',
      'Peso Salida Shredder (lbs)',
      'Identificación Autoclave',
      'Identificación Indicador Vial',
      'Resultado Indicador Vial',
      'No Lote Fabricante',
      'Firma Supervisor Autoclaves',
      'Firma Coordinador Autoclaves',
      'Ente Generador',
      'Ubicación Planta',
      'Nro Ticket Báscula',
      'Peso Ticket Báscula (lbs)',
      'Total Peso Boletas Calculado (lbs)',
      'Ubicación Baños',
      'Desinfectante Usado',
      'Área Física SGI',
      'Inspector Responsable Entrega'
    ]);
    
    const results = data.results || [];
    results.forEach((item: any) => {
      wsRows.push([
        item.fecha || '',
        formatHoraRegistro(item.fechaRegistro),
        item.tipoTitulo || '',
        item.codigoFormato || '',
        item.responsable || '',
        item.observaciones || 'Ninguna',
        item.turno || '',
        item.area || '',
        item.totalContenedores !== undefined ? item.totalContenedores : '',
        item.totalPacas !== undefined ? item.totalPacas : '',
        item.totalLibras !== undefined ? item.totalLibras : '',
        item.incinerador || '',
        item.duracionProceso || '',
        item.tempCombustion !== undefined ? item.tempCombustion : '',
        item.tempPostCombustion !== undefined ? item.tempPostCombustion : '',
        item.cantidadPolvoFin !== undefined ? item.cantidadPolvoFin : '',
        item.combustibleUsado || '',
        item.combustibleCantidad !== undefined ? item.combustibleCantidad : '',
        item.cuartoFrio || '',
        item.horaInspeccion || '',
        item.tempEntrada !== undefined ? item.tempEntrada : '',
        item.tempSalida !== undefined ? item.tempSalida : '',
        item.cantidadCongeladoresActivos !== undefined ? item.cantidadCongeladoresActivos : '',
        item.noTrituradora || '',
        item.noProceso || '',
        item.tiempoProceso || '',
        item.pesoEntrada !== undefined ? item.pesoEntrada : '',
        item.pesoSalida !== undefined ? item.pesoSalida : '',
        item.noAutoclave || '',
        item.identificacionIndicador || '',
        item.resultadoIndicador || '',
        item.noLoteFabricante || '',
        item.firmaSupervisor || '',
        item.firmaCoordinador || '',
        item.enteGenerador || '',
        item.ubicacion || '',
        item.noTicketBascula || '',
        item.pesoTicketBascula !== undefined ? item.pesoTicketBascula : '',
        item.totalPesoTickets !== undefined ? item.totalPesoTickets : '',
        item.ubicacionBanos || '',
        item.desinfectanteUsado || '',
        item.areaFisica || '',
        item.responsableEntrega || ''
      ]);
    });

  } else if (tipo === 'inventarios') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Área Planta:', data.area]);
    wsRows.push(['Turno Operativo:', data.turno]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. REGISTRO DE DESECHOS INGRESADOS']);
    wsRows.push(['Hora', 'Tipo de Desecho', 'Cantidad', 'Firma Registro']);
    
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.hora, f.producto, f.cantidad, f.firma]);
    });

  } else if (tipo === 'entrega_contenedores') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Total Contenedores:', data.totalContenedores]);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. ESTADO GENERAL DE CONTENEDORES']);
    wsRows.push(['Tapadera Buen Estado:', data.estadoGeneral?.tapaderaBuenEstado ? 'SÍ' : 'NO']);
    wsRows.push(['Cuerpo de Plástico:', data.estadoGeneral?.cuerpoBuenEstado ? 'SÍ' : 'NO']);
    wsRows.push(['Llantas / Ruedas:', data.estadoGeneral?.llantasBuenEstado ? 'SÍ' : 'NO']);
    wsRows.push(['Halador / Manijas:', data.estadoGeneral?.haladorBuenEstado ? 'SÍ' : 'NO']);
    wsRows.push([]); // separator

    wsRows.push(['III. DETALLE DE CANTIDADES ENTREGADAS POR RUTA']);
    wsRows.push(['Ruta/Destino', 'Cantidad Entregada', 'Firma Quien Recibe']);
    
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.ruta, f.cantidad, f.firmaRecibe]);
    });

  } else if (tipo === 'disposicion_pirolisis') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Total de Pacas:', data.totalPacas]);
    wsRows.push(['Total de Libras:', data.totalLibras + ' lbs']);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. REGISTRO DE PACAS POR PROCESO']);
    wsRows.push(['Proceso', 'Pacas Asignadas', 'Número Pase Traslado', 'Firma Recibe']);
    
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.proceso, f.pacas, f.noPaseTraslado, f.firmaRecibe]);
    });

  } else if (tipo === 'disposicion_vertedero') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Total Viajes:', data.totalViajes]);
    wsRows.push(['Total Pacas:', data.totalPacas]);
    wsRows.push(['Total Pesaje:', (data.totalPesaje || 0) + ' lbs']);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. DESGLOSE DE CAMIONES Y VIAJES']);
    wsRows.push(['Código Camión', 'Placa Registrada', 'Nro. Pase de Salida', 'Hora Salida', 'Piloto / Chofer', 'Nro. Correlativo de Paca', 'Cantidad Pacas', 'Pesaje (LBS)']);
    
    (data.filas || []).forEach((f: any) => {
      wsRows.push([
        f.camion,
        f.placa,
        f.noPaseSalida,
        f.horaSalida || 'N/R',
        f.nombrePiloto || 'N/R',
        f.correlativoPacas || '',
        f.cantidadPacas,
        f.pesaje !== undefined ? f.pesaje : 0
      ]);
    });

  } else if (tipo === 'control_incineracion') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Incinerador ID:', data.incinerador]);
    wsRows.push(['Duración Proceso:', data.duracionProceso]);
    wsRows.push(['Hora Inicio:', data.horaInicio]);
    wsRows.push(['Hora Fin:', data.horaFin]);
    wsRows.push(['Total Libras:', data.totalLibras + ' lbs']);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. PARÁMETROS OPERATIVOS Y CONTROL TÉRMICO']);
    wsRows.push(['Temp. Cámara Combustión:', data.tempCombustion + ' °C']);
    wsRows.push(['Temp. Cámara Post-Combustión:', data.tempPostCombustion + ' °C']);
    wsRows.push(['Cantidad Polvo Final:', data.cantidadPolvoFin + ' kg']);
    wsRows.push(['Combustible Usado:', data.combustibleUsado]);
    wsRows.push(['Combustible Cantidad:', data.combustibleCantidad + ' gal']);
    wsRows.push([]); // separator

    wsRows.push(['III. DETALLE DE INGRESOS DE CARGA']);
    wsRows.push(['Ingreso', 'Libras Recibidas']);
    
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.ingreso, f.libras]);
    });

  } else if (tipo === 'cuarto_frio') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Cuarto Frío ID:', data.cuartoFrio]);
    wsRows.push(['Hora Inspección:', data.horaInspeccion]);
    wsRows.push(['Temp. Entrada:', data.tempEntrada + ' °C']);
    wsRows.push(['Temp. Salida:', data.tempSalida + ' °C']);
    wsRows.push(['Congeladores Activos:', data.cantidadCongeladoresActivos]);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. REGISTRO DE INSPECCIÓN SANITARIA']);
    wsRows.push(['Limpieza Paredes Exteriores:', data.inspeccion?.limpiezaParedesExteriores ? 'APROBADO' : 'FALLA']);
    wsRows.push(['Limpieza Paredes Interiores:', data.inspeccion?.limpiezaParedesInteriores ? 'APROBADO' : 'FALLA']);
    wsRows.push(['Limpieza Pisos:', data.inspeccion?.limpiezaPiso ? 'APROBADO' : 'FALLA']);
    wsRows.push(['Funcionamiento Evaporadores:', data.inspeccion?.funcionamientoEvaporadores ? 'APROBADO' : 'FALLA']);
    wsRows.push(['Funcionamiento Condensadores:', data.inspeccion?.funcionamientoCondensadores ? 'APROBADO' : 'FALLA']);
    wsRows.push(['Luces Interiores SGI:', data.inspeccion?.funcionamientoLucesInteriores ? 'APROBADO' : 'FALLA']);
    wsRows.push(['Limpieza Techos:', data.inspeccion?.limpiezaTecho ? 'APROBADO' : 'FALLA']);
    wsRows.push(['Limpieza Exterior Techo:', data.inspeccion?.limpiezaExteriorTecho ? 'APROBADO' : 'FALLA']);
    wsRows.push(['Residuo Ordenado:', data.inspeccion?.residuoOrdenado ? 'APROBADO' : 'FALLA']);
    wsRows.push([]); // separator

    wsRows.push(['III. TEMPERATURA CONGELADORES AUXILIARES']);
    wsRows.push(['Congelador 01:', data.tempCongeladores?.congelador01 + ' °C']);
    wsRows.push(['Congelador 02:', data.tempCongeladores?.congelador02 + ' °C']);
    wsRows.push(['Congelador 03:', data.tempCongeladores?.congelador03 + ' °C']);
    wsRows.push(['Congelador 04:', data.tempCongeladores?.congelador04 + ' °C']);
    wsRows.push(['Congelador 05:', data.tempCongeladores?.congelador05 + ' °C']);
    wsRows.push(['Congelador 06:', data.tempCongeladores?.congelador06 + ' °C']);

  } else if (tipo === 'reduccion_volumen') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Código Trituradora:', data.noTrituradora]);
    wsRows.push(['Número de Proceso:', data.noProceso]);
    wsRows.push(['Tiempo Proceso:', data.tiempoProceso]);
    wsRows.push(['Peso Entrada (lbs):', data.pesoEntrada + ' Lbs']);
    wsRows.push(['Peso Salida (lbs):', data.pesoSalida + ' Lbs']);
    wsRows.push(['Cantidad Pacas:', data.cantidadPacas]);
    wsRows.push(['Peso Promedio por Paca:', (data.cantidadPacas > 0 ? (data.pesoSalida / data.cantidadPacas).toFixed(1) : '0') + ' Lbs/Paca']);
    wsRows.push(['Anotaciones Especiales:', data.anotacionesEspeciales || 'Ninguna']);
    wsRows.push(['Observaciones Generales:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. DIAGNÓSTICO DEL SISTEMA MECÁNICO']);
    wsRows.push(['Estado Trituradora Shredder:', data.estadoTrituradora ? 'SANO' : 'FALLA']);
    wsRows.push(['Estado Cajas Reductoras:', data.estadoCajasReductoras ? 'SANO' : 'FALLA']);
    wsRows.push(['Estado Fajas Motor:', data.estadoFajas ? 'SANO' : 'FALLA']);
    wsRows.push(['Estado Elevador Carros:', data.estadoElevadorCarros ? 'SANO' : 'FALLA']);
    wsRows.push(['Estado Banda Transportadora:', data.estadoBandaTransportadora ? 'SANO' : 'FALLA']);
    wsRows.push(['Estado Compactadora Hidráulica:', data.estadoCompactadora ? 'SANO' : 'FALLA']);

  } else if (tipo === 'control_autoclaves') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Identificación Autoclave:', data.noAutoclave]);
    wsRows.push(['Peso Total Bruto:', (data.pesoBrutoTotal !== undefined ? data.pesoBrutoTotal : (data.pesoProceso ? data.pesoProceso + 1080 : 1730)) + ' Lbs']);
    wsRows.push(['Peso Total Neto (Proceso):', data.pesoProceso + ' Lbs']);
    wsRows.push(['Peso Carrito 1 (Bruto):', (data.pesoBruto1 !== undefined ? data.pesoBruto1 : 300) + ' Lbs (Neto: ' + (data.pesoNeto1 !== undefined ? data.pesoNeto1 : 120) + ' Lbs)']);
    wsRows.push(['Peso Carrito 2 (Bruto):', (data.pesoBruto2 !== undefined ? data.pesoBruto2 : 300) + ' Lbs (Neto: ' + (data.pesoNeto2 !== undefined ? data.pesoNeto2 : 120) + ' Lbs)']);
    wsRows.push(['Peso Carrito 3 (Bruto):', (data.pesoBruto3 !== undefined ? data.pesoBruto3 : 300) + ' Lbs (Neto: ' + (data.pesoNeto3 !== undefined ? data.pesoNeto3 : 120) + ' Lbs)']);
    wsRows.push(['Peso Carrito 4 (Bruto):', (data.pesoBruto4 !== undefined ? data.pesoBruto4 : 300) + ' Lbs (Neto: ' + (data.pesoNeto4 !== undefined ? data.pesoNeto4 : 120) + ' Lbs)']);
    wsRows.push(['Peso Carrito 5 (Bruto):', (data.pesoBruto5 !== undefined ? data.pesoBruto5 : 300) + ' Lbs (Neto: ' + (data.pesoNeto5 !== undefined ? data.pesoNeto5 : 120) + ' Lbs)']);
    wsRows.push(['Peso Carrito 6 (Bruto):', (data.pesoBruto6 !== undefined ? data.pesoBruto6 : 230) + ' Lbs (Neto: ' + (data.pesoNeto6 !== undefined ? data.pesoNeto6 : 50) + ' Lbs)']);
    wsRows.push(['Número de Proceso:', data.noProceso]);
    wsRows.push(['Temperatura Incubación:', data.tempIncubacion]);
    wsRows.push(['Firma Supervisor:', data.firmaSupervisor]);
    wsRows.push(['Firma Coordinador:', data.firmaCoordinador]);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. MONITOREO DE INDICADORES BIOLÓGICOS Y QUÍMICOS']);
    wsRows.push(['Prueba de Ampolla Biológica:', data.tipoIndicador?.biologico ? 'SÍ' : 'NO']);
    wsRows.push(['Prueba de Cinta Química:', data.tipoIndicador?.quimico ? 'SÍ' : 'NO']);
    wsRows.push(['Identificación Indicador:', data.identificacionIndicador]);
    wsRows.push(['Resultado Clínico Vial:', data.resultadoIndicador]);
    wsRows.push(['Número de Lote Fabricante:', data.noLoteFabricante]);
    wsRows.push([]); // separator

    wsRows.push(['III. PARÁMETROS OPERATIVOS DE ESTERILIZACIÓN']);
    wsRows.push(['Control Temperatura Cumplido:', data.parametrosOperacion?.temperatura ? 'ALCANZADO (✓)' : 'FALLO (✗)']);
    wsRows.push(['Control Presión Cumplido:', data.parametrosOperacion?.presion ? 'ALCANZADO (✓)' : 'FALLO (✗)']);
    wsRows.push(['Tiempo Proceso Esterilización:', data.parametrosOperacion?.tiempoProceso ? 'CONFORME (✓)' : 'REVISIÓN (✗)']);
    wsRows.push(['Observaciones Generales Proceso:', data.observacionesGeneralesProceso || 'Ninguna']);

  } else if (tipo === 'generacion_almacenamiento') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Ente Generador:', data.enteGenerador]);
    wsRows.push(['Fecha Recepción:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Ubicación Planta:', data.ubicacion]);
    wsRows.push(['Nro. Ticket Báscula:', data.noTicketBascula]);
    wsRows.push(['Peso Ticket Báscula:', data.pesoTicketBascula + ' lbs']);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. CLASIFICACIÓN DE RESIDUO RPBI Y EMBALAJE']);
    wsRows.push(['Inorgánico:', data.tipoResiduo?.inorganico ? 'SÍ' : 'NO']);
    wsRows.push(['Punzocortante:', data.tipoResiduo?.punzoCortante ? 'SÍ' : 'NO']);
    wsRows.push(['Patológico:', data.tipoResiduo?.patologico ? 'SÍ' : 'NO']);
    wsRows.push(['Embalaje Contenedor:', data.tipoEmbalaje?.contenedor ? 'SÍ' : 'NO']);
    wsRows.push(['Embalaje Tonel Metálico:', data.tipoEmbalaje?.tonelMetalico ? 'SÍ' : 'NO']);
    wsRows.push(['Embalaje Congelador:', data.tipoEmbalaje?.congelador ? 'SÍ' : 'NO']);
    wsRows.push([]); // separator

    wsRows.push(['III. DETALLES DE RECEPCIÓN Y PESAJES']);
    wsRows.push(['No. Ticket', 'Tipo de Residuo', 'Embalaje', 'Cantidad (Unidades)', 'Peso (lbs)']);
    
    (data.filasLeft || []).forEach((f: any) => {
      wsRows.push([
        f.noTicketInterno || 'N/A',
        f.tipoResiduo || 'Inorgánico común',
        f.tipoEmbalaje || 'Bolsa / Ninguno',
        f.cantidad || 1,
        f.peso || 0
      ]);
    });
    wsRows.push([]);
    wsRows.push(['Total Peso Combinado (Tickets):', data.totalPesoTickets]);
    wsRows.push(['Peso Oficial Báscula:', data.pesoTicketBascula]);
    
    const deviation = Math.abs((data.totalPesoTickets || 0) - (data.pesoTicketBascula || 0));
    const devPct = (data.pesoTicketBascula || 0) > 0 ? (deviation / (data.pesoTicketBascula || 0)) * 100 : 0;
    wsRows.push(['Desviación de Báscula (%):', devPct.toFixed(2) + ' %']);
    wsRows.push(['Desviación de Báscula (lbs):', deviation.toFixed(1) + ' lbs']);
    wsRows.push(['Estado de Tolerancia:', devPct > 3 ? 'FUERA DE TOLERANCIA (>3%)' : 'DENTRO DE TOLERANCIA (≤3%)']);
  } else if (tipo === 'lavado_banos') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Ubicación de Baños:', data.ubicacionBanos]);
    wsRows.push(['Turno Operativo:', data.turno]);
    wsRows.push(['Desinfectante Proceso:', data.desinfectanteUsado]);
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. REVISIÓN DE CUMPLIMIENTO']);
    wsRows.push(['Lavado Sanitarios:', data.checklistBanos?.lavadoSanitarios ? 'CUMPLIDO' : 'PENDIENTE']);
    wsRows.push(['Lavado Lavamanos:', data.checklistBanos?.lavadoLavamanos ? 'CUMPLIDO' : 'PENDIENTE']);
    wsRows.push(['Barrido / Trapeado:', data.checklistBanos?.barridoTrapeado ? 'CUMPLIDO' : 'PENDIENTE']);
    wsRows.push(['Espejos:', data.checklistBanos?.limpiezaEspejos ? 'CUMPLIDO' : 'PENDIENTE']);
    wsRows.push(['Vidrios:', data.checklistBanos?.limpiezaVidrios ? 'CUMPLIDO' : 'PENDIENTE']);
    wsRows.push(['Desinfección Superficies:', data.checklistBanos?.desinfeccionSuperficies ? 'CUMPLIDO' : 'PENDIENTE']);
    wsRows.push(['Vaciado Papeleras:', data.checklistBanos?.vaciadoPapeleras ? 'CUMPLIDO' : 'PENDIENTE']);
    wsRows.push([]); // separator

    wsRows.push(['III. ABASTECIMIENTO DE CONSUMIBLES']);
    wsRows.push(['Papel Higiénico:', data.abastecimientoBanos?.papelHigienico ? 'CON STOCK' : 'SIN STOCK']);
    wsRows.push(['Jabón Manos:', data.abastecimientoBanos?.jabonManos ? 'CON STOCK' : 'SIN STOCK']);
    wsRows.push(['Toallas de Papel:', data.abastecimientoBanos?.toallasPapel ? 'CON STOCK' : 'SIN STOCK']);

  } else if (tipo === 'insumos_quimicos') {
    wsRows.push(['I. INFORMACIÓN DE AUDITORÍA']);
    wsRows.push(['Fecha de Proceso:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Turno Operativo:', data.turno]);
    wsRows.push(['Responsable Calidad:', data.responsable]);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. REGISTRO DE STOCK DE PRODUCTOS QUÍMICOS Y PLÁSTICOS']);
    wsRows.push(['Producto', 'Unidad Medida', 'Stock Inicial', 'Unidades Recibidas', 'Unidades Consumidas', 'Stock Final', 'Nro Lote']);
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.producto, f.unidadMedida, f.stockInicial, f.unidadesRecibidas, f.unidadesConsumidas, f.stockFinal, f.noLoteProveedor]);
    });

  } else if (tipo === 'inventarios_sgc') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha de Auditoría SGI:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Área Física Involucrada:', data.areaFisica]);
    wsRows.push(['Auditor de Calidad:', data.responsable]);
    wsRows.push(['Observaciones generales:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. DETALLES DE AUDITORÍA SGI']);
    wsRows.push(['Código Insumo', 'Descripción Completa', 'Unidad Medida', 'Stock Mínimo Requerido', 'Existencia Real Física', 'Estado de Empaque / Conservación']);
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.codigoInsmo, f.descripcion, f.medida, f.stockMinimo, f.existenciaReal, f.estadoEmpaque]);
    });

  } else if (tipo === 'control_uniformes') {
    wsRows.push(['I. INFORMACIÓN DE DOTACIONES']);
    wsRows.push(['Fecha Reporte:', data.fecha]);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Coordinador EPP:', data.responsableEntrega]);
    wsRows.push(['Observaciones de Entrega:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. REGISTRO DOTACIONES FILTRADO']);
    wsRows.push(['Colaborador', 'Puesto Operativo', 'Talla Filipina', 'Talla Pantalón', 'Talla Botas', 'Tiene Mandil', 'Tiene Guantes', 'Tiene Careta', 'Firma Recibido']);
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.colaborador, f.puesto, f.tallaCamisa, f.tallaPantalon, f.tallaBotas, f.tieneMandil ? 'SÍ' : 'NO', f.tieneGuantes ? 'SÍ' : 'NO', f.tieneCareta ? 'SÍ' : 'NO', f.firmaRecibido]);
    });
  } else if (tipo === 'control_horas_cargador') {
    wsRows.push(['I. INFORMACIÓN GENERAL Y OPERADOR']);
    wsRows.push(['Fecha de Turno:', data.fecha || '']);
    wsRows.push(['Hora Captura:', formatHoraRegistro(data.fechaRegistro)]);
    wsRows.push(['Turno:', data.turno || '']);
    wsRows.push(['Número de Reporte:', data.noReporte || '']);
    wsRows.push(['Nombre Operador:', data.nombreOperador || '']);
    wsRows.push(['Código Empleado:', data.codigoEmpleado || '']);
    wsRows.push(['Área Asignada:', data.areaAsignada || '']);
    wsRows.push(['Supervisor a Cargo:', data.supervisorCargo || '']);
    wsRows.push([]); // separator

    wsRows.push(['II. DATOS DEL EQUIPO Y COMBUSTIBLE']);
    wsRows.push(['Código de Unidad:', data.codigoUnidad || '']);
    wsRows.push(['Marca y Modelo:', data.marcaModelo || '']);
    wsRows.push(['Año de Fabricación:', data.anio || '']);
    wsRows.push(['Nivel Combustible Inicial:', data.nivelCombustibleInicio || '']);
    wsRows.push(['Litros Combustible Cargados:', data.litrosCargados || 0]);
    wsRows.push(['Nivel Combustible Final:', data.nivelCombustibleFinal || '']);
    wsRows.push([]); // separator

    wsRows.push(['III. REGISTRO DE HORÓMETRO Y ACTIVIDAD']);
    wsRows.push(['Horómetro Inicial (hrs):', data.lecturaInicialHorometro || 0]);
    wsRows.push(['Horómetro Final (hrs):', data.lecturaFinalHorometro || 0]);
    wsRows.push(['Total Operado Calculado (hrs):', data.totalOperadoHoras || 0]);
    wsRows.push(['Hora de Inicio:', data.horaInicio || '']);
    wsRows.push(['Hora de Término:', data.horaTermino || '']);
    wsRows.push(['Pausas / Inactividad (hrs):', data.horasPausaInactividad || 0]);
    wsRows.push(['Actividad Principal:', data.tipoActividadPrincipal || '']);
    wsRows.push(['Material Trabajado:', data.tipoMaterialTrabajado || '']);
    wsRows.push(['Descripción de Actividades:', data.descripcionActividades || '']);
    wsRows.push([]); // separator

    wsRows.push(['IV. CHECKLIST DE INSPECCIÓN PRE-OPERACIONAL']);
    const chk = data.checklistPrevia || {};
    wsRows.push(['Nivel de aceite motor:', chk.nivelAceiteMotor ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Nivel de refrigerante:', chk.nivelRefrigerante ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Presión de llantas:', chk.presionLlantas ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Estado de la cuchara/balde:', chk.estadoCucharaBalde ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Luces y señales direccionales:', chk.lucesSenales ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Frenos de servicio y de mano:', chk.frenos ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Cinturón de seguridad:', chk.cinturonSeguridad ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Bocina y alarma de reversa:', chk.bocinaAlarmaReversa ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Extintor a bordo (vigencia):', chk.extintorAbordo ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push(['Documentos y tarjeta de equipo:', chk.documentosEquipo ? 'CONFORME' : 'NO CONFORME']);
    wsRows.push([]); // separator

    wsRows.push(['V. DIAGNÓSTICO OPERACIONAL Y VALIDACIONES SGI']);
    wsRows.push(['Estado Operativo General:', data.estadoEquipo || '']);
    wsRows.push(['Observaciones de Fallas:', data.descripcionFallasObservaciones || '']);
    wsRows.push(['Firma Operador de Turno:', data.firmaOperador || '']);
    wsRows.push(['Firma Supervisor de Planta:', data.firmaSupervisor || '']);
  }

  // Draw Control de Cambios standard at the end of the sheet
  wsRows.push([]); // separator
  wsRows.push(['--- SISTEMA SGI CONTROL DE CAMBIOS ---']);
  wsRows.push(['Versión', 'Fecha Modificación', 'Sección Comprometida', 'Motivo del Cambio', 'Solicitante Comité']);
  wsRows.push(['1.0', '13/06/2025', 'Todas', 'Creación del formato inicial bajo norma ISO 14001 y 9001', 'Comité de Calidad']);

  // Create workbook instance
  const wb = XLSX.utils.book_new();

  // Convert array of arrays to Worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsRows);

  // Set column widths dynamically to prevent truncation
  const colWidths = wsRows[0].map(() => ({ wch: 22 }));
  wsRows.forEach((row) => {
    row.forEach((cell, cellIdx) => {
      const val = String(cell || '');
      if (colWidths[cellIdx] && val.length > colWidths[cellIdx].wch) {
        colWidths[cellIdx].wch = Math.min(val.length + 2, 60);
      }
    });
  });
  ws['!cols'] = colWidths;

  // Append Worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'SGI FORMATO');

  // Write and Save
  const outputFileName = `${meta.code}_${tipo}_${(data.fecha || new Date().toISOString().split('T')[0]).replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, outputFileName);
}

/**
 * Generates a clean, flat, highly customized spreadsheet containing all filtered records
 * belonging only to a specific bitacora, avoiding irrelevant column clutter.
 */
function generateConsolidatedFormExcel(tipo: string, results: any[]): void {
  // Sanitize all filtered results to ensure "basura bio" is replaced with BIOTRASH
  results = sanitizeBiotrashObject(results);

  const wsRows: any[][] = [];
  
  // Define metadata title mapping
  const titles: Record<string, { code: string; name: string }> = {
    inventarios: { code: 'F-OPR-01', name: 'BITÁCORA DE INGRESO DE DESECHOS A PLANTA' },
    entrega_contenedores: { code: 'F-OPR-02', name: 'BITÁCORA DE ENTREGA DE CONTENEDORES ROJOS' },
    disposicion_pirolisis: { code: 'F-OPR-03', name: 'BITÁCORA DE DISPOSICIÓN FINAL DE RPBI A PIRÓLISIS' },
    disposicion_vertedero: { code: 'F-OPR-04', name: 'BITÁCORA DE DISPOSICIÓN FINAL DE RPBI A VERTEDERO' },
    control_incineracion: { code: 'F-OPR-05', name: 'BITÁCORA DE CONTROL DE INCINERACIÓN' },
    cuarto_frio: { code: 'F-OPR-06', name: 'BITÁCORA DE CONTROL DE CUARTO FRÍO Y CONGELADORES' },
    reduccion_volumen: { code: 'F-OPR-07', name: 'BITÁCORA DE REDUCCIÓN DE VOLUMEN Y CONTROL DE PACAS' },
    control_autoclaves: { code: 'F-OPR-08', name: 'BITÁCORA DE CONTROL QUÍMICO / BIOLÓGICO DE AUTOCLAVES' },
    generacion_almacenamiento: { code: 'F-OPR-09', name: 'BITÁCORA DE GESTIÓN DE GENERACIÓN Y ALMACENAMIENTO DE RPBI' },
    lavado_banos: { code: 'F-OPR-10', name: 'BITÁCORA DE LAVADO DE BAÑOS Y ÁREA ADMINISTRATIVA' },
    insumos_quimicos: { code: 'F-OPR-11', name: 'BITÁCORA DE INSUMOS QUÍMICOS Y PLÁSTICOS' },
    inventarios_sgc: { code: 'F-OPR-12', name: 'BITÁCORA DE CONTROL DE INVENTARIO SGI' },
    control_uniformes: { code: 'F-OPR-13', name: 'BITÁCORA DE CONTROL DE UNIFORMES DE PLANTA' },
    control_horas_cargador: { code: 'F-OPR-000-14', name: 'CONTROL DE HORAS DE TRABAJO - CARGADOR FRONTAL' }
  };

  const meta = titles[tipo] || { code: 'F-OPR-SGI', name: 'BITÁCORA SGI' };

  // Headers standard SGI
  wsRows.push(['BIOTRASH S.A.', '', '', '', '']);
  wsRows.push(['SISTEMA DE GESTIÓN INTEGRAL (SGI)', '', '', '', '']);
  wsRows.push([`REPORTE DE CONSOLIDADO DE REGISTROS: ${meta.name}`, '', '', '', '']);
  wsRows.push([`CÓDIGO FORMATO: ${meta.code}`, '', `VERSIÓN SGI: 4.2`, '', '']);
  wsRows.push([]); // blank separator

  if (tipo === 'inventarios') {
    wsRows.push(['Fecha', 'Hora Captura', 'Área Planta', 'Turno Operativo', 'Responsable SGI', 'Observaciones', 'Hora Ingreso', 'Producto/Desecho', 'Cantidad (Unidades)', 'Firma Registro']);
    results.forEach(item => {
      const rows = item.filas || [{}];
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.area || '',
          item.turno || '',
          item.responsable || '',
          item.observaciones || '',
          f.hora || '',
          f.producto || '',
          f.cantidad !== undefined ? f.cantidad : '',
          f.firma || ''
        ]);
      });
    });
  } else if (tipo === 'entrega_contenedores') {
    wsRows.push(['Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Total Contenedores', 'Tapadera Buen Estado', 'Cuerpo Buen Estado', 'Llantas Buen Estado', 'Halador Buen Estado', 'Ruta/Destino', 'Cantidad Entregada', 'Firma Recibe']);
    results.forEach(item => {
      const rows = item.filas || [{}];
      const est = item.estadoGeneral || {};
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.responsable || '',
          item.observaciones || '',
          item.totalContenedores !== undefined ? item.totalContenedores : '',
          est.tapaderaBuenEstado ? 'SÍ' : 'NO',
          est.cuerpoBuenEstado ? 'SÍ' : 'NO',
          est.llantasBuenEstado ? 'SÍ' : 'NO',
          est.haladorBuenEstado ? 'SÍ' : 'NO',
          f.ruta || '',
          f.cantidad !== undefined ? f.cantidad : '',
          f.firmaRecibe || ''
        ]);
      });
    });
  } else if (tipo === 'disposicion_pirolisis') {
    wsRows.push(['Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Total de Pacas', 'Total Libras (Lbs)', 'Identificador Proceso', 'Pacas Asignadas', 'Pase de Traslado', 'Firma Recibe']);
    results.forEach(item => {
      const rows = item.filas || [{}];
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.responsable || '',
          item.observaciones || '',
          item.totalPacas !== undefined ? item.totalPacas : '',
          item.totalLibras !== undefined ? item.totalLibras : '',
          f.proceso || '',
          f.pacas !== undefined ? f.pacas : '',
          f.noPaseTraslado || '',
          f.firmaRecibe || ''
        ]);
      });
    });
  } else if (tipo === 'disposicion_vertedero') {
    wsRows.push(['Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Total Viajes', 'Total Pacas', 'Total Pesaje (Lbs)', 'Código Camión', 'Placa Camión', 'Pase Salida', 'Hora Salida', 'Piloto / Chofer', 'Correlativo Paca', 'Cantidad Pacas', 'Pesaje Fila (Lbs)']);
    results.forEach(item => {
      const rows = item.filas || [{}];
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.responsable || '',
          item.observaciones || '',
          item.totalViajes !== undefined ? item.totalViajes : '',
          item.totalPacas !== undefined ? item.totalPacas : '',
          item.totalPesaje !== undefined ? item.totalPesaje : '',
          f.camion || '',
          f.placa || '',
          f.noPaseSalida || '',
          f.horaSalida || '',
          f.nombrePiloto || '',
          f.correlativoPacas || '',
          f.cantidadPacas !== undefined ? f.cantidadPacas : '',
          f.pesaje !== undefined ? f.pesaje : ''
        ]);
      });
    });
  } else if (tipo === 'control_incineracion') {
    wsRows.push(['Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Incinerador ID', 'Duración Proceso', 'Hora Inicio', 'Hora Fin', 'Total Libras (Lbs)', 'Temp Combustión (°C)', 'Temp Post-Combustión (°C)', 'Polvo Cenizas (kg)', 'Combustible Tipo', 'Combustible Cantidad (Gls)', 'ID Carga / Ingreso', 'Libras Recibidas']);
    results.forEach(item => {
      const rows = item.filas || [{}];
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.responsable || '',
          item.observaciones || '',
          item.incinerador || '',
          item.duracionProceso || '',
          item.horaInicio || '',
          item.horaFin || '',
          item.totalLibras !== undefined ? item.totalLibras : '',
          item.tempCombustion !== undefined ? item.tempCombustion : '',
          item.tempPostCombustion !== undefined ? item.tempPostCombustion : '',
          item.cantidadPolvoFin !== undefined ? item.cantidadPolvoFin : '',
          item.combustibleUsado || '',
          item.combustibleCantidad !== undefined ? item.combustibleCantidad : '',
          f.ingreso || '',
          f.libras !== undefined ? f.libras : ''
        ]);
      });
    });
  } else if (tipo === 'cuarto_frio') {
    wsRows.push([
      'Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Cuarto Frío ID', 'Hora Inspección', 'Temp Entrada (°C)', 'Temp Salida (°C)', 'Congeladores Activos',
      'Limpieza Paredes Ext', 'Limpieza Paredes Int', 'Limpieza Pisos', 'Evaporadores Ok', 'Condensadores Ok', 'Luces Ok', 'Residuo Ordenado', 'Techo Limpio', 'Ext Techo Limpio',
      'C1 (°C)', 'C2 (°C)', 'C3 (°C)', 'C4 (°C)', 'C5 (°C)', 'C6 (°C)'
    ]);
    results.forEach(item => {
      const insp = item.inspeccion || {};
      const temps = item.tempCongeladores || {};
      wsRows.push([
        item.fecha || '',
        formatHoraRegistro(item.fechaRegistro),
        item.responsable || '',
        item.observaciones || '',
        item.cuartoFrio || '',
        item.horaInspeccion || '',
        item.tempEntrada !== undefined ? item.tempEntrada : '',
        item.tempSalida !== undefined ? item.tempSalida : '',
        item.cantidadCongeladoresActivos !== undefined ? item.cantidadCongeladoresActivos : '',
        insp.limpiezaParedesExteriores ? 'CUMPLE' : 'FALLA',
        insp.limpiezaParedesInteriores ? 'CUMPLE' : 'FALLA',
        insp.limpiezaPiso ? 'CUMPLE' : 'FALLA',
        insp.funcionamientoEvaporadores ? 'CUMPLE' : 'FALLA',
        insp.funcionamientoCondensadores ? 'CUMPLE' : 'FALLA',
        insp.funcionamientoLucesInteriores ? 'CUMPLE' : 'FALLA',
        insp.residuoOrdenado ? 'CUMPLE' : 'FALLA',
        insp.limpiezaTecho ? 'CUMPLE' : 'FALLA',
        insp.limpiezaExteriorTecho ? 'CUMPLE' : 'FALLA',
        temps.congelador01 !== undefined ? temps.congelador01 : '',
        temps.congelador02 !== undefined ? temps.congelador02 : '',
        temps.congelador03 !== undefined ? temps.congelador03 : '',
        temps.congelador04 !== undefined ? temps.congelador04 : '',
        temps.congelador05 !== undefined ? temps.congelador05 : '',
        temps.congelador06 !== undefined ? temps.congelador06 : ''
      ]);
    });
  } else if (tipo === 'reduccion_volumen') {
    wsRows.push([
      'Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Anotaciones Especiales', 'Trituradora ID', 'Nº Proceso', 'Tiempo Proceso', 'Peso Entrada (lbs)', 'Peso Salida (lbs)', 'Cantidad Pacas',
      'Trituradora Sano', 'Cajas Reductoras Sano', 'Fajas Sano', 'Elevador Carros Sano', 'Banda Transportadora Sano', 'Compactadora Sano'
    ]);
    results.forEach(item => {
      wsRows.push([
        item.fecha || '',
        formatHoraRegistro(item.fechaRegistro),
        item.responsable || '',
        item.observaciones || '',
        item.anotacionesEspeciales || '',
        item.noTrituradora || '',
        item.noProceso || '',
        item.tiempoProceso || '',
        item.pesoEntrada !== undefined ? item.pesoEntrada : '',
        item.pesoSalida !== undefined ? item.pesoSalida : '',
        item.cantidadPacas !== undefined ? item.cantidadPacas : '',
        item.estadoTrituradora ? 'SÍ' : 'NO',
        item.estadoCajasReductoras ? 'SÍ' : 'NO',
        item.estadoFajas ? 'SÍ' : 'NO',
        item.estadoElevadorCarros ? 'SÍ' : 'NO',
        item.estadoBandaTransportadora ? 'SÍ' : 'NO',
        item.estadoCompactadora ? 'SÍ' : 'NO'
      ]);
    });
  } else if (tipo === 'control_autoclaves') {
    wsRows.push([
      'Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Autoclave ID', 
      'Peso Total Bruto (lbs)', 'Peso Total Neto (lbs)',
      'Carrito 1 Bruto (lbs)', 'Carrito 1 Neto (lbs)',
      'Carrito 2 Bruto (lbs)', 'Carrito 2 Neto (lbs)',
      'Carrito 3 Bruto (lbs)', 'Carrito 3 Neto (lbs)',
      'Carrito 4 Bruto (lbs)', 'Carrito 4 Neto (lbs)',
      'Carrito 5 Bruto (lbs)', 'Carrito 5 Neto (lbs)',
      'Carrito 6 Bruto (lbs)', 'Carrito 6 Neto (lbs)',
      'Nº Proceso', 'Temp Incubación (°C)', 'Firma Supervisor', 'Firma Coordinador',
      'Uso Ampolla Biológica', 'Uso Cinta Química', 'Identificación Indicador', 'Resultado Clínico', 'No Lote Fabricante', 'Temp Alcanzado', 'Presión Alcanzado', 'Tiempo Esterilización', 'Observaciones Proceso'
    ]);
    results.forEach(item => {
      const ind = item.tipoIndicador || {};
      const param = item.parametrosOperacion || {};
      const pTotalBruto = item.pesoBrutoTotal !== undefined ? item.pesoBrutoTotal : (item.pesoProceso ? (item.pesoProceso + 1080) : 1730);
      const pBruto1 = item.pesoBruto1 !== undefined ? item.pesoBruto1 : 300;
      const pNeto1 = item.pesoNeto1 !== undefined ? item.pesoNeto1 : 120;
      const pBruto2 = item.pesoBruto2 !== undefined ? item.pesoBruto2 : 300;
      const pNeto2 = item.pesoNeto2 !== undefined ? item.pesoNeto2 : 120;
      const pBruto3 = item.pesoBruto3 !== undefined ? item.pesoBruto3 : 300;
      const pNeto3 = item.pesoNeto3 !== undefined ? item.pesoNeto3 : 120;
      const pBruto4 = item.pesoBruto4 !== undefined ? item.pesoBruto4 : 300;
      const pNeto4 = item.pesoNeto4 !== undefined ? item.pesoNeto4 : 120;
      const pBruto5 = item.pesoBruto5 !== undefined ? item.pesoBruto5 : 300;
      const pNeto5 = item.pesoNeto5 !== undefined ? item.pesoNeto5 : 120;
      const pBruto6 = item.pesoBruto6 !== undefined ? item.pesoBruto6 : 230;
      const pNeto6 = item.pesoNeto6 !== undefined ? item.pesoNeto6 : 50;

      wsRows.push([
        item.fecha || '',
        formatHoraRegistro(item.fechaRegistro),
        item.responsable || '',
        item.observaciones || '',
        item.noAutoclave || '',
        pTotalBruto,
        item.pesoProceso !== undefined ? item.pesoProceso : '',
        pBruto1, pNeto1,
        pBruto2, pNeto2,
        pBruto3, pNeto3,
        pBruto4, pNeto4,
        pBruto5, pNeto5,
        pBruto6, pNeto6,
        item.noProceso || '',
        item.tempIncubacion !== undefined ? item.tempIncubacion : '',
        item.firmaSupervisor || '',
        item.firmaCoordinador || '',
        ind.biologico ? 'SÍ' : 'NO',
        ind.quimico ? 'SÍ' : 'NO',
        item.identificacionIndicador || '',
        item.resultadoIndicador || '',
        item.noLoteFabricante || '',
        param.temperatura ? 'SÍ' : 'NO',
        param.presion ? 'SÍ' : 'NO',
        param.tiempoProceso ? 'SÍ' : 'NO',
        item.observacionesGeneralesProceso || ''
      ]);
    });
  } else if (tipo === 'generacion_almacenamiento') {
    wsRows.push([
      'Fecha Recepción', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Ente Generador', 'Ubicación Planta', 'No Ticket Báscula', 'Peso Báscula (lbs)', 'Total Peso Tickets (lbs)',
      'Inorgánico', 'Punzocortantes', 'Patológico', 'Contenedor', 'Tonel Metálico', 'Congelador', 'No Ticket Interno', 'Tipo Residuo', 'Tipo Embalaje', 'Cantidad', 'Peso (lbs)'
    ]);
    results.forEach(item => {
      const rows = item.filasLeft || [{}];
      const res = item.tipoResiduo || {};
      const emb = item.tipoEmbalaje || {};
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.responsable || '',
          item.observaciones || '',
          item.enteGenerador || '',
          item.ubicacion || '',
          item.noTicketBascula || '',
          item.pesoTicketBascula !== undefined ? item.pesoTicketBascula : '',
          item.totalPesoTickets !== undefined ? item.totalPesoTickets : '',
          res.inorganico ? 'SÍ' : 'NO',
          res.punzoCortante ? 'SÍ' : 'NO',
          res.patologico ? 'SÍ' : 'NO',
          emb.contenedor ? 'SÍ' : 'NO',
          emb.tonelMetalico ? 'SÍ' : 'NO',
          emb.congelador ? 'SÍ' : 'NO',
          f.noTicketInterno || '',
          f.tipoResiduo || '',
          f.tipoEmbalaje || '',
          f.cantidad !== undefined ? f.cantidad : '',
          f.peso !== undefined ? f.peso : ''
        ]);
      });
    });
  } else if (tipo === 'lavado_banos') {
    wsRows.push([
      'Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Ubicación Baños', 'Turno', 'Desinfectante Usado',
      'Lavado Sanitarios', 'Lavado Lavamanos', 'Barrido Trapeado', 'Espejos', 'Vidrios', 'Desinfección Superficies', 'Vaciado Papeleras',
      'Stock Papel Higiénico', 'Stock Jabón Manos', 'Stock Toallas Papel'
    ]);
    results.forEach(item => {
      const chk = item.checklistBanos || {};
      const abs = item.abastecimientoBanos || {};
      wsRows.push([
        item.fecha || '',
        formatHoraRegistro(item.fechaRegistro),
        item.responsable || '',
        item.observaciones || '',
        item.ubicacionBanos || '',
        item.turno || '',
        item.desinfectanteUsado || '',
        chk.lavadoSanitarios ? 'SÍ' : 'NO',
        chk.lavadoLavamanos ? 'SÍ' : 'NO',
        chk.barridoTrapeado ? 'SÍ' : 'NO',
        chk.limpiezaEspejos ? 'SÍ' : 'NO',
        chk.limpiezaVidrios ? 'SÍ' : 'NO',
        chk.desinfeccionSuperficies ? 'SÍ' : 'NO',
        chk.vaciadoPapeleras ? 'SÍ' : 'NO',
        abs.papelHigienico ? 'CON STOCK' : 'SIN STOCK',
        abs.jabonManos ? 'CON STOCK' : 'SIN STOCK',
        abs.toallasPapel ? 'CON STOCK' : 'SIN STOCK'
      ]);
    });
  } else if (tipo === 'insumos_quimicos') {
    wsRows.push(['Fecha', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Turno Operativo', 'Producto', 'Unidad Medida', 'Stock Inicial', 'Unidades Recibidas', 'Unidades Consumidas', 'Stock Final', 'No Lote Proveedor']);
    results.forEach(item => {
      const rows = item.filas || [{}];
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.responsable || '',
          item.observaciones || '',
          item.turno || '',
          f.producto || '',
          f.unidadMedida || '',
          f.stockInicial !== undefined ? f.stockInicial : '',
          f.unidadesRecibidas !== undefined ? f.unidadesRecibidas : '',
          f.unidadesConsumidas !== undefined ? f.unidadesConsumidas : '',
          f.stockFinal !== undefined ? f.stockFinal : '',
          f.noLoteProveedor || ''
        ]);
      });
    });
  } else if (tipo === 'inventarios_sgc') {
    wsRows.push(['Fecha Auditoría', 'Hora Captura', 'Responsable SGI', 'Observaciones', 'Área Física Involucrada', 'Código Insumo', 'Descripción Completa', 'Unidad Medida', 'Stock Mínimo', 'Existencia Real', 'Estado Empaque']);
    results.forEach(item => {
      const rows = item.filas || [{}];
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.responsable || '',
          item.observaciones || '',
          item.areaFisica || '',
          f.codigoInsumo || f.codigoInsmo || '',
          f.descripcion || '',
          f.medida || '',
          f.stockMinimo !== undefined ? f.stockMinimo : '',
          f.existenciaReal !== undefined ? f.existenciaReal : '',
          f.estadoEmpaque || ''
        ]);
      });
    });
  } else if (tipo === 'control_uniformes') {
    wsRows.push(['Fecha Reporte', 'Hora Captura', 'Coordinador EPP', 'Observaciones', 'Colaborador', 'Puesto Operativo', 'Talla Filipina', 'Talla Pantalón', 'Talla Botas', 'Mandil', 'Guantes', 'Careta', 'Firma Recibido']);
    results.forEach(item => {
      const rows = item.filas || [{}];
      rows.forEach((f: any) => {
        wsRows.push([
          item.fecha || '',
          formatHoraRegistro(item.fechaRegistro),
          item.responsableEntrega || '',
          item.observaciones || '',
          f.colaborador || '',
          f.puesto || '',
          f.tallaCamisa || '',
          f.tallaPantalon || '',
          f.tallaBotas || '',
          f.tieneMandil ? 'SÍ' : 'NO',
          f.tieneGuantes ? 'SÍ' : 'NO',
          f.tieneCareta ? 'SÍ' : 'NO',
          f.firmaRecibido || ''
        ]);
      });
    });
  } else if (tipo === 'control_horas_cargador') {
    wsRows.push([
      'Fecha', 'Hora Captura', 'Turno', 'Nro Reporte', 'Nombre Operador', 'Código Empleado', 'Área Asignada', 'Supervisor Cargo', 'Código Unidad', 'Marca Modelo', 'Año',
      'Nivel Combustible Inicial', 'Litros Cargados', 'Nivel Combustible Final', 'Horómetro Inicial', 'Horómetro Final', 'Total Operado Horas', 'Hora Inicio', 'Hora Término',
      'Pausas Inactividad', 'Actividad Principal', 'Material Trabajado', 'Descripción Actividades', 'Estado Equipo', 'Observaciones Fallas', 'Firma Operador', 'Firma Supervisor'
    ]);
    results.forEach(item => {
      wsRows.push([
        item.fecha || '',
        formatHoraRegistro(item.fechaRegistro),
        item.turno || '',
        item.noReporte || '',
        item.nombreOperador || '',
        item.codigoEmpleado || '',
        item.areaAsignada || '',
        item.supervisorCargo || '',
        item.codigoUnidad || '',
        item.marcaModelo || '',
        item.anio || '',
        item.nivelCombustibleInicio || '',
        item.litrosCargados !== undefined ? item.litrosCargados : '',
        item.nivelCombustibleFinal || '',
        item.lecturaInicialHorometro !== undefined ? item.lecturaInicialHorometro : '',
        item.lecturaFinalHorometro !== undefined ? item.lecturaFinalHorometro : '',
        item.totalOperadoHoras !== undefined ? item.totalOperadoHoras : '',
        item.horaInicio || '',
        item.horaTermino || '',
        item.horasPausaInactividad !== undefined ? item.horasPausaInactividad : '',
        item.tipoActividadPrincipal || '',
        item.tipoMaterialTrabajado || '',
        item.descripcionActividades || '',
        item.estadoEquipo || '',
        item.descripcionFallasObservaciones || '',
        item.firmaOperador || '',
        item.firmaSupervisor || ''
      ]);
    });
  }

  // Draw Control de Cambios SGI standard at the bottom
  wsRows.push([]);
  wsRows.push(['--- SISTEMA SGI CONTROL DE CAMBIOS ---']);
  wsRows.push(['Versión', 'Fecha Modificación', 'Sección Comprometida', 'Motivo del Cambio', 'Solicitante Comité']);
  wsRows.push(['1.0', '13/06/2025', 'Todas', 'Creación del formato inicial consolidado bajo norma ISO 14001 y 9001', 'Comité de Calidad']);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsRows);

  // Auto adjust column widths
  const colWidths = wsRows[0].map(() => ({ wch: 22 }));
  wsRows.forEach((row) => {
    row.forEach((cell, cellIdx) => {
      const val = String(cell || '');
      if (colWidths[cellIdx] && val.length > colWidths[cellIdx].wch) {
        colWidths[cellIdx].wch = Math.min(val.length + 2, 60);
      }
    });
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'SGI FORMATO CONSOLIDADO');

  const outputFileName = `${meta.code}_Consolidado_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, outputFileName);
}
