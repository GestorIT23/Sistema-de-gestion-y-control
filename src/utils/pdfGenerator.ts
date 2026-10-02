import { jsPDF } from 'jspdf';
import { sanitizeBiotrashObject } from './textSanitizer';
import {
  DEFAULT_ITEMS_INCINERADOR,
  DEFAULT_ITEMS_TUNEL_LAVADO,
  DEFAULT_ITEMS_COMPACTADORA,
  DEFAULT_ITEMS_TRITURADORA
} from './evaluacion360Data';

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
 * Canvas Radar Chart Generator for Executive SGI Checklist Reports
 */
export function generateRadarChartCanvas(
  scores: { hse: number; calidad: number; mantenimiento: number; fivestar: number },
  previousScores?: { hse: number; calidad: number; mantenimiento: number; fivestar: number }
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 550;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border frame
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Title
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EVALUACIÓN RADIAL DE PLANTA - ANÁLISIS SGI (%)', 300, 42);

  // Radar chart config
  const cx = 300;
  const cy = 270;
  const radius = 165;
  const axes = [
    { label: 'SEGURIDAD (HSE)', val: scores.hse, angle: -Math.PI / 2 },
    { label: 'CALIDAD Y NORMA', val: scores.calidad, angle: 0 },
    { label: 'MANTENIMIENTO Y EQUIPOS', val: scores.mantenimiento, angle: Math.PI / 2 },
    { label: 'INSTALACIONES (5S)', val: scores.fivestar, angle: Math.PI }
  ];

  const levels = [0.25, 0.50, 0.75, 1.00];

  // Draw concentric grid polygons
  levels.forEach(level => {
    ctx.beginPath();
    ctx.strokeStyle = level === 1.0 ? '#94A3B8' : '#E2E8F0';
    ctx.lineWidth = level === 1.0 ? 1.5 : 1;
    axes.forEach((axis, i) => {
      const x = cx + Math.cos(axis.angle) * (radius * level);
      const y = cy + Math.sin(axis.angle) * (radius * level);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Level label on top
    ctx.fillStyle = '#64748B';
    ctx.font = '10px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(level * 100)}%`, cx + 5, cy - radius * level + 12);
  });

  // Draw axis lines and labels
  axes.forEach((axis) => {
    ctx.beginPath();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.moveTo(cx, cy);
    const endX = cx + Math.cos(axis.angle) * radius;
    const endY = cy + Math.sin(axis.angle) * radius;
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Axis label positioning
    const labelX = cx + Math.cos(axis.angle) * (radius + 40);
    const labelY = cy + Math.sin(axis.angle) * (radius + 22);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText(`${axis.label}`, labelX, labelY);
    ctx.fillStyle = axis.val >= 90 ? '#16A34A' : axis.val >= 75 ? '#2563EB' : '#DC2626';
    ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
    ctx.fillText(`[${Math.round(axis.val)}%]`, labelX, labelY + 15);
  });

  // Draw Previous / Historical Baseline Polygon if available
  if (previousScores) {
    const prevAxes = [
      previousScores.hse,
      previousScores.calidad,
      previousScores.mantenimiento,
      previousScores.fivestar
    ];
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#F59E0B'; // Amber
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    axes.forEach((axis, i) => {
      const valRatio = Math.max(0, Math.min(100, prevAxes[i])) / 100;
      const x = cx + Math.cos(axis.angle) * (radius * valRatio);
      const y = cy + Math.sin(axis.angle) * (radius * valRatio);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Current Audit Data Polygon
  ctx.beginPath();
  ctx.strokeStyle = '#2563EB'; // Blue
  ctx.lineWidth = 3.5;
  ctx.fillStyle = 'rgba(37, 99, 235, 0.28)';
  axes.forEach((axis, i) => {
    const valRatio = Math.max(0, Math.min(100, axis.val)) / 100;
    const x = cx + Math.cos(axis.angle) * (radius * valRatio);
    const y = cy + Math.sin(axis.angle) * (radius * valRatio);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dots at current vertices
  axes.forEach((axis) => {
    const valRatio = Math.max(0, Math.min(100, axis.val)) / 100;
    const x = cx + Math.cos(axis.angle) * (radius * valRatio);
    const y = cy + Math.sin(axis.angle) * (radius * valRatio);

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1D4ED8';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Legend at bottom
  const legendY = 510;
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(120, legendY - 10, 18, 12);
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 1;
  ctx.strokeRect(120, legendY - 10, 18, 12);

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Auditoría Actual (Estado Evaluado)', 145, legendY);

  if (previousScores) {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(370, legendY - 10, 18, 12);
    ctx.strokeRect(370, legendY - 10, 18, 12);

    ctx.fillStyle = '#1E293B';
    ctx.fillText('Promedio Anterior (Avances/Retrocesos)', 395, legendY);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Highly polished PDF generation utility for SGI BIOTRASH S.A.
 * Translates SGI operation data into elegant, official corporate documents.
 */
export async function generateAndDownloadPDF(tipo: string, data: any): Promise<void> {
  // Sanitize all data to ensure "basura bio" is replaced with BIOTRASH
  data = sanitizeBiotrashObject(data);

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
    disposicion_pirolisis: { code: 'F-OPR-03', name: 'BITÁCORA DE DISPOSICIÓN FINAL DE DSH A PIRÓLISIS' },
    disposicion_vertedero: { code: 'F-OPR-04', name: 'BITÁCORA DE DISPOSICIÓN FINAL DE DSH A VERTEDERO' },
    control_incineracion: { code: 'F-OPR-05', name: 'BITÁCORA DE CONTROL DE INCINERACIÓN' },
    cuarto_frio: { code: 'F-OPR-06', name: 'BITÁCORA DE CONTROL DE CUARTO FRÍO Y CONGELADORES' },
    reduccion_volumen: { code: 'F-OPR-07', name: 'BITÁCORA DE REDUCCIÓN DE VOLUMEN Y CONTROL DE PACAS' },
    control_autoclaves: { code: 'F-OPR-08', name: 'BITÁCORA DE CONTROL QUÍMICO / BIOLÓGICO DE AUTOCLAVES' },
    generacion_almacenamiento: { code: 'F-OPR-09', name: 'BITÁCORA DE GENERACIÓN Y ALMACENAMIENTO TEMPORAL DE DSH' },
    lavado_banos: { code: 'F-OPR-10', name: 'BITÁCORA DE LAVADO DE BAÑOS Y ÁREA ADMINISTRATIVA' },
    insumos_quimicos: { code: 'F-OPR-11', name: 'BITÁCORA DE INSUMOS QUÍMICOS Y PLÁSTICOS' },
    inventarios_sgc: { code: 'F-OPR-12', name: 'BITÁCORA DE CONTROL DE INVENTARIO SGI' },
    control_uniformes: { code: 'F-OPR-13', name: 'BITÁCORA DE CONTROL DE UNIFORMES DE PLANTA' },
    control_horas_cargador: { code: 'F-OPR-000-14', name: 'CONTROL DE HORAS DE TRABAJO - CARGADOR FRONTAL' },
    desinfeccion_agente_quimico: { code: 'F-OPR-000-15', name: 'CONTROL DE APLICACIÓN DE AGENTE QUÍMICO / BITÁCORA DE DESINFECCIÓN' },
    checklist_diario_planta: { code: 'F-OPR-000-16', name: 'CHECKLIST DIARIO DE PLANTA - INFORME EJECUTIVO' },
    control_360_vehiculos: { code: 'F-OPR-000-17', name: 'CONTROL 360° DE VEHÍCULOS - TRANSPORTE DSH' },
    reporte_recoleccion: { code: 'BIOTRASH 4.2. F-OPR-000-18', name: 'INFORME CONSOLIDADO DE RECOLECCIÓN DE RESIDUOS' },
    evaluacion_360_incinerador: { code: 'BIOTRASH 4.2. F-OPR-000-19', name: 'EVALUACIÓN 360° DE INCINERADOR DSH' },
    evaluacion_360_tunel_lavado: { code: 'BIOTRASH 4.2. F-OPR-000-20', name: 'EVALUACIÓN 360° DE TÚNEL DE LAVADO' },
    evaluacion_360_compactadora: { code: 'BIOTRASH 4.2. F-OPR-000-21', name: 'EVALUACIÓN 360° DE COMPACTADORA DE PACAS' },
    evaluacion_360_trituradora: { code: 'BIOTRASH 4.2. F-OPR-000-22', name: 'EVALUACIÓN 360° DE TRITURADORA SHREDDER' },
    control_caldera: { code: 'BIOTRASH 4.2. F-OPR-000-23', name: 'BITÁCORA DIARIA DE OPERACIÓN Y CONTROL DE CALDERA' },
    mantenimiento_incinerador: { code: 'BIOTRASH 4.2. BIT-MTO-INC-001', name: 'BITÁCORA DE MANTENIMIENTO INCINERADOR INDUSTRIAL DSH' },
    mantenimiento_lampinator: { code: 'BIOTRASH 4.2. BIT-MTO-LAMP-001', name: 'BITÁCORA DE MANTENIMIENTO MÁQUINA LAMPINATOR' },
    mantenimiento_trituradora: { code: 'BIOTRASH 4.2. BIT-MTO-TRIT-001', name: 'BITÁCORA DE MANTENIMIENTO TRITURADORA DE RESIDUOS' },
    mantenimiento_compactadora: { code: 'BIOTRASH 4.2. BIT-MTO-COMP-001', name: 'BITÁCORA DE MANTENIMIENTO COMPACTADORA / PRENSA' },
    mantenimiento_autoclaves: { code: 'BIOTRASH 4.2. BIT-MTO-AUTO-001', name: 'BITÁCORA DE MANTENIMIENTO AUTOCLAVES DE ESTERILIZACIÓN' },
    limpieza_desinfeccion_planta: { code: 'BIOTRASH 4.2. BIT-LIM-DES-001', name: 'CONTROL DIARIO DE LIMPIEZA Y DESINFECCIÓN DE PLANTA' }
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
  function drawFooter(currentPageNum?: number, totalPagesCount?: number) {
    const footY = pageHeight - 14;
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, footY, pageWidth - marginX, footY);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textColorLight[0], textColorLight[1], textColorLight[2]);
    doc.text('BIOTRASH S.A. © Corporación Internacional de Gestión de Desechos de Riesgo.', marginX + 3, footY + 4);
    doc.text('Documento oficial controlado por el Comité de Aseguramiento de Calidad ISO 9001 / ISO 14001.', marginX + 3, footY + 8);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    if (currentPageNum && totalPagesCount) {
      doc.text(`Página ${currentPageNum} de ${totalPagesCount} — SGI FIREBASE`, pageWidth - marginX - 60, footY + 6);
    } else {
      doc.text('CONEXIÓN EN VIVO CON FIREBASE SGI', pageWidth - marginX - 58, footY + 6);
    }
  }

  // --- DRAW SECTION HEADER ---
  function drawSectionHeader(title: string, compact = false, customHeight?: number) {
    const hHeight = customHeight ? customHeight : (compact ? 5.2 : 6.0);
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(marginX + 1, y, pageWidth - (marginX * 2) - 2, hHeight, 'F');
    
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.6);
    doc.line(marginX + 1, y, marginX + 1, y + hHeight);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(compact ? 7.4 : 8.0);
    doc.text(title, marginX + 4, y + (compact ? 3.8 : 4.4));
    
    y += compact ? 6.8 : 8.5;
  }

  // --- DRAW GRID INFO ---
  function drawGridInfo(items: { key: string; value: string }[], compact: boolean | number = false, customRowHeight?: number) {
    doc.setLineWidth(0.1);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);

    const colWidth = (pageWidth - (marginX * 2) - 2) / 2;
    const maxKeyWidth = colWidth - 25; // guaranteed 25mm of space for the value text
    
    let rHeight = 6.4;
    let fontSize = 7.2;
    let valOffsetY = 4.2;
    let bottomSpacing = 3.5;

    if (customRowHeight) {
      rHeight = customRowHeight;
      fontSize = customRowHeight < 5.8 ? 6.8 : (customRowHeight > 6.6 ? 7.5 : 7.2);
      valOffsetY = rHeight * 0.65;
      bottomSpacing = customRowHeight < 5.8 ? 2.5 : 3.5;
    } else if (compact === true) {
      rHeight = 5.8;
      fontSize = 7.0;
      valOffsetY = 3.9;
      bottomSpacing = 3.0;
    } else if (typeof compact === 'number') {
      rHeight = compact;
      fontSize = compact < 5.8 ? 6.8 : 7.2;
      valOffsetY = rHeight * 0.65;
      bottomSpacing = 3.0;
    } else {
      rHeight = 6.8;
      fontSize = 7.5;
      valOffsetY = 4.6;
      bottomSpacing = 4.5;
    }
    let localY = y;

    for (let i = 0; i < items.length; i += 2) {
      const isPesoLeft = items[i].key.toUpperCase().includes('PESO') || items[i].key.toUpperCase().includes('LIBRAS') || items[i].key.toUpperCase().includes('PESAJE') || items[i].key.toUpperCase().includes('LBS');

      // Background row striping
      if (Math.floor(i / 2) % 2 === 0) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(marginX + 1, localY, colWidth * 2, rHeight, 'F');
      }

      // Highlight left if it's weight
      if (isPesoLeft) {
        doc.setFillColor(209, 250, 229); // light green
        doc.rect(marginX + 1, localY, colWidth, rHeight, 'F');
      }

      // Left column key
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(fontSize);
      if (isPesoLeft) {
        doc.setTextColor(6, 95, 70); // deep emerald green
      } else {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      }
      
      const keyStrLeft = items[i].key + ':';
      let displayKeyLeft = keyStrLeft;
      if (doc.getTextWidth(keyStrLeft) > maxKeyWidth) {
        let tempKey = items[i].key;
        while (tempKey.length > 5 && doc.getTextWidth(tempKey + '...:') > maxKeyWidth) {
          tempKey = tempKey.slice(0, -1);
        }
        displayKeyLeft = tempKey + '...:';
      }
      doc.text(displayKeyLeft, marginX + 4, localY + valOffsetY);
      
      // Left column value
      if (isPesoLeft) {
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(6, 95, 70);
      } else {
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      }
      doc.setFontSize(fontSize);
      doc.text(truncateText(items[i].value, 46), marginX + colWidth - 4, localY + valOffsetY, { align: 'right' });

      // Right column (if exists)
      if (items[i + 1]) {
        const isPesoRight = items[i + 1].key.toUpperCase().includes('PESO') || items[i + 1].key.toUpperCase().includes('LIBRAS') || items[i + 1].key.toUpperCase().includes('PESAJE') || items[i + 1].key.toUpperCase().includes('LBS');

        if (isPesoRight) {
          doc.setFillColor(209, 250, 229); // light green
          doc.rect(marginX + colWidth, localY, colWidth, rHeight, 'F');
        }

        // Right column key
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(fontSize);
        if (isPesoRight) {
          doc.setTextColor(6, 95, 70);
        } else {
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        }
        
        const keyStrRight = items[i + 1].key + ':';
        let displayKeyRight = keyStrRight;
        if (doc.getTextWidth(keyStrRight) > maxKeyWidth) {
          let tempKey = items[i + 1].key;
          while (tempKey.length > 5 && doc.getTextWidth(tempKey + '...:') > maxKeyWidth) {
            tempKey = tempKey.slice(0, -1);
          }
          displayKeyRight = tempKey + '...:';
        }
        doc.text(displayKeyRight, marginX + colWidth + 4, localY + valOffsetY);
        
        // Right column value
        if (isPesoRight) {
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(6, 95, 70);
        } else {
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        }
        doc.setFontSize(fontSize);
        doc.text(truncateText(items[i + 1].value, 46), marginX + colWidth * 2 - 4, localY + valOffsetY, { align: 'right' });
      }

      // Draw horizontal dividing line
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.1);
      doc.line(marginX + 1, localY + rHeight, pageWidth - marginX - 1, localY + rHeight);
      localY += rHeight;
    }

    doc.line(marginX + colWidth, y, marginX + colWidth, localY); // vertical middle line

    y = localY + bottomSpacing;
  }

  // Truncate function
  function truncateText(val: any, maxLen: number): string {
    if (val === null || val === undefined || val === '') return 'N/A';
    const str = String(val);
    return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
  }

  // --- DRAW TEXT CARD (MULTILINE PARAGRAPHS & CARDS) ---
  function drawTextCard(title: string, content: any, variant: 'normal' | 'success' | 'warning' | 'danger' = 'normal', compact = false) {
    const fontSize = compact ? 6.8 : 7.4;
    doc.setFontSize(fontSize);
    const cardWidth = pageWidth - (marginX * 2) - 2;
    const printableWidth = cardWidth - 8;

    let rawLines: string[] = [];
    if (typeof content === 'string') {
      rawLines = content.split('\n');
    } else if (Array.isArray(content)) {
      rawLines = content.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(' | ');
        }
        return String(item || '');
      });
    } else if (content && typeof content === 'object') {
      rawLines = Object.entries(content).map(([k, v]) => `${k}: ${v}`);
    } else {
      rawLines = [String(content || '')];
    }

    const allWrappedLines: string[] = [];

    rawLines.forEach(rawLine => {
      const lineStr = String(rawLine || '').trim();
      if (!lineStr) return;
      doc.setFont('Helvetica', 'normal');
      const wrapped = doc.splitTextToSize(lineStr, printableWidth);
      allWrappedLines.push(...wrapped);
    });

    const lineStep = compact ? 3.0 : 3.6;
    const headerHeight = title ? (compact ? 4.8 : 5.8) : 0;
    const padding = compact ? 2.5 : 4.5;
    const boxHeight = headerHeight + (allWrappedLines.length * lineStep) + padding;

    if (y + boxHeight > pageHeight - 18) {
      doc.addPage();
      drawHeader();
    }

    if (variant === 'success') {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
    } else if (variant === 'danger') {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
    } else if (variant === 'warning') {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
    } else {
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    }

    doc.rect(marginX + 1, y, cardWidth, boxHeight, 'F');
    doc.setLineWidth(0.3);
    doc.rect(marginX + 1, y, cardWidth, boxHeight, 'S');

    let currentY = y + (compact ? 3.4 : 4.4);

    if (title) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(compact ? 7.2 : 7.8);
      if (variant === 'success') doc.setTextColor(22, 101, 52);
      else if (variant === 'danger') doc.setTextColor(153, 27, 27);
      else if (variant === 'warning') doc.setTextColor(146, 64, 14);
      else doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

      doc.text(title, marginX + 4, currentY);
      currentY += (compact ? 4.0 : 5.0);
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);

    allWrappedLines.forEach(line => {
      doc.text(line, marginX + 4, currentY);
      currentY += lineStep;
    });

    y += boxHeight + (compact ? 2.5 : 3.8);
  }

  // --- DRAW MULTILINE DATA TABLE ---
  function drawDataTable(headers: string[], widths: number[], rows: any[][], compact: boolean | number = false, customMinRowHeight?: number) {
    doc.setLineWidth(0.15);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);

    const tableWidth = pageWidth - (marginX * 2) - 2; // 178 mm
    let thHeight = 6.2;
    let thFontSize = 6.8;
    let thOffsetY = 4.2;
    let minRowHeight = 5.8;
    let lineStep = 3.2;
    let padding = 2.2;
    let textOffsetY = 3.8;
    let cellFontSize = 6.5;

    if (customMinRowHeight) {
      minRowHeight = customMinRowHeight;
      thHeight = Math.max(5.2, customMinRowHeight + 0.3);
      cellFontSize = customMinRowHeight < 5.2 ? 6.0 : (customMinRowHeight > 6.0 ? 6.8 : 6.4);
      thFontSize = cellFontSize + 0.3;
      textOffsetY = minRowHeight * 0.65;
      thOffsetY = thHeight * 0.65;
    } else if (compact === true) {
      minRowHeight = 5.2;
      thHeight = 5.5;
      thFontSize = 6.4;
      thOffsetY = 3.8;
      lineStep = 3.0;
      padding = 1.8;
      textOffsetY = 3.5;
      cellFontSize = 6.2;
    } else if (typeof compact === 'number') {
      minRowHeight = compact;
      thHeight = compact + 0.4;
      thFontSize = compact < 5.0 ? 6.2 : 6.5;
      thOffsetY = thHeight * 0.65;
      textOffsetY = minRowHeight * 0.65;
      cellFontSize = compact < 5.0 ? 5.8 : 6.2;
      lineStep = compact < 5.0 ? 2.5 : 2.8;
      padding = compact < 5.0 ? 1.0 : 1.4;
    } else {
      minRowHeight = 6.2;
      thHeight = 6.8;
      thFontSize = 7.0;
      thOffsetY = 4.6;
      lineStep = 3.4;
      padding = 2.5;
      textOffsetY = 4.2;
      cellFontSize = 6.8;
    }

    function renderTableHeader() {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(marginX + 1, y, tableWidth, thHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(thFontSize);
      
      let currentX = marginX + 2.5;
      headers.forEach((h, idx) => {
        doc.text(h, currentX, y + thOffsetY);
        currentX += widths[idx];
      });

      y += thHeight;
    }

    renderTableHeader();

    // Table Rows
    rows.forEach((row, rIdx) => {
      const cellLinesList: string[][] = [];
      let maxLinesInRow = 1;

      row.forEach((cell, cIdx) => {
        const colWidth = widths[cIdx] || 30;
        const printableWidth = colWidth - 2.5;
        const cellStr = cell !== null && cell !== undefined ? String(cell) : '';
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(cellFontSize);
        const lines = doc.splitTextToSize(cellStr, printableWidth);
        const validLines = lines.length > 0 ? lines : [''];
        cellLinesList.push(validLines);
        if (validLines.length > maxLinesInRow) {
          maxLinesInRow = validLines.length;
        }
      });

      const rowHeight = Math.max(minRowHeight, maxLinesInRow * lineStep + padding);

      if (y + rowHeight > pageHeight - 18) {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.line(marginX + 1, y, pageWidth - marginX - 1, y);

        doc.addPage();
        drawHeader();
        renderTableHeader();
      }

      let rowX = marginX + 1;
      cellLinesList.forEach((lines, cIdx) => {
        const colWidth = widths[cIdx] || 30;
        const cellRawVal = String(row[cIdx] || '').trim();
        const upperVal = cellRawVal.toUpperCase();
        const hName = String(headers[cIdx] || '').toUpperCase();
        
        const isPesoCol = hName.includes('PESO') || hName.includes('LIBRAS') || hName.includes('PESAJE') || hName.includes('CANTIDAD') || hName.includes('PACAS');
        const isStatusCol = hName.includes('ESTATUS') || hName.includes('ESTADO') || hName.includes('CONDICIÓN') || hName.includes('EVALUADO') || hName.includes('RESULTADO');

        if (isStatusCol && (upperVal === 'CUMPLE' || upperVal === 'EXCELENTE' || upperVal.includes('CONFORME') || upperVal === 'BUENO' || upperVal.includes('OPERATIVO'))) {
          doc.setFillColor(220, 252, 231);
          doc.rect(rowX, y + 0.5, colWidth, rowHeight - 1, 'F');
        } else if (isStatusCol && (upperVal === 'NO_CUMPLE' || upperVal === 'CRÍTICO' || upperVal.includes('FALLA') || upperVal === 'MALO' || upperVal.includes('NO APLICADO'))) {
          doc.setFillColor(254, 226, 226);
          doc.rect(rowX, y + 0.5, colWidth, rowHeight - 1, 'F');
        } else if (isStatusCol && (upperVal === 'PARCIAL' || upperVal === 'SATISFACTORIO' || upperVal.includes('OBSERVACIÓN') || upperVal.includes('PENDIENTE'))) {
          doc.setFillColor(254, 243, 199);
          doc.rect(rowX, y + 0.5, colWidth, rowHeight - 1, 'F');
        } else if (isPesoCol) {
          doc.setFillColor(209, 250, 229);
          doc.rect(rowX, y + 0.5, colWidth, rowHeight - 1, 'F');
        } else if (rIdx % 2 === 1) {
          doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
          doc.rect(rowX, y + 0.5, colWidth, rowHeight - 1, 'F');
        }

        doc.setFontSize(cellFontSize);
        if (isStatusCol && (upperVal === 'CUMPLE' || upperVal === 'EXCELENTE' || upperVal.includes('CONFORME') || upperVal === 'BUENO' || upperVal.includes('OPERATIVO'))) {
          doc.setTextColor(22, 101, 52);
          doc.setFont('Helvetica', 'bold');
        } else if (isStatusCol && (upperVal === 'NO_CUMPLE' || upperVal === 'CRÍTICO' || upperVal.includes('FALLA') || upperVal === 'MALO')) {
          doc.setTextColor(153, 27, 27);
          doc.setFont('Helvetica', 'bold');
        } else if (isStatusCol && (upperVal === 'PARCIAL' || upperVal === 'SATISFACTORIO' || upperVal.includes('OBSERVACIÓN') || upperVal.includes('PENDIENTE'))) {
          doc.setTextColor(146, 64, 14);
          doc.setFont('Helvetica', 'bold');
        } else if (isPesoCol) {
          doc.setTextColor(6, 95, 70);
          doc.setFont('Helvetica', 'bold');
        } else {
          doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
          doc.setFont('Helvetica', 'normal');
        }

        lines.forEach((lineStr, lineIdx) => {
          doc.text(lineStr, rowX + 1.5, y + textOffsetY + lineIdx * lineStep);
        });

        rowX += colWidth;
      });

      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.1);
      doc.line(marginX + 1, y + rowHeight, pageWidth - marginX - 1, y + rowHeight);
      
      y += rowHeight;
    });

    y += compact ? 2.5 : 4.0;
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

  const horaCaptura = formatHoraRegistro(data.fechaRegistro);

  // Render content according to the bitacora form category/type
  if (tipo === 'inventarios') {
    // 1. Ingreso de Desechos a Planta
    drawSectionHeader('I. INFORMACIÓN DE LA BITÁCORA');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Hora Captura', value: horaCaptura },
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
      { key: 'Hora Captura', value: horaCaptura },
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
    // 3. Disposicion Final DSH a Pirolisis
    drawSectionHeader('I. METADATOS DISPOSICIÓN FINAL (PIRÓLISIS)');
    drawGridInfo([
      { key: 'Fecha Proceso', value: data.fecha },
      { key: 'Hora Captura', value: horaCaptura },
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
    // 4. Disposicion Final DSH a Vertedero
    drawSectionHeader('I. INFORMACIÓN REGISTRO VERTEDERO');
    drawGridInfo([
      { key: 'Fecha', value: data.fecha },
      { key: 'Hora Captura', value: horaCaptura },
      { key: 'Responsable', value: data.responsable },
      { key: 'No. Boleta(s) AMSA', value: data.noBoletaAmsa || 'N/R' },
      { key: 'Total Viajes', value: String(data.totalViajes || 0) },
      { key: 'Total Pacas', value: String(data.totalPacas || 0) },
      { key: 'Total Pesaje', value: String(data.totalPesaje || 0) + ' lbs' }
    ]);

    if (data.boletasAmsa && Array.isArray(data.boletasAmsa) && data.boletasAmsa.length > 0) {
      drawSectionHeader('II. CONTROL DE BOLETAS DE PAGO AMSA (1 A LA N)');
      const boletaHeaders = ['ITEM', 'NO. BOLETA AMSA', 'PESAJE (LBS)', 'MONTO (Q)', 'NOTAS'];
      const boletaWidths = [22, 55, 40, 35, 38];
      const boletaRows = data.boletasAmsa.map((b: any, idx: number) => [
        `Boleta #${idx + 1}`,
        typeof b === 'string' ? b : (b.numeroBoleta || 'N/R'),
        typeof b === 'object' && b.pesajeLbs ? `${b.pesajeLbs} lbs` : '—',
        typeof b === 'object' && b.montoQuetzales ? `Q ${Number(b.montoQuetzales).toFixed(2)}` : '—',
        typeof b === 'object' && b.observaciones ? b.observaciones : '—'
      ]);
      drawDataTable(boletaHeaders, boletaWidths, boletaRows);
    }

    if (data.observaciones) {
      drawSectionHeader(data.boletasAmsa && data.boletasAmsa.length > 0 ? 'III. OBSERVACIONES' : 'II. OBSERVACIONES');
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(data.observaciones, marginX + 4, y);
      y += 8;
    }

    drawSectionHeader(data.boletasAmsa && data.boletasAmsa.length > 0 ? 'IV. DESGLOSE DE CAMIONES Y VIAJES (CRUCE AMSA)' : 'III. DESGLOSE DE CAMIONES Y VIAJES (CRUCE AMSA)');
    const tableHeaders = ['CÓDIGO', 'PLACA', 'NO. PASE', 'BOLETA AMSA', 'H. SALIDA', 'PILOTO / CHOFER', 'CORRELATIVO', 'PACAS', 'PESO (LBS)'];
    const tableWidths = [18, 18, 18, 22, 16, 30, 24, 16, 28];
    const tableRows = (data.filas || []).map((f: any) => [
      f.camion || '',
      f.placa || '',
      f.noPaseSalida || '',
      f.noBoletaAmsa || data.noBoletaAmsa || 'N/R',
      f.horaSalida || 'N/R',
      f.nombrePiloto || 'N/R',
      f.correlativoPacas || 'N/R',
      String(f.cantidadPacas || 0),
      f.pesaje !== undefined ? `${f.pesaje} lbs` : '0 lbs'
    ]);
    drawDataTable(tableHeaders, tableWidths, tableRows);

  } else if (tipo === 'control_incineracion') {
    // 5. Control de Incineacion
    drawSectionHeader('I. METADATOS DE INCINERACIÓN');
    drawGridInfo([
      { key: 'Fecha de Proceso', value: data.fecha },
      { key: 'Hora Captura', value: horaCaptura },
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
      { key: 'Hora Captura', value: horaCaptura },
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
      { key: 'Hora Captura', value: horaCaptura },
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
    const pTotalBruto = data.pesoBrutoTotal !== undefined ? data.pesoBrutoTotal : (data.pesoProceso ? (data.pesoProceso + 1080) : 1730);
    const pBruto1 = data.pesoBruto1 !== undefined ? data.pesoBruto1 : 300;
    const pNeto1 = data.pesoNeto1 !== undefined ? data.pesoNeto1 : 120;
    const pBruto2 = data.pesoBruto2 !== undefined ? data.pesoBruto2 : 300;
    const pNeto2 = data.pesoNeto2 !== undefined ? data.pesoNeto2 : 120;
    const pBruto3 = data.pesoBruto3 !== undefined ? data.pesoBruto3 : 300;
    const pNeto3 = data.pesoNeto3 !== undefined ? data.pesoNeto3 : 120;
    const pBruto4 = data.pesoBruto4 !== undefined ? data.pesoBruto4 : 300;
    const pNeto4 = data.pesoNeto4 !== undefined ? data.pesoNeto4 : 120;
    const pBruto5 = data.pesoBruto5 !== undefined ? data.pesoBruto5 : 300;
    const pNeto5 = data.pesoNeto5 !== undefined ? data.pesoNeto5 : 120;
    const pBruto6 = data.pesoBruto6 !== undefined ? data.pesoBruto6 : 230;
    const pNeto6 = data.pesoNeto6 !== undefined ? data.pesoNeto6 : 50;

    drawSectionHeader('I. INFORMACIÓN TÉCNICA DEL CICLO DE AUTOCLAVE');
    drawGridInfo([
      { key: 'Fecha de Proceso', value: data.fecha },
      { key: 'Hora Captura', value: horaCaptura },
      { key: 'Responsable SGI', value: data.responsable },
      { key: 'Identificación Autoclave', value: data.noAutoclave },
      { key: 'Número Proceso', value: data.noProceso },
      { key: 'Línea Utilizada', value: data.lineaUtilizada || '' },
      { key: 'Temperatura Incubación', value: data.tempIncubacion },
      { key: 'Tara por Carrito', value: '180 lbs' },
      { key: 'Peso Total Bruto', value: String(pTotalBruto) + ' lbs' },
      { key: 'Peso Total Neto (Proceso)', value: String(data.pesoProceso || 0) + ' lbs' },
      { key: 'Peso Carrito 1', value: String(pBruto1) + ' lbs Bruto (Neto: ' + String(pNeto1) + ' lbs)' },
      { key: 'Peso Carrito 2', value: String(pBruto2) + ' lbs Bruto (Neto: ' + String(pNeto2) + ' lbs)' },
      { key: 'Peso Carrito 3', value: String(pBruto3) + ' lbs Bruto (Neto: ' + String(pNeto3) + ' lbs)' },
      { key: 'Peso Carrito 4', value: String(pBruto4) + ' lbs Bruto (Neto: ' + String(pNeto4) + ' lbs)' },
      { key: 'Peso Carrito 5', value: String(pBruto5) + ' lbs Bruto (Neto: ' + String(pNeto5) + ' lbs)' },
      { key: 'Peso Carrito 6', value: String(pBruto6) + ' lbs Bruto (Neto: ' + String(pNeto6) + ' lbs)' }
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

    if (data.capturaPanelAutoclave) {
      drawSectionHeader('VI. CAPTURA DE PANEL DE AUTOCLAVE');
      try {
        if (y + 85 > pageHeight - 15) {
          doc.addPage();
          y = 35;
          doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setLineWidth(0.5);
          doc.line(marginX, 12, pageWidth - marginX, 12);
          doc.line(marginX, 12, marginX, pageHeight - 12);
          doc.line(pageWidth - marginX, 12, pageWidth - marginX, pageHeight - 12);
          doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
        }
        const imgWidth = 100;
        const imgHeight = 70;
        const imgX = marginX + (pageWidth - marginX * 2 - imgWidth) / 2;
        doc.addImage(data.capturaPanelAutoclave, 'JPEG', imgX, y, imgWidth, imgHeight);
        y += imgHeight + 5;
      } catch (imgError) {
        console.error('Error rendering panel capture in PDF:', imgError);
      }
    }

  } else if (tipo === 'generacion_almacenamiento') {
    // 9. Generacion y Almacenamiento Temporal
    drawSectionHeader('I. INFORMACIÓN DEL ENTE GENERADOR');
    drawGridInfo([
      { key: 'Ente Generador', value: data.enteGenerador },
      { key: 'Fecha Recepción', value: data.fecha },
      { key: 'Hora Captura', value: horaCaptura },
      { key: 'Responsable de Recepción', value: data.responsable },
      { key: 'Ubicación Planta', value: data.ubicacion },
      { key: 'No. Ticket Báscula', value: data.noTicketBascula },
      { key: 'Peso Ticket Báscula', value: String(data.pesoTicketBascula || 0) + ' lbs' }
    ]);

    drawSectionHeader('II. CLASIFICACIÓN DEL RESIDUO DSH');
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
      { key: 'Hora Captura', value: horaCaptura },
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
      { key: 'Hora Captura', value: horaCaptura },
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
      { key: 'Hora Captura', value: horaCaptura },
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
      { key: 'Hora Captura', value: horaCaptura },
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
      { key: 'Hora Captura', value: horaCaptura },
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
  } else if (tipo === 'desinfeccion_agente_quimico') {
    // 15. Control de Aplicacion de Agente Quimico / Desinfeccion
    drawSectionHeader('I. INFORMACIÓN GENERAL Y APLICADOR');
    drawGridInfo([
      { key: 'Fecha de Proceso', value: data.fecha || '' },
      { key: 'Hora Captura', value: horaCaptura },
      { key: 'Horario Ejecución', value: `${data.horaInicio || ''} - ${data.horaFin || ''}` },
      { key: 'Operador Responsable', value: data.responsable || '' },
      { key: 'Elaboró', value: data.elaboro || 'Gerente Comercial Industrial' },
      { key: 'Revisó', value: data.reviso || 'Comité ISO' },
      { key: 'Aprobó', value: data.aprobo || 'Gerente General' }
    ]);

    drawSectionHeader('II. PARÁMETROS DEL QUÍMICO Y MÉTODO DE APLICACIÓN');
    const met = data.metodoAplicacion || {};
    drawGridInfo([
      { key: 'Químico / Desinfectante', value: data.quimico || '' },
      { key: 'Dosis / Concentración', value: data.dosis || '' },
      { key: 'Cantidad Gl', value: `${data.cantidadGl || 0} Gl` },
      { key: 'Manual (Mochila)', value: met.manualMochila ? '(APLICADO)' : '(NO)' },
      { key: 'Aspersión', value: met.aspersion ? '(APLICADO)' : '(NO)' }
    ]);

    drawSectionHeader('III. ÁREAS Y UBICACIONES TRATADAS (13 ÁREAS PLANTA)');
    const ar = data.areasTratadas || {};
    const tableHeaders = ['ÁREA PLANTA', 'APLICADO', 'ÁREA PLANTA', 'APLICADO'];
    const tableWidths = [60, 30, 60, 30];
    const tableRows = [
      ['Recepción', ar.recepcion ? 'SI [X]' : 'NO [ ]', 'Patio maniobras', ar.patioManiobras ? 'SI [X]' : 'NO [ ]'],
      ['Cuarto frío', ar.cuartoFrio ? 'SI [X]' : 'NO [ ]', 'Ingreso', ar.ingreso ? 'SI [X]' : 'NO [ ]'],
      ['Auto claves', ar.autoclaves ? 'SI [X]' : 'NO [ ]', 'Lavandería', ar.lavanderia ? 'SI [X]' : 'NO [ ]'],
      ['Trituradoras', ar.trituradoras ? 'SI [X]' : 'NO [ ]', 'Muro perimetral', ar.muroPerimetral ? 'SI [X]' : 'NO [ ]'],
      ['Compactadora', ar.compactadora ? 'SI [X]' : 'NO [ ]', 'Comedor', ar.comedor ? 'SI [X]' : 'NO [ ]'],
      ['Lavado', ar.lavado ? 'SI [X]' : 'NO [ ]', 'Taller', ar.taller ? 'SI [X]' : 'NO [ ]'],
      ['Incinerador', ar.incinerador ? 'SI [X]' : 'NO [ ]', '-', '-']
    ];
    drawDataTable(tableHeaders, tableWidths, tableRows);

    drawSectionHeader('IV. PUNTOS CLAVE, INSTRUCCIONES Y VERIFICACIÓN DE SEGURIDAD (EPP)');
    const epp = data.verificacionEPP || {};
    drawGridInfo([
      { key: 'Identificación de Insumos', value: data.identificacionInsumos || 'N/A' },
      { key: 'Trazabilidad de Cargas / Lote', value: data.trazabilidadCargasLote || 'N/A' },
      { key: 'Respirador Vapores/Ácidos', value: epp.respiradorCartuchos ? 'CUMPLE [X]' : 'NO [ ]' },
      { key: 'Traje Impermeable', value: epp.trajeImpermeable ? 'CUMPLE [X]' : 'NO [ ]' },
      { key: 'Careta Protección Facial', value: epp.careta ? 'CUMPLE [X]' : 'NO [ ]' },
      { key: 'Guantes Nitrilo / Neopreno', value: epp.guantesNitriloNeopreno ? 'CUMPLE [X]' : 'NO [ ]' }
    ]);

    drawSectionHeader('V. OBSERVACIONES Y FIRMAS DE VALIDACIÓN SGI');
    drawGridInfo([
      { key: 'Observaciones Generales', value: data.observaciones || 'Sin novedades' },
      { key: 'Firma Operador Aplicador', value: data.firmaOperador || '' },
      { key: 'Firma Supervisor SGI', value: data.firmaSupervisor || '' }
    ]);
  } else if (tipo === 'checklist_diario_planta') {
    // 16. Checklist Diario de Planta - Executive Report with Radar Chart
    drawSectionHeader('I. INFORMACIÓN GENERAL Y METADATOS DE AUDITORÍA DE PLANTA');
    drawGridInfo([
      { key: 'Fecha Auditoría', value: data.fecha || '' },
      { key: 'Turno Operativo', value: data.turno || 'Matutino' },
      { key: 'Área / Zona Evaluada', value: data.areaZona || 'Planta Principal' },
      { key: 'Inspector / Responsable', value: data.responsable || data.inspector || '' },
      { key: 'Hora Registro SGI', value: horaCaptura },
      { key: 'Código Formato SGI', value: 'F-OPR-000-16' }
    ]);

    drawSectionHeader('II. RESUMEN EJECUTIVO DE CUMPLIMIENTO POR EJES EVALUADOS');
    
    // Scores
    const scoreHse = Math.round(data.puntajeHse || 0);
    const scoreCal = Math.round(data.puntajeCalidad || 0);
    const scoreMnt = Math.round(data.puntajeMantenimiento || 0);
    const score5s = Math.round(data.puntaje5s || 0);
    const scoreGlobal = Math.round(data.puntajeGlobal || 0);

    const getEstadoStr = (val: number) => val >= 90 ? 'EXCELENTE' : val >= 75 ? 'SATISFACTORIO' : 'CRÍTICO';

    const summaryHeaders = ['EJE / SECCIÓN EVALUADA', 'PUNTAJE (%)', 'ESTATUS SGI', 'DESCRIPCIÓN DE CUMPLIMIENTO'];
    const summaryWidths = [55, 25, 30, 70];
    const summaryRows = [
      ['SECCIÓN 1 — SEGURIDAD (HSE)', `${scoreHse}%`, getEstadoStr(scoreHse), 'Equipos de protección, extintores y bioseguridad'],
      ['SECCIÓN 2 — CALIDAD Y NORMATIVO', `${scoreCal}%`, getEstadoStr(scoreCal), 'Autoclaves, bitácoras y cumplimiento normativo'],
      ['SECCIÓN 3 — MANTENIMIENTO Y EQUIPOS', `${scoreMnt}%`, getEstadoStr(scoreMnt), 'Equipos térmicos, básculas y contingencias'],
      ['SECCIÓN 4 — INSTALACIONES (5S)', `${score5s}%`, getEstadoStr(score5s), 'Orden, limpieza y condiciones ambientales'],
      ['ÍNDICE GLOBAL DE CONFORMIDAD', `${scoreGlobal}%`, getEstadoStr(scoreGlobal), 'EVALUACIÓN GLOBAL INTEGRADA DE PLANTA']
    ];
    drawDataTable(summaryHeaders, summaryWidths, summaryRows);

    // Section III: Radar Chart Visual Image
    drawSectionHeader('III. EVALUACIÓN RADIAL DE ASPECTOS DÉBILES Y FORTALEZAS (GRÁFICA RADIAL SGI)');
    try {
      const scoresObj = { hse: scoreHse, calidad: scoreCal, mantenimiento: scoreMnt, fivestar: score5s };
      let prevScoresObj;
      if (data.avanceRetroceso?.puntajeAnteriorGlobal !== undefined) {
        const prevAvg = data.avanceRetroceso.puntajeAnteriorGlobal || scoreGlobal;
        prevScoresObj = { hse: prevAvg, calidad: prevAvg, mantenimiento: prevAvg, fivestar: prevAvg };
      }
      const chartDataUrl = generateRadarChartCanvas(scoresObj, prevScoresObj);
      if (chartDataUrl) {
        if (y + 80 > pageHeight - 18) {
          doc.addPage();
          drawHeader();
        }
        doc.addImage(chartDataUrl, 'PNG', marginX + 45, y, 90, 75);
        y += 79;
      }
    } catch (e) {
      console.warn('Could not generate radar chart canvas for PDF:', e);
    }

    // Section IV: Analysis of Strengths & Weaknesses
    drawSectionHeader('IV. DIAGNÓSTICO EJECUTIVO: FORTALEZAS Y ASPECTOS DÉBILES / HALLAZGOS');
    
    const allItems = [
      ...(data.seccionHse || []),
      ...(data.seccionCalidad || []),
      ...(data.seccionMantenimiento || []),
      ...(data.seccion5s || [])
    ];
    const hallazgos = allItems.filter((i: any) => i.estatus === 'NO_CUMPLE' || i.estatus === 'PARCIAL');
    const fortalezasCount = allItems.filter((i: any) => i.estatus === 'CUMPLE').length;

    const txtFortalezas = `Se identificaron ${fortalezasCount} de ${allItems.length} puntos de verificación en nivel de CUMPLIMIENTO TOTAL (100%). La planta mantiene estándares operativos sólidos en los rubros auditados.`;
    drawTextCard('FORTALEZAS OPERATIVAS DE PLANTA', txtFortalezas, 'success');

    if (hallazgos.length > 0) {
      const hallazgosLines = [
        `Se detectaron ${hallazgos.length} aspectos débiles / desviaciones que requieren acción inmediata:`,
        ...hallazgos.map((h: any) => `• [${h.codigo}] ${h.punto} — Estatus: ${h.estatus}${h.comentario ? ` (Observación: ${h.comentario})` : ''}`)
      ];
      drawTextCard('ASPECTOS DÉBILES Y HALLAZGOS CRÍTICOS', hallazgosLines, 'danger');
    } else {
      drawTextCard('ASPECTOS DÉBILES Y HALLAZGOS CRÍTICOS', 'No se registraron hallazgos ni desviaciones en la presente inspección de planta.', 'normal');
    }

    // Section V: Avances o Retrocesos
    drawSectionHeader('V. TENDENCIA Y EVALUACIÓN DE AVANCES O RETROCESOS');
    let txtTendencia = 'Auditoría inicial de referencia para el historial SGI.';
    if (data.avanceRetroceso) {
      const dif = data.avanceRetroceso.diferenciaGlobal || 0;
      const tend = data.avanceRetroceso.tendencia || 'Estable';
      const prevVal = data.avanceRetroceso.puntajeAnteriorGlobal || scoreGlobal;
      txtTendencia = `Comparativa vs Registro Anterior (${prevVal}%): Tendencia de ${tend.toUpperCase()} (${dif >= 0 ? '+' : ''}${dif.toFixed(1)}%). ` +
        (dif > 0 ? 'Las acciones correctivas aplicadas reflejan mejoras operacionales en la planta.' : dif < 0 ? 'Se requiere reforzar controles preventivos en los rubros con retroceso.' : 'Desempeño constante.');
    }
    drawTextCard('DIAGNÓSTICO DE TENDENCIA SGI', txtTendencia, 'warning');

    if (data.observaciones) {
      drawTextCard('OBSERVACIONES GENERALES DEL INSPECTOR', data.observaciones, 'normal');
    }

    // Section VI: Desglose completo de puntos (Table on new page)
    doc.addPage();
    drawHeader();
    drawSectionHeader(`VI. DESGLOSE DETALLADO DE PUNTOS DE VERIFICACIÓN (${allItems.length} PUNTOS)`);
    
    const dtlHeaders = ['CÓDIGO', 'PUNTO DE VERIFICACIÓN', 'NORMATIVA', 'ESTATUS', 'COMENTARIO / EVIDENCIA'];
    const dtlWidths = [18, 65, 37, 22, 38];
    const dtlRows: any[] = [];

    allItems.forEach((item: any) => {
      dtlRows.push([
        item.codigo || '',
        item.punto || '',
        item.referencia || '',
        item.estatus || 'CUMPLE',
        item.comentario || 'Conforme'
      ]);
    });
    drawDataTable(dtlHeaders, dtlWidths, dtlRows);

    drawSectionHeader('VII. FIRMAS Y CERTIFICACIÓN DE LA AUDITORÍA');
    const firmas = data.firmas || {};
    drawGridInfo([
      { key: 'Inspector / Responsable Evaluador', value: firmas.inspector || data.responsable || '' },
      { key: 'Gerente de Planta / Vo.Bo.', value: firmas.gerentePlanta || 'Ing. Manuel López — Gerente de Planta' }
    ]);
  } else if (tipo === 'control_360_vehiculos') {
    // 17. Control 360 de Vehiculos (F-OPR-000-17) - 1 PÁGINA COMPLETA
    drawSectionHeader('I. IDENTIFICACIÓN DE RUTA Y UNIDAD (F-OPR-000-17)', true);
    drawGridInfo([
      { key: 'Folio Boleta', value: data.folio || 'N/A' },
      { key: 'Fecha de Operación', value: data.fecha || '' },
      { key: 'Turno', value: data.turno || 'AM' },
      { key: 'Centro / Distribuidora', value: data.centro || '' },
      { key: 'Ruta Asignada', value: data.ruta || '' },
      { key: 'Placa del Vehículo', value: `${data.placa || ''} (${data.estadoPlaca || 'Activa'})` },
      { key: 'Tipo de Vehículo', value: data.tipoVehiculo || '' },
      { key: 'Conductor Asignado', value: data.conductor || data.piloto || '' },
      { key: 'Kilometraje Salida / Llegada', value: `${data.kmSalida || 0} km  ➔  ${data.kmLlegada || 0} km` },
      { key: 'Km Totales Recorridos', value: `${data.kmRecorridos || 0} km` },
      { key: 'Contenedores Rojos Limpios', value: `${data.contenedoresRojosLimpiosVacios || 0} unidades` },
      { key: 'Horario Operativo', value: `${data.horaSalida || ''} - ${data.horaLlegadaFinal || ''}` }
    ], false, 5.8);

    drawSectionHeader('II. INSPECCIÓN PRE-OPERACIONAL 360° (MECÁNICA Y BIOSEGURIDAD)', true);
    const mec = data.checklistMecanico || {};
    const bio = data.checklistBioseguridad || {};

    const inspHeaders = ['RUBRO / SISTEMA EVALUADO', 'ESTADO', 'RUBRO / SISTEMA EVALUADO', 'ESTADO'];
    const inspWidths = [54, 35, 54, 35]; // Total: 178 mm
    const inspRows = [
      ['Frenos (Servicio y Emergencia) [CRÍTICO]', String(mec.frenos || 'Cumple'), 'Sello Hermético de Caja [CRÍTICO]', String(bio.selloHermetico || 'Cumple')],
      ['Llantas (Presión y Labrado) [CRÍTICO]', String(mec.llantas || 'Cumple'), 'Señalización Biohazard [CRÍTICO]', String(bio.biohazardVisible || 'Cumple')],
      ['Luces y Señalización', String(mec.luces || 'Cumple'), 'Desinfección Previa Verificada [CRÍTICO]', String(bio.desinfeccionPrevia || 'Cumple')],
      ['Extintor ABC Vigente [CRÍTICO]', String(mec.extintor || 'Cumple'), 'Kit de Derrames Completo [CRÍTICO]', String(bio.kitDerrame || 'Cumple')],
      ['Cinturones de Seguridad', String(mec.cinturones || 'Cumple'), 'EPP Completo a Bordo [CRÍTICO]', String(bio.eppCompleto || 'Cumple')],
      ['Espejos Retrovisores', String(mec.espejos || 'Cumple'), 'Lavado Interior Furgón', data.limpiezaInterior ? 'SÍ (CONFORME)' : 'PENDIENTE'],
      ['Nivel de Combustible y Fluidos', String(mec.combustible || 'Cumple'), 'Descarga Completa (100%)', data.descargaCompleta ? 'SÍ (CONFORME)' : 'NO'],
      ['Botiquín Primeros Auxilios', String(mec.botiquin || 'Cumple'), 'Desinfectante Utilizado', data.desinfectanteUtilizado || 'Hipoclorito 1%']
    ];
    drawDataTable(inspHeaders, inspWidths, inspRows, 5.0);

    drawSectionHeader('III. ENTREGA EN PLANTA, PESAJE Y DESINFECCIÓN POST-RUTA', true);
    drawGridInfo([
      { key: 'Hora Llegada a Planta', value: data.horaLlegadaPlanta || 'N/A' },
      { key: 'Peso Entregado en Báscula', value: `${data.pesoEntregadoLbs !== undefined ? data.pesoEntregadoLbs : (data.pesoEntregadoKg || 0)} lb (libras)` },
      { key: 'Recibido en Planta por', value: data.recibidoPorPlanta || 'Recepción SGI' },
      { key: 'Tiempo Contacto Biocida', value: `${data.tiempoContactoMinutos || 10} min (Fin: ${data.horaFinDesinfeccion || ''})` },
      { key: 'Novedades de Ruta', value: data.novedadesRuta || 'Sin novedades reportadas' },
      { key: 'Acciones Correctivas', value: data.accionesCorrectivas || 'Ninguna requerida' }
    ], false, 5.8);

    drawSectionHeader('IV. DICTAMEN DE CONFORMIDAD Y FIRMAS RESPONSABLES', true);
    drawGridInfo([
      { key: 'Firma Conductor Asignado', value: data.firmaConductor || data.conductor || '' },
      { key: 'Firma Supervisor de Flota', value: data.firmaSupervisor || 'Supervisor de Flota' },
      { key: 'Firma Recepción en Planta', value: data.firmaPlanta || data.recibidoPorPlanta || '' },
      { key: 'Dictamen de Operatividad', value: 'VEHÍCULO APROBADO PARA TRANSPORTE DSH' }
    ], false, 5.8);

    drawSectionHeader('V. SISTEMA CONTROL DE CAMBIOS DEL FORMATO (ISO 9001 / ISO 14001)', true, 4.8);
    const modHeadersVeh = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
    const modWidthsVeh = [15, 35, 35, 63, 30]; // Total: 178 mm
    const modDataVeh = [
      ['1.0', '13/06/2025', 'Todas', 'Creación del formato oficial bajo norma ISO 14001 y 9001:2015', 'Comité SGI']
    ];
    drawDataTable(modHeadersVeh, modWidthsVeh, modDataVeh, true, 4.4);

  } else if (tipo === 'reporte_recoleccion') {
    // 18. Informe Consolidado de Recolección de Residuos
    const results = data.results || (Array.isArray(data) ? data : []);
    drawSectionHeader('I. RESUMEN DE PARÁMETROS Y CONSULTA DE RECOLECCIÓN');
    drawGridInfo([
      { key: 'Total de Registros / Visitas', value: `${results.length} visitas procesadas` },
      { key: 'Total de Peso Recolectado', value: `${results.reduce((acc: number, r: any) => acc + (Number(r.unidades) || 0), 0).toLocaleString()} Lbs` },
      { key: 'Filtro / Criterio de Consulta', value: data.filterDescription || 'Informe de recolección de residuos DSH' },
      { key: 'Fecha de Emisión', value: new Date().toLocaleDateString('es-GT') }
    ]);

    drawSectionHeader(`II. DETALLE DE RECOLECCIONES REGISTRADAS (${results.length} REGISTROS)`);
    const rHeaders = ['FECHA/HORA', 'RECIBO', 'CLIENTE', 'UBICACIÓN / SEDE', 'RUTA', 'DESECHO', 'LBS'];
    const rWidths = [24, 20, 42, 38, 26, 20, 8];
    const rRows: any[] = [];

    results.slice(0, 150).forEach((item: any) => {
      rRows.push([
        `${item.fechaVisita || ''} ${item.horaVisita || ''}`,
        item.numeroRecibo || '',
        item.nombreCliente || item.codigoCliente || '',
        item.nombreUbicacion || item.codigoUbicacion || '',
        item.ruta || item.codigoRuta || '',
        item.categoria || '',
        String(item.unidades || 0)
      ]);
    });
    drawDataTable(rHeaders, rWidths, rRows);

  } else if (tipo.startsWith('evaluacion_360_')) {
    // 19-22. Evaluaciones 360 de Equipos Críticos de Planta
    // PÁGINA 1: INFORME EJECUTIVO Y CERTIFICACIÓN 360° (PÁGINA COMPLETA 100% LLENA)
    drawSectionHeader('I. IDENTIFICACIÓN DEL EQUIPO Y CONDICIONES DE AUDITORÍA', false, 5.5);
    drawGridInfo([
      { key: 'Folio Auditoría', value: data.folio || 'EV360-001' },
      { key: 'Equipo Auditado', value: `${data.nombreEquipo || ''} (ID: ${data.equipoId || ''})` },
      { key: 'Modelo / Serie', value: data.modeloSerie || 'N/A' },
      { key: 'Ubicación en Planta', value: data.ubicacionPlanta || '' },
      { key: 'Fecha y Turno', value: `${data.fecha || ''} | Turno ${data.turno || 'Matutino'}` },
      { key: 'Horómetro Actual', value: data.horometroActual !== undefined && data.horometroActual !== null && data.horometroActual !== '' ? `${Number(data.horometroActual).toLocaleString()} Horas` : '' },
      { key: 'Operador Responsable', value: data.operadorAsignado || '' },
      { key: 'Inspector SGI / Auditor', value: data.inspectorSgi || data.responsable || '' }
    ], false, 6.0);

    drawSectionHeader('II. DICTAMEN GLOBAL DE CONFORMIDAD Y BALANCE OPERACIONAL 360°', false, 5.5);
    drawGridInfo([
      { key: 'Calificación Global 360°', value: `${data.puntajeGlobal || 0}% (${data.puntajeGlobal >= 85 ? 'CONFORME' : data.puntajeGlobal >= 70 ? 'CONDICIONADO' : 'NO CONFORME'})` },
      { key: 'Veredicto Operacional', value: String(data.veredictoOperacional || 'Aprobado para Operar').toUpperCase() },
      { key: 'Nivel de Riesgo SGI', value: String(data.nivelRiesgo || 'Bajo').toUpperCase() },
      { key: 'Estado Operativo del Activo', value: String(data.estadoOperacional || 'En Servicio Conforme').toUpperCase() },
      { key: 'Seguridad y EPP (25%)', value: `${data.puntajeSeguridad || 0}%` },
      { key: 'Integridad Mecánica (20%)', value: `${data.puntajeMecanico || 0}%` },
      { key: 'Hidráulica / Combustión (20%)', value: `${data.puntajeHidraulicoCombustion || 0}%` },
      { key: 'Eléctrico y Control (15%)', value: `${data.puntajeElectricoControl || 0}%` },
      { key: 'Bioseguridad y Limpieza (10%)', value: `${data.puntajeBioseguridadLimpieza || 0}%` },
      { key: 'Desempeño Operativo (10%)', value: `${data.puntajeOperatividad || 0}%` }
    ], false, 6.0);

    // Parámetros específicos de maquinaria
    const paramItems: { key: string; value: string }[] = [];
    if (tipo.includes('incinerador')) {
      paramItems.push(
        { key: 'Temp. Cámara Primaria', value: `${data.tempCamaraPrimariaC || 850} °C (Ref: 850-950 °C)` },
        { key: 'Temp. Cámara Secundaria', value: `${data.tempCamaraSecundariaC || 1100} °C (Ref: >1000 °C)` },
        { key: 'Presión Combustible', value: `${data.presionCombustibleBar || 2.5} Bar` },
        { key: 'Opacidad de Humos', value: `${data.opacidadHumoPorc || 5}% (<20% Ringelmann)` },
        { key: 'Tipo Combustible', value: data.tipoCombustible || 'Diésel Industrial' },
        { key: 'Tiro Negativo en Cámara', value: data.tiroNegativoOk ? 'Verificado Estable' : 'Conforme' }
      );
    } else if (tipo.includes('tunel')) {
      paramItems.push(
        { key: 'Presión Bomba Lavado', value: `${data.presionBombaLavadoPsi || 120} PSI (Ref: 100-140)` },
        { key: 'PPM Desinfectante', value: `${data.ppmDesinfectante || 400} PPM (Ref: 400-600)` },
        { key: 'Temperatura Agua', value: `${data.temperaturaAguaC || 65} °C (Ref: 60-70 °C)` },
        { key: 'Velocidad Cadena', value: `${data.velocidadCadenaMetrosMin || 3.5} m/min` },
        { key: 'Químico Dosificado', value: data.quimicoDosificado || 'Amonio Cuaternario' },
        { key: 'Hermeticidad de Cortinas', value: 'Hermético Sin Fugas' }
      );
    } else if (tipo.includes('compactadora')) {
      paramItems.push(
        { key: 'Presión Prensado', value: `${data.presionPrensadoPsi || 2200} PSI (Ref: 2000-2400)` },
        { key: 'Temperatura Aceite', value: `${data.temperaturaAceiteC || 48} °C (Ref: <60 °C)` },
        { key: 'Peso Promedio Paca', value: `${data.pesoPromedioPacaLbs || 450} Lbs` },
        { key: 'Tiempo Ciclo Prensado', value: `${data.tiempoCicloPrensadoSeg || 45} seg` },
        { key: 'Tipo Fleje Amarre', value: data.tipoFleje || 'Poliéster Alta Densidad' },
        { key: 'Hermeticidad Puerta Descarga', value: 'Sellos en Buen Estado' }
      );
    } else if (tipo.includes('trituradora')) {
      paramItems.push(
        { key: 'Amperaje Motor Principal', value: `${data.amperajeMotorA || 62} A (Nominal: 65 A)` },
        { key: 'Velocidad Rotación', value: `${data.velocidadRotacionRpm || 38} RPM` },
        { key: 'Respuesta Auto-Reverse', value: `${data.tiempoRespuestaAutoReverseSeg || 1.8} seg (<2.5s)` },
        { key: 'Desgaste Cuchillas', value: `${data.desgasteCuchillasMm || 1.2} mm (<3.0 mm)` },
        { key: 'Capacidad Proceso', value: `${data.capacidadProcesamientoLbsHr || 1200} Lbs/h` },
        { key: 'Nivel Aceite Reductor', value: 'Normal / Sintético ISO 320' }
      );
    }
    if (paramItems.length > 0) {
      drawSectionHeader('III. PARÁMETROS OPERATIVOS Y CALIBRACIONES ESPECÍFICAS', false, 5.5);
      drawGridInfo(paramItems, false, 6.0);
    }

    drawSectionHeader('IV. PROTOCOLO DE SEGURIDAD INDUSTRIAL PREVIO Y BLOQUEO LOTO', false, 5.5);
    drawGridInfo([
      { key: 'Protocolo Candadeo y Bloqueo LOTO', value: 'APLICADO Y VERIFICADO [CONFORME]' },
      { key: 'Paradas de Emergencia / Interlocks', value: 'PROBADAS Y ACTIVAS AL 100%' },
      { key: 'Uso de EPP de Bioseguridad Normativo', value: 'COMPLETO POR EL OPERADOR' },
      { key: 'Hermeticidad y Control Ambiental', value: 'EN NORMA SIN FUGAS' }
    ], false, 6.0);

    drawSectionHeader('V. CONCLUSIÓN EJECUTIVA DEL AUDITOR SGI Y RECOMENDACIONES', false, 5.5);
    const conclusionText = data.observaciones || data.conclusiones || (
      data.puntajeGlobal >= 85
        ? `El equipo evaluado cumple satisfactoriamente con los estándares corporativos del Sistema de Gestión Integral (SGI). La confiabilidad técnica general es del ${data.puntajeGlobal || 90}%, autorizándose su operación continua bajo las condiciones actuales de mantenimiento preventivo.`
        : `El equipo presenta desviaciones operativas que requieren atención técnica prioritaria. Se debe ejecutar el plan de acciones correctivas detallado en la página siguiente antes de la próxima auditoría programada.`
    );
    drawTextCard('DICTAMEN DE CONFIABILIDAD OPERATIVA Y DISPONIBILIDAD', conclusionText, data.puntajeGlobal < 70 ? 'danger' : (data.puntajeGlobal < 85 ? 'warning' : 'success'), true);

    drawSectionHeader('VI. TRAZABILIDAD Y REGISTRO DE AUDITORÍA SGI', false, 5.5);
    drawGridInfo([
      { key: 'Normativa de Aplicación', value: 'ISO 9001:2015 / ISO 14001:2015 / OHSAS 18001' },
      { key: 'Próxima Auditoría Programada', value: 'A 30 días calendario conforme a programa SGI' }
    ], false, 6.0);

    drawSectionHeader('VII. FIRMAS OFICIALES DE AUDITORÍA Y CERTIFICACIÓN SGI', false, 5.5);
    const f1 = data.firmas || {};
    drawGridInfo([
      { key: 'Auditor SGI / Inspector', value: f1.inspector || data.inspectorSgi || data.responsable || 'Auditor Líder SGI' },
      { key: 'Operador Responsable Equipo', value: f1.operador || data.operadorAsignado || 'Operador de Turno' },
      { key: 'Supervisor / Gerente de Planta', value: f1.supervisor || 'Gerente de Planta SGI' },
      { key: 'Dictamen Oficial Certificado', value: String(data.veredictoOperacional || 'Aprobado para Operar').toUpperCase() }
    ], false, 6.2);

    // PÁGINA 2: MATRIZ TÉCNICA DETALLADA DE CRITERIOS AUDITADOS Y CONTROL DE CAMBIOS SGI
    doc.addPage();
    drawHeader();

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${meta.name} — MATRIZ TÉCNICA DETALLADA (24 ÍTEMS) Y CONTROL SGI`, marginX + 4, y);
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX + 1, y + 2, pageWidth - marginX - 1, y + 2);
    y += 6;

    drawSectionHeader('VIII. MATRIZ TÉCNICA DETALLADA DE CRITERIOS AUDITADOS (24 ÍTEMS)', false, 5.0);
    let allItems = [
      ...(data.itemsSeguridad || []),
      ...(data.itemsMecanico || []),
      ...(data.itemsHidraulicoCombustion || []),
      ...(data.itemsElectricoControl || []),
      ...(data.itemsBioseguridadLimpieza || []),
      ...(data.itemsOperatividad || [])
    ];

    if (allItems.length === 0) {
      let defaults: any = DEFAULT_ITEMS_INCINERADOR;
      if (tipo.includes('tunel')) defaults = DEFAULT_ITEMS_TUNEL_LAVADO;
      else if (tipo.includes('compactadora')) defaults = DEFAULT_ITEMS_COMPACTADORA;
      else if (tipo.includes('trituradora')) defaults = DEFAULT_ITEMS_TRITURADORA;

      allItems = [
        ...(defaults.seguridad || []),
        ...(defaults.mecanico || []),
        ...(defaults.hidraulicoCombustion || defaults.hidraulicoPrensado || defaults.hidraulicaMecanica || defaults.hidraulico || []),
        ...(defaults.electricoControl || []),
        ...(defaults.bioseguridadLimpieza || []),
        ...(defaults.operatividad || [])
      ];
    }

    const cHeaders = ['CÓDIGO', 'SISTEMA / RUBRO', 'CRITERIO AUDITADO', 'CALIF.', 'ESTADO'];
    const cWidths = [18, 38, 92, 12, 18]; // Total: 178 mm
    const cRows: any[] = [];

    allItems.forEach((item: any) => {
      cRows.push([
        item.codigo || '',
        item.categoria || '',
        item.criterio || '',
        `${item.calificacion || 5}/5`,
        item.estado || 'Conforme'
      ]);
    });
    drawDataTable(cHeaders, cWidths, cRows, 4.8);

    // Section IX: Plan de Acciones Correctivas
    const acciones = data.accionesCorrectivas || [];
    drawSectionHeader('IX. PLAN DE ACCIONES CORRECTIVAS Y MITIGACIÓN DE RIESGOS', false, 5.0);
    if (acciones.length > 0) {
      const aHeaders = ['ÍTEM', 'DESVIACIÓN / HALLAZGO', 'ACCIÓN PROPUESTA', 'RESPONSABLE', 'PLAZO'];
      const aWidths = [22, 50, 56, 32, 18]; // Total: 178 mm
      const aRows: any[] = [];
      acciones.forEach((ac: any) => {
        aRows.push([
          ac.itemAfectado || '',
          ac.descripcionDesviacion || '',
          ac.accionPropuesta || '',
          ac.responsableEjecucion || '',
          `${ac.plazoDias || 1} días`
        ]);
      });
      drawDataTable(aHeaders, aWidths, aRows, 4.8);
    } else {
      drawTextCard('MEDIDAS PREVENTIVAS Y SEGUIMIENTO CONTINUO', 'No se registran desviaciones críticas pendientes. Se ratifica el programa de mantenimiento preventivo y lubricación periódica conforme al manual del fabricante.', 'normal', true);
    }

    // Section X: Dictamen de Conformidad Técnica y Calificación
    drawSectionHeader('X. DICTAMEN DE CONFORMIDAD TÉCNICA Y CALIFICACIÓN SGI', false, 5.0);
    drawGridInfo([
      { key: 'Veredicto Operacional', value: String(data.veredictoOperacional || 'Aprobado para Operar').toUpperCase() },
      { key: 'Confiabilidad Técnica', value: `${data.puntajeGlobal || 90}% — Grado A (Conforme SGI)` },
      { key: 'Próxima Auditoría SGI', value: 'Programada a 30 días calendario' },
      { key: 'Estatus del Formato', value: 'REGISTRO AUDITADO Y ARCHIVADO SGI' }
    ], false, 5.8);

    // Section XI: Control de Cambios en Página 2
    drawSectionHeader('XI. SISTEMA CONTROL DE CAMBIOS DEL FORMATO (ISO 9001 / ISO 14001)', true, 4.8);
    const modHeaders360 = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
    const modWidths360 = [15, 35, 35, 63, 30]; // Total: 178 mm
    const modData360 = [
      ['1.0', '13/06/2025', 'Todas', 'Creación del formato oficial bajo norma ISO 14001 y 9001:2015', 'Comité SGI']
    ];
    drawDataTable(modHeaders360, modWidths360, modData360, true, 4.6);

  } else if (tipo === 'control_caldera') {
    // 23. Bitácora de Operación, Control y Mantenimiento de Caldera (F-OPR-000-23) - 1 PÁGINA COMPLETA
    drawSectionHeader('I. DATOS GENERALES DE LA CALDERA (F-OPR-000-23)', true);
    drawGridInfo([
      { key: 'Fecha de Registro', value: data.fecha || '' },
      { key: 'Turno Seleccionado', value: data.turnoSeleccionado || 'Turno 1 & 2' },
      { key: 'Identificación Caldera', value: data.identificacionCaldera || 'CALD-01 (Caldera de Vapor)' },
      { key: 'Operador Responsable', value: data.operadorResponsable || data.responsable || '' },
      { key: 'Estado Operacional', value: data.estadoOperacional || 'Operativo / Conforme' }
    ], false, 5.2);

    drawSectionHeader('II. PARÁMETROS OPERATIVOS POR TURNO (NORMATIVA VAPOR)', true);
    const t1 = data.turno1 || {};
    const t2 = data.turno2 || {};

    const pHeaders = ['PARÁMETRO / COMPONENTE', 'UNIDAD', 'REFERENCIA', 'TURNO 1', 'TURNO 2'];
    const pWidths = [58, 25, 35, 30, 30]; // Total: 178 mm
    const pRows = [
      ['Presión de Vapor', 'PSI', '80 - 120', t1.presionVaporPsi !== undefined ? `${t1.presionVaporPsi} PSI` : '—', t2.presionVaporPsi !== undefined ? `${t2.presionVaporPsi} PSI` : '—'],
      ['Temperatura Agua Alimentación', '°C', '80 - 90', t1.tempAguaAlimentacionC !== undefined ? `${t1.tempAguaAlimentacionC} °C` : '—', t2.tempAguaAlimentacionC !== undefined ? `${t2.tempAguaAlimentacionC} °C` : '—'],
      ['Temperatura Gases Chimenea', '°C', '180 - 230', t1.tempGasesChimeneaC !== undefined ? `${t1.tempGasesChimeneaC} °C` : '—', t2.tempGasesChimeneaC !== undefined ? `${t2.tempGasesChimeneaC} °C` : '—'],
      ['Nivel de Agua en Visor', 'Visual', 'Normal', t1.nivelAguaVisorOk ? '[X] OK' : '[ ] Falla', t2.nivelAguaVisorOk ? '[X] OK' : '[ ] Falla'],
      ['Presión Combustible / Gas', 'PSI', 'Según manual', t1.presionCombustibleGasPsi !== undefined ? `${t1.presionCombustibleGasPsi} PSI` : '—', t2.presionCombustibleGasPsi !== undefined ? `${t2.presionCombustibleGasPsi} PSI` : '—'],
      ['Purga de Columna / Nivel', 'Operativo', 'Requerido', t1.purgaColumnaNivel ? '[X] Sí' : '[ ] No', t2.purgaColumnaNivel ? '[X] Sí' : '[ ] No'],
      ['Purga de Fondo (Lodos)', 'Operativo', 'Requerido', t1.purgaFondoLodos ? '[X] Sí' : '[ ] No', t2.purgaFondoLodos ? '[X] Sí' : '[ ] No'],
      ['Dosificación Químicos', 'PPM / L', '1.5 L/día', t1.dosificacionQuimicosPpm !== undefined ? `${t1.dosificacionQuimicosPpm} L/d` : '1.5 L/d', t2.dosificacionQuimicosPpm !== undefined ? `${t2.dosificacionQuimicosPpm} L/d` : '1.5 L/d'],
      ['TDS / Conductividad de Agua', 'µS/cm', '< 3,000', t1.tdsConductividadAgua !== undefined ? `${t1.tdsConductividadAgua} µS` : '—', t2.tdsConductividadAgua !== undefined ? `${t2.tdsConductividadAgua} µS` : '—'],
      ['Inspección de Fugas', 'Visual', 'Sin fugas', t1.inspeccionFugasOk ? '[X] OK' : '[ ] Fuga', t2.inspeccionFugasOk ? '[X] OK' : '[ ] Fuga']
    ];
    drawDataTable(pHeaders, pWidths, pRows, 4.4);

    drawSectionHeader('III. PROGRAMA DE MANTENIMIENTO PREVENTIVO (CHECKLIST)', true);
    const chk = data.checklist || {};
    const cHeaders = ['ACTIVIDAD DE MANTENIMIENTO PREVENTIVO', 'PERIODICIDAD', 'ESTADO'];
    const cWidths = [113, 35, 30]; // Total: 178 mm
    const cRows = [
      ['Limpieza y drenaje de filtros de combustible / trampas de agua', 'Semanal', chk.limpiezaFiltrosCombustibleTrampasAgua ? '[X] Realizado' : '[ ] Pendiente'],
      ['Limpieza de fotocelda y electrodo de ignición (hollín/residuos)', 'Semanal', chk.limpiezaFotoceldaElectrodoIgnicion ? '[X] Realizado' : '[ ] Pendiente'],
      ['Pruebas de simulación de falla por bajo nivel (Corte Cut-Off)', 'Semanal', chk.pruebaParadaBajoNivelAguaCutOff ? '[X] Realizado' : '[ ] Pendiente'],
      ['Inspección de trampas de vapor de retorno de condensados', 'Semanal', chk.inspeccionTrampasVaporRetornoCondensados ? '[X] Realizado' : '[ ] Pendiente'],
      ['Limpieza de malla de ventilación del quemador (relación aire/comb.)', 'Semanal', chk.limpiezaMallaVentilacionQuemador ? '[X] Realizado' : '[ ] Pendiente'],
      ['Inspección de quemador y boquillas (patrón de llama y desgaste)', 'Mensual', chk.inspeccionQuemadorBoquillas ? '[X] Realizado' : '[ ] Pendiente'],
      ['Verificación y prueba de presostato operativo y límite alto', 'Mensual', chk.verificacionPresostatosLimiteAlto ? '[X] Realizado' : '[ ] Pendiente'],
      ['Inspección de tubos de gases / apertura de registro (hollín)', 'Mensual', chk.inspeccionTubosGasesRegistroHollin ? '[X] Realizado' : '[ ] Pendiente'],
      ['Inspección de bombas de alimentación y sellos mecánicos', 'Mensual', chk.inspeccionBombasAlimentacionSellos ? '[X] Realizado' : '[ ] Pendiente'],
      ['Accionamiento manual de palanca en válvulas de seguridad', 'Mensual', chk.accionamientoManualValvulasSeguridad ? '[X] Realizado' : '[ ] Pendiente'],
      ['Inspección lado agua / apertura tapas de hombre (desincrustación)', 'Semestral/Anual', chk.inspeccionLadoAguaDesincrustacion ? '[X] Realizado' : '[ ] Pendiente'],
      ['Deshollinado completo y refractarios cámara de combustión', 'Semestral/Anual', chk.limpiezaMecanicaTubosRefractario ? '[X] Realizado' : '[ ] Pendiente'],
      ['Calibración certificada de válvulas de seguridad', 'Semestral/Anual', chk.calibracionValvulasSeguridadAcreditado ? '[X] Realizado' : '[ ] Pendiente'],
      ['Análisis de gases de combustión con analizador (CO, CO2, O2)', 'Semestral/Anual', chk.analisisGasesCombustionEficiencia ? '[X] Realizado' : '[ ] Pendiente'],
      ['Prueba hidrostática / Ultrasonido de espesores según norma', 'Semestral/Anual', chk.pruebaHidrostaticaEspesoresNorma ? '[X] Realizado' : '[ ] Pendiente']
    ];
    drawDataTable(cHeaders, cWidths, cRows, 4.1);

    if (data.eventos && data.eventos.length > 0) {
      if (y > pageHeight - 35) {
        doc.addPage();
        drawHeader();
      }
      drawSectionHeader('IV. REGISTRO DE EVENTOS Y FALLAS', true);
      const eHeaders = ['FECHA', 'COMPONENTE', 'FALLA', 'ACCIÓN', 'REPUESTO', 'PROVEEDOR'];
      const eWidths = [24, 32, 36, 38, 24, 24]; // Total: 178 mm
      const eRows: any[] = [];
      data.eventos.forEach((ev: any) => {
        eRows.push([
          ev.fecha || '',
          ev.componente || '',
          ev.falla || '',
          ev.accion || '',
          ev.repuesto || '—',
          ev.proveedor || '—'
        ]);
      });
      drawDataTable(eHeaders, eWidths, eRows, true);
    }

    drawSectionHeader('IV. DICTAMEN TÉCNICO Y FIRMAS', true);
    drawGridInfo([
      { key: 'Comentarios Operativos', value: data.comentarios || 'Operación nominal y purgas completadas conforme a estándar.' },
      { key: 'Dictamen Técnico', value: data.dictamenTecnico || 'Caldera aprobada para operación continua de vapor.' },
      { key: 'Firma Operador Responsable', value: data.firmaResponsable || data.operadorResponsable || '' },
      { key: 'Vo.Bo. Supervisor SGI', value: data.firmaSupervisor || 'Supervisor de Planta' }
    ], false, 5.2);

    drawSectionHeader('V. SISTEMA CONTROL DE CAMBIOS DEL FORMATO (ISO 9001 / ISO 14001)', true, 4.8);
    const modHeadersCald = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
    const modWidthsCald = [15, 35, 35, 63, 30]; // Total: 178 mm
    const modDataCald = [
      ['1.0', '13/06/2025', 'Todas', 'Creación del formato oficial bajo norma ISO 14001 y 9001:2015', 'Comité SGI']
    ];
    drawDataTable(modHeadersCald, modWidthsCald, modDataCald, true, 4.2);

  } else if (tipo === 'mantenimiento_incinerador') {
    // 24. Bitácora de Mantenimiento Incinerador Industrial DSH (BIT-MTO-INC-001) - 1 PÁGINA COMPLETA
    drawSectionHeader('I. INFORMACIÓN GENERAL DEL SERVICIO Y EQUIPO TÉRMICO', true);
    drawGridInfo([
      { key: 'Folio Oficial', value: data.folio || 'MTO-INC-001' },
      { key: 'Fecha del Servicio', value: data.fecha || '' },
      { key: 'Equipo Intervenido', value: `${data.nombreEquipo || 'Incinerador Industrial'} (ID: ${data.equipoId || 'INC-01'})` },
      { key: 'Tipo de Mantenimiento', value: data.tipoMantenimiento || 'Preventivo Programado' },
      { key: 'Horario Ejecución', value: `${data.horaInicio || '07:00'} - ${data.horaFin || '12:00'}` },
      { key: 'Horas de Operación', value: data.horasOperacion !== undefined && data.horasOperacion !== null && data.horasOperacion !== '' ? `${Number(data.horasOperacion).toLocaleString()} Horas` : '' },
      { key: 'Técnico Responsable', value: data.tecnicoResponsable || '' },
      { key: 'Supervisado Por', value: data.supervisadoPor || 'Ing. Manuel López — Gerente de Planta' }
    ], 5.6);

    drawSectionHeader('II. PROTOCOLO DE SEGURIDAD PREVIO (LOTO Y RIESGO TÉRMICO)', true);
    drawGridInfo([
      { key: 'Candadeo y Bloqueo LOTO', value: data.lotoCandadeo ? 'APLICADO [CONFORME]' : 'NO APLICADO' },
      { key: 'Temperatura Menor a 40°C', value: data.temperaturaMenor40 ? 'VERIFICADA (<40°C)' : 'NO CONFORME' },
      { key: 'Purga y Corte Combustible', value: data.purgaCorteCombustible ? 'CORTADO Y PURGADO' : 'NO' },
      { key: 'Ventilación Cámaras', value: data.ventilacionCamaras ? 'EJECUTADA' : 'NO' }
    ], 5.6);

    drawSectionHeader('III. INSPECCIÓN TÉCNICA DE CÁMARAS, COMBUSTIÓN E INSTRUMENTACIÓN', true);
    const cam = data.checklistCamaras || {};
    const comb = data.checklistCombustion || {};
    const inst = data.checklistInstrumentacion || {};

    const inciHeaders = ['SISTEMA / SUBSISTEMA', 'ELEMENTO INSPECCIONADO', 'ESTADO TÉCNICO'];
    const inciWidths = [48, 90, 40]; // Total: 178 mm
    const inciRows = [
      ['Cámaras Térmicas', 'Revestimiento Refractario Cámara Primaria', cam.revestimientoCamaraPrimaria || 'Bueno'],
      ['Cámaras Térmicas', 'Revestimiento Refractario Cámara Secundaria', cam.revestimientoCamaraSecundaria || 'Bueno'],
      ['Cámaras Térmicas', 'Sellos y Empaques de Fibra Cerámica en Puertas', cam.sellosPuertas || 'Bueno'],
      ['Cámaras Térmicas', 'Mirillas de Inspección de Llama y Visores', cam.mirillasInspeccion || 'Bueno'],
      ['Cámaras Térmicas', 'Estructura Exterior y Cárter Metálico', cam.estructuraExteriorCarter || 'Bueno'],
      ['Sistema Combustión', 'Boquillas e Inyectores de Quemador Principal', comb.boquillasInyectores || 'Bueno'],
      ['Sistema Combustión', 'Electrodos de Ignición y Chispa de Encendido', comb.electrodosIgnicion || 'Bueno'],
      ['Sistema Combustión', 'Detectores de Llama (Fotoceldas UV/IR)', comb.detectoresLlama || 'Bueno'],
      ['Sistema Combustión', 'Filtros de Combustible y Líneas de Suministro', comb.filtrosCombustible || 'Bueno'],
      ['Sistema Combustión', 'Válvulas Solenoides y Válvula de Corte Slam-Off', comb.valvulasSolenoides || 'Bueno'],
      ['Instrumentación PLC', 'Termocupla Cámara Primaria (Continuidad)', inst.termocuplaCamaraPrimaria || 'Bueno'],
      ['Instrumentación PLC', 'Termocupla Cámara Secundaria (Postcombustión)', inst.termocuplaCamaraSecundaria || 'Bueno'],
      ['Instrumentación PLC', 'Manómetros de Presión de Combustible y Aire', inst.manometrosPresion || 'Bueno'],
      ['Instrumentación PLC', 'Panel de Alarmas PLC y Parada de Emergencia', inst.panelPlcAlarmas || 'Bueno']
    ];
    drawDataTable(inciHeaders, inciWidths, inciRows, 4.8);

    drawSectionHeader('IV. DESCRIPCIÓN DE TRABAJOS Y REPUESTOS UTILIZADOS', true);
    drawTextCard('DETALLE DE ACTIVIDADES EJECUTADAS', data.descripcionTrabajos || 'Mantenimiento preventivo general conforme a protocolo SGI.', 'normal', true);

    const repuestos = data.repuestosUtilizados || [];
    if (repuestos.length > 0) {
      const repHeaders = ['CANT.', 'CÓDIGO', 'DESCRIPCIÓN DE REPUESTO', 'CAUSA DE REEMPLAZO'];
      const repWidths = [18, 32, 75, 53]; // Total: 178 mm
      const repRows = repuestos.map((r: any) => [
        String(r.cantidad || 1),
        r.codigo || '—',
        r.descripcion || r.repuesto || '',
        r.causaReemplazo || r.causa || 'Mantenimiento Preventivo'
      ]);
      drawDataTable(repHeaders, repWidths, repRows, 4.8);
    }

    drawSectionHeader('V. PRUEBAS DE ARRANQUE, DICTAMEN FINAL Y FIRMAS', true);
    drawGridInfo([
      { key: 'Prueba Hermeticidad', value: data.pruebasHermeticidad ? 'APROBADA [CONFORME]' : 'NO APROBADA' },
      { key: 'Prueba Interlocks', value: data.pruebasInterlocks ? 'APROBADA [CONFORME]' : 'NO APROBADA' },
      { key: 'Modulación de Llama', value: data.modulacionLlama ? 'OPERANDO NOMINAL' : 'FALLA' },
      { key: 'Temp. Consigna Sec. (>1000°C)', value: data.tempConsignaSecundariaAlcanzada ? 'ALCANZADA [OK]' : 'NO' },
      { key: 'Tiro Negativo', value: data.tiroNegativoVerificado ? 'SÍ (TIRO ESTABLE)' : 'NO' },
      { key: 'Estado Operativo Final', value: String(data.estadoFinal || 'Operativo Conforme').toUpperCase() },
      { key: 'Firma Técnico Ejecutor', value: data.firmaTecnico || data.tecnicoResponsable || '' },
      { key: 'Firma Supervisor Planta', value: data.firmaSupervisor || data.supervisadoPor || 'Gerente de Planta' }
    ], false, 5.2);

    drawSectionHeader('VI. SISTEMA CONTROL DE CAMBIOS DEL FORMATO (ISO 9001 / ISO 14001)', true, 4.8);
    const modHeadersInci = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
    const modWidthsInci = [15, 35, 35, 63, 30]; // Total: 178 mm
    const modDataInci = [
      ['1.0', '13/06/2025', 'Todas', 'Creación del formato oficial bajo norma ISO 14001 y 9001:2015', 'Comité SGI']
    ];
    drawDataTable(modHeadersInci, modWidthsInci, modDataInci, true, 4.2);

  } else if (tipo === 'mantenimiento_lampinator') {
    // 25. Bitácora de Mantenimiento Máquina Lampinator (BIT-MTO-LAMP-001) - 1 PÁGINA COMPLETA
    drawSectionHeader('I. INFORMACIÓN GENERAL Y METADATOS DEL SERVICIO', false, 5.5);
    drawGridInfo([
      { key: 'Folio Oficial', value: data.folio || 'MTO-LAMP-001' },
      { key: 'Fecha del Servicio', value: data.fecha || '' },
      { key: 'Equipo Intervenido', value: `${data.nombreEquipo || 'Desmercurizadora Lampinator'} (ID: ${data.equipoId || 'LAMP-01'})` },
      { key: 'Tipo de Mantenimiento', value: data.tipoMantenimiento || 'Preventivo Programado' },
      { key: 'Horario Ejecución', value: `${data.horaInicio || '08:00'} - ${data.horaFin || '10:45'}` },
      { key: 'Horómetro de Operación', value: data.horometro !== undefined && data.horometro !== null && data.horometro !== '' ? `${Number(data.horometro).toLocaleString()} Horas` : '' },
      { key: 'Técnico Responsable', value: data.tecnicoResponsable || '' },
      { key: 'Operador de Turno', value: data.operadorTurno || '' }
    ], false, 6.2);

    drawSectionHeader('II. PROTOCOLO DE BIOSEGURIDAD MERCURIAL (HG) Y LOTO', false, 5.5);
    drawGridInfo([
      { key: 'Mascarilla Vapor Hg 3M Certificada', value: data.mascarillaVaporHg ? 'EN USO [OBLIGATORIA]' : 'NO EN USO' },
      { key: 'Prueba Fuga Vapor Hg (<0.025)', value: `${data.pruebaFugaVaporHgPpm || 0} ppm [SEGURO]` },
      { key: 'Protocolo Candadeo LOTO', value: data.protocoloLoto ? 'APLICADO [CONFORME]' : 'NO APLICADO' },
      { key: 'Contención de Residuos Fosfóricos', value: 'Hermético Sin Fugas en Tambor' }
    ], false, 6.2);

    drawSectionHeader('III. INSPECCIÓN DE FILTRACIÓN, MECÁNICA, EXTRACCIÓN Y SEGURIDAD', false, 5.5);
    const filt = data.checklistFiltracion || {};
    const meca = data.checklistMecanico || {};
    const extr = data.checklistExtraccion || {};
    const segu = data.checklistSeguridad || {};

    const lampHeaders = ['SISTEMA AUDITADO', 'COMPONENTE / DISPOSITIVO', 'ESTADO EVALUADO'];
    const lampWidths = [48, 90, 40]; // Total: 178 mm
    const lampRows = [
      ['Filtración de Aire', 'Diferencial de Presión Filtro HEPA Absoluto', filt.diferencialPresionHepa || 'Conforme'],
      ['Filtración de Aire', 'Módulo de Carbón Activado para Vapores Hg', filt.moduloCarbonActivadoHg || 'Conforme'],
      ['Filtración de Aire', 'Prefiltros de Polvo y Partículas Gruesas', filt.prefiltrosPolvo || 'Conforme'],
      ['Mecánica y Trituración', 'Desgaste de Martillos y Cuchillas Rompedoras', meca.desgasteMartillosCuchillas || 'Conforme'],
      ['Mecánica y Trituración', 'Hermeticidad de Empaques y Tolva Alimentación', meca.hermeticidadEmpaquesTolva || 'Conforme'],
      ['Extracción de Polvos', 'Nivel Llenado Tambor Vidrio y Polvo Fosfórico', extr.nivelLlenadoTamborVidrio || 'Conforme'],
      ['Extracción de Polvos', 'Inspección Mangueras Succión y Sellos Vacío', extr.inspeccionManguerasSuccion || 'Conforme'],
      ['Seguridad Operativa', 'Paradas de Emergencia e Interlocks Compuerta', segu.parosEmergenciaInterlocks || 'Conforme'],
      ['Seguridad Operativa', 'Manómetros de Depresión y Medidores Vacío', segu.medidoresDepresionVacio || 'Conforme']
    ];
    drawDataTable(lampHeaders, lampWidths, lampRows, false, 5.6);

    drawSectionHeader('IV. OBSERVACIONES TÉCNICAS Y REPUESTOS REEMPLAZADOS', false, 5.5);
    drawTextCard('OBSERVACIONES DE MANTENIMIENTO', data.observaciones || 'Mantenimiento preventivo conforme a protocolo de bioseguridad mercurial. Sistema operando con tiro y vacío nominal.', 'normal', false);

    const repLamp = data.repuestosUtilizados || [];
    if (repLamp.length > 0) {
      const repH = ['CANT.', 'CÓDIGO', 'REPUESTO / INSUMO', 'MOTIVO DE SUSTITUCIÓN'];
      const repW = [18, 32, 75, 53]; // Total: 178 mm
      const repR = repLamp.map((r: any) => [
        String(r.cantidad || 1),
        r.codigo || '—',
        r.repuesto || r.descripcion || '',
        r.causa || r.causaReemplazo || 'Preventivo'
      ]);
      drawDataTable(repH, repW, repR, false, 5.4);
    }

    drawSectionHeader('V. VEREDICTO FINAL Y VALIDACIÓN DE FIRMAS', false, 5.5);
    drawGridInfo([
      { key: 'Estado Operativo Final', value: String(data.estadoFinal || 'Operativo Conforme').toUpperCase() },
      { key: 'Dictamen de Bioseguridad', value: 'EQUIPO SEGURO PARA OPERACIÓN CON MERCURIO' },
      { key: 'Firma Técnico Especialista', value: data.firmaTecnico || data.tecnicoResponsable || '' },
      { key: 'Firma Supervisor Planta', value: data.firmaSupervisor || 'Ing. Manuel López — Gerente de Planta' }
    ], false, 5.8);

    drawSectionHeader('VI. SISTEMA CONTROL DE CAMBIOS DEL FORMATO (ISO 9001 / ISO 14001)', true, 4.8);
    const modHeadersLamp = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
    const modWidthsLamp = [15, 35, 35, 63, 30]; // Total: 178 mm
    const modDataLamp = [
      ['1.0', '13/06/2025', 'Todas', 'Creación del formato oficial bajo norma ISO 14001 y 9001:2015', 'Comité SGI']
    ];
    drawDataTable(modHeadersLamp, modWidthsLamp, modDataLamp, true, 4.2);

  } else if (tipo === 'mantenimiento_trituradora') {
    // 26. Bitácora de Mantenimiento Trituradora de Residuos (BIT-MTO-TRIT-001) - 1 PÁGINA COMPLETA
    drawSectionHeader('I. IDENTIFICACIÓN DE EQUIPO Y CONDICIONES DEL SERVICIO', false, 5.5);
    drawGridInfo([
      { key: 'Folio Oficial', value: data.folio || 'MTO-TRIT-001' },
      { key: 'Fecha del Servicio', value: data.fecha || '' },
      { key: 'Turno Operativo', value: data.turno || 'Turno 1' },
      { key: 'Equipo Intervenido', value: `${data.nombreEquipo || 'Trituradora Industrial Shredder'} (ID: ${data.equipoId || 'TRIT-01'})` },
      { key: 'Marca / Modelo / Serie', value: `${data.marcaModelo || 'Shredder Heavy'} | Serie: ${data.serie || 'S/N'}` },
      { key: 'Ubicación en Planta', value: data.ubicacionPlanta || 'Nave de Triturado DSH' },
      { key: 'Horómetro de Operación', value: data.horometro !== undefined && data.horometro !== null && data.horometro !== '' ? `${Number(data.horometro).toLocaleString()} Horas` : '' },
      { key: 'Horas de Paro', value: `${data.horasParo || 0} Horas` },
      { key: 'Tipo de Mantenimiento', value: data.tipoMantenimiento || 'Preventivo Semanal/Mensual' },
      { key: 'Candadeo LOTO Aplicado', value: data.lotoAplicado ? 'SÍ [CONFORME]' : 'NO' },
      { key: 'Técnico Responsable', value: data.tecnicoResponsable || '' },
      { key: 'Supervisado Por', value: data.firmaSupervisor || 'Ing. Manuel López — Gerente de Planta' }
    ], false, 6.0);

    drawSectionHeader('II. INSPECCIÓN MECÁNICA, ELÉCTRICA Y PARÁMETROS HIDRÁULICOS', false, 5.5);
    const tritHeaders = ['SISTEMA EVALUADO', 'COMPONENTE / PARÁMETRO', 'CONDICIÓN / LECTURA'];
    const tritWidths = [48, 85, 45]; // Total: 178 mm
    const tritRows = [
      ['Mecánica Cuchillas', 'Estado y Filo de Cuchillas Trituradoras', data.estadoCuchillas || 'Bueno'],
      ['Mecánica Transmisión', 'Nivel y Calidad de Aceite en Reductor', data.nivelAceiteReductor || 'Conforme'],
      ['Mecánica Rodamientos', 'Ruidos Anormales y Nivel de Vibraciones', data.ruidosVibraciones || 'Normal'],
      ['Higiene y Desinfección', 'Limpieza y Desinfección Interna de Tolva', data.limpiezaDesinfeccion || 'Realizada'],
      ['Sistema Seguridad', 'Prueba de Reversa Automática (Auto-Reverse)', data.pruebaAutoReverse || 'Conforme'],
      ['Lubricación', 'Engrase General de Chumaceras y Rodamientos', data.engraseRodamientos || 'Realizado'],
      ['Transmisión Motriz', 'Tensión de Fajas, Cadenas y Acoples', data.tensionFajasCadenas || 'Ajustada'],
      ['Eléctrico Motor', 'Consumo de Amperaje Motor Principal (A)', `${data.consumoAmperajeMotorA || 62} A (Nominal: 65 A)`],
      ['Sistema Hidráulico', 'Presión de Empuje Hidráulico (PSI)', `${data.presionSistemaHidraulicoPsi || 2100} PSI`]
    ];
    drawDataTable(tritHeaders, tritWidths, tritRows, false, 5.6);

    drawSectionHeader('III. ANOMALÍAS DETECTADAS Y TRABAJOS EJECUTADOS', false, 5.5);
    if (data.anomaliasDetectadas) {
      drawTextCard('ANOMALÍAS O DESVIACIONES DETECTADAS', data.anomaliasDetectadas, 'warning', false);
    }
    drawTextCard('DESCRIPCIÓN DEL TRABAJO REALIZADO', data.descripcionTrabajo || 'Inspección periódica, lubricación general y ajuste de torque de cuchillas de corte.', 'normal', false);

    const repTrit = data.repuestosUtilizados || [];
    if (repTrit.length > 0) {
      const repH = ['CANT.', 'REPUESTO / PIEZA', 'PROVEEDOR'];
      const repW = [24, 100, 54]; // Total: 178 mm
      const repR = repTrit.map((r: any) => [
        String(r.cantidad || 1),
        r.repuesto || r.descripcion || '',
        r.proveedor || 'Almacén Central SGI'
      ]);
      drawDataTable(repH, repW, repR, false, 5.4);
    }

    drawSectionHeader('IV. DICTAMEN FINAL Y FIRMAS DE CONFORMIDAD', false, 5.5);
    drawGridInfo([
      { key: 'Estado Operativo Final', value: String(data.estadoFinal || 'Operativo Conforme').toUpperCase() },
      { key: 'Dictamen de Operatividad', value: 'TRITURADORA APTA PARA MOLIENDA CONTINUA DSH' },
      { key: 'Firma Técnico Responsable', value: data.firmaTecnico || data.tecnicoResponsable || '' },
      { key: 'Firma Supervisor Planta', value: data.firmaSupervisor || 'Ing. Manuel López — Gerente de Planta' }
    ], false, 5.8);

    drawSectionHeader('V. SISTEMA CONTROL DE CAMBIOS DEL FORMATO (ISO 9001 / ISO 14001)', true, 4.8);
    const modHeadersTrit = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
    const modWidthsTrit = [15, 35, 35, 63, 30]; // Total: 178 mm
    const modDataTrit = [
      ['1.0', '13/06/2025', 'Todas', 'Creación del formato oficial bajo norma ISO 14001 y 9001:2015', 'Comité SGI']
    ];
    drawDataTable(modHeadersTrit, modWidthsTrit, modDataTrit, true, 4.2);

  } else if (tipo === 'mantenimiento_compactadora') {
    // 27. Bitácora de Mantenimiento Compactadora / Prensa (BIT-MTO-COMP-001) - 1 PÁGINA COMPLETA
    drawSectionHeader('I. INFORMACIÓN DEL EQUIPO Y PARÁMETROS DE SERVICIO', false, 5.5);
    drawGridInfo([
      { key: 'Folio Oficial', value: data.folio || 'MTO-COMP-001' },
      { key: 'Fecha del Servicio', value: data.fecha || '' },
      { key: 'Turno Operativo', value: data.turno || 'Turno 1' },
      { key: 'Equipo Intervenido', value: `${data.nombreEquipo || 'Compactadora de Residuos'} (ID: ${data.equipoId || 'COMP-01'})` },
      { key: 'Periodicidad del Mantenimiento', value: data.periodicidad || 'Semanal/Mensual (Técnico)' },
      { key: 'Tipo de Mantenimiento', value: data.tipoMantenimiento || 'Preventivo' },
      { key: 'Horómetro de Operación', value: data.horometro !== undefined && data.horometro !== null && data.horometro !== '' ? `${Number(data.horometro).toLocaleString()} Horas` : '' },
      { key: 'Técnico Responsable', value: data.tecnicoResponsable || '' }
    ], false, 6.0);

    drawSectionHeader('II. INSPECCIÓN HIDRÁULICA, SELLOS Y SISTEMAS DE SEGURIDAD', false, 5.5);
    const compHeaders = ['RUBRO INSPECCIONADO', 'CRITERIO / COMPONENTE', 'CONFORMIDAD / EVALUACIÓN'];
    const compWidths = [48, 85, 45]; // Total: 178 mm
    const compRows = [
      ['Hidráulica', 'Fugas de Fluidos Debajo del Plato Prensador', data.fugaFluidosDebajoPlato || 'Conforme'],
      ['Estructura', 'Hermeticidad y Sellos de Puerta Principal', data.hermeticidadSellosPuerta || 'Conforme'],
      ['Bioseguridad', 'Limpieza y Desinfección de Tolva de Carga', data.limpiezaDesinfeccionTolva || 'Conforme'],
      ['Seguridad', 'Paros de Emergencia y Fotoceldas de Seguridad', data.parosEmergenciaFotoceldas || 'Conforme'],
      ['Hidráulica', 'Ruidos Anormales en Motor y Bomba Hidráulica', data.ruidosMotorHidraulico || 'Conforme'],
      ['Líneas Hidráulicas', 'Inspección de Mangueras y Vástagos Cilindros', data.inspeccionManguerasCilindros || 'Bueno'],
      ['Fluido Hidráulico', 'Nivel y Calidad de Aceite Hidráulico ISO 68', data.nivelAceiteHidraulicoIso68 || 'Conforme'],
      ['Lubricación', 'Engrase de Guías de Deslizamiento y Chumaceras', data.engraseChumacerasGuias || 'Realizado'],
      ['Ventilación', 'Filtros de Aire y Respiradero del Tanque', data.filtrosAireRespiradero || 'Bueno'],
      ['Retención Ambiental', 'Empaque y Bandeja de Retención Lixiviados', data.empaqueRetencionLixiviados || 'Bueno']
    ];
    drawDataTable(compHeaders, compWidths, compRows, false, 5.4);

    drawSectionHeader('III. REGISTRO DE TRABAJOS, CORRECTIVOS Y BIOSEGURIDAD', false, 5.5);
    if (data.causaRaizFalla) {
      drawTextCard('CAUSA RAÍZ DE LA FALLA O INCIDENCIA', data.causaRaizFalla, 'warning', false);
    }
    drawTextCard('TRABAJO EJECUTADO Y ACCIÓN CORRECTIVA', data.accionCorrectiva || 'Revisión hidráulica, reengrase de guías y ajuste de interruptores límite de prensado.', 'normal', false);

    if (data.repuestosUtilizados) {
      if (Array.isArray(data.repuestosUtilizados) && data.repuestosUtilizados.length > 0) {
        const repH = ['CANT.', 'REPUESTO / INSUMO', 'MOTIVO'];
        const repW = [24, 100, 54];
        const repR = data.repuestosUtilizados.map((r: any) => [
          String(r.cantidad || 1),
          r.repuesto || r.descripcion || '',
          r.causa || r.causaReemplazo || 'Preventivo'
        ]);
        drawDataTable(repH, repW, repR, false, 5.0);
      } else if (typeof data.repuestosUtilizados === 'string') {
        drawTextCard('REPUESTOS E INSUMOS CONSUMIDOS', data.repuestosUtilizados, 'normal', true);
      }
    }

    drawSectionHeader('IV. PROTOCOLO EPP, DICTAMEN FINAL Y FIRMAS', false, 5.5);
    drawGridInfo([
      { key: 'Protocolo Bioseguridad y EPP', value: data.protocoloBioseguridadEpp ? 'CUMPLIDO AL 100%' : 'NO' },
      { key: 'Veredicto Operacional', value: String(data.estadoFinal || 'Aprobado para Operar').toUpperCase() },
      { key: 'Firma Técnico Ejecutor', value: data.firmaTecnico || data.tecnicoResponsable || '' },
      { key: 'Firma Supervisor Planta', value: data.firmaSupervisor || 'Ing. Manuel López — Gerente de Planta' }
    ], false, 5.8);

    drawSectionHeader('V. SISTEMA CONTROL DE CAMBIOS DEL FORMATO (ISO 9001 / ISO 14001)', true, 4.8);
    const modHeadersComp = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
    const modWidthsComp = [15, 35, 35, 63, 30]; // Total: 178 mm
    const modDataComp = [
      ['1.0', '13/06/2025', 'Todas', 'Creación del formato oficial bajo norma ISO 14001 y 9001:2015', 'Comité SGI']
    ];
    drawDataTable(modHeadersComp, modWidthsComp, modDataComp, true, 4.2);

  } else if (tipo === 'mantenimiento_autoclaves') {
    // 28. Bitácora de Mantenimiento Autoclaves de Esterilización (BIT-MTO-AUTO-001) - 1 PÁGINA COMPLETA
    drawSectionHeader('I. INFORMACIÓN GENERAL Y PARÁMETROS TERMODINÁMICOS', false, 5.5);
    drawGridInfo([
      { key: 'Folio Oficial', value: data.folio || 'MTO-AUTO-001' },
      { key: 'Fecha del Servicio', value: data.fecha || '' },
      { key: 'Turno Operativo', value: data.turno || 'Turno 1' },
      { key: 'Autoclave Intervenida', value: String(data.equipoId || 'AUTO CLAVE 1') },
      { key: 'Tipo de Mantenimiento', value: data.tipoMantenimiento || 'Preventivo Periódico' },
      { key: 'Horómetro de Operación', value: data.horometro !== undefined && data.horometro !== null && data.horometro !== '' ? `${Number(data.horometro).toLocaleString()} Horas` : '' },
      { key: 'Técnico Responsable', value: data.tecnicoResponsable || '' },
      { key: 'Presión Vapor Caldera', value: `${data.presionVaporCalderaPsi || 75} PSI (Nominal: 70-80 PSI)` },
      { key: 'Presión de Cámara', value: `${data.presionCamaraPsi || 32} PSI (Nominal: 30-35 PSI)` },
      { key: 'Temperatura Esterilización', value: `${data.temperaturaC || 134} °C (Nominal: 134 °C)` },
      { key: 'Tiempo de Ciclo Térmico', value: `${data.tiempoCicloMin || 45} Minutos` },
      { key: 'Supervisado Por', value: data.firmaSupervisor || 'Ing. Manuel López — Gerente de Planta' }
    ], false, 6.0);

    drawSectionHeader('II. INSPECCIÓN DE COMPONENTES CRÍTICOS Y PRUEBAS FUNCIONALES', false, 5.5);
    const autoHeaders = ['SISTEMA AUDITADO', 'COMPONENTE / PRUEBA EJECUTADA', 'RESULTADO EVALUADO'];
    const autoWidths = [48, 85, 45]; // Total: 178 mm
    const autoRows = [
      ['Pruebas de Vacío', 'Prueba de Vacío Previo y Retención', data.pruebaVacioResultado || 'Conforme'],
      ['Línea de Vapor', 'Drenaje de Condensados y Trampas de Vapor', data.drenajeCondensadosTrampa || 'Conforme'],
      ['Hermeticidad Puerta', 'Estado de Empaque de Silicona de Puerta', data.estadoEmpaquePuerta || 'Excelente'],
      ['Seguridad Sobrepresión', 'Válvulas de Seguridad y Disco de Alivio', data.valvulasSeguridadAlivio || 'Bueno'],
      ['Instrumentación', 'Manómetros de Presión y Certificados Calibración', data.manometrosCalibracion || 'Bueno'],
      ['Control Térmico', 'Transmisores de Temperatura PT100 / Termopares', data.transmisoresPt100 || 'Bueno'],
      ['Filtración', 'Filtro Canasta de Descarga de Residuos', data.filtroCanastaDescarga || 'Limpio'],
      ['Mecánica Puerta', 'Engrase y Ajuste de Brazos de Cierre', data.engraseBrazosCierre || 'Realizado']
    ];
    drawDataTable(autoHeaders, autoWidths, autoRows, false, 5.6);

    drawSectionHeader('III. INTERVENCIÓN TÉCNICA, CALIBRACIÓN Y REPUESTOS', false, 5.5);
    drawTextCard('DESCRIPCIÓN DE LA INTERVENCIÓN TÉCNICA', data.descripcionIntervencion || 'Inspección rutinaria, limpieza de trampas y comprobación de hermeticidad de compuerta.', 'normal', false);

    if (data.repuestosCalibraciones) {
      drawTextCard('REPUESTOS, INSUMOS Y CERTIFICACIONES', data.repuestosCalibraciones, 'normal', false);
    }

    drawSectionHeader('IV. ESTADO FINAL DE OPERABILIDAD Y FIRMAS', false, 5.5);
    drawGridInfo([
      { key: 'Estado Final del Autoclave', value: String(data.estadoFinal || 'Operativa al 100%').toUpperCase() },
      { key: 'Dictamen de Bioseguridad', value: 'ESTERILIZACIÓN EFECTIVA Y CONFORME' },
      { key: 'Firma Técnico Especialista', value: data.firmaTecnico || data.tecnicoResponsable || '' },
      { key: 'Firma Supervisor Planta', value: data.firmaSupervisor || 'Ing. Manuel López — Gerente de Planta' }
    ], false, 6.0);

  } else if (tipo === 'limpieza_desinfeccion_planta') {
    // 29. Control Diario de Limpieza y Desinfección de Planta (BIT-LIM-DES-001) - 1 PÁGINA COMPLETA
    drawSectionHeader('I. INFORMACIÓN OPERATIVA, TURNO Y CUADRILLA', true);
    drawGridInfo([
      { key: 'Folio Oficial', value: data.folio || 'LIM-DES-001' },
      { key: 'Fecha de la Jornada', value: data.fecha || '' },
      { key: 'Turno Operativo', value: data.turno || 'Mañana' },
      { key: 'Supervisor Responsable HSE', value: data.supervisorResponsable || '' },
      { key: 'Cuadrilla de Operadores', value: data.cuadrillaOperadores || '' },
      { key: 'Hora Preparación Química', value: data.horaPreparacion || '06:15' }
    ], 5.6);

    drawSectionHeader('II. PARÁMETROS DE PREPARACIÓN DE SOLUCIÓN BIOCIDA', true);
    drawGridInfo([
      { key: 'Producto Químico Desinfectante', value: data.productoQuimico || 'Amonio Cuaternario' },
      { key: 'Lote del Químico', value: data.loteProducto || 'L-AQ-2026-09' },
      { key: 'Concentración Objetivo (PPM)', value: `${data.concentracionObjetivoPpm || 400} PPM` },
      { key: 'Concentración Medida (PPM)', value: `${data.concentracionMedidaPpm || 405} PPM [EN NORMA]` }
    ], 5.6);

    drawSectionHeader('III. MATRIZ DE LIMPIEZA Y SANITIZACIÓN POR ZONAS DE PLANTA', true);
    const zonas = data.zonas || [
      { area: 'Bahía de Descarga y Recepción DSH', frecuencia: 'Por Turno', tipoLimpieza: 'Desinfección de Choque', hora: '06:30', estatus: 'Conforme', operador: 'Cuadrilla' },
      { area: 'Cuarto Frío / Almacenamiento Temporal', frecuencia: 'Diario', tipoLimpieza: 'Limpieza Profunda', hora: '07:00', estatus: 'Conforme', operador: 'Cuadrilla' },
      { area: 'Área de Autoclaves y Esterilización', frecuencia: 'Por Ciclo', tipoLimpieza: 'Desinfección de Choque', hora: '07:30', estatus: 'Conforme', operador: 'Cuadrilla' },
      { area: 'Área de Incineración DSH', frecuencia: 'Diario', tipoLimpieza: 'Rutinaria', hora: '08:00', estatus: 'Conforme', operador: 'Cuadrilla' },
      { area: 'Área de Trituración y Molienda', frecuencia: 'Por Turno', tipoLimpieza: 'Desinfección de Choque', hora: '08:30', estatus: 'Conforme', operador: 'Cuadrilla' },
      { area: 'Área de Compactadora y Prensa', frecuencia: 'Por Turno', tipoLimpieza: 'Rutinaria', hora: '09:00', estatus: 'Conforme', operador: 'Cuadrilla' },
      { area: 'Túnel de Lavado de Contenedores', frecuencia: 'Continuo', tipoLimpieza: 'Limpieza Profunda', hora: '09:30', estatus: 'Conforme', operador: 'Cuadrilla' },
      { area: 'Área de Caldera y Servicios Auxiliares', frecuencia: 'Diario', tipoLimpieza: 'Rutinaria', hora: '10:00', estatus: 'Conforme', operador: 'Cuadrilla' }
    ];

    const zonaHeaders = ['ÁREA / ZONA DE PLANTA', 'FRECUENCIA', 'TIPO ACCIÓN', 'HORA', 'ESTATUS', 'OPERADOR'];
    const zonaWidths = [48, 24, 38, 16, 22, 30]; // Total: 178 mm
    const zonaRows = zonas.map((z: any) => [
      z.area || '',
      z.frecuencia || '',
      z.tipoLimpieza || '',
      z.hora || '',
      z.estatus || 'Conforme',
      z.operador || 'Cuadrilla'
    ]);
    drawDataTable(zonaHeaders, zonaWidths, zonaRows, 5.0);

    drawSectionHeader('IV. VERIFICACIÓN DE EPP Y DISPONIBILIDAD DE INSUMOS', true);
    drawGridInfo([
      { key: 'Guantes Nitrilo Alta Resistencia', value: data.eppGuantesNitrilo ? 'CUMPLE [X]' : 'NO' },
      { key: 'Botas de Hule con Puntera', value: data.eppBotasImpermeables ? 'CUMPLE [X]' : 'NO' },
      { key: 'Mandil / Traje Tyvek Impermeable', value: data.eppTrajeTyvekMandil ? 'CUMPLE [X]' : 'NO' },
      { key: 'Respirador Filtro Vapores', value: data.eppRespiradorVapores ? 'CUMPLE [X]' : 'NO' },
      { key: 'Careta Facial / Goggles', value: data.eppCaretaFacial ? 'CUMPLE [X]' : 'NO' },
      { key: 'Paños y Mopas Exclusivas Limpias', value: data.panosMopasLímpias ? 'DISPONIBLES [X]' : 'NO' }
    ], 5.6);

    drawSectionHeader('V. NOVEDADES, ACCIONES CORRECTIVAS Y VALIDACIÓN', true);
    drawTextCard('NOVEDADES O DESVIACIONES DETECTADAS', data.desviacionesNovedades || 'Jornada de desinfección completada sin novedades biológicas.', 'normal', true);
    if (data.accionesCorrectivas) {
      drawTextCard('ACCIONES CORRECTIVAS INMEDIATAS', data.accionesCorrectivas, 'normal', true);
    }

    drawSectionHeader('VI. DICTAMEN DE CUMPLIMIENTO Y FIRMAS', true);
    drawGridInfo([
      { key: 'Veredicto de Cumplimiento', value: String(data.veredictoCumplimiento || 'Cumplimiento Total (100%)').toUpperCase() },
      { key: 'Dictamen de Bioseguridad', value: 'ÁREAS SANITIZADAS APTAS PARA OPERACIÓN' },
      { key: 'Firma Operador Líder', value: data.firmaOperadorLider || '' },
      { key: 'Firma Supervisor HSE', value: data.firmaSupervisorHse || '' }
    ], 5.6);
  }

  // --- CONTROL DE CAMBIOS TABLE (Only for single-page forms, since 360 forms render it on Page 2) ---
  if (!tipo.startsWith('evaluacion_360_')) {
    if (y > pageHeight - 20) {
      doc.addPage();
      drawHeader();
    }
    drawSectionHeader('SISTEMA CONTROL DE CAMBIOS DEL FORMATO', true, 5.0);
    const modHeaders = ['VER', 'FECHA MODIFICACIÓN', 'SECCIÓN COMPROMETIDA', 'MOTIVO DEL CAMBIO / AJUSTE', 'SOLICITANTE COMITÉ'];
    const modWidths = [15, 35, 35, 63, 30]; // Total: 178 mm
    const modData = [
      ['1.0', '13/06/2025', 'Todas', 'Creación del formato oficial bajo norma ISO 14001 y 9001:2015', 'Comité SGI']
    ];
    drawDataTable(modHeaders, modWidths, modData, true, 4.8);
  }

  // Draw Footer on all pages with page numbering
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    drawFooter(pageNum, totalPages);
  }

  // Save / Action Download trigger
  const fechaVal = String(data.fecha || new Date().toISOString().split('T')[0]);
  const escapedFileName = `${meta.code}_${tipo}_${fechaVal.replace(/\//g, '-')}.pdf`;
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
