import React, { useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface Props {
  tipo: string;
  userEmail: string;
  onSuccess: () => void;
}

export default function BulkUploadPanel({ tipo, userEmail, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' | '' }>({ text: '', type: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column definitions and sample data for the 14 bitácoras
  const getTemplateData = () => {
    const today = new Date().toISOString().split('T')[0];
    switch (tipo) {
      case 'inventarios':
        return {
          filename: 'Formato_Control_Inventarios.xlsx',
          sheetName: 'Inventarios',
          columns: ['Fecha', 'Turno', 'Area', 'Responsable', 'Observaciones', 'Hora', 'Producto', 'Cantidad', 'Firma'],
          samples: [
            { Fecha: today, Turno: 'Matutino', Area: 'Almacén Central', Responsable: userEmail, Observaciones: 'Carga masiva inicial', Hora: '08:00', Producto: 'Bolsas Rojas RPBI', Cantidad: 150, Firma: 'Aprobado' },
            { Fecha: today, Turno: 'Matutino', Area: 'Almacén Central', Responsable: userEmail, Observaciones: 'Carga masiva inicial', Hora: '08:30', Producto: 'Insumo Cloro SGI', Cantidad: 45, Firma: 'Aprobado' }
          ]
        };
      case 'entrega_contenedores':
        return {
          filename: 'Formato_Entrega_Contenedores.xlsx',
          sheetName: 'Contenedores',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Total Contenedores', 'Ruta', 'Cantidad', 'Firma Recibe', 'Tapadera Buen Estado (Si/No)', 'Cuerpo Buen Estado (Si/No)', 'Llantas Buen Estado (Si/No)', 'Halador Buen Estado (Si/No)'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Inspección de contenedores', 'Total Contenedores': 12, Ruta: 'Ruta Metropolitana A', Cantidad: 6, 'Firma Recibe': 'Recibido Piloto 1', 'Tapadera Buen Estado (Si/No)': 'Si', 'Cuerpo Buen Estado (Si/No)': 'Si', 'Llantas Buen Estado (Si/No)': 'Si', 'Halador Buen Estado (Si/No)': 'Si' },
            { Fecha: today, Responsable: userEmail, Observaciones: 'Inspección de contenedores', 'Total Contenedores': 12, Ruta: 'Ruta Hospitales Norte', Cantidad: 6, 'Firma Recibe': 'Recibido Piloto 2', 'Tapadera Buen Estado (Si/No)': 'Si', 'Cuerpo Buen Estado (Si/No)': 'Si', 'Llantas Buen Estado (Si/No)': 'Si', 'Halador Buen Estado (Si/No)': 'Si' }
          ]
        };
      case 'disposicion_pirolisis':
        return {
          filename: 'Formato_Disposicion_Pirolisis.xlsx',
          sheetName: 'Pirolisis',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Total Libras', 'Total Pacas', 'Proceso', 'Pacas', 'No Pase Traslado', 'Firma Recibe'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Envío de pacas a pirolisis', 'Total Libras': 480, 'Total Pacas': 4, Proceso: 'Proceso 01', Pacas: 2, 'No Pase Traslado': 'PT-10029', 'Firma Recibe': 'Receptor Planta' },
            { Fecha: today, Responsable: userEmail, Observaciones: 'Envío de pacas a pirolisis', 'Total Libras': 480, 'Total Pacas': 4, Proceso: 'Proceso 02', Pacas: 2, 'No Pase Traslado': 'PT-10030', 'Firma Recibe': 'Receptor Planta' }
          ]
        };
      case 'disposicion_vertedero':
        return {
          filename: 'Formato_Disposicion_Vertedero.xlsx',
          sheetName: 'Vertedero',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Total Viajes', 'Total Pacas', 'Total Pesaje', 'Camion', 'Placa', 'No Pase Salida', 'Cantidad Pacas', 'Pesaje', 'Hora Salida', 'Nombre Piloto', 'Correlativo Pacas'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Disposición final municipal', 'Total Viajes': 1, 'Total Pacas': 40, 'Total Pesaje': 4500, Camion: 'Camion 01', Placa: 'C-928BKN', 'No Pase Salida': 'PS-998', 'Cantidad Pacas': 40, Pesaje: 4500, 'Hora Salida': '11:00', 'Nombre Piloto': 'Juan Pérez', 'Correlativo Pacas': 'P-001 a P-040' }
          ]
        };
      case 'control_incineracion':
        return {
          filename: 'Formato_Control_Incineracion.xlsx',
          sheetName: 'Incineracion',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Incinerador', 'Duracion Proceso', 'Total Libras', 'Hora Inicio', 'Hora Fin', 'Temp Combustion (C)', 'Temp Post-Combustion (C)', 'Cantidad Polvo Fin', 'Combustible Usado', 'Combustible Cantidad', 'Ingreso Numero', 'Libras Ingreso'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Incineración segura', Incinerador: 'Incinerador Alfa-1', 'Duracion Proceso': '4 horas', 'Total Libras': 850, 'Hora Inicio': '08:00', 'Hora Fin': '12:00', 'Temp Combustion (C)': 850, 'Temp Post-Combustion (C)': 1100, 'Cantidad Polvo Fin': 45, 'Combustible Usado': 'Gas propano', 'Combustible Cantidad': 120, 'Ingreso Numero': 'CANTIDAD DE LIBRAS INGRESO 01', 'Libras Ingreso': 450 },
            { Fecha: today, Responsable: userEmail, Observaciones: 'Incineración segura', Incinerador: 'Incinerador Alfa-1', 'Duracion Proceso': '4 horas', 'Total Libras': 850, 'Hora Inicio': '08:00', 'Hora Fin': '12:00', 'Temp Combustion (C)': 850, 'Temp Post-Combustion (C)': 1100, 'Cantidad Polvo Fin': 45, 'Combustible Usado': 'Gas propano', 'Combustible Cantidad': 120, 'Ingreso Numero': 'CANTIDAD DE LIBRAS INGRESO 02', 'Libras Ingreso': 400 }
          ]
        };
      case 'cuarto_frio':
        return {
          filename: 'Formato_Control_Cuarto_Frio.xlsx',
          sheetName: 'Cuarto Frio',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Cuarto Frio', 'Hora Inspeccion', 'Cantidad Congeladores Activos', 'Temp Entrada (C)', 'Temp Salida (C)', 'Congelador 1 (C)', 'Congelador 2 (C)', 'Congelador 3 (C)', 'Congelador 4 (C)', 'Congelador 5 (C)', 'Congelador 6 (C)', 'Limpieza Paredes Ext (Si/No)', 'Limpieza Paredes Int (Si/No)', 'Limpieza Piso (Si/No)', 'Evaporadores Conforme (Si/No)', 'Condensadores Conforme (Si/No)', 'Luces Conforme (Si/No)', 'Limpieza Techo (Si/No)', 'Limpieza Exterior Techo (Si/No)', 'Residuo Ordenado (Si/No)'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Monitoreo diario de frío', 'Cuarto Frio': 'Sección Fría Norte / Cámara A', 'Hora Inspeccion': '07:30', 'Cantidad Congeladores Activos': 6, 'Temp Entrada (C)': 1.8, 'Temp Salida (C)': 2.2, 'Congelador 1 (C)': -5.2, 'Congelador 2 (C)': -4.8, 'Congelador 3 (C)': -4.5, 'Congelador 4 (C)': -5.8, 'Congelador 5 (C)': -5.0, 'Congelador 6 (C)': -4.2, 'Limpieza Paredes Ext (Si/No)': 'Si', 'Limpieza Paredes Int (Si/No)': 'Si', 'Limpieza Piso (Si/No)': 'Si', 'Evaporadores Conforme (Si/No)': 'Si', 'Condensadores Conforme (Si/No)': 'Si', 'Luces Conforme (Si/No)': 'Si', 'Limpieza Techo (Si/No)': 'Si', 'Limpieza Exterior Techo (Si/No)': 'Si', 'Residuo Ordenado (Si/No)': 'Si' }
          ]
        };
      case 'reduccion_volumen':
        return {
          filename: 'Formato_Reduccion_Volumen.xlsx',
          sheetName: 'Reduccion Volumen',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'No Trituradora', 'Tiempo Proceso', 'No Proceso', 'Peso Entrada', 'Peso Salida', 'Cantidad Pacas', 'Hora Inicio', 'Hora Fin', 'Linea Utilizada', 'Trituradora Conforme (Si/No)', 'Cajas Reductoras Conforme (Si/No)', 'Fajas Conforme (Si/No)', 'Elevador Carros Conforme (Si/No)', 'Banda Conforme (Si/No)', 'Compactadora Conforme (Si/No)', 'Anotaciones Especiales'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Proceso matutino normal', 'No Trituradora': 'Trituradora T-100', 'Tiempo Proceso': '120 minutos', 'No Proceso': 'PRO-0982', 'Peso Entrada': 1200, 'Peso Salida': 1185, 'Cantidad Pacas': 12, 'Hora Inicio': '08:00', 'Hora Fin': '10:00', 'Linea Utilizada': 'Linea Principal 1', 'Trituradora Conforme (Si/No)': 'Si', 'Cajas Reductoras Conforme (Si/No)': 'Si', 'Fajas Conforme (Si/No)': 'Si', 'Elevador Carros Conforme (Si/No)': 'Si', 'Banda Conforme (Si/No)': 'Si', 'Compactadora Conforme (Si/No)': 'Si', 'Anotaciones Especiales': 'Sin fallas registradas' }
          ]
        };
      case 'control_autoclaves':
        return {
          filename: 'Formato_Control_Autoclaves.xlsx',
          sheetName: 'Control Autoclaves',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'No Autoclave', 'Peso Proceso', 'No Proceso', 'Linea Utilizada', 'Indicador Biologico (Si/No)', 'Indicador Quimico (Si/No)', 'Identificacion Indicador', 'Resultado Indicador', 'No Lote Fabricante', 'Temp Incubacion', 'Cinta Testigo Color (Verde/Cafe)', 'Temperatura Conforme (Si/No)', 'Presion Conforme (Si/No)', 'Tiempo Esteril Conforme (Si/No)', 'Bomba Vacio Conforme (Si/No)', 'Firma Supervisor', 'Firma Coordinador', 'Observaciones Generales Proceso', 'Peso Bruto 1', 'Peso Neto 1', 'Peso Bruto 2', 'Peso Neto 2', 'Peso Bruto 3', 'Peso Neto 3', 'Peso Bruto 4', 'Peso Neto 4', 'Peso Bruto 5', 'Peso Neto 5', 'Peso Bruto 6', 'Peso Neto 6', 'Peso Bruto Total'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Ciclo biológico normal', 'No Autoclave': 'Autoclave AT-01', 'Peso Proceso': 650, 'No Proceso': 'CICLO-229', 'Linea Utilizada': 'Linea 1', 'Indicador Biologico (Si/No)': 'Si', 'Indicador Quimico (Si/No)': 'Si', 'Identificacion Indicador': 'IB-3948', 'Resultado Indicador': 'Negativo (Sin proliferación)', 'No Lote Fabricante': 'LOT-2026-9A', 'Temp Incubacion': '120 grados y 21 minutos', 'Cinta Testigo Color (Verde/Cafe)': 'cafe', 'Temperatura Conforme (Si/No)': 'Si', 'Presion Conforme (Si/No)': 'Si', 'Tiempo Esteril Conforme (Si/No)': 'Si', 'Bomba Vacio Conforme (Si/No)': 'Si', 'Firma Supervisor': 'Firma Supervisor', 'Firma Coordinador': 'Firma Coordinador', 'Observaciones Generales Proceso': 'Ciclo completo y validado', 'Peso Bruto 1': 300, 'Peso Neto 1': 120, 'Peso Bruto 2': 300, 'Peso Neto 2': 120, 'Peso Bruto 3': 300, 'Peso Neto 3': 120, 'Peso Bruto 4': 300, 'Peso Neto 4': 120, 'Peso Bruto 5': 300, 'Peso Neto 5': 120, 'Peso Bruto 6': 230, 'Peso Neto 6': 50, 'Peso Bruto Total': 1730 }
          ]
        };
      case 'generacion_almacenamiento':
        return {
          filename: 'Formato_Generacion_Almacenamiento.xlsx',
          sheetName: 'RPBI',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Ente Generador', 'Peso Ticket Bascula', 'Ubicacion', 'No Ticket Bascula', 'Inorganico (Si/No)', 'Punzo Cortante (Si/No)', 'Patologico (Si/No)', 'Contenedor (Si/No)', 'Tonel Metalico (Si/No)', 'Congelador (Si/No)', 'No Ticket Interno', 'Tipo Residuo', 'Tipo Embalaje', 'Cantidad', 'Peso Ticket Interno', 'Ubicacion Fila (Izquierda/Derecha)'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Registro masivo', 'Ente Generador': 'Hospital General San Juan', 'Peso Ticket Bascula': 120, 'Ubicacion': 'Bodega Norte', 'No Ticket Bascula': 'TB-8849', 'Inorganico (Si/No)': 'Si', 'Punzo Cortante (Si/No)': 'No', 'Patologico (Si/No)': 'No', 'Contenedor (Si/No)': 'Si', 'Tonel Metalico (Si/No)': 'No', 'Congelador (Si/No)': 'No', 'No Ticket Interno': 'TI-101', 'Tipo Residuo': 'Inorgánico', 'Tipo Embalaje': 'Contenedor', 'Cantidad': 1, 'Peso Ticket Interno': 120, 'Ubicacion Fila (Izquierda/Derecha)': 'Izquierda' }
          ]
        };
      case 'lavado_banos':
        return {
          filename: 'Formato_Lavado_Banos.xlsx',
          sheetName: 'Lavado Banos',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Turno', 'Ubicacion Banos', 'Desinfectante Usado', 'Lavado Sanitarios (Si/No)', 'Lavado Lavamanos (Si/No)', 'Barrido Trapeado (Si/No)', 'Limpieza Espejos (Si/No)', 'Limpieza Vidrios (Si/No)', 'Desinfeccion Superficies (Si/No)', 'Vaciado Papeleras (Si/No)', 'Abastecimiento Papel (Si/No)', 'Abastecimiento Jabon (Si/No)', 'Abastecimiento Toallas (Si/No)', 'Abastecimiento Sanitizante (Si/No)'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Limpieza profunda matutina', Turno: 'Matutino', 'Ubicacion Banos': 'Planta Alta', 'Desinfectante Usado': 'Cloro SGI al 5%', 'Lavado Sanitarios (Si/No)': 'Si', 'Lavado Lavamanos (Si/No)': 'Si', 'Barrido Trapeado (Si/No)': 'Si', 'Limpieza Espejos (Si/No)': 'Si', 'Limpieza Vidrios (Si/No)': 'Si', 'Desinfeccion Superficies (Si/No)': 'Si', 'Vaciado Papeleras (Si/No)': 'Si', 'Abastecimiento Papel (Si/No)': 'Si', 'Abastecimiento Jabon (Si/No)': 'Si', 'Abastecimiento Toallas (Si/No)': 'Si', 'Abastecimiento Sanitizante (Si/No)': 'Si' }
          ]
        };
      case 'insumos_quimicos':
        return {
          filename: 'Formato_Insumos_Quimicos.xlsx',
          sheetName: 'Insumos',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Turno', 'Producto', 'Unidad Medida', 'Stock Inicial', 'Unidades Recibidas', 'Unidades Consumidas', 'Stock Final', 'No Lote Proveedor'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Inventario de insumos químicos', Turno: 'Matutino', Producto: 'Cloro Concentrado', 'Unidad Medida': 'Galones', 'Stock Inicial': 20, 'Unidades Recibidas': 10, 'Unidades Consumidas': 2, 'Stock Final': 28, 'No Lote Proveedor': 'LOTE-QC-991' }
          ]
        };
      case 'inventarios_sgc':
        return {
          filename: 'Formato_Inventario_SGI.xlsx',
          sheetName: 'Inventario SGI',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Area Fisica', 'Codigo Insumo', 'Descripcion', 'Medida', 'Stock Minimo', 'Existencia Real', 'Estado Empaque (Buen estado/Dañado/Por vencer)'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Control de stock SGI', 'Area Fisica': 'Área de Autoclaves', 'Codigo Insumo': 'INS-011', Descripcion: 'Cinta Testigo 3M', Medida: 'Unidad', 'Stock Minimo': 5, 'Existencia Real': 12, 'Estado Empaque (Buen estado/Dañado/Por vencer)': 'Buen estado' }
          ]
        };
      case 'control_uniformes':
        return {
          filename: 'Formato_Control_Uniformes.xlsx',
          sheetName: 'Uniformes',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Responsable Entrega', 'Colaborador', 'Puesto', 'Talla Camisa', 'Talla Pantalon', 'Talla Botas', 'Tiene Mandil (Si/No)', 'Tiene Guantes (Si/No)', 'Tiene Careta (Si/No)', 'Motivo Dotacion', 'Firma Recibido', 'Usa Uniforme Completo (Si/No)', 'Usa Botas Seguridad (Si/No)', 'Cumple Limpieza (Si/No)', 'Observacion Auditoria', 'Estado General Conforme (Si/No)'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Entrega semanal de EPP', 'Responsable Entrega': userEmail, Colaborador: 'Marcos Arriola', Puesto: 'Operador de Autoclave', 'Talla Camisa': 'M', 'Talla Pantalon': '32', 'Talla Botas': '41', 'Tiene Mandil (Si/No)': 'Si', 'Tiene Guantes (Si/No)': 'Si', 'Tiene Careta (Si/No)': 'Si', 'Motivo Dotacion': 'Dotación Semestral', 'Firma Recibido': 'Firma Marcos', 'Usa Uniforme Completo (Si/No)': 'Si', 'Usa Botas Seguridad (Si/No)': 'Si', 'Cumple Limpieza (Si/No)': 'Si', 'Observacion Auditoria': 'EPP en perfectas condiciones', 'Estado General Conforme (Si/No)': 'Si' }
          ]
        };
      case 'control_horas_cargador':
        return {
          filename: 'Formato_Control_Cargador_Frontal.xlsx',
          sheetName: 'Cargador',
          columns: ['Fecha', 'Responsable', 'Observaciones', 'Turno', 'No Reporte', 'Codigo Unidad', 'Marca Modelo', 'Anio', 'Nombre Operador', 'Codigo Empleado', 'Area Asignada', 'Supervisor Cargo', 'Lectura Inicial Horometro', 'Lectura Final Horometro', 'Total Operado Horas', 'Hora Inicio', 'Hora Termino', 'Horas Pausa Inactividad', 'Tipo Actividad Principal', 'Tipo Material Trabajado', 'Descripcion Actividades', 'Nivel Combustible Inicio', 'Litros Cargados', 'Nivel Combustible Final', 'Estado Equipo (Bueno/Falla leve/Falla grave/Equipo parado)', 'Descripcion Fallas Observaciones', 'Nivel Aceite Motor Previa (Si/No)', 'Nivel Refrigerante Previa (Si/No)', 'Presion Llantas Previa (Si/No)', 'Estado Cuchara Previa (Si/No)', 'Luces Senales Previa (Si/No)', 'Frenos Previa (Si/No)', 'Cinturon Seg Previa (Si/No)', 'Alarma Reversa Previa (Si/No)', 'Extintor Previa (Si/No)', 'Documentos Previa (Si/No)', 'Firma Operador', 'Firma Supervisor'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Bitácora de cargador frontal', Turno: 'Matutino', 'No Reporte': 'REP-5541', 'Codigo Unidad': 'CARG-02', 'Marca Modelo': 'CAT 924K', Anio: '2019', 'Nombre Operador': 'Gerson Castillo', 'Codigo Empleado': 'EMP-401', 'Area Asignada': 'Patio de Celdas', 'Supervisor Cargo': 'Supervisor SGI', 'Lectura Inicial Horometro': 1420.5, 'Lectura Final Horometro': 1426.0, 'Total Operado Horas': 5.5, 'Hora Inicio': '07:00', 'Hora Termino': '13:00', 'Horas Pausa Inactividad': 0.5, 'Tipo Actividad Principal': 'Movimiento de pacas', 'Tipo Material Trabajado': 'Plástico triturado', 'Descripcion Actividades': 'Operación estándar sin percances', 'Nivel Combustible Inicio': '1/2 Tanque', 'Litros Cargados': 40, 'Nivel Combustible Final': 'Full Tanque', 'Estado Equipo (Bueno/Falla leve/Falla grave/Equipo parado)': 'Bueno — sin novedades', 'Descripcion Fallas Observaciones': 'Todo conforme', 'Nivel Aceite Motor Previa (Si/No)': 'Si', 'Nivel Refrigerante Previa (Si/No)': 'Si', 'Presion Llantas Previa (Si/No)': 'Si', 'Estado Cuchara Previa (Si/No)': 'Si', 'Luces Senales Previa (Si/No)': 'Si', 'Frenos Previa (Si/No)': 'Si', 'Cinturon Seg Previa (Si/No)': 'Si', 'Alarma Reversa Previa (Si/No)': 'Si', 'Extintor Previa (Si/No)': 'Si', 'Documentos Previa (Si/No)': 'Si', 'Firma Operador': 'Gerson C.', 'Firma Supervisor': 'SGI Supervisor' }
          ]
        };
      default:
        return {
          filename: 'Formato_Generico.xlsx',
          sheetName: 'Formato',
          columns: ['Fecha', 'Responsable', 'Observaciones'],
          samples: [{ Fecha: today, Responsable: userEmail, Observaciones: 'Carga genérica' }]
        };
    }
  };

  const handleDownloadTemplate = () => {
    const { filename, sheetName, samples } = getTemplateData();
    const ws = XLSX.utils.json_to_sheet(samples);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFeedback({ text: 'Procesando archivo excel...', type: 'info' });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error('El archivo de Excel no contiene datos.');
        }

        const isYes = (val: any) => {
          if (!val) return false;
          const s = String(val).trim().toLowerCase();
          return s === 'si' || s === 'sí' || s === 'yes' || s === 'true' || s === '1';
        };

        const parseNum = (val: any) => {
          const n = parseFloat(val);
          return isNaN(n) ? 0 : n;
        };

        const recordsToSave: any[] = [];

        // Dynamic multi-row grouping or single row parsing based on module
        if (tipo === 'inventarios') {
          // Group by Fecha + Turno + Area
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row.Turno}_${row.Area}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                turno: row.Turno || 'Matutino',
                area: row.Area || 'Planta',
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                filas: []
              };
            }
            if (row.Producto) {
              groups[key].filas.push({
                hora: row.Hora || '08:00',
                producto: row.Producto,
                cantidad: parseNum(row.Cantidad),
                firma: row.Firma || 'Verificado'
              });
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'entrega_contenedores') {
          // Group by Fecha + Responsable
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row.Responsable}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                totalContenedores: parseNum(row['Total Contenedores']),
                estadoGeneral: {
                  tapaderaBuenEstado: isYes(row['Tapadera Buen Estado (Si/No)']),
                  cuerpoBuenEstado: isYes(row['Cuerpo Buen Estado (Si/No)']),
                  llantasBuenEstado: isYes(row['Llantas Buen Estado (Si/No)']),
                  haladorBuenEstado: isYes(row['Halador Buen Estado (Si/No)'])
                },
                filas: []
              };
            }
            if (row.Ruta) {
              groups[key].filas.push({
                ruta: row.Ruta,
                cantidad: parseNum(row.Cantidad),
                firmaRecibe: row['Firma Recibe'] || 'Recibido'
              });
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'disposicion_pirolisis') {
          // Group by Fecha + Responsable
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row.Responsable}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                totalLibras: parseNum(row['Total Libras']),
                totalPacas: parseNum(row['Total Pacas']),
                filas: []
              };
            }
            if (row.Proceso) {
              groups[key].filas.push({
                proceso: row.Proceso,
                pacas: parseNum(row.Pacas),
                noPaseTraslado: String(row['No Pase Traslado'] || ''),
                firmaRecibe: row['Firma Recibe'] || 'Recibido'
              });
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'disposicion_vertedero') {
          // Group by Fecha + Responsable
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row.Responsable}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                totalViajes: parseNum(row['Total Viajes']),
                totalPacas: parseNum(row['Total Pacas']),
                totalPesaje: parseNum(row['Total Pesaje']),
                filas: []
              };
            }
            if (row.Camion) {
              groups[key].filas.push({
                camion: row.Camion,
                placa: String(row.Placa || ''),
                noPaseSalida: String(row['No Pase Salida'] || ''),
                cantidadPacas: parseNum(row['Cantidad Pacas']),
                pesaje: parseNum(row.Pesaje),
                horaSalida: row['Hora Salida'] || '12:00',
                nombrePiloto: row['Nombre Piloto'] || '',
                correlativoPacas: row['Correlativo Pacas'] || ''
              });
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'control_incineracion') {
          // Group by Fecha + Hora Inicio + Hora Fin
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row['Hora Inicio']}_${row['Hora Fin']}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                incinerador: row.Incinerador || 'Incinerador 1',
                duracionProceso: row['Duracion Proceso'] || '4 horas',
                totalLibras: parseNum(row['Total Libras']),
                horaInicio: row['Hora Inicio'] || '08:00',
                horaFin: row['Hora Fin'] || '12:00',
                tempCombustion: parseNum(row['Temp Combustion (C)']),
                tempPostCombustion: parseNum(row['Temp Post-Combustion (C)']),
                cantidadPolvoFin: parseNum(row['Cantidad Polvo Fin']),
                combustibleUsado: row['Combustible Usado'] || 'Propano',
                combustibleCantidad: parseNum(row['Combustible Cantidad']),
                filas: []
              };
            }
            if (row['Ingreso Numero']) {
              groups[key].filas.push({
                ingreso: row['Ingreso Numero'],
                libras: parseNum(row['Libras Ingreso'])
              });
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'generacion_almacenamiento') {
          // Group by Fecha + Ente Generador + No Ticket Bascula
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row['Ente Generador']}_${row['No Ticket Bascula']}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                enteGenerador: row['Ente Generador'] || '',
                pesoTicketBascula: parseNum(row['Peso Ticket Bascula']),
                ubicacion: row.Ubicacion || 'Almacén',
                noTicketBascula: String(row['No Ticket Bascula'] || ''),
                tipoResiduo: {
                  inorganico: isYes(row['Inorganico (Si/No)']),
                  punzoCortante: isYes(row['Punzo Cortante (Si/No)']),
                  patologico: isYes(row['Patologico (Si/No)'])
                },
                tipoEmbalaje: {
                  contenedor: isYes(row['Contenedor (Si/No)']),
                  tonelMetalico: isYes(row['Tonel Metalico (Si/No)']),
                  congelador: isYes(row['Congelador (Si/No)'])
                },
                filasLeft: [],
                filasRight: [],
                totalPesoTickets: 0
              };
            }
            if (row['No Ticket Interno']) {
              const ticketItem = {
                noTicketInterno: String(row['No Ticket Interno']),
                tipoResiduo: row['Tipo Residuo'] || 'Inorgánico',
                tipoEmbalaje: row['Tipo Embalaje'] || 'Contenedor',
                cantidad: parseNum(row.Cantidad) || 1,
                peso: parseNum(row['Peso Ticket Interno'])
              };
              if (String(row['Ubicacion Fila (Izquierda/Derecha)']).trim().toLowerCase() === 'derecha') {
                groups[key].filasRight.push(ticketItem);
              } else {
                groups[key].filasLeft.push(ticketItem);
              }
              groups[key].totalPesoTickets += ticketItem.peso;
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'insumos_quimicos') {
          // Group by Fecha + Turno
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row.Turno}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                turno: row.Turno || 'Matutino',
                filas: []
              };
            }
            if (row.Producto) {
              groups[key].filas.push({
                producto: row.Producto,
                unidadMedida: row['Unidad Medida'] || 'Galones',
                stockInicial: parseNum(row['Stock Inicial']),
                unidadesRecibidas: parseNum(row['Unidades Recibidas']),
                unidadesConsumidas: parseNum(row['Unidades Consumidas']),
                stockFinal: parseNum(row['Stock Final']),
                noLoteProveedor: String(row['No Lote Proveedor'] || '')
              });
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'inventarios_sgc') {
          // Group by Fecha + Area Fisica
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row['Area Fisica']}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                areaFisica: row['Area Fisica'] || '',
                filas: []
              };
            }
            if (row['Codigo Insumo']) {
              groups[key].filas.push({
                codigoInsmo: String(row['Codigo Insumo']),
                descripcion: row.Descripcion || '',
                medida: row.Medida || 'Unidad',
                stockMinimo: parseNum(row['Stock Minimo']),
                existenciaReal: parseNum(row['Existencia Real']),
                estadoEmpaque: row['Estado Empaque (Buen estado/Dañado/Por vencer)'] || 'Buen estado'
              });
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'control_uniformes') {
          // Group by Fecha + Responsable Entrega
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const key = `${row.Fecha}_${row['Responsable Entrega']}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                responsable: row.Responsable || userEmail,
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                responsableEntrega: row['Responsable Entrega'] || userEmail,
                filas: []
              };
            }
            if (row.Colaborador) {
              groups[key].filas.push({
                colaborador: row.Colaborador,
                puesto: row.Puesto || '',
                tallaCamisa: String(row['Talla Camisa'] || 'M'),
                tallaPantalon: String(row['Talla Pantalon'] || '32'),
                tallaBotas: String(row['Talla Botas'] || '40'),
                tieneMandil: isYes(row['Tiene Mandil (Si/No)']),
                tieneGuantes: isYes(row['Tiene Guantes (Si/No)']),
                tieneCareta: isYes(row['Tiene Careta (Si/No)']),
                motivoDotacion: row['Motivo Dotacion'] || 'Dotación',
                firmaRecibido: row['Firma Recibido'] || 'SGI',
                usaUniformeCompleto: isYes(row['Usa Uniforme Completo (Si/No)']),
                usaBotasSeguridad: isYes(row['Usa Botas Seguridad (Si/No)']),
                cumpleLimpieza: isYes(row['Cumple Limpieza (Si/No)']),
                observacionAuditoria: row['Observacion Auditoria'] || '',
                estadoGeneralConforme: isYes(row['Estado General Conforme (Si/No)'])
              });
            }
          });
          Object.values(groups).forEach(g => recordsToSave.push(g));

        } else if (tipo === 'cuarto_frio') {
          jsonData.forEach((row) => {
            recordsToSave.push({
              fecha: row.Fecha || new Date().toISOString().split('T')[0],
              responsable: row.Responsable || userEmail,
              observaciones: row.Observaciones || 'Carga masiva desde Excel',
              cuartoFrio: row['Cuarto Frio'] || 'Sección Fría',
              horaInspeccion: row['Hora Inspeccion'] || '08:00',
              cantidadCongeladoresActivos: parseNum(row['Cantidad Congeladores Activos']) || 6,
              tempEntrada: parseNum(row['Temp Entrada (C)']),
              tempSalida: parseNum(row['Temp Salida (C)']),
              tempCongeladores: {
                congelador01: parseNum(row['Congelador 1 (C)']),
                congelador02: parseNum(row['Congelador 2 (C)']),
                congelador03: parseNum(row['Congelador 3 (C)']),
                congelador04: parseNum(row['Congelador 4 (C)']),
                congelador05: parseNum(row['Congelador 5 (C)']),
                congelador06: parseNum(row['Congelador 6 (C)'])
              },
              inspeccion: {
                limpiezaParedesExteriores: isYes(row['Limpieza Paredes Ext (Si/No)']),
                limpiezaParedesInteriores: isYes(row['Limpieza Paredes Int (Si/No)']),
                limpiezaPiso: isYes(row['Limpieza Piso (Si/No)']),
                funcionamientoEvaporadores: isYes(row['Evaporadores Conforme (Si/No)']),
                funcionamientoCondensadores: isYes(row['Condensadores Conforme (Si/No)']),
                funcionamientoLucesInteriores: isYes(row['Luces Conforme (Si/No)']),
                limpiezaTecho: isYes(row['Limpieza Techo (Si/No)']),
                limpiezaExteriorTecho: isYes(row['Limpieza Exterior Techo (Si/No)']),
                residuoOrdenado: isYes(row['Residuo Ordenado (Si/No)'])
              }
            });
          });

        } else if (tipo === 'reduccion_volumen') {
          jsonData.forEach((row) => {
            recordsToSave.push({
              fecha: row.Fecha || new Date().toISOString().split('T')[0],
              responsable: row.Responsable || userEmail,
              observaciones: row.Observaciones || 'Carga masiva desde Excel',
              noTrituradora: row['No Trituradora'] || 'Trituradora T-100',
              tiempoProceso: row['Tiempo Proceso'] || '120 minutos',
              noProceso: row['No Proceso'] || '',
              pesoEntrada: parseNum(row['Peso Entrada']),
              pesoSalida: parseNum(row['Peso Salida']),
              cantidadPacas: parseNum(row['Cantidad Pacas']),
              horaInicio: row['Hora Inicio'] || '08:00',
              horaFin: row['Hora Fin'] || '10:00',
              lineaUtilizada: row['Linea Utilizada'] || 'Linea 1',
              estadoTrituradora: isYes(row['Trituradora Conforme (Si/No)']),
              estadoCajasReductoras: isYes(row['Cajas Reductoras Conforme (Si/No)']),
              estadoFajas: isYes(row['Fajas Conforme (Si/No)']),
              estadoElevadorCarros: isYes(row['Elevador Carros Conforme (Si/No)']),
              estadoBandaTransportadora: isYes(row['Banda Conforme (Si/No)']),
              estadoCompactadora: isYes(row['Compactadora Conforme (Si/No)']),
              anotacionesEspeciales: row['Anotaciones Especiales'] || ''
            });
          });

        } else if (tipo === 'control_autoclaves') {
          jsonData.forEach((row) => {
            recordsToSave.push({
              fecha: row.Fecha || new Date().toISOString().split('T')[0],
              responsable: row.Responsable || userEmail,
              observaciones: row.Observaciones || 'Carga masiva desde Excel',
              noAutoclave: row['No Autoclave'] || '',
              pesoProceso: parseNum(row['Peso Proceso']),
              noProceso: row['No Proceso'] || '',
              lineaUtilizada: row['Linea Utilizada'] || '',
              tipoIndicador: {
                biologico: isYes(row['Indicador Biologico (Si/No)']),
                quimico: isYes(row['Indicador Quimico (Si/No)'])
              },
              identificacionIndicador: row['Identificacion Indicador'] || '',
              resultadoIndicador: row['Resultado Indicador'] || '',
              noLoteFabricante: row['No Lote Fabricante'] || '',
              tempIncubacion: row['Temp Incubacion'] || '',
              cintaTestigoColor: String(row['Cinta Testigo Color (Verde/Cafe)']).toLowerCase() === 'verde' ? 'verde' : 'cafe',
              parametrosOperacion: {
                temperatura: isYes(row['Temperatura Conforme (Si/No)']),
                presion: isYes(row['Presion Conforme (Si/No)']),
                tiempoProceso: isYes(row['Tiempo Esteril Conforme (Si/No)']),
                bombaVacio: isYes(row['Bomba Vacio Conforme (Si/No)'])
              },
              firmaSupervisor: row['Firma Supervisor'] || '',
              firmaCoordinador: row['Firma Coordinador'] || '',
              observacionesGeneralesProceso: row['Observaciones Generales Proceso'] || '',
              pesoBruto1: parseNum(row['Peso Bruto 1']) || 300,
              pesoNeto1: parseNum(row['Peso Neto 1']) || 120,
              pesoBruto2: parseNum(row['Peso Bruto 2']) || 300,
              pesoNeto2: parseNum(row['Peso Neto 2']) || 120,
              pesoBruto3: parseNum(row['Peso Bruto 3']) || 300,
              pesoNeto3: parseNum(row['Peso Neto 3']) || 120,
              pesoBruto4: parseNum(row['Peso Bruto 4']) || 300,
              pesoNeto4: parseNum(row['Peso Neto 4']) || 120,
              pesoBruto5: parseNum(row['Peso Bruto 5']) || 300,
              pesoNeto5: parseNum(row['Peso Neto 5']) || 120,
              pesoBruto6: parseNum(row['Peso Bruto 6']) || 230,
              pesoNeto6: parseNum(row['Peso Neto 6']) || 50,
              pesoBrutoTotal: parseNum(row['Peso Bruto Total']) || 1730
            });
          });

        } else if (tipo === 'lavado_banos') {
          jsonData.forEach((row) => {
            recordsToSave.push({
              fecha: row.Fecha || new Date().toISOString().split('T')[0],
              responsable: row.Responsable || userEmail,
              observaciones: row.Observaciones || 'Carga masiva desde Excel',
              turno: row.Turno || 'Matutino',
              ubicacionBanos: row['Ubicacion Banos'] || 'Planta',
              desinfectanteUsado: row['Desinfectante Usado'] || 'Cloro SGI',
              checklistBanos: {
                lavadoSanitarios: isYes(row['Lavado Sanitarios (Si/No)']),
                lavadoLavamanos: isYes(row['Lavado Lavamanos (Si/No)']),
                barridoTrapeado: isYes(row['Barrido Trapeado (Si/No)']),
                limpiezaEspejos: isYes(row['Limpieza Espejos (Si/No)']),
                limpiezaVidrios: isYes(row['Limpieza Vidrios (Si/No)']),
                desinfeccionSuperficies: isYes(row['Desinfeccion Superficies (Si/No)']),
                vaciadoPapeleras: isYes(row['Vaciado Papeleras (Si/No)'])
              },
              abastecimientoBanos: {
                papelHigienico: isYes(row['Abastecimiento Papel (Si/No)']),
                jabonManos: isYes(row['Abastecimiento Jabon (Si/No)']),
                toallasPapel: isYes(row['Abastecimiento Toallas (Si/No)']),
                sanitizante: isYes(row['Abastecimiento Sanitizante (Si/No)'])
              }
            });
          });

        } else if (tipo === 'control_horas_cargador') {
          jsonData.forEach((row) => {
            recordsToSave.push({
              fecha: row.Fecha || new Date().toISOString().split('T')[0],
              responsable: row.Responsable || userEmail,
              observaciones: row.Observaciones || 'Carga masiva desde Excel',
              turno: row.Turno || 'Matutino',
              noReporte: String(row['No Reporte'] || ''),
              codigoUnidad: row['Codigo Unidad'] || '',
              marcaModelo: row['Marca Modelo'] || '',
              anio: String(row.Anio || ''),
              nombreOperador: row['Nombre Operador'] || '',
              codigoEmpleado: String(row['Codigo Empleado'] || ''),
              areaAsignada: row['Area Asignada'] || '',
              supervisorCargo: row['Supervisor Cargo'] || '',
              lecturaInicialHorometro: parseNum(row['Lectura Inicial Horometro']),
              lecturaFinalHorometro: parseNum(row['Lectura Final Horometro']),
              totalOperadoHoras: parseNum(row['Total Operado Horas']),
              horaInicio: row['Hora Inicio'] || '07:00',
              horaTermino: row['Hora Termino'] || '17:00',
              horasPausaInactividad: parseNum(row['Horas Pausa Inactividad']),
              tipoActividadPrincipal: row['Tipo Actividad Principal'] || '',
              tipoMaterialTrabajado: row['Tipo Material Trabajado'] || '',
              descripcionActividades: row['Descripcion Actividades'] || '',
              nivelCombustibleInicio: row['Nivel Combustible Inicio'] || '',
              litrosCargados: parseNum(row['Litros Cargados']),
              nivelCombustibleFinal: row['Nivel Combustible Final'] || '',
              estadoEquipo: row['Estado Equipo (Bueno/Falla leve/Falla grave/Equipo parado)'] || 'Bueno — sin novedades',
              descripcionFallasObservaciones: row['Descripcion Fallas Observaciones'] || '',
              checklistPrevia: {
                nivelAceiteMotor: isYes(row['Nivel Aceite Motor Previa (Si/No)']),
                nivelRefrigerante: isYes(row['Nivel Refrigerante Previa (Si/No)']),
                presionLlantas: isYes(row['Presion Llantas Previa (Si/No)']),
                estadoCucharaBalde: isYes(row['Estado Cuchara Previa (Si/No)']),
                lucesSenales: isYes(row['Luces Senales Previa (Si/No)']),
                frenos: isYes(row['Frenos Previa (Si/No)']),
                cinturonSeguridad: isYes(row['Cinturon Seg Previa (Si/No)']),
                bocinaAlarmaReversa: isYes(row['Alarma Reversa Previa (Si/No)']),
                extintorAbordo: isYes(row['Extintor Previa (Si/No)']),
                documentosEquipo: isYes(row['Documentos Previa (Si/No)'])
              },
              firmaOperador: row['Firma Operador'] || '',
              firmaSupervisor: row['Firma Supervisor'] || ''
            });
          });
        }

        // Collection name resolution
        let colName = `bitacora_${tipo}`;
        if (tipo === 'inventarios_sgc') {
          colName = 'bitacora_inventarios_sgc';
        }

        // Save records sequentially or in parallel batches
        let count = 0;
        for (const record of recordsToSave) {
          const docWithMeta = {
            ...record,
            fechaRegistro: new Date().toISOString(),
            elaboro: 'Gerente Comercial Industrial',
            reviso: 'Comité ISO',
            aprobo: 'Gerente General',
            cambioControl: [
              { version: '1.2', fecha: new Date().toISOString().split('T')[0], seccion: 'Carga Masiva', cambio: 'Importación masiva desde archivo Excel SGI', solicitante: 'Auditor de Calidad' }
            ]
          };
          await addDoc(collection(db, colName), docWithMeta);
          count++;
        }

        setFeedback({
          text: `¡Éxito! Se han importado correctamente ${count} registros oficiales en Firebase.`,
          type: 'success'
        });
        
        onSuccess();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err: any) {
        console.error(err);
        setFeedback({
          text: `Error al importar Excel: ${err?.message || 'Verifique el formato de las columnas e intente nuevamente.'}`,
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div id={`bulk-upload-${tipo}`} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 border-b pb-2">
        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
        <div>
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Carga Masiva desde Excel</h4>
          <p className="text-[10px] text-slate-500 leading-none">Importar múltiples registros de forma automatizada</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Descargar Formato
        </button>

        <label className="flex-1">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
          <span className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            {loading ? 'Subiendo...' : 'Subir Archivo'}
          </span>
        </label>
      </div>

      {feedback.text && (
        <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-850' :
          feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-850' :
          'bg-sky-50 border-sky-200 text-sky-850'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> :
           feedback.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /> :
           <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}
    </div>
  );
}
