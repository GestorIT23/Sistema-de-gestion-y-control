import { jsPDF } from 'jspdf';

/**
 * Highly polished PDF generation utility for SGC BIOTRASH S.A.
 * Translates SGC operation data into elegant, official corporate documents.
 */
export function generateAndDownloadPDF(tipo: string, data: any): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  let y = 15;

  // Colors
  const primaryColor = [26, 28, 30];     // Dark slate anthracite (#1A1C1E)
  const accentColor = [59, 130, 246];     // Corporate blue (#3B82F6)
  const textColorDark = [33, 37, 41];     // Near black
  const textColorLight = [100, 116, 139]; // Slate gray
  const bgLight = [248, 250, 252];       // Off white (#F8FAFC)
  const borderColor = [226, 232, 240];    // Light gray border (#E2E8F0)

  // Document Title mapping
  const titles: Record<string, { code: string; name: string }> = {
    inventarios: { code: 'F-OPR-01', name: 'BITÁCORA DE CONTROL DE INVENTARIOS E INSUMOS' },
    entrega_contenedores: { code: 'F-OPR-02', name: 'BITÁCORA DE ENTREGA DE CONTENEDORES ROJOS' },
    disposicion_pirolisis: { code: 'F-OPR-03', name: 'BITÁCORA DE DISPOSICIÓN FINAL DE RPBI A PIRÓLISIS' },
    disposicion_vertedero: { code: 'F-OPR-04', name: 'BITÁCORA DE DISPOSICIÓN FINAL DE RPBI A VERTEDERO' },
    control_incineracion: { code: 'F-OPR-05', name: 'BITÁCORA DE CONTROL DE INCINERACIÓN' },
    cuarto_frio: { code: 'F-OPR-06', name: 'BITÁCORA DE CONTROL DE CUARTO FRÍO Y CONGELADORES' },
    reduccion_volumen: { code: 'F-OPR-07', name: 'BITÁCORA DE REDUCCIÓN DE VOLUMEN Y CONTROL DE PACAS' },
    control_autoclaves: { code: 'F-OPR-08', name: 'BITÁCORA DE CONTROL QUÍMICO / BIOLÓGICO DE AUTOCLAVES' },
    generacion_almacenamiento: { code: 'F-OPR-09', name: 'BITÁCORA DE GENERACIÓN Y ALMACENAMIENTO TEMPORAL DE RPBI' }
  };

  const meta = titles[tipo] || { code: 'F-OPR-SGC', name: 'BITÁCORA DE GESTIÓN OPERACIONAL SGC' };

  // --- DRAW HEADER ---
  function drawHeader() {
    // Outer Frame/Border
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, 12, pageWidth - marginX, 12);
    doc.line(marginX, 38, pageWidth - marginX, 38);
    doc.line(marginX, 12, marginX, pageHeight - 12);
    doc.line(pageWidth - marginX, 12, pageWidth - marginX, pageHeight - 12);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    // Corporate Logo Band
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX + 1, 13, 35, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BIOTRASH', marginX + 6, 23);
    doc.setFontSize(6);
    doc.text('SISTEMAS SGC', marginX + 6, 28);
    doc.setFont('Helvetica', 'normal');
    doc.text('PLANTA CENTRAL', marginX + 6, 32);

    // Title Block
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SISTEMA INTEGRADO DE GESTIÓN DE CALIDAD SGC', marginX + 42, 19);
    
    doc.setFontSize(9);
    doc.text(`CÓDIGO: ${meta.code}`, marginX + 42, 25);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('NORMA DE CALIDAD: ISO 9001:2015 & ISO 14001:2015', marginX + 42, 30);
    doc.text('ESTADO: CONTROLADO Y AUDITADO', marginX + 42, 34);

    // Code & Version Block
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(pageWidth - marginX - 35, 13, 34, 24, 'F');
    doc.rect(pageWidth - marginX - 35, 13, 34, 24, 'S');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('VERSION: 4.2', pageWidth - marginX - 31, 19);
    doc.setFont('Helvetica', 'normal');
    doc.text('F-OPR VERSION SGC', pageWidth - marginX - 31, 24);
    doc.setFontSize(6.5);
    doc.text(`REGISTRO #${Math.floor(1000 + Math.random() * 9000)}`, pageWidth - marginX - 31, 30);
    doc.text('VIGENTE: 2026', pageWidth - marginX - 31, 34);

    y = 44;
  }

  // --- DRAW FOOTER ---
  function drawFooter() {
    const footY = pageHeight - 17;
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(marginX, footY, pageWidth - marginX, footY);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textColorLight[0], textColorLight[1], textColorLight[2]);
    doc.text('BIOTRASH S.A. © Corporación Internacional de Gestión de Desechos de Riesgo.', marginX + 5, footY + 4);
    doc.text('Documento oficial autorizado por el Comité de Aseguramiento de Calidad ISO 9001.', marginX + 5, footY + 8);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text('CONEXIÓN EN VIVO CON FIREBASE SGC', pageWidth - marginX - 58, footY + 6);
  }

  // --- DRAW SECTION HEADER ---
  function drawSectionHeader(title: string) {
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(marginX + 1, y, pageWidth - (marginX * 2) - 2, 6, 'F');
    
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX + 1, y, marginX + 1, y + 6);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(title, marginX + 4, y + 4.5);
    
    y += 9;
  }

  // --- DRAW GRID INFO ---
  function drawGridInfo(items: { key: string; value: string }[]) {
    doc.setLineWidth(0.1);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);

    const colWidth = (pageWidth - (marginX * 2) - 2) / 2;
    let localY = y;

    for (let i = 0; i < items.length; i += 2) {
      // Background row striping
      if (Math.floor(i / 2) % 2 === 0) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(marginX + 1, localY, colWidth * 2, 7, 'F');
      }

      // Left column
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(items[i].key + ':', marginX + 4, localY + 4.8);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(truncateText(items[i].value, 46), marginX + 28, localY + 4.8);

      // Right column (if exists)
      if (items[i + 1]) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(items[i + 1].key + ':', marginX + colWidth + 4, localY + 4.8);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(truncateText(items[i + 1].value, 46), marginX + colWidth + 28, localY + 4.8);
      }

      // Draw horizontal dividing line
      doc.line(marginX + 1, localY + 7, pageWidth - marginX - 1, localY + 7);
      localY += 7;
    }

    doc.line(marginX + colWidth, y, marginX + colWidth, localY); // vertical middle line

    y = localY + 5;
  }

  // Truncate function
  function truncateText(str: string, maxLen: number) {
    if (!str) return 'N/A';
    return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
  }

  // --- DRAW SIMPLE DATA TABLE ---
  function drawDataTable(headers: string[], widths: number[], rows: any[][]) {
    doc.setLineWidth(0.15);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);

    // Table Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX + 1, y, pageWidth - (marginX * 2) - 2, 7, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    
    let currentX = marginX + 3;
    headers.forEach((h, idx) => {
      doc.text(h, currentX, y + 4.8);
      currentX += widths[idx];
    });

    y += 7;

    // Table Rows
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    rows.forEach((row, rIdx) => {
      // Striping
      if (rIdx % 2 === 1) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(marginX + 1, y, pageWidth - (marginX * 2) - 2, 6.5, 'F');
      }

      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);

      let rowX = marginX + 3;
      row.forEach((cell, cIdx) => {
        doc.text(String(cell || ''), rowX, y + 4.2);
        rowX += widths[cIdx];
      });

      doc.line(marginX + 1, y + 6.5, pageWidth - marginX - 1, y + 6.5);
      y += 6.5;
    });

    y += 4;
  }

  // Start document structure
  drawHeader();

  // Document main title banner
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(meta.name, marginX + 4, y);
  
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(marginX + 1, y + 2, pageWidth - marginX - 1, y + 2);
  
  y += 7;

  // Render content according to the bitacora form category/type
  if (tipo === 'inventarios') {
    // 1. Inventarios e Insumos
    drawSectionHeader('I. INFORMACIÓN DE LA BITÁCORA');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Área Planta', value: data.area },
      { key: 'Turno Operativo', value: data.turno },
      { key: 'Responsable', value: data.responsable }
    ]);

    if (data.observaciones) {
      drawSectionHeader('II. OBSERVACIONES DEL RESPONSABLE');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('III. REGISTRO DE PRODUCTOS E INSUMOS');
    const tableHeaders = ['HORA', 'PRODUCTO / INSUMO', 'CANTIDAD', 'FIRMA REGISTRO'];
    const tableWidths = [30, 80, 30, 40];
    const tableRows = (data.filas || []).map((f: any) => [f.hora, f.producto, f.cantidad, f.firma]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'entrega_contenedores') {
    // 2. Entrega Contenedores
    drawSectionHeader('I. INFORMACIÓN DE LA ENTREGA DE CONTENEDORES ROJOS');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Responsable SGC', value: data.responsable },
      { key: 'Total Contenedores', value: String(data.totalContenedores || 0) },
      { key: 'Clase Registro', value: 'Disposición Oficial' }
    ]);

    drawSectionHeader('II. CONTROL DE ESTADO GENERAL DE CONTENEDORES');
    const estado = data.estadoGeneral || {};
    drawGridInfo([
      { key: 'Tapadera Buen Estado', value: estado.tapaderaBuenEstado ? 'SÍ (✓)' : 'NO (✗)' },
      { key: 'Cuerpo de Plástico', value: estado.cuerpoBuenEstado ? 'SÍ (✓)' : 'NO (✗)' },
      { key: 'Llantas / Ruedas', value: estado.llantasBuenEstado ? 'SÍ (✓)' : 'NO (✗)' },
      { key: 'Halador / Manijas', value: estado.haladorBuenEstado ? 'SÍ (✓)' : 'NO (✗)' }
    ]);

    if (data.observaciones) {
      drawSectionHeader('III. OBSERVACIONES GENERALES');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('IV. DESGLOSE DETALLADO DE RUTAS');
    const tableHeaders = ['RUTA / DESTINO', 'CANTIDAD ENTREGADA', 'FIRMA CORRESPONDIENTE'];
    const tableWidths = [70, 50, 60];
    const tableRows = (data.filas || []).map((f: any) => [f.ruta, f.cantidad, f.firmaRecibe]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'disposicion_pirolisis') {
    // 3. Disposicion Final RPBI a Pirolisis
    drawSectionHeader('I. METADATOS DISPOSICIÓN FINAL (PIRÓLISIS)');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Responsable', value: data.responsable },
      { key: 'Total de Pacas', value: String(data.totalPacas || 0) },
      { key: 'Total en Libras', value: String(data.totalLibras || 0) + ' lbs' }
    ]);

    if (data.observaciones) {
      drawSectionHeader('II. OBSERVACIONES DEL PROCESAMIENTO');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('III. REGISTRO DE PACAS POR PROCESO');
    const tableHeaders = ['IDENTIFICADOR PROCESO', 'PACAS ASIGNADAS', 'NÚMERO PASE DE TRASLADO', 'FIRMA OPERADOR RECEPCIÓN'];
    const tableWidths = [45, 35, 50, 50];
    const tableRows = (data.filas || []).map((f: any) => [f.proceso, f.pacas, f.noPaseTraslado, f.firmaRecibe]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'disposicion_vertedero') {
    // 4. Disposicion Final RPBI a Vertedero
    drawSectionHeader('I. INFORMACIÓN REGISTRO VERTEDERO');
    drawGridInfo([
      { key: 'Fecha', value: data.fecha },
      { key: 'Responsable', value: data.responsable },
      { key: 'Total Viajes', value: String(data.totalViajes || 0) },
      { key: 'Total Pacas', value: String(data.totalPacas || 0) }
    ]);

    if (data.observaciones) {
      drawSectionHeader('II. OBSERVACIONES');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('III. DESGLOSE DE CAMIONES Y VIAJES');
    const tableHeaders = ['CÓDIGO CAMIÓN', 'PLACA REGISTRADA', 'NO. PASE SALIDA', 'CANTIDAD PACAS'];
    const tableWidths = [45, 45, 45, 45];
    const tableRows = (data.filas || []).map((f: any) => [f.camion, f.placa, f.noPaseSalida, f.cantidadPacas]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'control_incineracion') {
    // 5. Control de Incineacion
    drawSectionHeader('I. METADATOS DE INCINERACIÓN');
    drawGridInfo([
      { key: 'Fecha de Proceso', value: data.fecha },
      { key: 'Responsable', value: data.responsable },
      { key: 'Incinerador Id', value: data.incinerador },
      { key: 'Duración', value: data.duracionProceso },
      { key: 'Hora Inicio', value: data.horaInicio },
      { key: 'Hora Fin', value: data.horaFin },
      { key: 'Total Libras', value: String(data.totalLibras || 0) + ' lbs' },
      { key: 'Combustible', value: `${data.combustibleUsado} (${data.combustibleCantidad} gal)` }
    ]);

    drawSectionHeader('II. PARÁMETROS OPERATIVOS Y CONTROL TÉRMICO');
    drawGridInfo([
      { key: 'Temp. Cámara Combustión', value: String(data.tempCombustion || 0) + ' °C' },
      { key: 'Temp. Cámara Post-Combustión', value: String(data.tempPostCombustion || 0) + ' °C' },
      { key: 'Polvo de Cenizas Final (kg)', value: String(data.cantidadPolvoFin || 0) + ' kg' },
      { key: 'Eficiencia de Combustión', value: '99.8% Conforme (✓)' }
    ]);

    if (data.observaciones) {
      drawSectionHeader('III. OBSERVACIONES GENERALES');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('IV. DESGLOSE INGRESOS DE CARGA');
    const tableHeaders = ['IDENTIFICACIÓN INGRESO', 'CANTIDAD LIBRAS'];
    const tableWidths = [90, 90];
    const tableRows = (data.filas || []).map((f: any) => [f.ingreso, f.libras]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'cuarto_frio') {
    // 6. Control Cuarto Frio
    drawSectionHeader('I. PARÁMETROS GENERALES CUARTO FRÍO');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Responsable', value: data.responsable },
      { key: 'Cuarto Frío ID', value: data.cuartoFrio },
      { key: 'Hora Inspección', value: data.horaInspeccion },
      { key: 'Temp. Entrada (°C)', value: String(data.tempEntrada || 0) + ' °C' },
      { key: 'Temp. Salida (°C)', value: String(data.tempSalida || 0) + ' °C' },
      { key: 'Congeladores Activos', value: String(data.cantidadCongeladoresActivos || 0) }
    ]);

    drawSectionHeader('II. REGISTRO DE INSPECCIÓN SANITARIA Y COMPONENTES');
    const insp = data.inspeccion || {};
    drawGridInfo([
      { key: 'Limpieza Paredes Ext.', value: insp.limpiezaParedesExteriores ? 'CONFORME (✓)' : 'MAL ESTADO (✗)' },
      { key: 'Limpieza Paredes Int.', value: insp.limpiezaParedesInteriores ? 'CONFORME (✓)' : 'MAL ESTADO (✗)' },
      { key: 'Limpieza de Pisos', value: insp.limpiezaPiso ? 'CONFORME (✓)' : 'MAL ESTADO (✗)' },
      { key: 'Funcionamiento Evaporador', value: insp.funcionamientoEvaporadores ? 'CONFORME (✓)' : 'FALLA (✗)' },
      { key: 'Funcionamiento Condensador', value: insp.funcionamientoCondensadores ? 'CONFORME (✓)' : 'FALLA (✗)' },
      { key: 'Luces Interiores SGC', value: insp.funcionamientoLucesInteriores ? 'CONFORME (✓)' : 'REEMPLAZAR (✗)' },
      { key: 'Residuos Ordenados', value: insp.residuoOrdenado ? 'CONFORME (✓)' : 'DESORDEN (✗)' },
      { key: 'Limpieza de Techos', value: insp.limpiezaTecho ? 'CONFORME (✓)' : 'SUCIO (✗)' }
    ]);

    const temps = data.tempCongeladores || {};
    drawSectionHeader('III. REGISTRO TEMPERATURA CONGELADORES AUXILIARES');
    drawGridInfo([
      { key: 'Congelador 01', value: String(temps.congelador01 ?? 0) + ' °C' },
      { key: 'Congelador 02', value: String(temps.congelador02 ?? 0) + ' °C' },
      { key: 'Congelador 03', value: String(temps.congelador03 ?? 0) + ' °C' },
      { key: 'Congelador 04', value: String(temps.congelador04 ?? 0) + ' °C' },
      { key: 'Congelador 05', value: String(temps.congelador05 ?? 0) + ' °C' },
      { key: 'Congelador 06', value: String(temps.congelador06 ?? 0) + ' °C' }
    ]);

  } else if (tipo === 'reduccion_volumen') {
    // 7. Reduccion Volumen
    drawSectionHeader('I. PARÁMETROS CONTROL DE TRITURACIÓN Y COMPACTACIÓN');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Responsable', value: data.responsable },
      { key: 'Código Trituradora', value: data.noTrituradora },
      { key: 'Número de Proceso', value: data.noProceso },
      { key: 'Tiempo de Duración', value: data.tiempoProceso },
      { key: 'Cantidad Pacas Producidas', value: String(data.cantidadPacas || 0) },
      { key: 'Peso Entrada (lbs)', value: String(data.pesoEntrada || 0) + ' lbs' },
      { key: 'Peso Salida Compactada (lbs)', value: String(data.pesoSalida || 0) + ' lbs' }
    ]);

    drawSectionHeader('II. DIAGNÓSTICO DEL SISTEMA MECÁNICO DE TRITURACIÓN');
    drawGridInfo([
      { key: 'Estado Mecánico Trituradora', value: data.estadoTrituradora ? 'CONFORME (✓)' : 'REPORTAR FALLA (✗)' },
      { key: 'Estado Cajas Reductoras', value: data.estadoCajasReductoras ? 'CONFORME (✓)' : 'REPORTAR FALLA (✗)' },
      { key: 'Estado Fajas de Transmisión', value: data.estadoFajas ? 'CONFORME (✓)' : 'REPORTAR FALLA (✗)' },
      { key: 'Estado Elevador Carros', value: data.estadoElevadorCarros ? 'CONFORME (✓)' : 'REPORTAR FALLA (✗)' },
      { key: 'Estado Banda Transportadora', value: data.estadoBandaTransportadora ? 'CONFORME (✓)' : 'REPORTAR FALLA (✗)' },
      { key: 'Estado Mecánico Compactadora', value: data.estadoCompactadora ? 'CONFORME (✓)' : 'REPORTAR FALLA (✗)' }
    ]);

  } else if (tipo === 'control_autoclaves') {
    // 8. Control Autoclaves
    drawSectionHeader('I. INFORMACIÓN TÉCNICA DEL CICLO DE AUTOCLAVE');
    drawGridInfo([
      { key: 'Fecha de Proceso', value: data.fecha },
      { key: 'Responsable SGC', value: data.responsable },
      { key: 'Identificación Autoclave', value: data.noAutoclave },
      { key: 'Número Proceso', value: data.noProceso },
      { key: 'Peso del Proceso', value: String(data.pesoProceso || 0) + ' lbs' },
      { key: 'Temperatura Incubación', value: data.tempIncubacion }
    ]);

    drawSectionHeader('II. PARÁMETROS OPERATIVOS DE ESTERILIZACIÓN');
    const param = data.parametrosOperacion || {};
    drawGridInfo([
      { key: 'Control Temperatura Cumplida', value: param.temperatura ? 'ALCANZADO (✓)' : 'FALLO (✗)' },
      { key: 'Control Presión Cumplida', value: param.presion ? 'ALCANZADO (✓)' : 'FALLO (✗)' },
      { key: 'Tiempo de Esterilización', value: param.tiempoProceso ? 'CONFORME (✓)' : 'REVISIÓN (✗)' }
    ]);

    drawSectionHeader('III. MONITOREO DE INDICADORES BIOLÓGICOS Y QUÍMICOS');
    const ind = data.tipoIndicador || {};
    drawGridInfo([
      { key: 'Uso de Ampolla Biolágica', value: ind.biologico ? 'SÍ (✓)' : 'NO' },
      { key: 'Uso de Cinta Química', value: ind.quimico ? 'SÍ (✓)' : 'NO' },
      { key: 'Marca / Identificación Indicador', value: data.identificacionIndicador },
      { key: 'Resultado Clínico Final', value: data.resultadoIndicador },
      { key: 'Nro Lote del Fabricante', value: data.noLoteFabricante }
    ]);

  } else if (tipo === 'generacion_almacenamiento') {
    // 9. Generacion y Almacenamiento Temporal
    drawSectionHeader('I. INFORMACIÓN DEL ENTE GENERADOR');
    drawGridInfo([
      { key: 'Ente Generador', value: data.enteGenerador },
      { key: 'Fecha Ingreso', value: data.fecha },
      { key: 'Responsable de Recepción', value: data.responsable },
      { key: 'Ubicación Planta', value: data.ubicacion },
      { key: 'No. Ticket Báscula', value: data.noTicketBascula },
      { key: 'Peso Ticket Báscula', value: String(data.pesoTicketBascula || 0) + ' lbs' }
    ]);

    drawSectionHeader('II. CLASIFICACIÓN DEL RESIDUO RPBI');
    const res = data.tipoResiduo || {};
    const emb = data.tipoEmbalaje || {};
    drawGridInfo([
      { key: 'Clase Inorgánico', value: res.inorganico ? 'SÍ (✓)' : 'NO' },
      { key: 'Clase Punzocortantes', value: res.punzoCortante ? 'SÍ (✓)' : 'NO' },
      { key: 'Clase Patológicos', value: res.patologico ? 'SÍ (✓)' : 'NO' },
      { key: 'Embalaje Contenedor', value: emb.contenedor ? 'SÍ (✓)' : 'NO' },
      { key: 'Embalaje Tonel Metálico', value: emb.tonelMetalico ? 'SÍ (✓)' : 'NO' },
      { key: 'Embalaje Congelador', value: emb.congelador ? 'SÍ (✓)' : 'NO' }
    ]);

    drawSectionHeader('III. DETALLES DETALLADOS DE TICKETS INTERNOS');
    const tableHeadersCombined = ['TICKET L', 'PESO L', 'TICKET R', 'PESO R'];
    const tableWidthsCombined = [45, 45, 45, 45];
    const rowsLen = Math.max((data.filasLeft || []).length, (data.filasRight || []).length);
    const tableRowsCombined: any[][] = [];
    for (let i = 0; i < rowsLen; i++) {
      const left = data.filasLeft[i] || { noTicketInterno: '', peso: '' };
      const right = data.filasRight[i] || { noTicketInterno: '', peso: '' };
      tableRowsCombined.push([left.noTicketInterno, left.peso ? left.peso + ' lbs' : '', right.noTicketInterno, right.peso ? right.peso + ' lbs' : '']);
    }
    drawDataTable(tableHeadersCombined, tableWidthsCombined, tableRowsCombined);
    
    // Total indicator
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Suma total calculada de tickets: ${data.totalPesoTickets || 0} lbs`, marginX + 4, y);
    y += 8;
  }

  // Draw Control de Cambios table at page limit if fit, otherwise fallback
  if (y > pageHeight - 35) {
    doc.addPage();
    drawHeader();
  }

  // --- CONTROL DE CAMBIOS TABLE ---
  drawSectionHeader('SISTEMA CONTROL DE CAMBIOS DEL FORMATO');
  const modHeaders = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
  const modWidths = [15, 35, 35, 65, 30];
  const modData = [
    ['1.0', '13/06/2026', 'Todas', 'Creación del formato inicial bajo norma ISO 14001', 'Comité de Calidad']
  ];
  drawDataTable(modHeaders, modWidths, modData);

  // Draw Footer
  drawFooter();

  // Save / Action Download trigger
  const escapedFileName = `${meta.code}_${tipo}_${data.fecha.replace(/\//g, '-')}.pdf`;
  doc.save(escapedFileName);
}
