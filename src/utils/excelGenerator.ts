import * as XLSX from 'xlsx';

/**
 * Highly polished Excel generation utility for SGC BIOTRASH S.A.
 * Translates operational data into beautiful spreadsheet grids.
 */
export function generateAndDownloadExcel(tipo: string, data: any): void {
  // Create Worksheet array
  const wsRows: any[][] = [];

  // Define metadata title mapping
  const titles: Record<string, { code: string; name: string }> = {
    inventarios: { code: 'F-OPR-01', name: 'BITÁCORA DE CONTROL DE INVENTARIOS E INSUMOS' },
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
    inventarios_sgc: { code: 'F-OPR-12', name: 'BITÁCORA DE CONTROL DE INVENTARIO SGC' },
    control_uniformes: { code: 'F-OPR-13', name: 'BITÁCORA DE CONTROL DE UNIFORMES DE PLANTA' },
    control_horas_cargador: { code: 'F-OPR-000-14', name: 'CONTROL DE HORAS DE TRABAJO - CARGADOR FRONTAL' },
    reporte_general: { code: 'SGC-REP-GENERAL', name: 'REPORTE GENERAL INTEGRADO SGC - ISO 14001 / ISO 9001' }
  };

  const meta = titles[tipo] || { code: 'F-OPR-SGC', name: 'BITÁCORA DE GESTIÓN OPERACIONAL SGC' };

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
      'Tipo de Bitácora',
      'Código Formato',
      'Responsable SGC',
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
      'Área Física SGC',
      'Inspector Responsable Entrega'
    ]);
    
    const results = data.results || [];
    results.forEach((item: any) => {
      wsRows.push([
        item.fecha || '',
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
    wsRows.push(['Área Planta:', data.area]);
    wsRows.push(['Turno Operativo:', data.turno]);
    wsRows.push(['Responsable SGC:', data.responsable]);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. REGISTRO DE PRODUCTOS E INSUMOS']);
    wsRows.push(['Hora', 'Producto / Insumo', 'Cantidad', 'Firma Registro']);
    
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.hora, f.producto, f.cantidad, f.firma]);
    });

  } else if (tipo === 'entrega_contenedores') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Responsable SGC:', data.responsable]);
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
    wsRows.push(['Responsable SGC:', data.responsable]);
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
    wsRows.push(['Responsable SGI:', data.responsable]);
    wsRows.push(['Total Viajes:', data.totalViajes]);
    wsRows.push(['Total Pacas:', data.totalPacas]);
    wsRows.push(['Total Pesaje:', (data.totalPesaje || 0) + ' lbs']);
    wsRows.push(['Observaciones:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. DESGLOSE DE CAMIONES Y VIAJES']);
    wsRows.push(['Código Camión', 'Placa Registrada', 'Nro. Pase de Salida', 'Cantidad Pacas', 'Pesaje (LBS)']);
    
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.camion, f.placa, f.noPaseSalida, f.cantidadPacas, f.pesaje !== undefined ? f.pesaje : 0]);
    });

  } else if (tipo === 'control_incineracion') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Responsable SGC:', data.responsable]);
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
    wsRows.push(['Responsable SGC:', data.responsable]);
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
    wsRows.push(['Luces Interiores SGC:', data.inspeccion?.funcionamientoLucesInteriores ? 'APROBADO' : 'FALLA']);
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
    wsRows.push(['Responsable SGC:', data.responsable]);
    wsRows.push(['Código Trituradora:', data.noTrituradora]);
    wsRows.push(['Número de Proceso:', data.noProceso]);
    wsRows.push(['Tiempo Proceso:', data.tiempoProceso]);
    wsRows.push(['Peso Entrada (lbs):', data.pesoEntrada + ' Lbs']);
    wsRows.push(['Peso Salida (lbs):', data.pesoSalida + ' Lbs']);
    wsRows.push(['Cantidad Pacas:', data.cantidadPacas]);
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
    wsRows.push(['Responsable SGC:', data.responsable]);
    wsRows.push(['Identificación Autoclave:', data.noAutoclave]);
    wsRows.push(['Peso del Proceso:', data.pesoProceso + ' Lbs']);
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
    wsRows.push(['Fecha Ingreso:', data.fecha]);
    wsRows.push(['Responsable SGC:', data.responsable]);
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

    wsRows.push(['III. DETALLES DE BOLETAS TICKETS INTERNOS']);
    wsRows.push(['Ticket Izquierdo', 'Peso L (lbs)', 'Ticket Derecho', 'Peso R (lbs)']);
    
    const rowsLen = Math.max((data.filasLeft || []).length, (data.filasRight || []).length);
    for (let i = 0; i < rowsLen; i++) {
      const left = data.filasLeft[i] || { noTicketInterno: '', peso: '' };
      const right = data.filasRight[i] || { noTicketInterno: '', peso: '' };
      wsRows.push([left.noTicketInterno, left.peso, right.noTicketInterno, right.peso]);
    }
    wsRows.push(['Suma Total Tickets Calculada:', data.totalPesoTickets]);
  } else if (tipo === 'lavado_banos') {
    wsRows.push(['I. INFORMACIÓN GENERAL']);
    wsRows.push(['Fecha Proceso:', data.fecha]);
    wsRows.push(['Ubicación de Baños:', data.ubicacionBanos]);
    wsRows.push(['Turno Operativo:', data.turno]);
    wsRows.push(['Desinfectante Proceso:', data.desinfectanteUsado]);
    wsRows.push(['Responsable SGC:', data.responsable]);
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
    wsRows.push(['Fecha de Auditoría SGC:', data.fecha]);
    wsRows.push(['Área Física Involucrada:', data.areaFisica]);
    wsRows.push(['Auditor de Calidad:', data.responsable]);
    wsRows.push(['Observaciones generales:', data.observaciones || 'Ninguna']);
    wsRows.push([]); // separator

    wsRows.push(['II. DETALLES DE AUDITORÍA SGC']);
    wsRows.push(['Código Insumo', 'Descripción Completa', 'Unidad Medida', 'Stock Mínimo Requerido', 'Existencia Real Física', 'Estado de Empaque / Conservación']);
    (data.filas || []).forEach((f: any) => {
      wsRows.push([f.codigoInsmo, f.descripcion, f.medida, f.stockMinimo, f.existenciaReal, f.estadoEmpaque]);
    });

  } else if (tipo === 'control_uniformes') {
    wsRows.push(['I. INFORMACIÓN DE DOTACIONES']);
    wsRows.push(['Fecha Reporte:', data.fecha]);
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
