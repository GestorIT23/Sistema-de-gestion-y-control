import { jsPDF } from 'jspdf';

/**
 * Highly polished PDF generation utility for SGI BIOTRASH S.A.
 * Translates SGI operation data into elegant, official corporate documents.
 */
export async function generateAndDownloadPDF(tipo: string, data: any): Promise<void> {
  // Load logo from localStorage if available
  const savedBase64 = typeof window !== 'undefined' ? localStorage.getItem('sgi_logo_base64') || localStorage.getItem('sgc_logo_base64') : null;
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('sgi_logo_url') || localStorage.getItem('sgc_logo_url') : null;
  const logoSource = savedBase64 || savedUrl;

  let logoImage: HTMLImageElement | null = null;
  if (logoSource) {
    try {
      logoImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = logoSource;
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        // Timeout after 2.5 seconds to avoid locking pdf generation if network is slow
        setTimeout(() => reject(new Error('Timeout loading image')), 2500);
      });
    } catch (err) {
      console.warn('Error loading custom SGI logo, falling back to SGI vector logo:', err);
    }
  }

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
    control_horas_cargador: { code: 'F-OPR-000-14', name: 'CONTROL DE HORAS DE TRABAJO - CARGADOR FRONTAL' }
  };

  const meta = titles[tipo] || { code: 'F-OPR-SGI', name: 'BITÁCORA DE GESTIÓN OPERACIONAL SGI' };

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

    // Corporate Logo Band (Custom SGI Graphical Logo matching FormHeader.tsx)
    // Draw white background for logo block
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX + 1, 13, 35, 24, 'F');
    doc.rect(marginX + 1, 13, 35, 24, 'S');

    if (logoImage) {
      // Draw loaded image scaled to fit inside the 33 x 22 box
      try {
        doc.addImage(logoImage, 'PNG', marginX + 2, 14, 33, 22);
      } catch (imgError) {
        console.warn('doc.addImage failed, falling back to SGI vector logo:', imgError);
        drawFallbackVectorLogo(doc, marginX);
      }
    } else {
      drawFallbackVectorLogo(doc, marginX);
    }

    // Title Block
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SISTEMA DE GESTIÓN INTEGRAL SGI', marginX + 42, 19);
    
    doc.setFontSize(9);
    doc.text(`CÓDIGO: ${meta.code}`, marginX + 42, 25);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('NORMA DE CALIDAD: ISO 9001:2015 / ISO 14001:2015', marginX + 42, 30);
    doc.text('ESTADO: CONTROLADO Y AUDITADO', marginX + 42, 34);

    // Code & Version Block
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(pageWidth - marginX - 35, 13, 34, 24, 'F');
    doc.rect(pageWidth - marginX - 35, 13, 34, 24, 'S');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('VERSION: 4.2', pageWidth - marginX - 31, 19);
    doc.setFont('Helvetica', 'normal');
    doc.text('F-OPR VERSION SGI', pageWidth - marginX - 31, 24);
    doc.setFontSize(6.5);
    doc.text(`REGISTRO #${Math.floor(1000 + Math.random() * 9000)}`, pageWidth - marginX - 31, 30);
    doc.text('VIGENTE: 2025', pageWidth - marginX - 31, 34);

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
    doc.text('CONEXIÓN EN VIVO CON FIREBASE SGI', pageWidth - marginX - 58, footY + 6);
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
    const maxKeyWidth = colWidth - 25; // guaranteed 25mm of space for the value text
    let localY = y;

    for (let i = 0; i < items.length; i += 2) {
      // Background row striping
      if (Math.floor(i / 2) % 2 === 0) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(marginX + 1, localY, colWidth * 2, 7, 'F');
      }

      // Left column key
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      
      const keyStrLeft = items[i].key + ':';
      let displayKeyLeft = keyStrLeft;
      if (doc.getTextWidth(keyStrLeft) > maxKeyWidth) {
        let tempKey = items[i].key;
        while (tempKey.length > 5 && doc.getTextWidth(tempKey + '...:') > maxKeyWidth) {
          tempKey = tempKey.slice(0, -1);
        }
        displayKeyLeft = tempKey + '...:';
      }
      doc.text(displayKeyLeft, marginX + 4, localY + 4.8);
      
      // Left column value
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(truncateText(items[i].value, 46), marginX + colWidth - 4, localY + 4.8, { align: 'right' });

      // Right column (if exists)
      if (items[i + 1]) {
        // Right column key
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        
        const keyStrRight = items[i + 1].key + ':';
        let displayKeyRight = keyStrRight;
        if (doc.getTextWidth(keyStrRight) > maxKeyWidth) {
          let tempKey = items[i + 1].key;
          while (tempKey.length > 5 && doc.getTextWidth(tempKey + '...:') > maxKeyWidth) {
            tempKey = tempKey.slice(0, -1);
          }
          displayKeyRight = tempKey + '...:';
        }
        doc.text(displayKeyRight, marginX + colWidth + 4, localY + 4.8);
        
        // Right column value
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(truncateText(items[i + 1].value, 46), marginX + colWidth * 2 - 4, localY + 4.8, { align: 'right' });
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
    // 1. Ingreso de Desechos a Planta
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

    drawSectionHeader('III. REGISTRO DE DESECHOS INGRESADOS');
    const tableHeaders = ['HORA', 'TIPO DE DESECHO', 'CANTIDAD', 'FIRMA REGISTRO'];
    const tableWidths = [30, 80, 30, 40];
    const tableRows = (data.filas || []).map((f: any) => [f.hora, f.producto, f.cantidad, f.firma]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'entrega_contenedores') {
    // 2. Entrega Contenedores
    drawSectionHeader('I. INFORMACIÓN DE LA ENTREGA DE CONTENEDORES ROJOS');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Responsable SGI', value: data.responsable },
      { key: 'Total Contenedores', value: String(data.totalContenedores || 0) },
      { key: 'Clase Registro', value: 'Disposición Oficial' }
    ]);

    drawSectionHeader('II. CONTROL DE ESTADO GENERAL DE CONTENEDORES');
    const estado = data.estadoGeneral || {};
    drawGridInfo([
      { key: 'Tapadera Buen Estado', value: estado.tapaderaBuenEstado ? '(SÍ)' : '(NO)' },
      { key: 'Cuerpo de Plástico', value: estado.cuerpoBuenEstado ? '(SÍ)' : '(NO)' },
      { key: 'Llantas / Ruedas', value: estado.llantasBuenEstado ? '(SÍ)' : '(NO)' },
      { key: 'Halador / Manijas', value: estado.haladorBuenEstado ? '(SÍ)' : '(NO)' }
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
      { key: 'Total Pacas', value: String(data.totalPacas || 0) },
      { key: 'Total Pesaje', value: String(data.totalPesaje || 0) + ' lbs' }
    ]);

    if (data.observaciones) {
      drawSectionHeader('II. OBSERVACIONES');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('III. DESGLOSE DE CAMIONES Y VIAJES');
    const tableHeaders = ['CÓDIGO', 'PLACA', 'NO. PASE', 'H. SALIDA', 'PILOTO / CHOFER', 'PACAS', 'PESO (LBS)'];
    const tableWidths = [24, 24, 24, 24, 40, 24, 30];
    const tableRows = (data.filas || []).map((f: any) => [
      f.camion || '',
      f.placa || '',
      f.noPaseSalida || '',
      f.horaSalida || 'N/R',
      f.nombrePiloto || 'N/R',
      String(f.cantidadPacas || 0),
      f.pesaje !== undefined ? `${f.pesaje} lbs` : '0 lbs'
    ]);
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
      { key: 'Eficiencia de Combustión', value: '(99.8% CONFORME)' }
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
      { key: 'Limpieza Paredes Ext.', value: insp.limpiezaParedesExteriores ? '(CONFORME)' : '(MAL ESTADO)' },
      { key: 'Limpieza Paredes Int.', value: insp.limpiezaParedesInteriores ? '(CONFORME)' : '(MAL ESTADO)' },
      { key: 'Limpieza de Pisos', value: insp.limpiezaPiso ? '(CONFORME)' : '(MAL ESTADO)' },
      { key: 'Funcionamiento Evaporador', value: insp.funcionamientoEvaporadores ? '(CONFORME)' : '(FALLA)' },
      { key: 'Funcionamiento Condensador', value: insp.funcionamientoCondensadores ? '(CONFORME)' : '(FALLA)' },
      { key: 'Luces Interiores SGI', value: insp.funcionamientoLucesInteriores ? '(CONFORME)' : '(REEMPLAZAR)' },
      { key: 'Residuos Ordenados', value: insp.residuoOrdenado ? '(CONFORME)' : '(DESORDEN)' },
      { key: 'Limpieza de Techos', value: insp.limpiezaTecho ? '(CONFORME)' : '(SUCIO)' }
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
      { key: 'Línea Utilizada', value: data.lineaUtilizada || '' },
      { key: 'Hora de Inicio', value: data.horaInicio || '' },
      { key: 'Hora de Finalización', value: data.horaFin || '' },
      { key: 'Tiempo de Duración', value: data.tiempoProceso },
      { key: 'Cantidad Pacas Producidas', value: String(data.cantidadPacas || 0) },
      { key: 'Peso Entrada (lbs)', value: String(data.pesoEntrada || 0) + ' lbs' },
      { key: 'Peso Salida Compactada (lbs)', value: String(data.pesoSalida || 0) + ' lbs' },
      { key: 'Peso Promedio por Paca', value: data.cantidadPacas > 0 ? ((data.pesoSalida || 0) / data.cantidadPacas).toFixed(1) + ' lbs/paca' : '0 lbs/paca' }
    ]);

    drawSectionHeader('II. DIAGNÓSTICO DEL SISTEMA MECÁNICO DE TRITURACIÓN');
    drawGridInfo([
      { key: 'Estado Mecánico Trituradora', value: data.estadoTrituradora ? '(CONFORME)' : '(REPORTAR FALLA)' },
      { key: 'Estado Cajas Reductoras', value: data.estadoCajasReductoras ? '(CONFORME)' : '(REPORTAR FALLA)' },
      { key: 'Estado general de la faja o tornillo', value: data.estadoFajas ? '(CONFORME)' : '(REPORTAR FALLA)' },
      { key: 'Estado Elevador Carros', value: data.estadoElevadorCarros ? '(CONFORME)' : '(REPORTAR FALLA)' },
      { key: 'Estado Mecánico Compactadora', value: data.estadoCompactadora ? '(CONFORME)' : '(REPORTAR FALLA)' }
    ]);

  } else if (tipo === 'control_autoclaves') {
    // 8. Control Autoclaves
    drawSectionHeader('I. INFORMACIÓN TÉCNICA DEL CICLO DE AUTOCLAVE');
    drawGridInfo([
      { key: 'Fecha de Proceso', value: data.fecha },
      { key: 'Responsable SGI', value: data.responsable },
      { key: 'Identificación Autoclave', value: data.noAutoclave },
      { key: 'Número Proceso', value: data.noProceso },
      { key: 'Línea Utilizada', value: data.lineaUtilizada || '' },
      { key: 'Peso del Proceso', value: String(data.pesoProceso || 0) + ' lbs' },
      { key: 'Temperatura Incubación', value: data.tempIncubacion }
    ]);

    drawSectionHeader('II. PARÁMETROS OPERATIVOS DE ESTERILIZACIÓN');
    const param = data.parametrosOperacion || {};
    drawGridInfo([
      { key: 'Control Temperatura Cumplida', value: param.temperatura ? '(ALCANZADO)' : '(FALLO)' },
      { key: 'Control Presión Cumplida', value: param.presion ? '(ALCANZADO)' : '(FALLO)' },
      { key: 'Tiempo de Esterilización', value: param.tiempoProceso ? '(CONFORME)' : '(REVISIÓN)' },
      { key: 'Estado Bomba de Vacío', value: param.bombaVacio === undefined || param.bombaVacio ? '(CORRECTO)' : '(FALLA/ALERTA)' }
    ]);

    drawSectionHeader('III. MONITOREO DE INDICADORES BIOLÓGICOS Y QUÍMICOS');
    const ind = data.tipoIndicador || {};
    drawGridInfo([
      { key: 'Uso de Ampolla Biológica', value: ind.biologico ? '(SÍ)' : '(NO)' },
      { key: 'Uso de Cinta Química', value: ind.quimico ? '(SÍ)' : '(NO)' },
      { key: 'Marca / Identificación Indicador', value: data.identificacionIndicador },
      { key: 'Resultado Clínico Final', value: data.resultadoIndicador },
      { key: 'Nro Lote del Fabricante', value: data.noLoteFabricante },
      { key: 'Color de Cinta Testigo', value: data.cintaTestigoColor === 'verde' ? 'VERDE (PROCESO FALLIDO)' : 'CAFÉ (VIRADO CORRECTO - PROCESO CORRECTO)' }
    ]);

    const isAutoCompliant = param.temperatura && param.presion && param.tiempoProceso && (data.resultadoIndicador || '').includes('NEGATIVO') && data.cintaTestigoColor !== 'verde';

    drawSectionHeader('IV. ESTADO DE APROBACIÓN DEL LOTE');
    drawGridInfo([
      { key: 'Resultado Final del Lote', value: isAutoCompliant ? 'APROBADO PARA LIBERACIÓN (SGI)' : 'RECHAZADO / RETENIDO' },
      { key: 'Dictamen de Aseguramiento', value: isAutoCompliant ? 'Apto para egresar de planta' : 'FALLA DE PARÁMETROS / DETENER SALIDA' }
    ]);

    drawSectionHeader('V. OBSERVACIONES Y FIRMAS DE RESPONSABILIDAD');
    drawGridInfo([
      { key: 'Observaciones de Laboratorio', value: data.observaciones || 'Ninguna' },
      { key: 'Firma Supervisor Técnico', value: data.firmaSupervisor || '' },
      { key: 'Firma Coordinador Procesos', value: data.firmaCoordinador || '' }
    ]);

  } else if (tipo === 'generacion_almacenamiento') {
    // 9. Generacion y Almacenamiento Temporal
    drawSectionHeader('I. INFORMACIÓN DEL ENTE GENERADOR');
    drawGridInfo([
      { key: 'Ente Generador', value: data.enteGenerador },
      { key: 'Fecha Recepción', value: data.fecha },
      { key: 'Responsable de Recepción', value: data.responsable },
      { key: 'Ubicación Planta', value: data.ubicacion },
      { key: 'No. Ticket Báscula', value: data.noTicketBascula },
      { key: 'Peso Ticket Báscula', value: String(data.pesoTicketBascula || 0) + ' lbs' }
    ]);

    drawSectionHeader('II. CLASIFICACIÓN DEL RESIDUO RPBI');
    const res = data.tipoResiduo || {};
    const emb = data.tipoEmbalaje || {};
    drawGridInfo([
      { key: 'Clase Inorgánico', value: res.inorganico ? '(SÍ)' : '(NO)' },
      { key: 'Clase Punzocortantes', value: res.punzoCortante ? '(SÍ)' : '(NO)' },
      { key: 'Clase Patológicos', value: res.patologico ? '(SÍ)' : '(NO)' },
      { key: 'Embalaje Contenedor', value: emb.contenedor ? '(SÍ)' : '(NO)' },
      { key: 'Embalaje Tonel Metálico', value: emb.tonelMetalico ? '(SÍ)' : '(NO)' },
      { key: 'Embalaje Congelador', value: emb.congelador ? '(SÍ)' : '(NO)' }
    ]);

    drawSectionHeader('III. DETALLES DE RECEPCIÓN Y PESAJES');
    const tableHeaders = ['NO. TICKET', 'TIPO RESIDUO', 'EMBALAJE/RECIPIENTE', 'CANT.', 'PESO TOTAL'];
    const tableWidths = [35, 55, 45, 20, 25];
    const tableRows = (data.filasLeft || []).map((f: any) => [
      f.noTicketInterno || 'N/A',
      f.tipoResiduo || 'Inorgánico común',
      f.tipoEmbalaje || 'Bolsa / Ninguno',
      String(f.cantidad || 1),
      String(f.peso || 0) + ' lbs'
    ]);
    drawDataTable(tableHeaders, tableWidths, tableRows);
    
    // Total indicator and deviation in PDF
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`TOTAL COMBINADO (TICKETS): ${data.totalPesoTickets || 0} lbs`, marginX + 4, y);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(`PESO OFICIAL BÁSCULA: ${data.pesoTicketBascula || 0} lbs`, marginX + 110, y);
    y += 5;

    const deviation = Math.abs((data.totalPesoTickets || 0) - (data.pesoTicketBascula || 0));
    const devPct = (data.pesoTicketBascula || 0) > 0 ? (deviation / (data.pesoTicketBascula || 0)) * 100 : 0;
    
    doc.setFont('Helvetica', 'bold');
    if (devPct > 3) {
      doc.setTextColor(185, 28, 28); // red color for high deviation
      doc.text(`DESVIACIÓN DE BÁSCULA: ${devPct.toFixed(2)}% (${deviation.toFixed(1)} lbs) - FUERA DE TOLERANCIA (>3%)`, marginX + 4, y);
    } else {
      doc.setTextColor(4, 120, 87); // emerald color for compliant deviation
      doc.text(`DESVIACIÓN DE BÁSCULA: ${devPct.toFixed(2)}% (${deviation.toFixed(1)} lbs) - DENTRO DE TOLERANCIA (≤3%)`, marginX + 4, y);
    }
    y += 8;
  } else if (tipo === 'lavado_banos') {
    // 10. Lavado de Baños
    drawSectionHeader('I. INFORMACIÓN GENERAL DE SANITIZACIÓN');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Turno Operativo', value: data.turno },
      { key: 'Ubicación General', value: data.ubicacionBanos },
      { key: 'Responsable', value: data.responsable },
      { key: 'Desinfectante', value: data.desinfectanteUsado }
    ]);

    if (data.observaciones) {
      drawSectionHeader('II. NOVEDADES REPORTADAS');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('III. CUMPLIMIENTO DE ACTIVIDADES HIGIÉNICAS');
    const chk = data.checklistBanos || {};
    const ab = data.abastecimientoBanos || {};
    drawGridInfo([
      { key: 'Lavado de Sanitarios', value: chk.lavadoSanitarios ? '(CUMPLIDO)' : '(PENDIENTE)' },
      { key: 'Lavado de Lavamanos', value: chk.lavadoLavamanos ? '(CUMPLIDO)' : '(PENDIENTE)' },
      { key: 'Barrido y Trapeado', value: chk.barridoTrapeado ? '(CUMPLIDO)' : '(PENDIENTE)' },
      { key: 'Limpieza de Espejos', value: chk.limpiezaEspejos ? '(CUMPLIDO)' : '(PENDIENTE)' },
      { key: 'Limpieza de Vidrios', value: chk.limpiezaVidrios ? '(CUMPLIDO)' : '(PENDIENTE)' },
      { key: 'Desinfección Superficies', value: chk.desinfeccionSuperficies ? '(CUMPLIDO)' : '(PENDIENTE)' },
      { key: 'Vaciado Papeleras', value: chk.vaciadoPapeleras ? '(CUMPLIDO)' : '(PENDIENTE)' },
      { key: 'Papel Higiénico Surtido', value: ab.papelHigienico ? '(CON STOCK)' : '(SIN STOCK)' },
      { key: 'Jabón Surtido', value: ab.jabonManos ? '(CON STOCK)' : '(SIN STOCK)' },
      { key: 'Toallas de Papel', value: ab.toallasPapel ? '(CON STOCK)' : '(SIN STOCK)' }
    ]);

  } else if (tipo === 'insumos_quimicos') {
    // 11. Insumos Químicos y Plásticos
    drawSectionHeader('I. INFORMACIÓN DEL AUDITOR DE ALMACÉN');
    drawGridInfo([
      { key: 'Fecha Auditoría', value: data.fecha },
      { key: 'Turno Operativo', value: data.turno },
      { key: 'Auditor SGI', value: data.responsable }
    ]);

    if (data.observaciones) {
      drawSectionHeader('II. OBSERVACIONES DEL INVENTARIO');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('III. STOCK DE INSUMOS DE PLANTA');
    const tableHeaders = ['PRODUCTO / MATERIAL', 'UD', 'STD INIC', 'ENTRADAS', 'SALIDAS', 'STOCK FINAL', 'LOTE'];
    const tableWidths = [60, 15, 20, 20, 20, 22, 23];
    const tableRows = (data.filas || []).map((f: any) => [
      f.producto, f.unidadMedida, String(f.stockInicial), String(f.unidadesRecibidas), String(f.unidadesConsumidas), String(f.stockFinal), f.noLoteProveedor
    ]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'inventarios_sgc') {
    // 12. Inventario SGI
    drawSectionHeader('I. INFORMACIÓN GENERAL DE AUDITORÍA');
    drawGridInfo([
      { key: 'Fecha Auditoría', value: data.fecha },
      { key: 'Área Auditora', value: data.areaFisica },
      { key: 'Auditor Responsable', value: data.responsable }
    ]);

    if (data.observaciones) {
      drawSectionHeader('II. OBSERVACIONES DE LA AUDITORÍA');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('III. EVALUACIÓN DE EXISTENCIAS SGI');
    const tableHeaders = ['SKU', 'DESCRIPCIÓN', 'UNIDAD', 'STOCK MÍN', 'EXISTENCIA REAL', 'ESTADO', 'ALERTA RECORTE'];
    const tableWidths = [22, 53, 17, 20, 25, 20, 23];
    const tableRows = (data.filas || []).map((f: any) => [
      f.codigoInsmo, f.descripcion, f.medida, String(f.stockMinimo), String(f.existenciaReal), f.estadoEmpaque, f.existenciaReal < f.stockMinimo ? 'BAJO REQUERIDO' : 'SUFICIENTE'
    ]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'control_uniformes') {
    // 13. Control de Uniformes
    drawSectionHeader('I. INFORMACIÓN DE REGISTRO');
    drawGridInfo([
      { key: 'Fecha Inspección', value: data.fecha },
      { key: 'Inspector EPP / Coordinador', value: data.responsableEntrega }
    ]);

    if (data.observaciones) {
      drawSectionHeader('II. ACUERDOS DE HIGIENE Y PROTECCIÓN');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('III. AUDITORÍA DE UNIFORMES Y EPP');
    const tableHeaders = ['COLABORADOR', 'PUESTO', 'UNIFORME OK', 'BOTAS OK', 'LIMPIO', 'ESTADO GRAL', 'OBSERVACIONES / FIRMA'];
    const tableWidths = [45, 30, 20, 18, 15, 20, 32];
    const tableRows = (data.filas || []).map((f: any) => [
      f.colaborador,
      f.puesto || 'N/A',
      f.usaUniformeCompleto ? '(SÍ)' : '(NO)',
      f.usaBotasSeguridad ? '(SÍ)' : '(NO)',
      f.cumpleLimpieza ? '(SÍ)' : '(NO)',
      `(${f.estadoGeneralConforme || 'CONFORME'})`,
      f.observacionAuditoria || 'Sin observaciones'
    ]);
    drawDataTable(tableHeaders, tableWidths, tableRows);
  } else if (tipo === 'control_horas_cargador') {
    // 14. Control de horas del cargador frontal
    drawSectionHeader('I. INFORMACIÓN GENERAL Y OPERADOR');
    drawGridInfo([
      { key: 'Fecha de Turno', value: data.fecha || '' },
      { key: 'Turno', value: data.turno || '' },
      { key: 'No. Reporte', value: data.noReporte || '' },
      { key: 'Nombre Operador', value: data.nombreOperador || '' },
      { key: 'Código Empleado', value: data.codigoEmpleado || '' },
      { key: 'Área Asignada', value: data.areaAsignada || '' },
      { key: 'Supervisor Cargo', value: data.supervisorCargo || '' }
    ]);

    drawSectionHeader('II. DATOS DEL EQUIPO Y COMBUSTIBLE');
    drawGridInfo([
      { key: 'Código de Unidad', value: data.codigoUnidad || '' },
      { key: 'Marca y Modelo', value: data.marcaModelo || '' },
      { key: 'Año de Fabricación', value: data.anio || '' },
      { key: 'Nivel Combustible Inicial', value: data.nivelCombustibleInicio || '' },
      { key: 'Litros Combustible Cargados', value: `${data.litrosCargados || 0} L` },
      { key: 'Nivel Combustible Final', value: data.nivelCombustibleFinal || '' }
    ]);

    drawSectionHeader('III. REGISTRO DE HORÓMETRO Y ACTIVIDAD');
    drawGridInfo([
      { key: 'Horómetro Inicial', value: `${data.lecturaInicialHorometro || 0} hrs` },
      { key: 'Horómetro Final', value: `${data.lecturaFinalHorometro || 0} hrs` },
      { key: 'Total Operado (Calculado)', value: `${data.totalOperadoHoras || 0} hrs` },
      { key: 'Hora de Inicio', value: data.horaInicio || '' },
      { key: 'Hora de Término', value: data.horaTermino || '' },
      { key: 'Pausas / Inactividad', value: `${data.horasPausaInactividad || 0} hrs` },
      { key: 'Actividad Principal', value: data.tipoActividadPrincipal || '' },
      { key: 'Material Trabajado', value: data.tipoMaterialTrabajado || '' }
    ]);

    if (data.descripcionActividades) {
      drawSectionHeader('IV. DESCRIPCIÓN DE ACTIVIDADES');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(data.descripcionActividades, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader('V. CHECKLIST DE INSPECCIÓN PRE-OPERACIONAL (10 PUNTOS)');
    const chk = data.checklistPrevia || {};
    const tableHeaders = ['COMPONENTE INSPECCIONADO', 'ESTADO (CONFORME?)', 'COMPONENTE INSPECCIONADO', 'ESTADO (CONFORME?)'];
    const tableWidths = [60, 30, 60, 30];
    const tableRows = [
      ['Nivel de aceite motor', chk.nivelAceiteMotor ? '(CONFORME)' : '(REQUIERE REVISIÓN)', 'Frenos de servicio y de mano', chk.frenos ? '(CONFORME)' : '(REQUIERE REVISIÓN)'],
      ['Nivel de refrigerante', chk.nivelRefrigerante ? '(CONFORME)' : '(REQUIERE REVISIÓN)', 'Cinturón de seguridad', chk.cinturonSeguridad ? '(CONFORME)' : '(REQUIERE REVISIÓN)'],
      ['Presión de llantas', chk.presionLlantas ? '(CONFORME)' : '(REQUIERE REVISIÓN)', 'Bocina y alarma de reversa', chk.bocinaAlarmaReversa ? '(CONFORME)' : '(REQUIERE REVISIÓN)'],
      ['Estado de la cuchara/balde', chk.estadoCucharaBalde ? '(CONFORME)' : '(REQUIERE REVISIÓN)', 'Extintor a bordo (vigencia)', chk.extintorAbordo ? '(CONFORME)' : '(REQUIERE REVISIÓN)'],
      ['Luces y señales direccionales', chk.lucesSenales ? '(CONFORME)' : '(REQUIERE REVISIÓN)', 'Documentos y tarjeta de equipo', chk.documentosEquipo ? '(CONFORME)' : '(REQUIERE REVISIÓN)']
    ];
    drawDataTable(tableHeaders, tableWidths, tableRows);

    drawSectionHeader('VI. DIAGNÓSTICO OPERACIONAL Y VALIDACIONES SGI');
    drawGridInfo([
      { key: 'Estado Operativo General', value: data.estadoEquipo || '' },
      { key: 'Observaciones de Fallas', value: data.descripcionFallasObservaciones || 'Ninguna' },
      { key: 'Firma Operador de Turno', value: data.firmaOperador || '' },
      { key: 'Firma Supervisor de Planta', value: data.firmaSupervisor || '' }
    ]);
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
    ['1.0', '13/06/2025', 'Todas', 'Creación del formato inicial bajo norma ISO 14001 y 9001', 'Comité de Calidad']
  ];
  drawDataTable(modHeaders, modWidths, modData);

  // Draw Footer
  drawFooter();

  // Save / Action Download trigger
  const escapedFileName = `${meta.code}_${tipo}_${data.fecha.replace(/\//g, '-')}.pdf`;
  doc.save(escapedFileName);
}

function drawFallbackVectorLogo(doc: any, marginX: number): void {
  // Draw the blue square (represented in SGI logo)
  doc.setFillColor(59, 130, 246); // #3B82F6
  doc.roundedRect(marginX + 12.5, 14.0, 10, 10, 1.2, 1.2, 'F');

  // Draw "BIO" in white inside the blue square
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.text('BIO', marginX + 14.5, 21.0);

  // Draw "BIOTRASH" below it
  doc.setTextColor(30, 41, 59); // Charcoal #1E293B
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('BIOTRASH', marginX + 11.0, 27.5);

  doc.setTextColor(59, 130, 246); // Blue #3B82F6
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(3.3);
  doc.text('SISTEMA DE GESTIÓN INTEGRAL SGI', marginX + 3.0, 31.0);

  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(3.0);
  doc.text('ISO 9001:2015 / ISO 14001:2015', marginX + 4.5, 34.5);
}
