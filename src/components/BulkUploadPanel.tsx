import React, { useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { 
  DEFAULT_ITEMS_INCINERADOR, 
  DEFAULT_ITEMS_TUNEL_LAVADO, 
  DEFAULT_ITEMS_COMPACTADORA, 
  DEFAULT_ITEMS_TRITURADORA 
} from '../utils/evaluacion360Data';

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
            { Fecha: today, Turno: 'Matutino', Area: 'Almacén Central', Responsable: userEmail, Observaciones: 'Carga masiva inicial', Hora: '08:00', Producto: 'Bolsas Rojas DSH', Cantidad: 150, Firma: 'Aprobado' },
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
          columns: ['Fecha', 'Responsable', 'Observaciones', 'No Boleta Pago AMSA', 'Total Viajes', 'Total Pacas', 'Total Pesaje', 'Camion', 'Placa', 'No Pase Salida', 'No Boleta AMSA Fila', 'Cantidad Pacas', 'Pesaje', 'Hora Salida', 'Nombre Piloto', 'Correlativo Pacas'],
          samples: [
            { Fecha: today, Responsable: userEmail, Observaciones: 'Disposición final en vertedero autorizado AMSA', 'No Boleta Pago AMSA': 'AMSA-2026-08492', 'Total Viajes': 1, 'Total Pacas': 40, 'Total Pesaje': 4500, Camion: 'Camión 01', Placa: 'C-928BKN', 'No Pase Salida': 'PS-998', 'No Boleta AMSA Fila': 'AMSA-2026-08492', 'Cantidad Pacas': 40, Pesaje: 4500, 'Hora Salida': '11:00', 'Nombre Piloto': 'Juan Pérez', 'Correlativo Pacas': 'P-001 a P-040' }
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
          sheetName: 'DSH',
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
      case 'desinfeccion_agente_quimico':
        return {
          filename: 'Formato_Desinfeccion_Agente_Quimico.xlsx',
          sheetName: 'Desinfección',
          columns: ['Fecha', 'Responsable', 'Hora Inicio', 'Hora Fin', 'Quimico', 'Dosis', 'Cantidad Gl', 'Metodo Manual Mochila (Si/No)', 'Metodo Aspersion (Si/No)', 'Recepcion (Si/No)', 'Cuarto Frio (Si/No)', 'Autoclaves (Si/No)', 'Trituradoras (Si/No)', 'Compactadora (Si/No)', 'Lavado (Si/No)', 'Incinerador (Si/No)', 'Patio Maniobras (Si/No)', 'Ingreso (Si/No)', 'Lavanderia (Si/No)', 'Muro Perimetral (Si/No)', 'Comedor (Si/No)', 'Taller (Si/No)', 'Identificacion Insumos', 'Trazabilidad Cargas Lote', 'EPP Respirador (Si/No)', 'EPP Traje Impermeable (Si/No)', 'EPP Careta (Si/No)', 'EPP Guantes (Si/No)', 'Observaciones', 'Firma Operador', 'Firma Supervisor'],
          samples: [
            { Fecha: today, Responsable: userEmail, 'Hora Inicio': '08:00', 'Hora Fin': '08:30', Quimico: 'Innibith', Dosis: '50.00%', 'Cantidad Gl': 10.0, 'Metodo Manual Mochila (Si/No)': 'Si', 'Metodo Aspersion (Si/No)': 'Si', 'Recepcion (Si/No)': 'Si', 'Cuarto Frio (Si/No)': 'Si', 'Autoclaves (Si/No)': 'Si', 'Trituradoras (Si/No)': 'Si', 'Compactadora (Si/No)': 'Si', 'Lavado (Si/No)': 'Si', 'Incinerador (Si/No)': 'Si', 'Patio Maniobras (Si/No)': 'Si', 'Ingreso (Si/No)': 'Si', 'Lavanderia (Si/No)': 'Si', 'Muro Perimetral (Si/No)': 'Si', 'Comedor (Si/No)': 'Si', 'Taller (Si/No)': 'Si', 'Identificacion Insumos': 'Relación agua-químico 1:1', 'Trazabilidad Cargas Lote': 'Vincular pesaje en recepción', 'EPP Respirador (Si/No)': 'Si', 'EPP Traje Impermeable (Si/No)': 'Si', 'EPP Careta (Si/No)': 'Si', 'EPP Guantes (Si/No)': 'Si', Observaciones: 'Desinfección general de planta', 'Firma Operador': 'Ing. Daniel M.', 'Firma Supervisor': 'Licda. Ana S.' }
          ]
        };
      case 'checklist_diario_planta':
        return {
          filename: 'Formato_Checklist_Diario_Planta.xlsx',
          sheetName: 'Checklist Planta',
          columns: ['Fecha', 'Turno', 'Area', 'Responsable', 'Puntaje HSE', 'Puntaje Calidad', 'Puntaje Mantenimiento', 'Puntaje 5S', 'Observaciones'],
          samples: [
            { Fecha: today, Turno: 'Matutino', Area: 'Planta Principal', Responsable: userEmail, 'Puntaje HSE': 100, 'Puntaje Calidad': 100, 'Puntaje Mantenimiento': 90, 'Puntaje 5S': 95, Observaciones: 'Carga inicial checklist' }
          ]
        };
      case 'control_caldera':
        return {
          filename: 'Modelo_Carga_Caldera_F-OPR-000-23.xlsx',
          sheetName: 'Caldera F-OPR-000-23',
          columns: [
            'Fecha', 'Turno', 'Identificacion Caldera', 'Operador Responsable',
            'T1 Presion Vapor (PSI)', 'T1 Temp Agua Alimentacion (C)', 'T1 Temp Gases Chimenea (C)', 'T1 Nivel Agua Visor (OK/Falla)', 'T1 Presion Combustible (PSI)', 'T1 Purga Columna (Si/No)', 'T1 Purga Fondo (Si/No)', 'T1 Dosificacion Quimicos (L/dia)', 'T1 TDS Conductividad (uS/cm)', 'T1 Fugas (OK/Falla)',
            'T2 Presion Vapor (PSI)', 'T2 Temp Agua Alimentacion (C)', 'T2 Temp Gases Chimenea (C)', 'T2 Nivel Agua Visor (OK/Falla)', 'T2 Presion Combustible (PSI)', 'T2 Purga Columna (Si/No)', 'T2 Purga Fondo (Si/No)', 'T2 Dosificacion Quimicos (L/dia)', 'T2 TDS Conductividad (uS/cm)', 'T2 Fugas (OK/Falla)',
            'Mantenimiento Semanal Completo (Si/No)', 'Mantenimiento Mensual Completo (Si/No)', 'Mantenimiento Semestral Completo (Si/No)',
            'Falla Componente', 'Falla Descripcion', 'Accion Correctiva', 'Repuesto', 'Proveedor',
            'Comentarios', 'Dictamen Tecnico', 'Estado Caldera', 'Firma Operador', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Ambos Turnos',
              'Identificacion Caldera': 'Caldera Clayton Mod. E-100 (Principal)',
              'Operador Responsable': userEmail,
              'T1 Presion Vapor (PSI)': 105,
              'T1 Temp Agua Alimentacion (C)': 85,
              'T1 Temp Gases Chimenea (C)': 195,
              'T1 Nivel Agua Visor (OK/Falla)': 'OK',
              'T1 Presion Combustible (PSI)': 35,
              'T1 Purga Columna (Si/No)': 'Si',
              'T1 Purga Fondo (Si/No)': 'Si',
              'T1 Dosificacion Quimicos (L/dia)': 1.5,
              'T1 TDS Conductividad (uS/cm)': 2200,
              'T1 Fugas (OK/Falla)': 'OK',
              'T2 Presion Vapor (PSI)': 110,
              'T2 Temp Agua Alimentacion (C)': 87,
              'T2 Temp Gases Chimenea (C)': 200,
              'T2 Nivel Agua Visor (OK/Falla)': 'OK',
              'T2 Presion Combustible (PSI)': 36,
              'T2 Purga Columna (Si/No)': 'Si',
              'T2 Purga Fondo (Si/No)': 'Si',
              'T2 Dosificacion Quimicos (L/dia)': 1.5,
              'T2 TDS Conductividad (uS/cm)': 2350,
              'T2 Fugas (OK/Falla)': 'OK',
              'Mantenimiento Semanal Completo (Si/No)': 'Si',
              'Mantenimiento Mensual Completo (Si/No)': 'Si',
              'Mantenimiento Semestral Completo (Si/No)': 'No',
              'Falla Componente': 'Quemador / Boquillas',
              'Falla Descripcion': 'Hollín leve en tobera',
              'Accion Correctiva': 'Limpieza preventiva programada',
              'Repuesto': 'Ninguno',
              'Proveedor': 'Interno BIOTRASH',
              Comentarios: 'Operación continua en parámetros óptimos de vapor para autoclaves',
              'Dictamen Tecnico': 'Caldera en condiciones óptimas y seguras',
              'Estado Caldera': 'Operativo / Conforme',
              'Firma Operador': userEmail,
              'Firma Supervisor': 'Ing. Manuel López — Gerente de Planta'
            }
          ]
        };
      case 'evaluacion_360_incinerador':
        return {
          filename: 'Modelo_Carga_360_Incinerador_F-OPR-000-19.xlsx',
          sheetName: '360 Incinerador',
          columns: [
            'Fecha', 'Turno', 'Equipo ID', 'Nombre Equipo', 'Horometro', 'Operador Responsable', 'Inspector SGI',
            'Temp Camara Primaria (C)', 'Temp Camara Secundaria (C)', 'Presion Combustible (Bar)', 'Opacidad Humo (%)', 'Tipo Combustible',
            'Puntaje Seguridad', 'Puntaje Mecanico', 'Puntaje Combustion', 'Puntaje Electrico', 'Puntaje Bioseguridad', 'Puntaje Operatividad',
            'Veredicto Operacional', 'Nivel Riesgo', 'Observaciones Generales', 'Firma Inspector', 'Firma Operador', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Matutino',
              'Equipo ID': 'INC-01',
              'Nombre Equipo': 'Incinerador Pirolítico Industrial 01',
              Horometro: 3850,
              'Operador Responsable': 'Juan Carlos Méndez',
              'Inspector SGI': userEmail,
              'Temp Camara Primaria (C)': 850,
              'Temp Camara Secundaria (C)': 1050,
              'Presion Combustible (Bar)': 3.2,
              'Opacidad Humo (%)': 5,
              'Tipo Combustible': 'Diésel Bajo Azufre (LSD)',
              'Puntaje Seguridad': 100,
              'Puntaje Mecanico': 95,
              'Puntaje Combustion': 95,
              'Puntaje Electrico': 100,
              'Puntaje Bioseguridad': 100,
              'Puntaje Operatividad': 100,
              'Veredicto Operacional': 'Aprobado para Operar',
              'Nivel Riesgo': 'Bajo',
              'Observaciones Generales': 'Evaluación 360° incinerador pirolítico conforme a ISO 14001',
              'Firma Inspector': userEmail,
              'Firma Operador': 'Juan Carlos Méndez',
              'Firma Supervisor': 'Ing. Manuel López — Gerente de Planta'
            }
          ]
        };
      case 'evaluacion_360_tunel_lavado':
        return {
          filename: 'Modelo_Carga_360_Tunel_Lavado_F-OPR-000-20.xlsx',
          sheetName: '360 Tunel Lavado',
          columns: [
            'Fecha', 'Turno', 'Equipo ID', 'Nombre Equipo', 'Horometro', 'Operador Responsable', 'Inspector SGI',
            'Presion Bomba Lavado (PSI)', 'PPM Desinfectante', 'Temperatura Agua (C)', 'Velocidad Cadena (m/min)', 'Quimico Dosificado',
            'Puntaje Seguridad', 'Puntaje Mecanico', 'Puntaje Hidraulico', 'Puntaje Electrico', 'Puntaje Bioseguridad', 'Puntaje Operatividad',
            'Veredicto Operacional', 'Nivel Riesgo', 'Observaciones Generales', 'Firma Inspector', 'Firma Operador', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Matutino',
              'Equipo ID': 'TUN-01',
              'Nombre Equipo': 'Túnel Hidro-Lavador Automático 01',
              Horometro: 2495,
              'Operador Responsable': 'Carlos Eduardo Gómez',
              'Inspector SGI': userEmail,
              'Presion Bomba Lavado (PSI)': 1850,
              'PPM Desinfectante': 200,
              'Temperatura Agua (C)': 60,
              'Velocidad Cadena (m/min)': 3.5,
              'Quimico Dosificado': 'Amonio Cuaternario 5ta Gen / Ácido Peracético',
              'Puntaje Seguridad': 100,
              'Puntaje Mecanico': 100,
              'Puntaje Hidraulico': 95,
              'Puntaje Electrico': 100,
              'Puntaje Bioseguridad': 100,
              'Puntaje Operatividad': 95,
              'Veredicto Operacional': 'Aprobado para Operar',
              'Nivel Riesgo': 'Bajo',
              'Observaciones Generales': 'Evaluación 360° túnel hidrolavador de contenedores conforme a SGI',
              'Firma Inspector': userEmail,
              'Firma Operador': 'Carlos Eduardo Gómez',
              'Firma Supervisor': 'Ing. Manuel López — Gerente de Planta'
            }
          ]
        };
      case 'evaluacion_360_compactadora':
        return {
          filename: 'Modelo_Carga_360_Compactadora_F-OPR-000-21.xlsx',
          sheetName: '360 Compactadora',
          columns: [
            'Fecha', 'Turno', 'Equipo ID', 'Nombre Equipo', 'Horometro', 'Operador Responsable', 'Inspector SGI',
            'Presion Prensado (PSI)', 'Temperatura Aceite (C)', 'Peso Promedio Paca (Lbs)', 'Tiempo Ciclo Prensado (Seg)', 'Tipo Fleje',
            'Puntaje Seguridad', 'Puntaje Mecanico', 'Puntaje Hidraulico', 'Puntaje Electrico', 'Puntaje Bioseguridad', 'Puntaje Operatividad',
            'Veredicto Operacional', 'Nivel Riesgo', 'Observaciones Generales', 'Firma Inspector', 'Firma Operador', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Matutino',
              'Equipo ID': 'COMP-01',
              'Nombre Equipo': 'Compactadora Hidráulica Vertical 01',
              Horometro: 4125,
              'Operador Responsable': 'Marcos Tulio Juárez',
              'Inspector SGI': userEmail,
              'Presion Prensado (PSI)': 2800,
              'Temperatura Aceite (C)': 48,
              'Peso Promedio Paca (Lbs)': 450,
              'Tiempo Ciclo Prensado (Seg)': 42,
              'Tipo Fleje': 'Alambre Recocido Calibre 14 Alta Resistencia',
              'Puntaje Seguridad': 100,
              'Puntaje Mecanico': 95,
              'Puntaje Hidraulico': 100,
              'Puntaje Electrico': 95,
              'Puntaje Bioseguridad': 100,
              'Puntaje Operatividad': 100,
              'Veredicto Operacional': 'Aprobado para Operar',
              'Nivel Riesgo': 'Bajo',
              'Observaciones Generales': 'Evaluación 360° prensa compactadora hidráulica conforme',
              'Firma Inspector': userEmail,
              'Firma Operador': 'Marcos Tulio Juárez',
              'Firma Supervisor': 'Ing. Manuel López — Gerente de Planta'
            }
          ]
        };
      case 'evaluacion_360_trituradora':
        return {
          filename: 'Modelo_Carga_360_Trituradora_F-OPR-000-22.xlsx',
          sheetName: '360 Trituradora',
          columns: [
            'Fecha', 'Turno', 'Equipo ID', 'Nombre Equipo', 'Horometro', 'Operador Responsable', 'Inspector SGI',
            'Amperaje Motor (A)', 'Velocidad Rotacion (RPM)', 'Tiempo Auto-Reverse (Seg)', 'Desgaste Cuchillas (mm)', 'Capacidad Procesamiento (Lbs/Hr)',
            'Puntaje Seguridad', 'Puntaje Mecanico', 'Puntaje Hidraulico', 'Puntaje Electrico', 'Puntaje Bioseguridad', 'Puntaje Operatividad',
            'Veredicto Operacional', 'Nivel Riesgo', 'Observaciones Generales', 'Firma Inspector', 'Firma Operador', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Matutino',
              'Equipo ID': 'TRIT-01',
              'Nombre Equipo': 'Trituradora Shredder Industrial Doble Eje 01',
              Horometro: 5285,
              'Operador Responsable': 'Byron Estuardo Reyes',
              'Inspector SGI': userEmail,
              'Amperaje Motor (A)': 62,
              'Velocidad Rotacion (RPM)': 24,
              'Tiempo Auto-Reverse (Seg)': 1.2,
              'Desgaste Cuchillas (mm)': 1.5,
              'Capacidad Procesamiento (Lbs/Hr)': 2500,
              'Puntaje Seguridad': 100,
              'Puntaje Mecanico': 95,
              'Puntaje Hidraulico': 95,
              'Puntaje Electrico': 100,
              'Puntaje Bioseguridad': 100,
              'Puntaje Operatividad': 100,
              'Veredicto Operacional': 'Aprobado para Operar',
              'Nivel Riesgo': 'Bajo',
              'Observaciones Generales': 'Evaluación 360° trituradora de doble eje shredder en orden',
              'Firma Inspector': userEmail,
              'Firma Operador': 'Byron Estuardo Reyes',
              'Firma Supervisor': 'Ing. Manuel López — Gerente de Planta'
            }
          ]
        };
      case 'control_360_vehiculos':
        return {
          filename: 'Modelo_Carga_Control_360_Vehiculos_F-OPR-000-17.xlsx',
          sheetName: 'Control 360 Vehiculos',
          columns: [
            'Fecha', 'Turno', 'Centro Operaciones', 'Ruta', 'Placa', 'Tipo Vehiculo', 'Conductor',
            'No Licencia', 'Tipo Licencia', 'Telefono', 'Contenedores Rojos Limpios Vacios',
            'Hora Salida', 'KM Salida', 'Hora Llegada Planta', 'KM Llegada', 'Peso Entregado Lbs', 'Recibido Por Planta',
            'Frenos Conforme (Si/No)', 'Llantas Conforme (Si/No)', 'Luces Conforme (Si/No)', 'Extintor Vigente (Si/No)',
            'Cinturones Conforme (Si/No)', 'Sello Hermetico (Si/No)', 'Rotulo Biohazard Visible (Si/No)',
            'Kit Antiderrame Conforme (Si/No)', 'EPP Completo (Si/No)', 'Desinfeccion Previa Realizada (Si/No)',
            'Desinfectante Utilizado', 'Observaciones Salida', 'Novedades Ruta', 'Firma Conductor', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'AM',
              'Centro Operaciones': 'VILLA NUEVA 1',
              Ruta: 'VN1-BLA',
              Placa: 'C-442BTL',
              'Tipo Vehiculo': 'Camion',
              Conductor: 'Marcos Danilo Arriola',
              'No Licencia': '2489-1092-0101',
              'Tipo Licencia': 'Tipo A Profesional',
              Telefono: '5544-3322',
              'Contenedores Rojos Limpios Vacios': 16,
              'Hora Salida': '06:30',
              'KM Salida': 128450,
              'Hora Llegada Planta': '14:15',
              'KM Llegada': 128540,
              'Peso Entregado Lbs': 2450,
              'Recibido Por Planta': 'Receptor Planta BIOTRASH',
              'Frenos Conforme (Si/No)': 'Si',
              'Llantas Conforme (Si/No)': 'Si',
              'Luces Conforme (Si/No)': 'Si',
              'Extintor Vigente (Si/No)': 'Si',
              'Cinturones Conforme (Si/No)': 'Si',
              'Sello Hermetico (Si/No)': 'Si',
              'Rotulo Biohazard Visible (Si/No)': 'Si',
              'Kit Antiderrame Conforme (Si/No)': 'Si',
              'EPP Completo (Si/No)': 'Si',
              'Desinfeccion Previa Realizada (Si/No)': 'Si',
              'Desinfectante Utilizado': 'Amonio Cuaternario al 10%',
              'Observaciones Salida': 'Vehículo listo para ruta matutina de recolección',
              'Novedades Ruta': 'Ruta completada sin novedad',
              'Firma Conductor': 'Marcos Danilo Arriola',
              'Firma Supervisor': 'Ing. Manuel López — Gerente de Planta'
            }
          ]
        };
      case 'mantenimiento_incinerador':
        return {
          filename: 'Modelo_Carga_Mantenimiento_Incinerador_BIT-MTO-INC-001.xlsx',
          sheetName: 'Mantenimiento Incinerador',
          columns: [
            'Fecha', 'Equipo ID', 'Tipo Mantenimiento', 'Hora Inicio', 'Hora Fin', 'Horometro', 'Tecnico Responsable', 'Supervisado Por',
            'LOTO Candadeo', 'Temperatura Menor 40C', 'Purga Corte Combustible', 'Ventilacion Camaras',
            'Estado Refractario Camara Primaria', 'Estado Refractario Camara Secundaria', 'Estado Sellos Puertas',
            'Estado Boquillas Inyectores', 'Estado Electrodos Ignicion', 'Estado Detectores Llama', 'Estado Termocuplas', 'Estado Manometros',
            'Descripcion Trabajos y Repuestos', 'Pruebas Hermeticidad', 'Pruebas Interlocks', 'Modulacion Llama', 'Estado Final', 'Firma Tecnico', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              'Equipo ID': 'INC-01',
              'Tipo Mantenimiento': 'Preventivo Programado',
              'Hora Inicio': '07:00',
              'Hora Fin': '11:30',
              Horometro: 4200,
              'Tecnico Responsable': 'Juan Carlos Méndez',
              'Supervisado Por': 'Ing. Manuel López',
              'LOTO Candadeo': 'Si',
              'Temperatura Menor 40C': 'Si',
              'Purga Corte Combustible': 'Si',
              'Ventilacion Camaras': 'Si',
              'Estado Refractario Camara Primaria': 'Bueno',
              'Estado Refractario Camara Secundaria': 'Bueno',
              'Estado Sellos Puertas': 'Bueno',
              'Estado Boquillas Inyectores': 'Bueno',
              'Estado Electrodos Ignicion': 'Bueno',
              'Estado Detectores Llama': 'Bueno',
              'Estado Termocuplas': 'Bueno',
              'Estado Manometros': 'Bueno',
              'Descripcion Trabajos y Repuestos': 'Limpieza de toberas de quemador principal y sustitución de empaquetadura de puerta.',
              'Pruebas Hermeticidad': 'Si',
              'Pruebas Interlocks': 'Si',
              'Modulacion Llama': 'Si',
              'Estado Final': 'Operativo Conforme',
              'Firma Tecnico': 'Juan Carlos Méndez',
              'Firma Supervisor': 'Ing. Manuel López'
            }
          ]
        };
      case 'mantenimiento_lampinator':
        return {
          filename: 'Modelo_Carga_Mantenimiento_Lampinator_BIT-MTO-LAMP-001.xlsx',
          sheetName: 'Mantenimiento Lampinator',
          columns: [
            'Fecha', 'Equipo ID', 'Tipo Mantenimiento', 'Hora Inicio', 'Hora Fin', 'Horometro', 'Tecnico Responsable', 'Operador Turno',
            'Mascarilla Vapor Hg 3M', 'Fuga Vapor Hg Ppm', 'Protocolo LOTO', 'Filtro HEPA Presion Diferencial', 'Modulo Carbon Activado Hg',
            'Prefiltros Polvo', 'Desgaste Martillos Trituracion', 'Hermeticidad Empaques Tolva', 'Nivel Tambor Vidrio y Fósforo',
            'Mangueras Succion Vacio', 'Paros Emergencia Interlocks', 'Descripcion Trabajos y Repuestos', 'Estado Final', 'Firma Tecnico', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              'Equipo ID': 'LAMP-01',
              'Tipo Mantenimiento': 'Preventivo Programado',
              'Hora Inicio': '08:00',
              'Hora Fin': '10:45',
              Horometro: 1850,
              'Tecnico Responsable': 'Pedro Fernando Alvarado',
              'Operador Turno': 'Carlos Rodas',
              'Mascarilla Vapor Hg 3M': 'Si',
              'Fuga Vapor Hg Ppm': 0.002,
              'Protocolo LOTO': 'Si',
              'Filtro HEPA Presion Diferencial': 'Conforme',
              'Modulo Carbon Activado Hg': 'Conforme',
              'Prefiltros Polvo': 'Conforme',
              'Desgaste Martillos Trituracion': 'Conforme',
              'Hermeticidad Empaques Tolva': 'Conforme',
              'Nivel Tambor Vidrio y Fósforo': 'Conforme',
              'Mangueras Succion Vacio': 'Conforme',
              'Paros Emergencia Interlocks': 'Conforme',
              'Descripcion Trabajos y Repuestos': 'Reemplazo de prefiltro de polvo y revisión de sellos de tolva.',
              'Estado Final': 'Operativo Conforme',
              'Firma Tecnico': 'Pedro Fernando Alvarado',
              'Firma Supervisor': 'Ing. Manuel López'
            }
          ]
        };
      case 'mantenimiento_trituradora':
        return {
          filename: 'Modelo_Carga_Mantenimiento_Trituradora_BIT-MTO-TRIT-001.xlsx',
          sheetName: 'Mantenimiento Trituradora',
          columns: [
            'Fecha', 'Turno', 'Equipo ID', 'Tipo Mantenimiento', 'Horometro', 'Tecnico Responsable',
            'Estado Cuchillas', 'Nivel Aceite Reductor', 'Ruidos o Vibraciones', 'Limpieza y Desinfección Interna', 'Prueba Auto-Reverse',
            'Engrase Rodamientos', 'Consumo Amperaje Motor A', 'Presion Hidraulica Empuje PSI', 'Descripcion Trabajos y Repuestos',
            'Horas Paro', 'LOTO Aplicado', 'Estado Final', 'Firma Tecnico', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Turno 1',
              'Equipo ID': 'TRIT-01',
              'Tipo Mantenimiento': 'Preventivo Semanal/Mensual',
              Horometro: 5340,
              'Tecnico Responsable': 'Byron Estuardo Reyes',
              'Estado Cuchillas': 'Bueno',
              'Nivel Aceite Reductor': 'Conforme',
              'Ruidos o Vibraciones': 'Normal',
              'Limpieza y Desinfección Interna': 'Si',
              'Prueba Auto-Reverse': 'Si',
              'Engrase Rodamientos': 'Si',
              'Consumo Amperaje Motor A': 62.5,
              'Presion Hidraulica Empuje PSI': 2100,
              'Descripcion Trabajos y Repuestos': 'Engrase general de chumaceras SKF y ajuste de fajas motrices.',
              'Horas Paro': 0,
              'LOTO Aplicado': 'Si',
              'Estado Final': 'Operativo Conforme',
              'Firma Tecnico': 'Byron Estuardo Reyes',
              'Firma Supervisor': 'Ing. Manuel López'
            }
          ]
        };
      case 'mantenimiento_compactadora':
        return {
          filename: 'Modelo_Carga_Mantenimiento_Compactadora_BIT-MTO-COMP-001.xlsx',
          sheetName: 'Mantenimiento Compactadora',
          columns: [
            'Fecha', 'Turno', 'Equipo ID', 'Periodicidad', 'Tipo Mantenimiento', 'Horometro', 'Tecnico Responsable',
            'Fugas Fluidos Debajo Plato', 'Hermeticidad Sellos Puerta', 'Limpieza Desinfección Tolva', 'Paros Emergencia y Fotoceldas',
            'Ruidos Motor Hidráulico', 'Inspeccion Mangueras y Cilindros', 'Nivel Aceite ISO 68', 'Engrase Guias y Chumaceras',
            'Filtros Aire Respiradero', 'Empaque Retencion Lixiviados', 'Descripcion Trabajos y Repuestos', 'Protocolo Bioseguridad y EPP',
            'Estado Final', 'Firma Tecnico', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Turno 1',
              'Equipo ID': 'COMP-01',
              Periodicidad: 'Semanal/Mensual (Técnico)',
              'Tipo Mantenimiento': 'Preventivo',
              Horometro: 4180,
              'Tecnico Responsable': 'Marcos Tulio Juárez',
              'Fugas Fluidos Debajo Plato': 'Conforme',
              'Hermeticidad Sellos Puerta': 'Conforme',
              'Limpieza Desinfección Tolva': 'Conforme',
              'Paros Emergencia y Fotoceldas': 'Conforme',
              'Ruidos Motor Hidráulico': 'Conforme',
              'Inspeccion Mangueras y Cilindros': 'Bueno',
              'Nivel Aceite ISO 68': 'Conforme',
              'Engrase Guias y Chumaceras': 'Si',
              'Filtros Aire Respiradero': 'Bueno',
              'Empaque Retencion Lixiviados': 'Bueno',
              'Descripcion Trabajos y Repuestos': 'Relleno de aceite hidráulico ISO 68 y engrase de guías correderas.',
              'Protocolo Bioseguridad y EPP': 'Si',
              'Estado Final': 'Aprobado para Operar',
              'Firma Tecnico': 'Marcos Tulio Juárez',
              'Firma Supervisor': 'Ing. Manuel López'
            }
          ]
        };
      case 'mantenimiento_autoclaves':
        return {
          filename: 'Modelo_Carga_Mantenimiento_Autoclaves_BIT-MTO-AUTO-001.xlsx',
          sheetName: 'Mantenimiento Autoclaves',
          columns: [
            'Fecha', 'Turno', 'Equipo ID', 'Tipo Mantenimiento', 'Horometro', 'Tecnico Responsable',
            'Presion Vapor Caldera PSI', 'Presion Camara PSI', 'Temperatura C', 'Tiempo Ciclo Min', 'Prueba Vacio',
            'Drenaje Condensados Trampa', 'Estado Empaque Puerta', 'Valvulas Seguridad y Alivio', 'Manometros Calibrados',
            'Transmisores Temp PT100', 'Filtro Canasta Descarga', 'Engrase Brazos Cierre', 'Descripcion Trabajos y Repuestos',
            'Estado Final', 'Firma Tecnico', 'Firma Supervisor'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Turno 1',
              'Equipo ID': 'AUTO CLAVE 1',
              'Tipo Mantenimiento': 'Preventivo Periódico',
              Horometro: 6120,
              'Tecnico Responsable': 'Héctor David Morales',
              'Presion Vapor Caldera PSI': 75,
              'Presion Camara PSI': 35,
              'Temperatura C': 134,
              'Tiempo Ciclo Min': 50,
              'Prueba Vacio': 'Conforme',
              'Drenaje Condensados Trampa': 'Conforme',
              'Estado Empaque Puerta': 'Excelente',
              'Valvulas Seguridad y Alivio': 'Bueno',
              'Manometros Calibrados': 'Bueno',
              'Transmisores Temp PT100': 'Bueno',
              'Filtro Canasta Descarga': 'Limpio',
              'Engrase Brazos Cierre': 'Si',
              'Descripcion Trabajos y Repuestos': 'Limpieza de filtro canasta y verificación de calibración manométrica.',
              'Estado Final': 'Operativa al 100%',
              'Firma Tecnico': 'Héctor David Morales',
              'Firma Supervisor': 'Ing. Manuel López'
            }
          ]
        };
      case 'limpieza_desinfeccion_planta':
        return {
          filename: 'Modelo_Carga_Limpieza_Desinfeccion_Planta_BIT-LIM-DES-001.xlsx',
          sheetName: 'Limpieza y Desinfección',
          columns: [
            'Fecha', 'Turno', 'Supervisor Responsable', 'Cuadrilla Operadores', 'Producto Quimico Desinfectante',
            'Lote Quimico', 'Concentracion Objetivo PPM', 'Concentracion Medida PPM', 'Hora Preparacion',
            'Zonas Conformes', 'EPP Completo Verificado', 'Disponibilidad Insumos y Panos', 'Novedades y Desviaciones',
            'Acciones Correctivas Inmediatas', 'Veredicto Cumplimiento', 'Firma Operador Lider', 'Firma Supervisor HSE'
          ],
          samples: [
            {
              Fecha: today,
              Turno: 'Mañana',
              'Supervisor Responsable': 'Ing. Astrid Guzmán',
              'Cuadrilla Operadores': 'Cuadrilla A (Mario Pérez, Luis Gómez, Estuardo Xicay)',
              'Producto Quimico Desinfectante': 'Amonio Cuaternario 5ta Generación',
              'Lote Quimico': 'L-AQ-2026-09',
              'Concentracion Objetivo PPM': 400,
              'Concentracion Medida PPM': 405,
              'Hora Preparacion': '06:15',
              'Zonas Conformes': 'Todas las zonas conforme',
              'EPP Completo Verificado': 'Si',
              'Disponibilidad Insumos y Panos': 'Si',
              'Novedades y Desviaciones': 'Desinfección de choque completada con tiempo de contacto de 15 minutos.',
              'Acciones Correctivas Inmediatas': 'Ninguna requerida, parámetros en norma.',
              'Veredicto Cumplimiento': 'Cumplimiento Total (100%)',
              'Firma Operador Lider': 'Mario Pérez',
              'Firma Supervisor HSE': 'Ing. Astrid Guzmán'
            }
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

    // File size limit: 15MB
    const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFeedback({
        text: `El archivo seleccionado excede el tamaño máximo permitido de 15 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB). Por favor comprima o divida el archivo.`,
        type: 'error'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    setFeedback({ text: 'Procesando archivo excel...', type: 'info' });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        let worksheet = workbook.Sheets[workbook.SheetNames[0]];
        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName];
          const testData = XLSX.utils.sheet_to_json<any>(ws);
          if (testData && testData.length > 0) {
            worksheet = ws;
            break;
          }
        }
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error('El archivo de Excel no contiene datos.');
        }

        const isRowEmpty = (row: any): boolean => {
          if (!row || typeof row !== 'object') return true;
          const values = Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
          return values.length === 0;
        };

        const cleanData = jsonData.filter((row: any) => !isRowEmpty(row));
        if (cleanData.length === 0) {
          throw new Error('El archivo de Excel no contiene filas con datos válidos.');
        }

        const getRowVal = (row: any, ...keys: string[]) => {
          if (!row) return undefined;
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
              return row[k];
            }
          }
          const rowKeys = Object.keys(row);
          for (const k of keys) {
            const cleanTarget = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            const found = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget);
            if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
              return row[found];
            }
          }
          return undefined;
        };

        const isYes = (val: any) => {
          if (!val) return false;
          const s = String(val).trim().toLowerCase();
          return s === 'si' || s === 'sí' || s === 'yes' || s === 'true' || s === '1';
        };

        const parseNum = (val: any) => {
          const n = parseFloat(val);
          return isNaN(n) ? 0 : n;
        };

        const parseNumOrBlank = (val: any) => {
          if (val === null || val === undefined || String(val).trim() === '') return '';
          const n = parseFloat(val);
          return isNaN(n) ? '' : n;
        };

        const parseExcelDate = (val: any): string => {
          if (val === null || val === undefined || val === '') {
            return new Date().toISOString().split('T')[0];
          }

          // If JS Date object
          if (val instanceof Date) {
            if (!isNaN(val.getTime())) {
              const yyyy = val.getFullYear();
              const mm = String(val.getMonth() + 1).padStart(2, '0');
              const dd = String(val.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            }
          }

          // Handle Excel serial date numbers (e.g. 46240)
          const rawVal = typeof val === 'string' ? val.trim() : val;
          const num = typeof rawVal === 'number' ? rawVal : (typeof rawVal === 'string' && /^\d+(\.\d+)?$/.test(rawVal) ? parseFloat(rawVal) : NaN);
          if (!isNaN(num) && num > 20000 && num < 100000) {
            // Excel serial date formula offset
            const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
            if (!isNaN(dateObj.getTime())) {
              const yyyy = dateObj.getUTCFullYear();
              const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
              const dd = String(dateObj.getUTCDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            }
          }

          const str = String(val).trim();

          // If YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            return str.slice(0, 10);
          }

          // If DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
          const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (ddmmyyyy) {
            const day = ddmmyyyy[1].padStart(2, '0');
            const month = ddmmyyyy[2].padStart(2, '0');
            const year = ddmmyyyy[3];
            return `${year}-${month}-${day}`;
          }

          // Fallback parsing
          const parsed = new Date(str);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }

          return new Date().toISOString().split('T')[0];
        };

        // Validate 6-month temporal span limit across rows
        const dateFields = [
          'Fecha', 'fecha', 'FECHA', 'Fecha (AAAA-MM-DD)', 'Fecha (YYYY-MM-DD)', 
          'Fecha Visita', 'fechaVisita', 'Fecha Operacion', 'fechaOperacion', 
          'Fecha Desinfección', 'Fecha del Servicio'
        ];
        const extractedDates: Date[] = [];

        cleanData.forEach((row: any) => {
          for (const df of dateFields) {
            const val = getRowVal(row, df);
            if (val) {
              const dStr = parseExcelDate(val);
              const d = new Date(dStr);
              if (!isNaN(d.getTime())) {
                extractedDates.push(d);
              }
              break;
            }
          }
        });

        if (extractedDates.length > 0) {
          const minTime = Math.min(...extractedDates.map(d => d.getTime()));
          const maxTime = Math.max(...extractedDates.map(d => d.getTime()));
          const diffDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);

          // 185 days is approx 6 months
          if (diffDays > 185) {
            const minDateStr = new Date(minTime).toISOString().split('T')[0];
            const maxDateStr = new Date(maxTime).toISOString().split('T')[0];
            const monthsApprox = (diffDays / 30.4).toFixed(1);
            throw new Error(
              `Límite de rango temporal excedido: El archivo abarca ${Math.round(diffDays)} días (~${monthsApprox} meses, desde ${minDateStr} hasta ${maxDateStr}). Por política de rendimiento e integridad del SGI BIOTRASH, no se permite subir más de 6 meses (180 días) en un solo archivo. Por favor segmente la información en archivos semestrales.`
            );
          }
        }

        const recordsToSave: any[] = [];

        // Dynamic multi-row grouping or single row parsing based on module
        if (tipo === 'inventarios') {
          // Group by Fecha + Turno + Area
          const groups: { [key: string]: any } = {};
          jsonData.forEach((row) => {
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row.Turno}_${row.Area}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                turno: row.Turno || 'Matutino',
                area: row.Area || 'Planta',
                responsable: row.Responsable || '',
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
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row.Responsable}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                responsable: row.Responsable || '',
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
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row.Responsable}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                responsable: row.Responsable || '',
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
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row.Responsable}`;
            const boletaAmsaGeneral = String(row['No Boleta Pago AMSA'] || row['Boleta Pago AMSA'] || row['No Boleta AMSA'] || row['Boleta AMSA'] || '').trim();
            const boletaAmsaFila = String(row['No Boleta AMSA Fila'] || row['No Boleta Pago AMSA'] || row['Boleta Pago AMSA'] || row['No Boleta AMSA'] || row['Boleta AMSA'] || '').trim();

            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                responsable: row.Responsable || '',
                noBoletaAmsa: boletaAmsaGeneral,
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
                noBoletaAmsa: boletaAmsaFila || groups[key].noBoletaAmsa || '',
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
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row['Hora Inicio']}_${row['Hora Fin']}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                responsable: row.Responsable || '',
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
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row['Ente Generador']}_${row['No Ticket Bascula']}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                responsable: row.Responsable || '',
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
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row.Turno}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                responsable: row.Responsable || '',
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
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row['Area Fisica']}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                responsable: row.Responsable || '',
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
            const rowFecha = parseExcelDate(row.Fecha || row.fecha);
            const key = `${rowFecha}_${row['Responsable Entrega']}`;
            if (!groups[key]) {
              groups[key] = {
                fecha: rowFecha,
                responsable: row.Responsable || '',
                observaciones: row.Observaciones || 'Carga masiva desde Excel',
                responsableEntrega: row['Responsable Entrega'] || '',
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
                firmaRecibido: row['Firma Recibido'] || '',
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
              fecha: parseExcelDate(row.Fecha || row.fecha),
              responsable: row.Responsable || '',
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
              fecha: parseExcelDate(row.Fecha || row.fecha),
              responsable: row.Responsable || '',
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
              fecha: parseExcelDate(row.Fecha || row.fecha),
              responsable: row.Responsable || '',
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
              fecha: parseExcelDate(row.Fecha || row.fecha),
              responsable: row.Responsable || '',
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
              fecha: parseExcelDate(row.Fecha || row.fecha),
              responsable: row.Responsable || '',
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
              lecturaInicialHorometro: parseNumOrBlank(row['Lectura Inicial Horometro']),
              lecturaFinalHorometro: parseNumOrBlank(row['Lectura Final Horometro']),
              totalOperadoHoras: parseNumOrBlank(row['Total Operado Horas']),
              horaInicio: row['Hora Inicio'] || '07:00',
              horaTermino: row['Hora Termino'] || '17:00',
              horasPausaInactividad: parseNumOrBlank(row['Horas Pausa Inactividad']),
              tipoActividadPrincipal: row['Tipo Actividad Principal'] || '',
              tipoMaterialTrabajado: row['Tipo Material Trabajado'] || '',
              descripcionActividades: row['Descripcion Actividades'] || '',
              nivelCombustibleInicio: row['Nivel Combustible Inicio'] || '',
              litrosCargados: parseNumOrBlank(row['Litros Cargados']),
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
        } else if (tipo === 'desinfeccion_agente_quimico') {
          jsonData.forEach((row) => {
            recordsToSave.push({
              fecha: parseExcelDate(row.Fecha || row.fecha),
              responsable: row.Responsable || '',
              horaInicio: row['Hora Inicio'] || '08:00',
              horaFin: row['Hora Fin'] || '08:30',
              quimico: row.Quimico || 'Innibith',
              dosis: row.Dosis || '50.00%',
              cantidadGl: parseNum(row['Cantidad Gl']) || 10.0,
              metodoAplicacion: {
                manualMochila: isYes(row['Metodo Manual Mochila (Si/No)']),
                aspersion: isYes(row['Metodo Aspersion (Si/No)'])
              },
              areasTratadas: {
                recepcion: isYes(row['Recepcion (Si/No)']),
                cuartoFrio: isYes(row['Cuarto Frio (Si/No)']),
                autoclaves: isYes(row['Autoclaves (Si/No)']),
                trituradoras: isYes(row['Trituradoras (Si/No)']),
                compactadora: isYes(row['Compactadora (Si/No)']),
                lavado: isYes(row['Lavado (Si/No)']),
                incinerador: isYes(row['Incinerador (Si/No)']),
                patioManiobras: isYes(row['Patio Maniobras (Si/No)']),
                ingreso: isYes(row['Ingreso (Si/No)']),
                lavanderia: isYes(row['Lavanderia (Si/No)']),
                muroPerimetral: isYes(row['Muro Perimetral (Si/No)']),
                comedor: isYes(row['Comedor (Si/No)']),
                taller: isYes(row['Taller (Si/No)'])
              },
              identificacionInsumos: row['Identificacion Insumos'] || '',
              trazabilidadCargasLote: row['Trazabilidad Cargas Lote'] || '',
              verificacionEPP: {
                respiradorCartuchos: isYes(row['EPP Respirador (Si/No)']),
                trajeImpermeable: isYes(row['EPP Traje Impermeable (Si/No)']),
                careta: isYes(row['EPP Careta (Si/No)']),
                guantesNitriloNeopreno: isYes(row['EPP Guantes (Si/No)'])
              },
              observaciones: row.Observaciones || 'Carga masiva desinfección',
              firmaOperador: row['Firma Operador'] || '',
              firmaSupervisor: row['Firma Supervisor'] || '',
              elaboro: 'Gerente Comercial Industrial',
              reviso: 'Comité ISO',
              aprobo: 'Gerente General',
              cambioControl: [
                {
                  version: '1.0',
                  fecha: '23/10/2018',
                  seccion: 'Sección Inicial',
                  cambio: 'Emisión inicial de la bitácora de desinfección',
                  solicitante: 'Comité ISO'
                }
              ]
            });
          });
        } else if (tipo === 'checklist_diario_planta') {
          jsonData.forEach((row: any) => {
            recordsToSave.push({
              fecha: parseExcelDate(row.Fecha),
              turno: row.Turno || 'Matutino',
              areaZona: row.Area || row['Area / Zona'] || 'Planta Principal',
              inspector: row.Responsable || row.Inspector || '',
              responsable: row.Responsable || row.Inspector || '',
              puntajeHse: parseNum(row['Puntaje HSE'] || 100),
              puntajeCalidad: parseNum(row['Puntaje Calidad'] || 100),
              puntajeMantenimiento: parseNum(row['Puntaje Mantenimiento'] || 100),
              puntaje5s: parseNum(row['Puntaje 5S'] || 100),
              puntajeGlobal: parseNum(row['Puntaje Global'] || 98),
              observaciones: row.Observaciones || 'Inspección importada masivamente',
              seccionHse: [],
              seccionCalidad: [],
              seccionMantenimiento: [],
              seccion5s: [],
              firmas: {
                inspector: row.Responsable || row.Inspector || '',
                gerentePlanta: 'Ing. Manuel López — Gerente de Planta'
              }
            });
          });
        } else if (tipo === 'control_caldera') {
          jsonData.forEach((row: any, idx: number) => {
            const isOk = (val: any) => {
              if (!val) return false;
              const s = String(val).trim().toLowerCase();
              return s === 'ok' || s === 'conforme' || s === 'si' || s === 'sí' || s === 'true' || s === '1' || s === 'bien';
            };

            const turnoVal = row.Turno || row['Turno (Turno 1 / Turno 2 / Ambos)'] || 'Ambos Turnos';
            const normalizedTurno = turnoVal.includes('1') && !turnoVal.includes('2') && !turnoVal.includes('Ambos') ? 'Turno 1' :
                                    turnoVal.includes('2') && !turnoVal.includes('1') && !turnoVal.includes('Ambos') ? 'Turno 2' : 'Ambos Turnos';

            const eventosList: any[] = [];
            if (row['Falla Componente'] || row['Falla Descripcion'] || row.Componente || row.Falla) {
              eventosList.push({
                id: `ev-${Date.now()}-${idx}`,
                fecha: parseExcelDate(row.Fecha),
                componente: row['Falla Componente'] || row.Componente || 'Caldera / Quemador',
                falla: row['Falla Descripcion'] || row.Falla || 'Ajuste operativo',
                accion: row['Accion Correctiva'] || row.Accion || 'Mantenimiento preventivo',
                repuesto: row.Repuesto || row['Repuesto Utilizado'] || 'Ninguno',
                proveedor: row.Proveedor || 'Interno BIOTRASH'
              });
            }

            recordsToSave.push({
              folio: `CAL-${Date.now().toString().slice(-6)}-${idx + 1}`,
              fecha: parseExcelDate(row.Fecha),
              responsable: row['Operador Responsable'] || row.Operador || '',
              observaciones: row.Comentarios || row['Comentarios Operativos'] || 'Operación de caldera registrada vía carga masiva Excel',
              turnoSeleccionado: normalizedTurno,
              identificacionCaldera: row['Identificacion Caldera'] || row.Caldera || 'Caldera Clayton Mod. E-100 (Principal)',
              operadorResponsable: row['Operador Responsable'] || row.Operador || '',
              turno1: {
                presionVaporPsi: parseNum(row['T1 Presion Vapor (PSI)'] || row['T1 Presión Vapor PSI (80-120)'] || 105),
                tempAguaAlimentacionC: parseNum(row['T1 Temp Agua Alimentacion (C)'] || row['T1 Temp Agua Alimentación °C (80-90)'] || 85),
                tempGasesChimeneaC: parseNum(row['T1 Temp Gases Chimenea (C)'] || row['T1 Temp Gases Chimenea °C (180-230)'] || 195),
                nivelAguaVisorOk: isOk(row['T1 Nivel Agua Visor (OK/Falla)'] ?? true),
                presionCombustibleGasPsi: parseNum(row['T1 Presion Combustible (PSI)'] || row['T1 Presión Combustible Gas PSI'] || 35),
                purgaColumnaNivel: isYes((row['T1 Purga Columna (Si/No)'] || row['T1 Purga Columna Nivel (Si/No)']) ?? true),
                purgaFondoLodos: isYes((row['T1 Purga Fondo (Si/No)'] || row['T1 Purga Fondo Lodos (Si/No)']) ?? true),
                dosificacionQuimicosPpm: parseNum(row['T1 Dosificacion Quimicos (L/dia)'] || row['T1 Dosificación Químicos L/día (1.5)'] || 1.5),
                tdsConductividadAgua: parseNum(row['T1 TDS Conductividad (uS/cm)'] || row['T1 TDS Conductividad Agua µS/cm (<3000)'] || 2200),
                inspeccionFugasOk: isOk((row['T1 Fugas (OK/Falla)'] || row['T1 Inspección Fugas (OK/Fuga)']) ?? true)
              },
              turno2: {
                presionVaporPsi: parseNum(row['T2 Presion Vapor (PSI)'] || row['T2 Presión Vapor PSI (80-120)'] || 110),
                tempAguaAlimentacionC: parseNum(row['T2 Temp Agua Alimentacion (C)'] || row['T2 Temp Agua Alimentación °C (80-90)'] || 87),
                tempGasesChimeneaC: parseNum(row['T2 Temp Gases Chimenea (C)'] || row['T2 Temp Gases Chimenea °C (180-230)'] || 200),
                nivelAguaVisorOk: isOk(row['T2 Nivel Agua Visor (OK/Falla)'] ?? true),
                presionCombustibleGasPsi: parseNum(row['T2 Presion Combustible (PSI)'] || row['T2 Presión Combustible Gas PSI'] || 36),
                purgaColumnaNivel: isYes((row['T2 Purga Columna (Si/No)'] || row['T2 Purga Columna Nivel (Si/No)']) ?? true),
                purgaFondoLodos: isYes((row['T2 Purga Fondo (Si/No)'] || row['T2 Purga Fondo Lodos (Si/No)']) ?? true),
                dosificacionQuimicosPpm: parseNum(row['T2 Dosificacion Quimicos (L/dia)'] || row['T2 Dosificación Químicos L/día (1.5)'] || 1.5),
                tdsConductividadAgua: parseNum(row['T2 TDS Conductividad (uS/cm)'] || row['T2 TDS Conductividad Agua µS/cm (<3000)'] || 2350),
                inspeccionFugasOk: isOk((row['T2 Fugas (OK/Falla)'] || row['T2 Inspección Fugas (OK/Fuga)']) ?? true)
              },
              checklist: {
                limpiezaFiltrosCombustibleTrampasAgua: isYes(row['Mantenimiento Semanal Completo (Si/No)'] ?? true),
                limpiezaFotoceldaElectrodoIgnicion: isYes(row['Mantenimiento Semanal Completo (Si/No)'] ?? true),
                pruebaParadaBajoNivelAguaCutOff: isYes(row['Mantenimiento Semanal Completo (Si/No)'] ?? true),
                inspeccionTrampasVaporRetornoCondensados: isYes(row['Mantenimiento Semanal Completo (Si/No)'] ?? true),
                limpiezaMallaVentilacionQuemador: isYes(row['Mantenimiento Semanal Completo (Si/No)'] ?? true),

                inspeccionQuemadorBoquillas: isYes(row['Mantenimiento Mensual Completo (Si/No)'] ?? true),
                verificacionPresostatosLimiteAlto: isYes(row['Mantenimiento Mensual Completo (Si/No)'] ?? true),
                inspeccionTubosGasesRegistroHollin: isYes(row['Mantenimiento Mensual Completo (Si/No)'] ?? true),
                inspeccionBombasAlimentacionSellos: isYes(row['Mantenimiento Mensual Completo (Si/No)'] ?? true),
                accionamientoManualValvulasSeguridad: isYes(row['Mantenimiento Mensual Completo (Si/No)'] ?? true),

                inspeccionLadoAguaDesincrustacion: isYes(row['Mantenimiento Semestral Completo (Si/No)'] ?? false),
                limpiezaMecanicaTubosRefractario: isYes(row['Mantenimiento Semestral Completo (Si/No)'] ?? false),
                calibracionValvulasSeguridadAcreditado: isYes(row['Mantenimiento Semestral Completo (Si/No)'] ?? true),
                analisisGasesCombustionEficiencia: isYes(row['Mantenimiento Semestral Completo (Si/No)'] ?? true),
                pruebaHidrostaticaEspesoresNorma: isYes(row['Mantenimiento Semestral Completo (Si/No)'] ?? false)
              },
              eventos: eventosList,
              comentarios: row.Comentarios || row['Comentarios Operativos'] || 'Operación de caldera registrada vía carga masiva Excel',
              dictamenTecnico: row['Dictamen Tecnico'] || row['Dictamen Técnico'] || 'Caldera operando conforme a estándares del SGI',
              estadoOperacional: (row['Estado Caldera'] || 'Operativo / Conforme') as any,
              firmaResponsable: row['Firma Operador'] || '',
              firmaSupervisor: row['Firma Supervisor'] || ''
            });
          });
        } else if (tipo === 'evaluacion_360_incinerador') {
          cleanData.forEach((row: any, idx: number) => {
            const secSeg = parseNum(row['Puntaje Seguridad'] || 100);
            const secMec = parseNum(row['Puntaje Mecanico'] || row['Puntaje Mecánico'] || 95);
            const secComb = parseNum(row['Puntaje Combustion'] || row['Puntaje Combustión'] || 95);
            const secElec = parseNum(row['Puntaje Electrico'] || row['Puntaje Eléctrico'] || 100);
            const secBio = parseNum(row['Puntaje Bioseguridad'] || 100);
            const secOpr = parseNum(row['Puntaje Operatividad'] || 100);
            const secGlob = parseNum(row['Puntaje Global'] || Math.round((secSeg*0.25)+(secMec*0.20)+(secComb*0.20)+(secElec*0.15)+(secBio*0.10)+(secOpr*0.10)));

            const insp = getRowVal(row, 'Inspector SGI', 'Inspector', 'Auditor') || '';
            const opr = getRowVal(row, 'Operador Responsable', 'Operador Asignado', 'Operador') || '';
            const sup = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horometro Actual'));

            recordsToSave.push({
              folio: row.Folio || `EV360-INC-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: parseExcelDate(getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'fecha', 'FECHA')),
              responsable: insp || opr || '',
              observaciones: getRowVal(row, 'Observaciones Generales', 'Observaciones') || 'Evaluación 360° incinerador importada masivamente',
              equipoId: getRowVal(row, 'Equipo ID', 'Equipo ID (INC-01 / INC-02)', 'Equipo') || 'INC-01',
              nombreEquipo: getRowVal(row, 'Nombre Equipo') || 'Incinerador Pirolítico Industrial 01',
              turno: (getRowVal(row, 'Turno') || 'Matutino') as any,
              horometroActual: horo,
              operadorAsignado: opr,
              inspectorSgi: insp,
              tempCamaraPrimariaC: parseNumOrBlank(getRowVal(row, 'Temp Camara Primaria (C)', 'Temp Cámara Primaria °C')),
              tempCamaraSecundariaC: parseNumOrBlank(getRowVal(row, 'Temp Camara Secundaria (C)', 'Temp Cámara Secundaria °C')),
              presionCombustibleBar: parseNumOrBlank(getRowVal(row, 'Presion Combustible (Bar)', 'Presión Combustible Bar')),
              opacidadHumoPorc: parseNumOrBlank(getRowVal(row, 'Opacidad Humo (%)', 'Opacidad Humo %')),
              tipoCombustible: getRowVal(row, 'Tipo Combustible') || 'Diésel Bajo Azufre (LSD)',
              itemsSeguridad: DEFAULT_ITEMS_INCINERADOR.seguridad,
              itemsMecanico: DEFAULT_ITEMS_INCINERADOR.mecanico,
              itemsHidraulicoCombustion: DEFAULT_ITEMS_INCINERADOR.hidraulicoCombustion,
              itemsElectricoControl: DEFAULT_ITEMS_INCINERADOR.electricoControl,
              itemsBioseguridadLimpieza: DEFAULT_ITEMS_INCINERADOR.bioseguridadLimpieza,
              itemsOperatividad: DEFAULT_ITEMS_INCINERADOR.operatividad,
              puntajeSeguridad: secSeg,
              puntajeMecanico: secMec,
              puntajeHidraulicoCombustion: secComb,
              puntajeElectricoControl: secElec,
              puntajeBioseguridadLimpieza: secBio,
              puntajeOperatividad: secOpr,
              puntajeGlobal: secGlob,
              veredictoOperacional: (getRowVal(row, 'Veredicto Operacional') || 'Aprobado para Operar') as any,
              nivelRiesgo: (getRowVal(row, 'Nivel Riesgo') || 'Bajo') as any,
              observacionesGenerales: getRowVal(row, 'Observaciones Generales') || 'Auditoría 360° de horno térmico registrada vía carga masiva Excel',
              accionesCorrectivas: [],
              firmas: {
                inspector: getRowVal(row, 'Firma Inspector') || insp,
                operador: getRowVal(row, 'Firma Operador') || opr,
                supervisor: sup
              }
            });
          });
        } else if (tipo === 'evaluacion_360_tunel_lavado') {
          cleanData.forEach((row: any, idx: number) => {
            const secSeg = parseNum(row['Puntaje Seguridad'] || 100);
            const secMec = parseNum(row['Puntaje Mecanico'] || row['Puntaje Mecánico'] || 100);
            const secHid = parseNum(row['Puntaje Hidraulico'] || row['Puntaje Hidráulico'] || 95);
            const secElec = parseNum(row['Puntaje Electrico'] || row['Puntaje Eléctrico'] || 100);
            const secBio = parseNum(row['Puntaje Bioseguridad'] || 100);
            const secOpr = parseNum(row['Puntaje Operatividad'] || 95);
            const secGlob = parseNum(row['Puntaje Global'] || Math.round((secSeg*0.25)+(secMec*0.20)+(secHid*0.20)+(secElec*0.15)+(secBio*0.10)+(secOpr*0.10)));

            const insp = getRowVal(row, 'Inspector SGI', 'Inspector', 'Auditor') || '';
            const opr = getRowVal(row, 'Operador Responsable', 'Operador Asignado', 'Operador') || '';
            const sup = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horometro Actual'));

            recordsToSave.push({
              folio: row.Folio || `EV360-TUN-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: parseExcelDate(getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'fecha', 'FECHA')),
              responsable: insp || opr || '',
              observaciones: getRowVal(row, 'Observaciones Generales', 'Observaciones') || 'Evaluación 360° túnel de lavado importada masivamente',
              equipoId: getRowVal(row, 'Equipo ID', 'Equipo ID (TUN-01)', 'Equipo') || 'TUN-01',
              nombreEquipo: getRowVal(row, 'Nombre Equipo') || 'Túnel Hidro-Lavador Automático 01',
              turno: (getRowVal(row, 'Turno') || 'Matutino') as any,
              horometroActual: horo,
              operadorAsignado: opr,
              inspectorSgi: insp,
              presionBombaLavadoPsi: parseNumOrBlank(getRowVal(row, 'Presion Bomba Lavado (PSI)', 'Presión Bomba Lavado PSI')),
              ppmDesinfectante: parseNumOrBlank(getRowVal(row, 'PPM Desinfectante')),
              temperaturaAguaC: parseNumOrBlank(getRowVal(row, 'Temperatura Agua (C)', 'Temperatura Agua °C')),
              velocidadCadenaMetrosMin: parseNumOrBlank(getRowVal(row, 'Velocidad Cadena (m/min)')),
              quimicoDosificado: getRowVal(row, 'Quimico Dosificado', 'Químico Dosificado') || 'Amonio Cuaternario 5ta Gen / Ácido Peracético',
              itemsSeguridad: DEFAULT_ITEMS_TUNEL_LAVADO.seguridad,
              itemsMecanico: DEFAULT_ITEMS_TUNEL_LAVADO.mecanico,
              itemsHidraulicoCombustion: DEFAULT_ITEMS_TUNEL_LAVADO.hidraulicoCombustion,
              itemsElectricoControl: DEFAULT_ITEMS_TUNEL_LAVADO.electricoControl,
              itemsBioseguridadLimpieza: DEFAULT_ITEMS_TUNEL_LAVADO.bioseguridadLimpieza,
              itemsOperatividad: DEFAULT_ITEMS_TUNEL_LAVADO.operatividad,
              puntajeSeguridad: secSeg,
              puntajeMecanico: secMec,
              puntajeHidraulicoCombustion: secHid,
              puntajeElectricoControl: secElec,
              puntajeBioseguridadLimpieza: secBio,
              puntajeOperatividad: secOpr,
              puntajeGlobal: secGlob,
              veredictoOperacional: (getRowVal(row, 'Veredicto Operacional') || 'Aprobado para Operar') as any,
              nivelRiesgo: (getRowVal(row, 'Nivel Riesgo') || 'Bajo') as any,
              observacionesGenerales: getRowVal(row, 'Observaciones Generales') || 'Auditoría 360° de túnel hidrolavador registrada vía carga masiva Excel',
              accionesCorrectivas: [],
              firmas: {
                inspector: getRowVal(row, 'Firma Inspector') || insp,
                operador: getRowVal(row, 'Firma Operador') || opr,
                supervisor: sup
              }
            });
          });
        } else if (tipo === 'evaluacion_360_compactadora') {
          cleanData.forEach((row: any, idx: number) => {
            const secSeg = parseNum(row['Puntaje Seguridad'] || 100);
            const secMec = parseNum(row['Puntaje Mecanico'] || row['Puntaje Mecánico'] || 95);
            const secHid = parseNum(row['Puntaje Hidraulico'] || row['Puntaje Hidráulico'] || 100);
            const secElec = parseNum(row['Puntaje Electrico'] || row['Puntaje Eléctrico'] || 95);
            const secBio = parseNum(row['Puntaje Bioseguridad'] || 100);
            const secOpr = parseNum(row['Puntaje Operatividad'] || 100);
            const secGlob = parseNum(row['Puntaje Global'] || Math.round((secSeg*0.25)+(secMec*0.20)+(secHid*0.20)+(secElec*0.15)+(secBio*0.10)+(secOpr*0.10)));

            const insp = getRowVal(row, 'Inspector SGI', 'Inspector', 'Auditor') || '';
            const opr = getRowVal(row, 'Operador Responsable', 'Operador Asignado', 'Operador') || '';
            const sup = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horometro Actual'));

            recordsToSave.push({
              folio: row.Folio || `EV360-COMP-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: parseExcelDate(getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'fecha', 'FECHA')),
              responsable: insp || opr || '',
              observaciones: getRowVal(row, 'Observaciones Generales', 'Observaciones') || 'Evaluación 360° compactadora importada masivamente',
              equipoId: getRowVal(row, 'Equipo ID', 'Equipo ID (COMP-01 / COMP-02)', 'Equipo') || 'COMP-01',
              nombreEquipo: getRowVal(row, 'Nombre Equipo') || 'Compactadora Hidráulica Vertical 01',
              turno: (getRowVal(row, 'Turno') || 'Matutino') as any,
              horometroActual: horo,
              operadorAsignado: opr,
              inspectorSgi: insp,
              presionPrensadoPsi: parseNumOrBlank(getRowVal(row, 'Presion Prensado (PSI)', 'Presión Prensado PSI')),
              temperaturaAceiteC: parseNumOrBlank(getRowVal(row, 'Temperatura Aceite (C)', 'Temperatura Aceite °C')),
              pesoPromedioPacaLbs: parseNumOrBlank(getRowVal(row, 'Peso Promedio Paca (Lbs)')),
              tiempoCicloPrensadoSeg: parseNumOrBlank(getRowVal(row, 'Tiempo Ciclo Prensado (Seg)')),
              tipoFleje: getRowVal(row, 'Tipo Fleje') || 'Alambre Recocido Calibre 14 Alta Resistencia',
              itemsSeguridad: DEFAULT_ITEMS_COMPACTADORA.seguridad,
              itemsMecanico: DEFAULT_ITEMS_COMPACTADORA.mecanico,
              itemsHidraulicoCombustion: DEFAULT_ITEMS_COMPACTADORA.hidraulicoCombustion,
              itemsElectricoControl: DEFAULT_ITEMS_COMPACTADORA.electricoControl,
              itemsBioseguridadLimpieza: DEFAULT_ITEMS_COMPACTADORA.bioseguridadLimpieza,
              itemsOperatividad: DEFAULT_ITEMS_COMPACTADORA.operatividad,
              puntajeSeguridad: secSeg,
              puntajeMecanico: secMec,
              puntajeHidraulicoCombustion: secHid,
              puntajeElectricoControl: secElec,
              puntajeBioseguridadLimpieza: secBio,
              puntajeOperatividad: secOpr,
              puntajeGlobal: secGlob,
              veredictoOperacional: (getRowVal(row, 'Veredicto Operacional') || 'Aprobado para Operar') as any,
              nivelRiesgo: (getRowVal(row, 'Nivel Riesgo') || 'Bajo') as any,
              observacionesGenerales: getRowVal(row, 'Observaciones Generales') || 'Auditoría 360° de compactadora registrada vía carga masiva Excel',
              accionesCorrectivas: [],
              firmas: {
                inspector: getRowVal(row, 'Firma Inspector') || insp,
                operador: getRowVal(row, 'Firma Operador') || opr,
                supervisor: sup
              }
            });
          });
        } else if (tipo === 'evaluacion_360_trituradora') {
          cleanData.forEach((row: any, idx: number) => {
            const secSeg = parseNum(row['Puntaje Seguridad'] || 100);
            const secMec = parseNum(row['Puntaje Mecanico'] || row['Puntaje Mecánico'] || 95);
            const secComb = parseNum(row['Puntaje Hidraulico'] || row['Puntaje Hidráulico'] || 95);
            const secElec = parseNum(row['Puntaje Electrico'] || row['Puntaje Eléctrico'] || 100);
            const secBio = parseNum(row['Puntaje Bioseguridad'] || 100);
            const secOpr = parseNum(row['Puntaje Operatividad'] || 100);
            const secGlob = parseNum(row['Puntaje Global'] || Math.round((secSeg*0.25)+(secMec*0.20)+(secComb*0.20)+(secElec*0.15)+(secBio*0.10)+(secOpr*0.10)));

            const insp = getRowVal(row, 'Inspector SGI', 'Inspector', 'Auditor') || '';
            const opr = getRowVal(row, 'Operador Responsable', 'Operador Asignado', 'Operador') || '';
            const sup = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horometro Actual'));

            recordsToSave.push({
              folio: row.Folio || `EV360-TRIT-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: parseExcelDate(getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'fecha', 'FECHA')),
              responsable: insp || opr || '',
              observaciones: getRowVal(row, 'Observaciones Generales', 'Observaciones') || 'Evaluación 360° trituradora importada masivamente',
              equipoId: getRowVal(row, 'Equipo ID', 'Equipo ID (TRIT-01 / TRIT-02)', 'Equipo') || 'TRIT-01',
              nombreEquipo: getRowVal(row, 'Nombre Equipo') || 'Trituradora Shredder Industrial Doble Eje 01',
              turno: (getRowVal(row, 'Turno') || 'Matutino') as any,
              horometroActual: horo,
              operadorAsignado: opr,
              inspectorSgi: insp,
              amperajeMotorA: parseNumOrBlank(getRowVal(row, 'Amperaje Motor (A)', 'Amperaje Motor A')),
              velocidadRotacionRpm: parseNumOrBlank(getRowVal(row, 'Velocidad Rotacion (RPM)', 'Velocidad Rotación RPM')),
              tiempoRespuestaAutoReverseSeg: parseNumOrBlank(getRowVal(row, 'Tiempo Auto-Reverse (Seg)')),
              desgasteCuchillasMm: parseNumOrBlank(getRowVal(row, 'Desgaste Cuchillas (mm)')),
              capacidadProcesamientoLbsHr: parseNumOrBlank(getRowVal(row, 'Capacidad Procesamiento (Lbs/Hr)')),
              itemsSeguridad: DEFAULT_ITEMS_TRITURADORA.seguridad,
              itemsMecanico: DEFAULT_ITEMS_TRITURADORA.mecanico,
              itemsHidraulicoCombustion: DEFAULT_ITEMS_TRITURADORA.hidraulicoCombustion,
              itemsElectricoControl: DEFAULT_ITEMS_TRITURADORA.electricoControl,
              itemsBioseguridadLimpieza: DEFAULT_ITEMS_TRITURADORA.bioseguridadLimpieza,
              itemsOperatividad: DEFAULT_ITEMS_TRITURADORA.operatividad,
              puntajeSeguridad: secSeg,
              puntajeMecanico: secMec,
              puntajeHidraulicoCombustion: secComb,
              puntajeElectricoControl: secElec,
              puntajeBioseguridadLimpieza: secBio,
              puntajeOperatividad: secOpr,
              puntajeGlobal: secGlob,
              veredictoOperacional: (getRowVal(row, 'Veredicto Operacional') || 'Aprobado para Operar') as any,
              nivelRiesgo: (getRowVal(row, 'Nivel Riesgo') || 'Bajo') as any,
              observacionesGenerales: getRowVal(row, 'Observaciones Generales') || 'Auditoría 360° de trituradora shredder registrada vía carga masiva Excel',
              accionesCorrectivas: [],
              firmas: {
                inspector: getRowVal(row, 'Firma Inspector') || insp,
                operador: getRowVal(row, 'Firma Operador') || opr,
                supervisor: sup
              }
            });
          });
        } else if (tipo === 'control_360_vehiculos') {
          cleanData.forEach((row: any, idx: number) => {
            const cond = getRowVal(row, 'Conductor', 'Piloto Asignado', 'Piloto') || '';
            const sup = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';

            recordsToSave.push({
              folio: row.Folio || `V360-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: parseExcelDate(getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'fecha', 'FECHA')),
              responsable: cond || sup || '',
              observaciones: getRowVal(row, 'Observaciones Salida', 'Observaciones') || 'Inspección 360° de vehículo importada masivamente',
              turno: (getRowVal(row, 'Turno') || 'AM') as any,
              centro: getRowVal(row, 'Centro Operaciones', 'Centro') || 'VILLA NUEVA 1',
              ruta: getRowVal(row, 'Ruta') || 'VN1-BLA',
              placa: getRowVal(row, 'Placa') || 'C-442BTL',
              estadoPlaca: (getRowVal(row, 'Estado Placa') || 'Activa') as any,
              tipoVehiculo: (getRowVal(row, 'Tipo Vehiculo', 'Tipo Vehículo') || 'Camion') as any,
              conductor: cond,
              noLicencia: getRowVal(row, 'No Licencia', 'Número Licencia') || '',
              tipoLicencia: getRowVal(row, 'Tipo Licencia') || 'Tipo A Profesional',
              telefono: getRowVal(row, 'Telefono', 'Teléfono') || '',
              contenedoresRojosLimpiosVacios: parseNumOrBlank(getRowVal(row, 'Contenedores Rojos Limpios Vacios', 'Contenedores Rojos Limpios Vacíos')),
              checklistMecanico: {
                frenos: isYes(getRowVal(row, 'Frenos Conforme (Si/No)', 'Frenos Conforme') ?? true) ? 'OK' : 'Falla',
                llantas: isYes(getRowVal(row, 'Llantas Conforme (Si/No)', 'Llantas Conforme') ?? true) ? 'OK' : 'Falla',
                luces: isYes(getRowVal(row, 'Luces Conforme (Si/No)', 'Luces Conforme') ?? true) ? 'OK' : 'Falla',
                extintor: isYes(getRowVal(row, 'Extintor Vigente (Si/No)', 'Extintor Vigente') ?? true) ? 'OK' : 'Falla',
                cinturones: isYes(getRowVal(row, 'Cinturones Conforme (Si/No)', 'Cinturones Conforme') ?? true) ? 'OK' : 'Falla',
                espejos: 'OK',
                combustible: 'OK',
                botiquin: 'OK'
              },
              checklistBioseguridad: {
                selloHermetico: isYes(getRowVal(row, 'Sello Hermetico (Si/No)', 'Sello Hermetico') ?? true) ? 'OK' : 'Falla',
                biohazardVisible: isYes(getRowVal(row, 'Rotulo Biohazard Visible (Si/No)', 'Rotulo Biohazard Visible') ?? true) ? 'OK' : 'Falla',
                desinfeccionPrevia: isYes(getRowVal(row, 'Desinfeccion Previa Realizada (Si/No)', 'Desinfeccion Previa Realizada') ?? true) ? 'OK' : 'Falla',
                kitDerrame: isYes(getRowVal(row, 'Kit Antiderrame Conforme (Si/No)', 'Kit Antiderrame Conforme') ?? true) ? 'OK' : 'Falla',
                eppCompleto: isYes(getRowVal(row, 'EPP Completo (Si/No)', 'EPP Completo') ?? true) ? 'OK' : 'Falla'
              },
              horaSalida: getRowVal(row, 'Hora Salida', 'Hora Salida (HH:MM)') || '06:30',
              kmSalida: parseNumOrBlank(getRowVal(row, 'KM Salida', 'Kilometraje Salida')),
              obsSalida: getRowVal(row, 'Observaciones Salida') || 'Vehículo despachado conforme a checklist 360',
              todosCriticosAprobados: true,
              horaLlegadaPlanta: getRowVal(row, 'Hora Llegada Planta') || '14:15',
              kmLlegada: parseNumOrBlank(getRowVal(row, 'KM Llegada')),
              kmRecorridos: '',
              horaLlegadaFinal: getRowVal(row, 'Hora Llegada Planta') || '14:15',
              pesoEntregadoLbs: parseNumOrBlank(getRowVal(row, 'Peso Entregado Lbs')),
              recibidoPorPlanta: getRowVal(row, 'Recibido Por Planta') || '',
              descargaCompleta: true,
              limpiezaInterior: true,
              desinfectanteUtilizado: getRowVal(row, 'Desinfectante Utilizado') || 'Amonio Cuaternario al 10%',
              tiempoContactoMinutos: 15,
              horaFinDesinfeccion: '14:45',
              novedadesRuta: getRowVal(row, 'Novedades Ruta') || 'Ruta completada sin incidencias mecánicas ni biológicas',
              firmaConductor: getRowVal(row, 'Firma Conductor') || cond,
              firmaSupervisor: sup
            });
          });
        } else if (tipo === 'mantenimiento_incinerador') {
          cleanData.forEach((row: any, idx: number) => {
            const rowFecha = parseExcelDate(getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'fecha', 'FECHA'));
            const tecnico = getRowVal(row, 'Tecnico Responsable', 'Técnico Responsable', 'Tecnico', 'Técnico', 'Firma Tecnico', 'Firma Técnico') || '';
            const supervisor = getRowVal(row, 'Supervisado Por', 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horómetro (Horas Operación)', 'Horas Operacion'));
            const eqId = getRowVal(row, 'Equipo ID', 'Equipo ID (INC-01 / INC-02)', 'Equipo') || 'INC-01';
            const desc = getRowVal(row, 'Descripcion Trabajos y Repuestos', 'Descripción Trabajos y Repuestos', 'Descripcion', 'Descripción') || '';

            recordsToSave.push({
              folio: row.Folio || `MTO-INC-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: rowFecha,
              responsable: tecnico || supervisor || '',
              observaciones: desc || 'Mantenimiento preventivo de incinerador importado masivamente',
              equipoId: eqId,
              nombreEquipo: (eqId === 'INC-02') ? 'Incinerador Industrial de DSH 02' : 'Incinerador Industrial de DSH 01',
              tipoMantenimiento: (getRowVal(row, 'Tipo Mantenimiento') || 'Preventivo Programado') as any,
              horaInicio: getRowVal(row, 'Hora Inicio', 'Hora Inicio (HH:MM)') || '07:00',
              horaFin: getRowVal(row, 'Hora Fin', 'Hora Fin (HH:MM)') || '11:30',
              horasOperacion: horo,
              tecnicoResponsable: tecnico,
              supervisadoPor: supervisor,
              lotoCandadeo: isYes(getRowVal(row, 'LOTO Candadeo', 'LOTO Candadeo (Si/No)') ?? true),
              temperaturaMenor40: isYes(getRowVal(row, 'Temperatura Menor 40C', 'Temperatura Menor 40C (Si/No)') ?? true),
              purgaCorteCombustible: isYes(getRowVal(row, 'Purga Corte Combustible', 'Purga Corte Combustible (Si/No)') ?? true),
              ventilacionCamaras: isYes(getRowVal(row, 'Ventilacion Camaras', 'Ventilacion Camaras (Si/No)') ?? true),
              checklistCamaras: {
                revestimientoCamaraPrimaria: getRowVal(row, 'Estado Refractario Camara Primaria') || 'Bueno',
                revestimientoCamaraSecundaria: getRowVal(row, 'Estado Refractario Camara Secundaria') || 'Bueno',
                sellosPuertas: getRowVal(row, 'Estado Sellos Puertas') || 'Bueno',
                mirillasInspeccion: 'Bueno',
                estructuraExteriorCarter: 'Bueno'
              },
              checklistCombustion: {
                boquillasInyectores: getRowVal(row, 'Estado Boquillas Inyectores') || 'Bueno',
                electrodosIgnicion: getRowVal(row, 'Estado Electrodos Ignicion') || 'Bueno',
                detectoresLlama: getRowVal(row, 'Estado Detectores Llama') || 'Bueno',
                filtrosCombustible: 'Bueno',
                valvulasSolenoides: 'Bueno',
                valvulaCorteSlamOff: 'Bueno'
              },
              checklistInstrumentacion: {
                termocuplaCamaraPrimaria: getRowVal(row, 'Estado Termocuplas') || 'Bueno',
                termocuplaCamaraSecundaria: getRowVal(row, 'Estado Termocuplas') || 'Bueno',
                manometrosPresion: getRowVal(row, 'Estado Manometros') || 'Bueno',
                panelPlcAlarmas: 'Bueno'
              },
              repuestosUtilizados: [
                {
                  cantidad: 1,
                  codigo: 'MTO-REP-01',
                  descripcion: desc || 'Mantenimiento preventivo e insumos',
                  causaReemplazo: 'Servicio programado'
                }
              ],
              descripcionTrabajos: desc || 'Mantenimiento preventivo e inspección general de componentes',
              pruebasHermeticidad: isYes(getRowVal(row, 'Pruebas Hermeticidad') ?? true),
              pruebasInterlocks: isYes(getRowVal(row, 'Pruebas Interlocks') ?? true),
              modulacionLlama: isYes(getRowVal(row, 'Modulacion Llama') ?? true),
              tempConsignaSecundariaAlcanzada: true,
              tiroNegativoVerificado: true,
              estadoFinal: (getRowVal(row, 'Estado Final') || 'Operativo Conforme') as any,
              firmaTecnico: tecnico,
              firmaSupervisor: supervisor
            });
          });
        } else if (tipo === 'mantenimiento_lampinator') {
          cleanData.forEach((row: any, idx: number) => {
            const rowFecha = parseExcelDate(getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'fecha', 'FECHA'));
            const tecnico = getRowVal(row, 'Tecnico Responsable', 'Técnico Responsable', 'Tecnico', 'Técnico', 'Firma Tecnico', 'Firma Técnico') || '';
            const supervisor = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horómetro (Horas)', 'Horas Operacion'));
            const desc = getRowVal(row, 'Descripcion Trabajos y Repuestos', 'Descripción Trabajos y Repuestos', 'Descripcion', 'Descripción') || '';

            recordsToSave.push({
              folio: row.Folio || `MTO-LAMP-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: rowFecha,
              responsable: tecnico || supervisor || '',
              observaciones: desc || 'Mantenimiento Lampinator importado masivamente',
              equipoId: getRowVal(row, 'Equipo ID', 'Equipo ID (LAMP-01)') || 'LAMP-01',
              nombreEquipo: 'Máquina Desmercurizadora Lampinator 01',
              tipoMantenimiento: (getRowVal(row, 'Tipo Mantenimiento') || 'Preventivo Programado') as any,
              horaInicio: getRowVal(row, 'Hora Inicio', 'Hora Inicio (HH:MM)') || '08:00',
              horaFin: getRowVal(row, 'Hora Fin', 'Hora Fin (HH:MM)') || '10:45',
              horometro: horo,
              tecnicoResponsable: tecnico,
              operadorTurno: getRowVal(row, 'Operador Turno', 'Operador') || '',
              mascarillaVaporHg: isYes(getRowVal(row, 'Mascarilla Vapor Hg 3M', 'Mascarilla Vapor Hg 3M (Si/No)') ?? true),
              pruebaFugaVaporHgPpm: parseNumOrBlank(getRowVal(row, 'Fuga Vapor Hg Ppm', 'Fuga Vapor Hg PPM')),
              protocoloLoto: isYes(getRowVal(row, 'Protocolo LOTO', 'Protocolo LOTO (Si/No)') ?? true),
              checklistFiltracion: {
                diferencialPresionHepa: getRowVal(row, 'Filtro HEPA Presion Diferencial') || 'Conforme',
                moduloCarbonActivadoHg: getRowVal(row, 'Modulo Carbon Activado Hg') || 'Conforme',
                prefiltrosPolvo: getRowVal(row, 'Prefiltros Polvo') || 'Conforme'
              },
              checklistMecanico: {
                desgasteMartillosCuchillas: getRowVal(row, 'Desgaste Martillos Trituracion') || 'Conforme',
                hermeticidadEmpaquesTolva: getRowVal(row, 'Hermeticidad Empaques Tolva') || 'Conforme'
              },
              checklistExtraccion: {
                nivelLlenadoTamborVidrio: getRowVal(row, 'Nivel Tambor Vidrio y Fósforo') || 'Conforme',
                inspeccionManguerasSuccion: getRowVal(row, 'Mangueras Succion Vacio') || 'Conforme'
              },
              checklistSeguridad: {
                parosEmergenciaInterlocks: getRowVal(row, 'Paros Emergencia Interlocks') || 'Conforme',
                medidoresDepresionVacio: 'Conforme'
              },
              repuestosUtilizados: [
                {
                  cantidad: 1,
                  codigo: 'LAMP-FIL-01',
                  repuesto: desc || 'Prefiltro de partículas / Sellos herméticos',
                  causa: 'Mantenimiento periódico'
                }
              ],
              estadoFinal: (getRowVal(row, 'Estado Final') || 'Operativo Conforme') as any,
              firmaTecnico: tecnico,
              firmaSupervisor: supervisor
            });
          });
        } else if (tipo === 'mantenimiento_trituradora') {
          cleanData.forEach((row: any, idx: number) => {
            const rawFecha = getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'Fecha (YYYY-MM-DD)', 'fecha', 'FECHA');
            const tecnico = getRowVal(row, 'Tecnico Responsable', 'Técnico Responsable', 'Tecnico', 'Técnico', 'Firma Tecnico', 'Firma Técnico') || '';
            const supervisor = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable', 'Supervisado Por') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horometro Actual', 'Horómetro (Horas Operación)'));
            const eqId = getRowVal(row, 'Equipo ID', 'Equipo ID (TRIT-01 / TRIT-02)', 'Equipo') || 'TRIT-01';
            const desc = getRowVal(row, 'Descripcion Trabajos y Repuestos', 'Descripción Trabajos y Repuestos', 'Descripcion', 'Descripción') || '';
            const cuchillas = getRowVal(row, 'Estado Cuchillas', 'Estado Cuchillas (Bueno/Regular/Malo)');
            const tipoMto = getRowVal(row, 'Tipo Mantenimiento', 'Tipo Mantenimiento (Rutinario Diario / Preventivo Semanal/Mensual / Correctivo)');

            // Skip row if it has no date AND no technical data, or if it's a summary/footer row
            if (!rawFecha && !tecnico && !supervisor && horo === '' && !desc && !cuchillas && !tipoMto) {
              return;
            }
            if (rawFecha && (String(rawFecha).toLowerCase().includes('total') || String(rawFecha).toLowerCase().includes('nota') || String(rawFecha).toLowerCase().includes('firma'))) {
              return;
            }

            const rowFecha = parseExcelDate(rawFecha);

            recordsToSave.push({
              folio: row.Folio || `MTO-TRIT-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: rowFecha,
              responsable: tecnico || supervisor || '',
              observaciones: desc || 'Mantenimiento trituradora importado masivamente',
              turno: (getRowVal(row, 'Turno', 'Turno (Turno 1 / Turno 2 / Turno 3)') || 'Turno 1') as any,
              equipoId: eqId,
              nombreEquipo: 'Trituradora Industrial Shredder Doble Eje',
              marcaModelo: 'Shred-Tech ST-50',
              serie: 'ST50-9844-GT',
              ubicacionPlanta: 'Área de Pre-Tratamiento Mecánico DSH',
              horometro: horo,
              tipoMantenimiento: (tipoMto || 'Preventivo Semanal/Mensual') as any,
              tecnicoResponsable: tecnico,
              estadoCuchillas: cuchillas || 'Bueno',
              nivelAceiteReductor: getRowVal(row, 'Nivel Aceite Reductor', 'Nivel Aceite Reductor (Conforme/Bajo/Critico)') || 'Conforme',
              ruidosVibraciones: getRowVal(row, 'Ruidos o Vibraciones', 'Ruidos o Vibraciones (Normal/Anormal)') || 'Normal',
              limpiezaDesinfeccion: isYes(getRowVal(row, 'Limpieza y Desinfección Interna', 'Limpieza y Desinfección Interna (Si/No)') ?? true) ? 'Realizada' : 'Pendiente',
              pruebaAutoReverse: isYes(getRowVal(row, 'Prueba Auto-Reverse', 'Prueba Auto-Reverse (Si/No)') ?? true) ? 'Operativo' : 'Falla',
              engraseRodamientos: isYes(getRowVal(row, 'Engrase Rodamientos', 'Engrase Rodamientos (Si/No)') ?? true) ? 'Completado' : 'Pendiente',
              tensionFajasCadenas: 'Conforme',
              consumoAmperajeMotorA: parseNumOrBlank(getRowVal(row, 'Consumo Amperaje Motor A', 'Consumo Amperaje Motor A (50-75)')),
              presionSistemaHidraulicoPsi: parseNumOrBlank(getRowVal(row, 'Presion Hidraulica Empuje PSI', 'Presion Hidraulica Empuje PSI (1800-2500)')),
              anomaliasDetectadas: '',
              descripcionTrabajo: desc || 'Mantenimiento y revisión operativa',
              repuestosUtilizados: [],
              horasParo: parseNumOrBlank(getRowVal(row, 'Horas Paro')),
              lotoAplicado: isYes(getRowVal(row, 'LOTO Aplicado', 'LOTO Aplicado (Si/No)') ?? true),
              estadoFinal: (getRowVal(row, 'Estado Final', 'Estado Final (Operativo Conforme / Requiere Mantenimiento / Fuera de Servicio)') || 'Operativo Conforme') as any,
              firmaTecnico: tecnico,
              firmaSupervisor: supervisor
            });
          });
        } else if (tipo === 'mantenimiento_compactadora') {
          cleanData.forEach((row: any, idx: number) => {
            const rawFecha = getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'Fecha (YYYY-MM-DD)', 'fecha', 'FECHA');
            const tecnico = getRowVal(row, 'Tecnico Responsable', 'Técnico Responsable', 'Tecnico', 'Técnico', 'Firma Tecnico', 'Firma Técnico') || '';
            const supervisor = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horometro Actual', 'Horas Operacion'));
            const eqId = getRowVal(row, 'Equipo ID', 'Equipo ID (COMP-01 / COMP-02)', 'Equipo') || 'COMP-01';
            const desc = getRowVal(row, 'Descripcion Trabajos y Repuestos', 'Descripción Trabajos y Repuestos', 'Descripcion', 'Descripción') || '';
            const tipoMto = getRowVal(row, 'Tipo Mantenimiento', 'Tipo Mantenimiento (Preventivo / Correctivo / Emergencia)');

            if (!rawFecha && !tecnico && !supervisor && horo === '' && !desc && !tipoMto) {
              return;
            }
            if (rawFecha && (String(rawFecha).toLowerCase().includes('total') || String(rawFecha).toLowerCase().includes('nota') || String(rawFecha).toLowerCase().includes('firma'))) {
              return;
            }

            const rowFecha = parseExcelDate(rawFecha);

            recordsToSave.push({
              folio: row.Folio || `MTO-COMP-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: rowFecha,
              responsable: tecnico || supervisor || '',
              observaciones: desc || 'Mantenimiento compactadora importado masivamente',
              turno: (getRowVal(row, 'Turno', 'Turno (Turno 1 / Turno 2 / Turno 3)') || 'Turno 1') as any,
              equipoId: eqId,
              nombreEquipo: 'Prensa Compactadora Hidráulica Vertical 01',
              horometro: horo,
              periodicidad: (getRowVal(row, 'Periodicidad', 'Periodicidad (Diario (Operador) / Semanal/Mensual (Técnico) / Semestral/Anual (Especialista))') || 'Semanal/Mensual (Técnico)') as any,
              tipoMantenimiento: (tipoMto || 'Preventivo') as any,
              tecnicoResponsable: tecnico,
              fugaFluidosDebajoPlato: (getRowVal(row, 'Fugas Fluidos Debajo Plato', 'Fugas Fluidos Debajo Plato (Conforme/No Conforme)') || 'Conforme') as any,
              hermeticidadSellosPuerta: (getRowVal(row, 'Hermeticidad Sellos Puerta', 'Hermeticidad Sellos Puerta (Conforme/No Conforme)') || 'Conforme') as any,
              limpiezaDesinfeccionTolva: (getRowVal(row, 'Limpieza Desinfección Tolva', 'Limpieza Desinfección Tolva (Conforme/No Conforme)') || 'Conforme') as any,
              parosEmergenciaFotoceldas: (getRowVal(row, 'Paros Emergencia y Fotoceldas', 'Paros Emergencia y Fotoceldas (Conforme/No Conforme)') || 'Conforme') as any,
              ruidosMotorHidraulico: (getRowVal(row, 'Ruidos Motor Hidráulico', 'Ruidos Motor Hidráulico (Conforme/No Conforme)') || 'Conforme') as any,
              inspeccionManguerasCilindros: getRowVal(row, 'Inspeccion Mangueras y Cilindros', 'Inspeccion Mangueras y Cilindros (Bueno/Regular/Malo)') || 'Bueno',
              nivelAceiteHidraulicoIso68: getRowVal(row, 'Nivel Aceite ISO 68', 'Nivel Aceite ISO 68 (Conforme/Bajo/Critico)') || 'Conforme',
              engraseChumacerasGuias: isYes(getRowVal(row, 'Engrase Guias y Chumaceras', 'Engrase Guias y Chumaceras (Si/No)') ?? true) ? 'Realizado' : 'Pendiente',
              filtrosAireRespiradero: getRowVal(row, 'Filtros Aire Respiradero', 'Filtros Aire Respiradero (Bueno/Regular/Saturado)') || 'Bueno',
              empaqueRetencionLixiviados: getRowVal(row, 'Empaque Retencion Lixiviados', 'Empaque Retencion Lixiviados (Bueno/Desgastado/Con Fuga)') || 'Bueno',
              accionCorrectiva: desc || 'Ajustes y lubricación preventiva conforme',
              protocoloBioseguridadEpp: isYes(getRowVal(row, 'Protocolo Bioseguridad y EPP', 'Protocolo Bioseguridad y EPP (Si/No)') ?? true),
              estadoFinal: (getRowVal(row, 'Estado Final', 'Estado Final (Aprobado para Operar / Condicionado / Fuera de Servicio)') || 'Aprobado para Operar') as any,
              firmaTecnico: tecnico,
              firmaSupervisor: supervisor
            });
          });
        } else if (tipo === 'mantenimiento_autoclaves') {
          cleanData.forEach((row: any, idx: number) => {
            const rawFecha = getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'Fecha (YYYY-MM-DD)', 'fecha', 'FECHA');
            const tecnico = getRowVal(row, 'Tecnico Responsable', 'Técnico Responsable', 'Tecnico', 'Técnico', 'Firma Tecnico', 'Firma Técnico') || '';
            const supervisor = getRowVal(row, 'Firma Supervisor', 'Supervisor', 'Supervisor Responsable') || '';
            const horo = parseNumOrBlank(getRowVal(row, 'Horometro', 'Horómetro Actual', 'Horometro Actual', 'Horas Operacion'));
            const eqId = getRowVal(row, 'Equipo ID', 'Equipo ID (AUTO CLAVE 1 / AUTO CLAVE 2 / AUTO CLAVE 3)', 'Equipo') || 'AUTO CLAVE 1';
            const desc = getRowVal(row, 'Descripcion Trabajos y Repuestos', 'Descripción Trabajos y Repuestos', 'Descripcion', 'Descripción') || '';

            if (!rawFecha && !tecnico && !supervisor && horo === '' && !desc) {
              return;
            }
            if (rawFecha && (String(rawFecha).toLowerCase().includes('total') || String(rawFecha).toLowerCase().includes('nota') || String(rawFecha).toLowerCase().includes('firma'))) {
              return;
            }

            const rowFecha = parseExcelDate(rawFecha);

            recordsToSave.push({
              folio: row.Folio || `MTO-AUTO-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: rowFecha,
              responsable: tecnico || supervisor || '',
              observaciones: desc || 'Mantenimiento autoclaves importado masivamente',
              turno: (getRowVal(row, 'Turno', 'Turno (Turno 1 / Turno 2 / Turno 3)') || 'Turno 1') as any,
              equipoId: eqId as any,
              tipoMantenimiento: (getRowVal(row, 'Tipo Mantenimiento', 'Tipo Mantenimiento (Inspección Operativa Turno / Preventivo Periódico / Correctivo y Calibración)') || 'Preventivo Periódico') as any,
              horometro: horo,
              tecnicoResponsable: tecnico,
              presionVaporCalderaPsi: parseNumOrBlank(getRowVal(row, 'Presion Vapor Caldera PSI', 'Presión Vapor Caldera PSI')),
              presionCamaraPsi: parseNumOrBlank(getRowVal(row, 'Presion Camara PSI', 'Presión Cámara PSI')),
              temperaturaC: parseNumOrBlank(getRowVal(row, 'Temperatura C', 'Temperatura °C')),
              tiempoCicloMin: parseNumOrBlank(getRowVal(row, 'Tiempo Ciclo Min', 'Tiempo Ciclo Minutos')),
              pruebaVacioResultado: (getRowVal(row, 'Prueba Vacio', 'Prueba Vacío (Conforme/No Conforme)') || 'Conforme') as any,
              drenajeCondensadosTrampa: (getRowVal(row, 'Drenaje Condensados Trampa', 'Drenaje Condensados Trampa (Conforme/No Conforme)') || 'Conforme') as any,
              estadoEmpaquePuerta: (getRowVal(row, 'Estado Empaque Puerta', 'Estado Empaque Puerta (Excelente/Bueno/Desgastado/Fuga Detectada)') || 'Excelente') as any,
              valvulasSeguridadAlivio: getRowVal(row, 'Valvulas Seguridad y Alivio', 'Válvulas Seguridad y Alivio (Bueno/Regular/Malo)') || 'Bueno',
              manometrosCalibracion: getRowVal(row, 'Manometros Calibrados', 'Manómetros Calibrados (Bueno/Regular/Descalibrado)') || 'Bueno',
              transmisoresPt100: getRowVal(row, 'Transmisores Temp PT100', 'Transmisores Temp PT100 (Bueno/Regular/Falla)') || 'Bueno',
              filtroCanastaDescarga: getRowVal(row, 'Filtro Canasta Descarga', 'Filtro Canasta Descarga (Limpio/Obstruido/Dañado)') || 'Limpio',
              engraseBrazosCierre: isYes(getRowVal(row, 'Engrase Brazos Cierre', 'Engrase Brazos Cierre (Si/No)') ?? true) ? 'Realizado' : 'Pendiente',
              descripcionIntervencion: desc || 'Inspección de empaquetaduras y calibración de instrumentos',
              repuestosCalibraciones: 'Ninguno',
              estadoFinal: (getRowVal(row, 'Estado Final', 'Estado Final (Operativa al 100% / Observaciones Menores / Fuera de Servicio)') || 'Operativa al 100%') as any,
              firmaTecnico: tecnico,
              firmaSupervisor: supervisor
            });
          });
        } else if (tipo === 'limpieza_desinfeccion_planta') {
          cleanData.forEach((row: any, idx: number) => {
            const rawFecha = getRowVal(row, 'Fecha', 'Fecha (AAAA-MM-DD)', 'Fecha (YYYY-MM-DD)', 'fecha', 'FECHA', 'Fecha Desinfección', 'Fecha Limpieza', 'Dia', 'Día');
            const supervisor = getRowVal(row, 'Supervisor Responsable', 'Supervisor', 'SUPERVISOR', 'Firma Supervisor HSE', 'Firma Supervisor', 'Supervisado Por') || '';
            const operadorLider = getRowVal(row, 'Firma Operador Lider', 'Operador Lider', 'Operador Líder', 'Operador', 'Operador Responsable', 'Lider') || '';
            const cuadrilla = getRowVal(row, 'Cuadrilla Operadores', 'Cuadrilla', 'Operadores', 'Personal') || '';
            const productoQuimico = getRowVal(row, 'Producto Quimico Desinfectante', 'Producto Químico Desinfectante', 'Producto Quimico', 'Producto Químico', 'Producto', 'Quimico Desinfectante', 'Químico Desinfectante', 'Desinfectante') || '';
            const loteQuimico = getRowVal(row, 'Lote Quimico', 'Lote Químico', 'Lote') || '';
            const concObj = parseNumOrBlank(getRowVal(row, 'Concentracion Objetivo PPM', 'Concentración Objetivo PPM', 'PPM Objetivo', 'Concentracion Objetivo', 'Objetivo PPM'));
            const concMed = parseNumOrBlank(getRowVal(row, 'Concentracion Medida PPM', 'Concentración Medida PPM', 'PPM Medida', 'Concentracion Medida', 'Medida PPM'));
            const horaPrep = getRowVal(row, 'Hora Preparacion', 'Hora Preparación', 'Hora Preparacion (HH:MM)', 'Hora', 'Horario') || '';
            const veredicto = getRowVal(row, 'Veredicto Cumplimiento', 'Veredicto Cumplimiento (Cumplimiento Total (100%) / Cumplimiento Parcial / No Conforme)', 'Veredicto', 'Cumplimiento') || 'Cumplimiento Total (100%)';
            const novedades = getRowVal(row, 'Novedades y Desviaciones', 'Novedades', 'Desviaciones', 'Observaciones') || '';
            const acciones = getRowVal(row, 'Acciones Correctivas Inmediatas', 'Acciones Correctivas', 'Accion Correctiva') || '';

            // Skip row if it has no date and no sanitation data, or if it's a summary/footer row
            if (!rawFecha && !supervisor && !operadorLider && !cuadrilla && !productoQuimico && concObj === '' && concMed === '' && !novedades) {
              return;
            }
            if (rawFecha && (String(rawFecha).toLowerCase().includes('total') || String(rawFecha).toLowerCase().includes('nota') || String(rawFecha).toLowerCase().includes('firma'))) {
              return;
            }

            const rowFecha = parseExcelDate(rawFecha);

            recordsToSave.push({
              folio: row.Folio || `LIM-DES-${Date.now().toString().slice(-4)}${idx + 1}`,
              fecha: rowFecha,
              responsable: supervisor || operadorLider || '',
              observaciones: novedades || 'Control de limpieza y desinfección de planta',
              turno: (getRowVal(row, 'Turno', 'Turno (Mañana / Tarde / Noche)') || 'Mañana') as any,
              supervisorResponsable: supervisor,
              cuadrillaOperadores: cuadrilla,
              productoQuimico: productoQuimico,
              loteProducto: loteQuimico,
              concentracionObjetivoPpm: concObj,
              concentracionMedidaPpm: concMed,
              horaPreparacion: horaPrep,
              zonas: [
                { area: 'Bahía de Descarga DSH', frecuencia: 'Diaria', tipoLimpieza: 'Desinfección de Choque', hora: '06:30', estatus: 'Conforme', operador: cuadrilla || 'Cuadrilla Planta' },
                { area: 'Cuarto Frío de Almacenamiento', frecuencia: 'Diaria', tipoLimpieza: 'Limpieza Profunda', hora: '07:00', estatus: 'Conforme', operador: cuadrilla || 'Cuadrilla Planta' },
                { area: 'Área de Autoclaves', frecuencia: 'Diaria', tipoLimpieza: 'Rutinaria', hora: '07:30', estatus: 'Conforme', operador: cuadrilla || 'Cuadrilla Planta' },
                { area: 'Área de Incineración DSH', frecuencia: 'Diaria', tipoLimpieza: 'Rutinaria', hora: '08:00', estatus: 'Conforme', operador: cuadrilla || 'Cuadrilla Planta' },
                { area: 'Túnel de Lavado de Contenedores', frecuencia: 'Diaria', tipoLimpieza: 'Limpieza Profunda', hora: '08:30', estatus: 'Conforme', operador: cuadrilla || 'Cuadrilla Planta' }
              ],
              eppGuantesNitrilo: isYes(getRowVal(row, 'EPP Completo Verificado', 'EPP Completo Verificado (Si/No)') ?? true),
              eppBotasImpermeables: isYes(getRowVal(row, 'EPP Completo Verificado', 'EPP Completo Verificado (Si/No)') ?? true),
              eppTrajeTyvekMandil: isYes(getRowVal(row, 'EPP Completo Verificado', 'EPP Completo Verificado (Si/No)') ?? true),
              eppRespiradorVapores: isYes(getRowVal(row, 'EPP Completo Verificado', 'EPP Completo Verificado (Si/No)') ?? true),
              eppCaretaFacial: isYes(getRowVal(row, 'EPP Completo Verificado', 'EPP Completo Verificado (Si/No)') ?? true),
              panosMopasLímpias: isYes(getRowVal(row, 'Disponibilidad Insumos y Panos', 'Disponibilidad Insumos y Panos (Si/No)') ?? true),
              desviacionesNovedades: novedades,
              accionesCorrectivas: acciones,
              veredictoCumplimiento: veredicto as any,
              firmaOperadorLider: operadorLider,
              firmaSupervisorHse: supervisor
            });
          });
        }

        // Collection name resolution
        let colName = `bitacora_${tipo}`;
        if (tipo === 'inventarios_sgc') {
          colName = 'bitacora_inventarios_sgc';
        }

        // Save records using atomic write batches (up to 400 operations per batch)
        const uploadTimestamp = new Date().toISOString();
        const CHUNK_SIZE = 400;
        let count = 0;
        for (let i = 0; i < recordsToSave.length; i += CHUNK_SIZE) {
          const chunk = recordsToSave.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const record of chunk) {
            const docRef = doc(collection(db, colName));
            batch.set(docRef, {
              ...record,
              fechaRegistro: uploadTimestamp, // ALWAYS date and time of file upload!
              elaboro: 'Gerente Comercial Industrial',
              reviso: 'Comité ISO',
              aprobo: 'Gerente General',
              cambioControl: [
                { version: '1.2', fecha: uploadTimestamp.split('T')[0], seccion: 'Carga Masiva', cambio: 'Importación masiva desde archivo Excel SGI', solicitante: 'Auditor de Calidad' }
              ]
            });
            count++;
          }
          await batch.commit();
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
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Carga Masiva desde Excel</h4>
            <p className="text-[10px] text-slate-500 leading-none">Importar múltiples registros de forma automatizada</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Rango máximo de fechas permitido por archivo">
          Límite: Máx. 6 meses por archivo
        </span>
      </div>

      <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Política de carga de datos SGI:</span> No se permite subir más de <strong>6 meses (180 días)</strong> de información en un solo archivo. Si cuenta con históricos más amplios, debe segmentar la carga en periodos semestrales.
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
