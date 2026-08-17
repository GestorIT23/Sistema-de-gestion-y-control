import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import type { RegistroRecoleccion, TipoCargaRecoleccion } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import ReporteConsultaFiltros, { FiltrosConsultaRecoleccion } from './recoleccion/ReporteConsultaFiltros';
import ReporteAgrupaciones from './recoleccion/ReporteAgrupaciones';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Filter, 
  Database, 
  BarChart3, 
  Calendar, 
  Clock, 
  MapPin, 
  Layers, 
  Package, 
  Truck, 
  RefreshCw, 
  ArrowLeft, 
  Sparkles, 
  X, 
  Info,
  Check,
  Building2,
  FileCheck2,
  ListFilter,
  TrendingUp,
  Table as TableIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadRecoleccionTemplate, generateAndDownloadExcel } from '../../utils/excelGenerator';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface Props {
  onBack: () => void;
  userEmail: string;
}

interface ParsedRow extends Partial<RegistroRecoleccion> {
  _rowId: string;
  _isValid: boolean;
  _errors: string[];
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function ReporteRecoleccionModule({ onBack, userEmail }: Props) {
  // Tabs: 'reportes' (Consultas y Reportes), 'batch' (Carga Masiva), 'individual' (Ingreso Individual), 'analitica' (Gráficos)
  const [activeTab, setActiveTab] = useState<'reportes' | 'batch' | 'individual' | 'analitica'>('reportes');
  
  // State for Batch Upload
  const [tipoCarga, setTipoCarga] = useState<TipoCargaRecoleccion>('historica');
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [showPasteZone, setShowPasteZone] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State for Individual Form
  const [individualForm, setIndividualForm] = useState<Omit<RegistroRecoleccion, 'id' | 'fechaRegistro' | 'creadoPor'>>({
    codigoCliente: '',
    nombreCliente: '',
    codigoUbicacion: '',
    nombreUbicacion: '',
    fechaVisita: new Date().toISOString().split('T')[0],
    numeroRecibo: '',
    codigoRuta: '',
    ruta: '',
    categoria: 'RPBI BIOINFECCIOSO',
    producto: 'DESECHO BIOINFECCIOSO EN BOLSA ROJA',
    medida: 'Lb',
    unidades: 0,
    horaVisita: '08:00',
    tipoCarga: 'diario',
    observaciones: ''
  });
  const [individualSubmitting, setIndividualSubmitting] = useState(false);
  const [individualFeedback, setIndividualFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State for Historial / Registros
  const [registros, setRegistros] = useState<RegistroRecoleccion[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  // Joint Consultation Filters State
  const initialFiltros: FiltrosConsultaRecoleccion = {
    searchQuery: '',
    ruta: 'todas',
    codigoCliente: 'todos',
    nombreCliente: 'todos',
    codigoUbicacion: 'todas',
    nombreUbicacion: 'todas',
    categoria: 'todas',
    producto: 'todos',
    tipoCarga: 'todos',
    modoTemporal: 'todo',
    fechaDia: new Date().toISOString().split('T')[0],
    fechaSemana: new Date().toISOString().split('T')[0],
    fechaMes: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })(),
    fechaAnio: String(new Date().getFullYear()),
    fechaRangoInicio: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })(),
    fechaRangoFin: new Date().toISOString().split('T')[0]
  };

  const [filtros, setFiltros] = useState<FiltrosConsultaRecoleccion>(initialFiltros);
  const [subViewReporte, setSubViewReporte] = useState<'detalle' | 'consolidados'>('detalle');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);

  // Modals
  const [editingRecord, setEditingRecord] = useState<RegistroRecoleccion | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<RegistroRecoleccion | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing records from Firestore
  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoadingRegistros(true);
      const q = query(collection(db, 'reportes_recoleccion'), orderBy('fechaVisita', 'desc'), limit(2500));
      const snap = await getDocs(q);
      const list: RegistroRecoleccion[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as RegistroRecoleccion);
      });
      setRegistros(list);
    } catch (e) {
      console.error('Error cargando reportes de recolección:', e);
    } finally {
      setLoadingRegistros(false);
    }
  };

  // -------------------------------------------------------------
  // HELPER: Normalize Column Name and parse dates / values
  // -------------------------------------------------------------
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - (25567 + 2)) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    const str = String(val).trim();
    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      return `${year}-${month}-${day}`;
    }
    const ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
    return str || new Date().toISOString().split('T')[0];
  };

  const parseExcelTime = (val: any): string => {
    if (!val) return '08:00';
    if (typeof val === 'number') {
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    const str = String(val).trim();
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
    return str || '08:00';
  };

  // Convert raw objects array from Excel/CSV to structured ParsedRow[]
  const processRawDataObjects = (rawObjects: any[], sourceName: string) => {
    const rows: ParsedRow[] = [];

    rawObjects.forEach((raw, idx) => {
      const mapped: Record<string, any> = {};
      Object.keys(raw).forEach((k) => {
        const norm = normalizeKey(k);
        mapped[norm] = raw[k];
      });

      const codigoCliente = String(
        mapped['codigocliente'] || mapped['codcliente'] || mapped['clientecodigo'] || mapped['clienteid'] || mapped['codigo'] || ''
      ).trim();

      const nombreCliente = String(
        mapped['nombrecliente'] || mapped['cliente'] || mapped['razonsocial'] || mapped['nombre'] || ''
      ).trim();

      const codigoUbicacion = String(
        mapped['codigoubicacion'] || mapped['codubicacion'] || mapped['ubicacioncodigo'] || mapped['sede'] || ''
      ).trim();

      const nombreUbicacion = String(
        mapped['nombreubicacion'] || mapped['ubicacion'] || mapped['nombresede'] || mapped['area'] || ''
      ).trim();

      const rawFecha = mapped['fechavisita'] || mapped['fecha'] || mapped['fecharecoleccion'] || mapped['dia'];
      const fechaVisita = parseExcelDate(rawFecha);

      const numeroRecibo = String(
        mapped['numerorecibo'] || mapped['numrecibo'] || mapped['norecibo'] || mapped['recibo'] || mapped['boleta'] || mapped['ticket'] || ''
      ).trim();

      const codigoRuta = String(
        mapped['codigoruta'] || mapped['codruta'] || mapped['rutacodigo'] || ''
      ).trim();

      const ruta = String(
        mapped['ruta'] || mapped['nombreruta'] || mapped['rutatransporte'] || codigoRuta || 'Ruta Principal'
      ).trim();

      const categoria = String(
        mapped['categoria'] || mapped['tipodesecho'] || mapped['tiporesiduo'] || mapped['clasificacion'] || 'RPBI BIOINFECCIOSO'
      ).trim();

      const producto = String(
        mapped['producto'] || mapped['descripcion'] || mapped['item'] || 'DESECHO EN BOLSA ROJA'
      ).trim();

      const medida = String(
        mapped['medida'] || mapped['unidadmedida'] || mapped['um'] || 'Lb'
      ).trim();

      const rawUnidades = mapped['unidades'] || mapped['peso'] || mapped['pesolbs'] || mapped['cantidad'] || mapped['libras'] || 0;
      const parsedUnidades = parseFloat(String(rawUnidades).replace(/,/g, '')) || 0;

      const rawHora = mapped['horadevisita'] || mapped['horavisita'] || mapped['hora'];
      const horaVisita = parseExcelTime(rawHora);

      const errors: string[] = [];
      if (!codigoCliente && !nombreCliente) {
        errors.push('Falta Código o Nombre de Cliente');
      }
      if (!numeroRecibo) {
        errors.push('Falta Número de Recibo');
      }
      if (parsedUnidades <= 0) {
        errors.push('Peso/Unidades debe ser > 0');
      }

      rows.push({
        _rowId: `row_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        _isValid: errors.length === 0,
        _errors: errors,
        codigoCliente: codigoCliente || 'C-0000',
        nombreCliente: nombreCliente || 'CLIENTE NO ESPECIFICADO',
        codigoUbicacion: codigoUbicacion || 'U-001',
        nombreUbicacion: nombreUbicacion || 'SEDE PRINCIPAL',
        fechaVisita,
        numeroRecibo: numeroRecibo || `REC-${idx + 1}`,
        codigoRuta: codigoRuta || 'R-01',
        ruta: ruta || 'RUTA METROPOLITANA',
        categoria: categoria.toUpperCase(),
        producto: producto.toUpperCase(),
        medida: medida || 'Lb',
        unidades: parsedUnidades,
        horaVisita,
        tipoCarga,
        observaciones: `Carga Batch [${sourceName}]`
      });
    });

    setParsedRows(rows);
    if (rows.length > 0) {
      setUploadFeedback({
        type: 'success',
        message: `Se detectaron e interpretaron ${rows.length} registros del archivo ${sourceName}. ${rows.filter(r => !r._isValid).length} registros requieren revisión.`
      });
    } else {
      setUploadFeedback({
        type: 'error',
        message: 'No se encontraron filas con datos válidos en el archivo o texto proporcionado.'
      });
    }
  };

  // Handle Excel File Drop / Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchFile(file);
    setIsProcessingFile(true);
    setUploadFeedback(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
        processRawDataObjects(data, file.name);
      } catch (err: any) {
        console.error('Error procesando archivo Excel:', err);
        setUploadFeedback({
          type: 'error',
          message: `Error al leer el archivo Excel: ${err.message || 'Formato no soportado'}`
        });
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle Paste from Clipboard
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    setIsProcessingFile(true);
    try {
      const lines = pastedText.trim().split(/\r?\n/);
      if (lines.length === 0) return;

      const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : ';';
      const headers = lines[0].split(delimiter).map(h => h.trim());

      const rawObjects: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(delimiter).map(c => c.trim());
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || '';
        });
        rawObjects.push(rowObj);
      }

      processRawDataObjects(rawObjects, 'Pegado desde Portapapeles');
    } catch (err: any) {
      console.error('Error parseando texto pegado:', err);
      setUploadFeedback({
        type: 'error',
        message: `Error al interpretar el texto: ${err.message}`
      });
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Commit Parsed Rows to Firestore in Batches
  const handleCommitBatchUpload = async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) {
      setUploadFeedback({
        type: 'error',
        message: 'No hay filas válidas para guardar en la base de datos.'
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatusMsg('Iniciando escritura en base de datos...');

      const loteId = `LOTE-${tipoCarga.toUpperCase()}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const CHUNK_SIZE = 400; // Firestore limit is 500 ops per batch
      const totalRows = validRows.length;
      let processed = 0;

      for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((row) => {
          const docRef = doc(collection(db, 'reportes_recoleccion'));
          const { _rowId, _isValid, _errors, ...dataToSave } = row;
          batch.set(docRef, {
            ...dataToSave,
            unidades: Number(dataToSave.unidades) || 0,
            tipoCarga,
            loteCargaId: loteId,
            fechaRegistro: new Date().toISOString(),
            creadoPor: userEmail
          });
        });

        await batch.commit();
        processed += chunk.length;
        const pct = Math.round((processed / totalRows) * 100);
        setUploadProgress(pct);
        setUploadStatusMsg(`Guardados ${processed} de ${totalRows} registros (${pct}%)...`);
      }

      setUploadFeedback({
        type: 'success',
        message: `¡Carga exitosa! Se registraron ${totalRows} recolecciones en el lote ${loteId}.`
      });

      // Clear staging
      setParsedRows([]);
      setBatchFile(null);
      setPastedText('');
      setShowPasteZone(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh records
      await fetchRegistros();
      setActiveTab('reportes');
    } catch (err: any) {
      console.error('Error guardando lote en Firestore:', err);
      setUploadFeedback({
        type: 'error',
        message: `Error durante la carga: ${err.message}`
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusMsg('');
    }
  };

  // Submit Individual Form
  const handleSaveIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIndividualSubmitting(true);
      setIndividualFeedback(null);

      const recordData: Omit<RegistroRecoleccion, 'id'> = {
        ...individualForm,
        unidades: Number(individualForm.unidades) || 0,
        fechaRegistro: new Date().toISOString(),
        creadoPor: userEmail,
        loteCargaId: `INDIVIDUAL-${Date.now()}`
      };

      await addDoc(collection(db, 'reportes_recoleccion'), recordData);

      setIndividualFeedback({
        type: 'success',
        message: `Registro guardado exitosamente para el cliente ${individualForm.nombreCliente} (Recibo: ${individualForm.numeroRecibo}).`
      });

      // Reset form fields
      setIndividualForm({
        codigoCliente: '',
        nombreCliente: '',
        codigoUbicacion: '',
        nombreUbicacion: '',
        fechaVisita: new Date().toISOString().split('T')[0],
        numeroRecibo: '',
        codigoRuta: '',
        ruta: '',
        categoria: 'RPBI BIOINFECCIOSO',
        producto: 'DESECHO BIOINFECCIOSO EN BOLSA ROJA',
        medida: 'Lb',
        unidades: 0,
        horaVisita: '08:00',
        tipoCarga: 'diario',
        observaciones: ''
      });

      await fetchRegistros();
    } catch (err: any) {
      console.error('Error guardando registro individual:', err);
      setIndividualFeedback({
        type: 'error',
        message: `Error al guardar: ${err.message}`
      });
    } finally {
      setIndividualSubmitting(false);
    }
  };

  // Confirm Single Record Delete
  const handleConfirmDeleteSingle = async () => {
    if (!recordToDelete || !recordToDelete.id) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'reportes_recoleccion', recordToDelete.id));
      setRegistros(prev => prev.filter(r => r.id !== recordToDelete.id));
      setRecordToDelete(null);
    } catch (err) {
      console.error('Error eliminando registro:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirm Batch Delete (Undo Batch)
  const handleConfirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    try {
      setIsDeleting(true);
      const batchRecords = registros.filter(r => r.loteCargaId === batchToDelete);
      
      const CHUNK_SIZE = 400;
      for (let i = 0; i < batchRecords.length; i += CHUNK_SIZE) {
        const chunk = batchRecords.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(r => {
          if (r.id) {
            batch.delete(doc(db, 'reportes_recoleccion', r.id));
          }
        });
        await batch.commit();
      }

      setRegistros(prev => prev.filter(r => r.loteCargaId !== batchToDelete));
      setBatchToDelete(null);
    } catch (err) {
      console.error('Error eliminando lote completo:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Save Edit Modal
  const handleSaveEdit = async () => {
    if (!editingRecord || !editingRecord.id) return;
    try {
      setIsSavingEdit(true);
      const docRef = doc(db, 'reportes_recoleccion', editingRecord.id);
      const { id, ...dataToSave } = editingRecord;
      await updateDoc(docRef, {
        ...dataToSave,
        unidades: Number(dataToSave.unidades) || 0
      });

      setRegistros(prev => prev.map(r => r.id === editingRecord.id ? editingRecord : r));
      setEditingRecord(null);
    } catch (err) {
      console.error('Error actualizando registro:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // -------------------------------------------------------------
  // UNIQUE DIMENSIONAL LISTS FOR DROPDOWNS
  // -------------------------------------------------------------
  const uniqueRutas = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => {
      if (r.ruta) s.add(r.ruta);
      else if (r.codigoRuta) s.add(r.codigoRuta);
    });
    return Array.from(s).sort();
  }, [registros]);

  const uniqueCodigosCliente = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.codigoCliente) s.add(r.codigoCliente); });
    return Array.from(s).sort();
  }, [registros]);

  const uniqueNombresCliente = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.nombreCliente) s.add(r.nombreCliente); });
    return Array.from(s).sort();
  }, [registros]);

  const uniqueCodigosUbicacion = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.codigoUbicacion) s.add(r.codigoUbicacion); });
    return Array.from(s).sort();
  }, [registros]);

  const uniqueNombresUbicacion = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.nombreUbicacion) s.add(r.nombreUbicacion); });
    return Array.from(s).sort();
  }, [registros]);

  const uniqueCategorias = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.categoria) s.add(r.categoria); });
    return Array.from(s).sort();
  }, [registros]);

  const uniqueProductos = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.producto) s.add(r.producto); });
    return Array.from(s).sort();
  }, [registros]);

  const uniqueAnios = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => {
      if (r.fechaVisita && r.fechaVisita.length >= 4) {
        s.add(r.fechaVisita.substring(0, 4));
      }
    });
    return Array.from(s).sort().reverse();
  }, [registros]);

  // Helper for Week Date Calculation
  const getWeekRange = (dateStr: string) => {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return { start: '', end: '' };
    const day = target.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = target.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(target.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  // -------------------------------------------------------------
  // JOINT FILTERED RECORDS EVALUATION
  // -------------------------------------------------------------
  const filteredRegistros = useMemo(() => {
    return registros.filter(r => {
      // 1. Ruta
      if (filtros.ruta !== 'todas') {
        if (r.ruta !== filtros.ruta && r.codigoRuta !== filtros.ruta) return false;
      }

      // 2. Código Cliente
      if (filtros.codigoCliente !== 'todos' && r.codigoCliente !== filtros.codigoCliente) {
        return false;
      }

      // 3. Nombre Cliente
      if (filtros.nombreCliente !== 'todos' && r.nombreCliente !== filtros.nombreCliente) {
        return false;
      }

      // 4. Código Ubicación
      if (filtros.codigoUbicacion !== 'todas' && r.codigoUbicacion !== filtros.codigoUbicacion) {
        return false;
      }

      // 5. Nombre Ubicación
      if (filtros.nombreUbicacion !== 'todas' && r.nombreUbicacion !== filtros.nombreUbicacion) {
        return false;
      }

      // 6. Tipo Desecho / Categoría
      if (filtros.categoria !== 'todas' && r.categoria !== filtros.categoria) {
        return false;
      }

      // 7. Producto
      if (filtros.producto !== 'todos' && r.producto !== filtros.producto) {
        return false;
      }

      // 8. Modalidad / Tipo Carga
      if (filtros.tipoCarga !== 'todos' && r.tipoCarga !== filtros.tipoCarga) {
        return false;
      }

      // 9. Temporal Modes
      if (filtros.modoTemporal === 'dia' && filtros.fechaDia) {
        if (r.fechaVisita !== filtros.fechaDia) return false;
      } else if (filtros.modoTemporal === 'semana' && filtros.fechaSemana) {
        const { start, end } = getWeekRange(filtros.fechaSemana);
        if (start && end) {
          if (r.fechaVisita < start || r.fechaVisita > end) return false;
        }
      } else if (filtros.modoTemporal === 'mes' && filtros.fechaMes) {
        if (!r.fechaVisita || !r.fechaVisita.startsWith(filtros.fechaMes)) return false;
      } else if (filtros.modoTemporal === 'anio' && filtros.fechaAnio) {
        if (!r.fechaVisita || !r.fechaVisita.startsWith(filtros.fechaAnio)) return false;
      } else if (filtros.modoTemporal === 'rango') {
        if (filtros.fechaRangoInicio && r.fechaVisita < filtros.fechaRangoInicio) return false;
        if (filtros.fechaRangoFin && r.fechaVisita > filtros.fechaRangoFin) return false;
      }

      // 10. Free text search
      if (filtros.searchQuery.trim()) {
        const q = filtros.searchQuery.toLowerCase();
        const match = 
          r.codigoCliente?.toLowerCase().includes(q) ||
          r.nombreCliente?.toLowerCase().includes(q) ||
          r.codigoUbicacion?.toLowerCase().includes(q) ||
          r.nombreUbicacion?.toLowerCase().includes(q) ||
          r.numeroRecibo?.toLowerCase().includes(q) ||
          r.codigoRuta?.toLowerCase().includes(q) ||
          r.ruta?.toLowerCase().includes(q) ||
          r.categoria?.toLowerCase().includes(q) ||
          r.producto?.toLowerCase().includes(q) ||
          r.loteCargaId?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [registros, filtros]);

  // Pagination
  const totalPages = Math.ceil(filteredRegistros.length / recordsPerPage) || 1;
  const paginatedRegistros = useMemo(() => {
    return filteredRegistros.slice(
      (currentPage - 1) * recordsPerPage,
      currentPage * recordsPerPage
    );
  }, [filteredRegistros, currentPage, recordsPerPage]);

  // Aggregated KPIs
  const totalUnidades = useMemo(() => {
    return filteredRegistros.reduce((acc, r) => acc + (Number(r.unidades) || 0), 0);
  }, [filteredRegistros]);

  const totalClientesUnicos = useMemo(() => {
    return new Set(filteredRegistros.map(r => r.codigoCliente || r.nombreCliente)).size;
  }, [filteredRegistros]);

  const totalUbicacionesUnicas = useMemo(() => {
    return new Set(filteredRegistros.map(r => r.codigoUbicacion || r.nombreUbicacion)).size;
  }, [filteredRegistros]);

  const totalRutasUnicas = useMemo(() => {
    return new Set(filteredRegistros.map(r => r.ruta || r.codigoRuta)).size;
  }, [filteredRegistros]);

  const totalRecibos = filteredRegistros.length;
  const promedioPorRecibo = totalRecibos > 0 ? (totalUnidades / totalRecibos).toFixed(2) : '0.00';

  // Chart Data Calculations
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRegistros.forEach(r => {
      const cat = r.categoria || 'Sin Categoría';
      map[cat] = (map[cat] || 0) + (Number(r.unidades) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredRegistros]);

  const routeChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRegistros.forEach(r => {
      const rut = r.ruta || r.codigoRuta || 'Sin Ruta';
      map[rut] = (map[rut] || 0) + (Number(r.unidades) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredRegistros]);

  const topClientsChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRegistros.forEach(r => {
      const cli = r.nombreCliente || r.codigoCliente || 'Cliente';
      map[cli] = (map[cli] || 0) + (Number(r.unidades) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredRegistros]);

  // Export Full Filtered Report to Excel
  const handleExportFilteredExcel = () => {
    if (filteredRegistros.length === 0) {
      alert('No hay registros bajo los filtros actuales para exportar.');
      return;
    }
    generateAndDownloadExcel('reporte_recoleccion', filteredRegistros, `Reporte_Recoleccion_Consultado_${new Date().toISOString().split('T')[0]}`);
  };

  // Export Filtered Report to PDF
  const handleExportFilteredPDF = () => {
    if (filteredRegistros.length === 0) {
      alert('No hay registros bajo los filtros actuales para exportar.');
      return;
    }
    generateAndDownloadPDF('reporte_recoleccion', filteredRegistros, {
      title: 'INFORME CONSOLIDADO DE RECOLECCIÓN DE RESIDUOS',
      code: 'BIOTRASH 4.2. F-OPR-000-18',
      filterDescription: `Consulta: Ruta: ${filtros.ruta} | Cliente: ${filtros.nombreCliente} | Desecho: ${filtros.categoria} | Criterio Temporal: ${filtros.modoTemporal.toUpperCase()}`
    });
  };

  return (
    <div id="modulo-reporte-recoleccion" className="space-y-6 text-slate-800">
      
      {/* Top Action Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
            title="Regresar al Dashboard SGI"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                F-OPR-000-18
              </span>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Reporte de Recolección de Residuos
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Consultas Avanzadas Multidimensionales y Cargas en Lote (Diario, Semanal, Mensual e Histórico)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadRecoleccionTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 shadow-xs transition cursor-pointer"
            title="Descargar plantilla Excel oficial de recolección"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Plantilla Excel
          </button>

          <button
            type="button"
            onClick={handleExportFilteredExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            title="Exportar registros filtrados a Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
          </button>

          <button
            type="button"
            onClick={handleExportFilteredPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 shadow-xs transition cursor-pointer"
            title="Exportar informe a PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* ISO Header Component */}
      <FormHeader
        codigo="BIOTRASH 4.2. F-OPR-000-18"
        titulo="REPORTE DE RECOLECCIÓN DE RESIDUOS (CONSULTAS Y CARGAS)"
        version="1.0"
        fechaElaboracion="17/08/2026"
        fechaVersion="17/08/2026"
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('reportes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'reportes'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" /> Consultas y Reportes ({filteredRegistros.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'batch'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" /> Carga Masiva (Batch Excel/CSV)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'individual'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Plus className="w-4 h-4" /> Registro Individual
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analitica')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'analitica'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Métricas y Gráficos
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONSULTAS Y REPORTES MULTIDIMENSIONALES */}
      {/* ========================================================================= */}
      {activeTab === 'reportes' && (
        <div className="space-y-5">
          
          {/* Dynamic KPI Cards reflecting active combined query */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Volumen Recolectado</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-emerald-700 font-mono">{totalUnidades.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-bold text-emerald-600 font-mono">Lbs</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">En registros filtrados</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Recibos / Boletas</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-slate-800 font-mono">{totalRecibos.toLocaleString()}</span>
                <span className="text-xs font-medium text-slate-500">visitas</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Paradas completadas</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Clientes Atendidos</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-blue-700 font-mono">{totalClientesUnicos}</span>
                <span className="text-xs font-medium text-slate-500">únicos</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{totalUbicacionesUnicas} sedes / ubicaciones</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Promedio por Recibo</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-purple-700 font-mono">{promedioPorRecibo}</span>
                <span className="text-xs font-bold text-purple-600 font-mono">Lbs/visita</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Densidad de carga</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rutas Involucradas</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-teal-700 font-mono">{totalRutasUnicas}</span>
                <span className="text-xs font-medium text-slate-500">rutas</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Cobertura logística</span>
            </div>
          </div>

          {/* Joint Combined Filter Engine */}
          <ReporteConsultaFiltros
            filtros={filtros}
            onFiltrosChange={(newFiltros) => {
              setFiltros(newFiltros);
              setCurrentPage(1);
            }}
            onResetFiltros={() => {
              setFiltros(initialFiltros);
              setCurrentPage(1);
            }}
            uniqueRutas={uniqueRutas}
            uniqueCodigosCliente={uniqueCodigosCliente}
            uniqueNombresCliente={uniqueNombresCliente}
            uniqueCodigosUbicacion={uniqueCodigosUbicacion}
            uniqueNombresUbicacion={uniqueNombresUbicacion}
            uniqueCategorias={uniqueCategorias}
            uniqueProductos={uniqueProductos}
            uniqueAnios={uniqueAnios}
            totalResultados={filteredRegistros.length}
            totalRegistrosBD={registros.length}
          />

          {/* Sub-view switcher: Detalle Fila por Fila vs Tablas Consolidadas / Agrupadas */}
          <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSubViewReporte('detalle')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  subViewReporte === 'detalle'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5 text-emerald-600" /> Vista Detallada de Registros ({filteredRegistros.length})
              </button>

              <button
                type="button"
                onClick={() => setSubViewReporte('consolidados')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  subViewReporte === 'consolidados'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Tablas Consolidadas / Resumen Agrupado
              </button>
            </div>

            <button
              type="button"
              onClick={fetchRegistros}
              disabled={loadingRegistros}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
              title="Recargar datos de Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRegistros ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Subview 1: Detailed Table View */}
          {subViewReporte === 'detalle' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200">FECHA / HORA</th>
                      <th className="p-2.5 border-r border-slate-200">NO. RECIBO</th>
                      <th className="p-2.5 border-r border-slate-200">COD. CLIENTE</th>
                      <th className="p-2.5 border-r border-slate-200">NOMBRE DEL CLIENTE</th>
                      <th className="p-2.5 border-r border-slate-200">UBICACIÓN / SEDE</th>
                      <th className="p-2.5 border-r border-slate-200">RUTA</th>
                      <th className="p-2.5 border-r border-slate-200">CATEGORÍA</th>
                      <th className="p-2.5 border-r border-slate-200">PRODUCTO</th>
                      <th className="p-2.5 border-r border-slate-200 text-right">UNIDADES / LBS</th>
                      <th className="p-2.5 border-r border-slate-200 text-center">TIPO CARGA</th>
                      <th className="p-2.5 text-center w-20">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {loadingRegistros ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                          Cargando recolecciones registradas...
                        </td>
                      </tr>
                    ) : paginatedRegistros.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">
                          <AlertTriangle className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                          No se encontraron registros que coincidan con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      paginatedRegistros.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          <td className="p-2 border-r border-slate-200 font-mono text-[11px] whitespace-nowrap">
                            <span className="font-bold text-slate-900">{row.fechaVisita}</span>
                            <span className="text-slate-400 block text-[10px]">{row.horaVisita}</span>
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {row.numeroRecibo}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-semibold text-blue-700">
                            {row.codigoCliente}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium text-slate-900 max-w-[200px] truncate" title={row.nombreCliente}>
                            {row.nombreCliente}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[11px] max-w-[150px] truncate" title={`${row.codigoUbicacion} - ${row.nombreUbicacion}`}>
                            <span className="font-mono text-slate-500">{row.codigoUbicacion}</span> {row.nombreUbicacion}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[11px] max-w-[130px] truncate" title={`${row.codigoRuta} - ${row.ruta}`}>
                            <span className="font-mono font-bold text-purple-700">{row.codigoRuta}</span> {row.ruta}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {row.categoria}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[11px] text-slate-700 max-w-[180px] truncate" title={row.producto}>
                            {row.producto}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                            {Number(row.unidades).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">{row.medida || 'Lb'}</span>
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                              row.tipoCarga === 'historica' ? 'bg-amber-100 text-amber-800' :
                              row.tipoCarga === 'semanal' ? 'bg-blue-100 text-blue-800' :
                              row.tipoCarga === 'mensual' ? 'bg-purple-100 text-purple-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {row.tipoCarga || 'diario'}
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingRecord(row)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                title="Editar registro"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRecordToDelete(row)}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-slate-50 border-t border-slate-200 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Registros por página:</span>
                  <select
                    value={recordsPerPage}
                    onChange={(e) => {
                      setRecordsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="p-1 bg-white border border-slate-300 rounded font-mono"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                  <span className="text-slate-400 font-mono">
                    (Página {currentPage} de {totalPages})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subview 2: Consolidated Groupings */}
          {subViewReporte === 'consolidados' && (
            <ReporteAgrupaciones
              registros={filteredRegistros}
              totalUnidadesGeneral={totalUnidades}
            />
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CARGA MASIVA (BATCH EXCEL / CSV) */}
      {/* ========================================================================= */}
      {activeTab === 'batch' && (
        <div className="space-y-5">
          
          {/* Instructions and Batch Modality Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Carga Masiva de Reportes de Recolección (Batch)
                </h3>
                <p className="text-xs text-slate-500">
                  Cargue información primaria histórica o lotes periódicos (diarios, semanales, mensuales)
                </p>
              </div>
            </div>

            {/* Type of Batch selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 'historica',
                  title: 'Carga Histórica',
                  badge: 'Carga Primaria',
                  desc: 'Importación masiva de volúmenes pasados de meses o años previos.',
                  icon: <Database className="w-4 h-4 text-amber-600" />
                },
                {
                  id: 'diario',
                  title: 'Carga Diaria',
                  badge: 'Operación Día',
                  desc: 'Carga de recorridos del día finalizado con boletas físicas.',
                  icon: <Calendar className="w-4 h-4 text-emerald-600" />
                },
                {
                  id: 'semanal',
                  title: 'Carga Semanal',
                  badge: 'Ciclo Semanal',
                  desc: 'Cierre semanal consolidado de rutas y clientes.',
                  icon: <FileCheck2 className="w-4 h-4 text-blue-600" />
                },
                {
                  id: 'mensual',
                  title: 'Carga Mensual',
                  badge: 'Cierre de Mes',
                  desc: 'Consolidado mensual para auditorías y facturación.',
                  icon: <BarChart3 className="w-4 h-4 text-purple-600" />
                }
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setTipoCarga(m.id as TipoCargaRecoleccion)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    tipoCarga === m.id
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        {m.icon} {m.title}
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {m.desc}
                    </p>
                  </div>
                  {tipoCarga === m.id && (
                    <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Modo seleccionado
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feedback message banner */}
          {uploadFeedback && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}>
              {uploadFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{uploadFeedback.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dropzone & Paste Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* File Upload Dropzone */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Opción 1: Subir Archivo Excel o CSV
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Soporta formatos .xlsx, .xls y .csv con mapeo automático de columnas.
                </p>

                <label
                  htmlFor="file-upload-input"
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition"
                >
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">
                    {batchFile ? batchFile.name : 'Arrastre su archivo Excel o haga clic para seleccionar'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Formatos admitidos: .xlsx, .xls, .csv (hasta 5,000 filas por carga)
                  </span>
                  <input
                    ref={fileInputRef}
                    id="file-upload-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={downloadRecoleccionTemplate}
                  className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar Plantilla Oficial
                </button>
                {batchFile && (
                  <span className="font-mono text-[10px] text-slate-500">
                    {(batchFile.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            </div>

            {/* Paste from Clipboard option */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Opción 2: Copiar y Pegar Celdas desde Excel
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Copie directamente las celdas desde su hoja de cálculo y péguelas aquí.
                </p>

                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Pegue aquí las filas copiadas de Excel (incluyendo o no la fila de encabezados)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-500">
                  {pastedText ? `${pastedText.split('\n').length} líneas detectadas` : 'Sin datos pegados'}
                </span>
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim() || isProcessingFile}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Interpretar Celdas
                </button>
              </div>
            </div>

          </div>

          {/* Staging / Previsualización antes de guardar */}
          {parsedRows.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    Previsualización del Lote ({parsedRows.length} registros detectados)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Verifique los datos antes de confirmar la inserción masiva en Firestore.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                    {parsedRows.filter(r => r._isValid).length} Válidos
                  </span>
                  {parsedRows.filter(r => !r._isValid).length > 0 && (
                    <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                      {parsedRows.filter(r => !r._isValid).length} Con Errores
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setParsedRows([])}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                  >
                    Descartar
                  </button>
                </div>
              </div>

              {/* Progress bar when uploading */}
              {isUploading && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                  <div className="flex justify-between text-xs font-bold text-emerald-800">
                    <span>{uploadStatusMsg}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Staging Grid Table */}
              <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2 border-r border-slate-200 w-10 text-center">#</th>
                      <th className="p-2 border-r border-slate-200">FECHA</th>
                      <th className="p-2 border-r border-slate-200">NO. RECIBO</th>
                      <th className="p-2 border-r border-slate-200">COD. CLIENTE</th>
                      <th className="p-2 border-r border-slate-200">NOMBRE CLIENTE</th>
                      <th className="p-2 border-r border-slate-200">UBICACIÓN</th>
                      <th className="p-2 border-r border-slate-200">RUTA</th>
                      <th className="p-2 border-r border-slate-200">CATEGORÍA</th>
                      <th className="p-2 border-r border-slate-200 text-right">UNIDADES (LBS)</th>
                      <th className="p-2 text-center w-16">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {parsedRows.map((r, idx) => (
                      <tr key={r._rowId} className={`hover:bg-slate-50 ${!r._isValid ? 'bg-rose-50/50' : ''}`}>
                        <td className="p-1.5 border-r border-slate-200 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="p-1.5 border-r border-slate-200 font-mono text-[11px]">{r.fechaVisita}</td>
                        <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-emerald-700">{r.numeroRecibo}</td>
                        <td className="p-1.5 border-r border-slate-200 font-mono text-blue-700">{r.codigoCliente}</td>
                        <td className="p-1.5 border-r border-slate-200 font-medium truncate max-w-[160px]">{r.nombreCliente}</td>
                        <td className="p-1.5 border-r border-slate-200 text-[11px] truncate max-w-[120px]">{r.nombreUbicacion}</td>
                        <td className="p-1.5 border-r border-slate-200 text-[11px]">{r.ruta}</td>
                        <td className="p-1.5 border-r border-slate-200 text-[11px]">{r.categoria}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono font-extrabold text-slate-900">{r.unidades}</td>
                        <td className="p-1.5 text-center">
                          {r._isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 mx-auto" title={r._errors.join(', ')} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setParsedRows([])}
                  disabled={isUploading}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCommitBatchUpload}
                  disabled={isUploading || parsedRows.filter(r => r._isValid).length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Guardando Lote...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirmar e Insertar {parsedRows.filter(r => r._isValid).length} Registros
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REGISTRO INDIVIDUAL */}
      {/* ========================================================================= */}
      {activeTab === 'individual' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Ingreso de Boleta / Recolección Individual
              </h3>
              <p className="text-xs text-slate-500">
                Formulario manual para el registro puntual de boletas o servicios extraordinarios
              </p>
            </div>
          </div>

          {individualFeedback && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
              individualFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}>
              {individualFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="font-semibold">{individualFeedback.message}</p>
            </div>
          )}

          <form onSubmit={handleSaveIndividual} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700">CODIGO CLIENTE *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. C-10482"
                  value={individualForm.codigoCliente}
                  onChange={(e) => setIndividualForm({ ...individualForm, codigoCliente: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">NOMBRE CLIENTE / RAZÓN SOCIAL *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. HOSPITAL ROOSEVELT - MATERNIDAD"
                  value={individualForm.nombreCliente}
                  onChange={(e) => setIndividualForm({ ...individualForm, nombreCliente: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">NO. RECIBO / BOLETA *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. REC-2026-0891"
                  value={individualForm.numeroRecibo}
                  onChange={(e) => setIndividualForm({ ...individualForm, numeroRecibo: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">CODIGO UBICACIÓN</label>
                <input
                  type="text"
                  placeholder="Ej. SEDE-01"
                  value={individualForm.codigoUbicacion}
                  onChange={(e) => setIndividualForm({ ...individualForm, codigoUbicacion: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">NOMBRE UBICACIÓN / ÁREA</label>
                <input
                  type="text"
                  placeholder="Ej. Edificio Central - Bodega Residuos"
                  value={individualForm.nombreUbicacion}
                  onChange={(e) => setIndividualForm({ ...individualForm, nombreUbicacion: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">FECHA VISITA *</label>
                <input
                  type="date"
                  required
                  value={individualForm.fechaVisita}
                  onChange={(e) => setIndividualForm({ ...individualForm, fechaVisita: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">HORA VISITA</label>
                <input
                  type="time"
                  value={individualForm.horaVisita}
                  onChange={(e) => setIndividualForm({ ...individualForm, horaVisita: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">CODIGO RUTA</label>
                <input
                  type="text"
                  placeholder="Ej. R-01"
                  value={individualForm.codigoRuta}
                  onChange={(e) => setIndividualForm({ ...individualForm, codigoRuta: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">NOMBRE DE LA RUTA</label>
                <input
                  type="text"
                  placeholder="Ej. Ruta Metropolitana Hospitalaria"
                  value={individualForm.ruta}
                  onChange={(e) => setIndividualForm({ ...individualForm, ruta: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">CATEGORÍA / TIPO DESECHO *</label>
                <select
                  value={individualForm.categoria}
                  onChange={(e) => setIndividualForm({ ...individualForm, categoria: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="RPBI BIOINFECCIOSO">RPBI BIOINFECCIOSO</option>
                  <option value="PUNZOCORTANTES">PUNZOCORTANTES</option>
                  <option value="ANATOMOPATOLÓGICOS">ANATOMOPATOLÓGICOS</option>
                  <option value="QUÍMICOS / FARMACÉUTICOS">QUÍMICOS / FARMACÉUTICOS</option>
                  <option value="NO PELIGROSOS COMUNES">NO PELIGROSOS COMUNES</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">PRODUCTO DETALLADO</label>
                <input
                  type="text"
                  placeholder="Ej. BOLSA ROJA BIOPELIGROSA 15 GAL"
                  value={individualForm.producto}
                  onChange={(e) => setIndividualForm({ ...individualForm, producto: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">PESO / UNIDADES (LIBRAS) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={individualForm.unidades || ''}
                  onChange={(e) => setIndividualForm({ ...individualForm, unidades: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-extrabold text-emerald-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">TIPO DE CARGA</label>
                <select
                  value={individualForm.tipoCarga}
                  onChange={(e) => setIndividualForm({ ...individualForm, tipoCarga: e.target.value as TipoCargaRecoleccion })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                  <option value="historica">Histórica</option>
                </select>
              </div>

            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={individualSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                {individualSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Guardar Registro de Recolección
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MÉTRICAS Y ANÁLISIS GRÁFICO */}
      {/* ========================================================================= */}
      {activeTab === 'analitica' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Chart 1: Volume by Route */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                Volumen Total por Ruta (Lbs)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Libras" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Category Distribution */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-rose-600" />
                Distribución por Tipo de Residuo / Categoría
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name.substring(0, 10)}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Top Generating Clients */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Top Clientes Generadores de Residuos (Lbs)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClientsChartData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Libras" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase">Editar Registro de Recolección</h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700">Código Cliente</label>
                <input
                  type="text"
                  value={editingRecord.codigoCliente || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, codigoCliente: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Nombre Cliente</label>
                <input
                  type="text"
                  value={editingRecord.nombreCliente || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, nombreCliente: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">No. Recibo</label>
                <input
                  type="text"
                  value={editingRecord.numeroRecibo || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, numeroRecibo: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Fecha Visita</label>
                <input
                  type="date"
                  value={editingRecord.fechaVisita || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, fechaVisita: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Ruta</label>
                <input
                  type="text"
                  value={editingRecord.ruta || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, ruta: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Categoría</label>
                <input
                  type="text"
                  value={editingRecord.categoria || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, categoria: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Producto</label>
                <input
                  type="text"
                  value={editingRecord.producto || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, producto: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Unidades / Lbs</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRecord.unidades || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, unidades: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-extrabold text-emerald-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
              >
                {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE MODAL */}
      {/* ========================================================================= */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-sm font-bold uppercase text-slate-900">Confirmar Eliminación</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              ¿Está seguro de que desea eliminar la boleta <strong>{recordToDelete.numeroRecibo}</strong> correspondiente al cliente <strong>{recordToDelete.nombreCliente}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded shadow-xs"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISO Quality Control Footer */}
      <FormFooter
        elaboroCargo="Gerente Comercial Industrial"
        revisoCargo="Comité ISO"
        aproboCargo="Gerente General"
        cambios={[
          {
            version: '1.0',
            fecha: '17/08/2026',
            seccion: 'Todas',
            cambio: 'Creación del módulo consolidado de reporte de recolección en lote y consultas multidimensionales',
            solicitante: 'Comité de Calidad / Logística'
          }
        ]}
      />

    </div>
  );
}
