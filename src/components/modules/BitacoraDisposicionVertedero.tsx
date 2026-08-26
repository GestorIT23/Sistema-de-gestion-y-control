import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit , deleteDoc, doc} from 'firebase/firestore';
import { BitacoraDisposicionVertedero as IBitacoraDisposicionVertedero, FilaDisposicionVertedero, BoletaPagoAmsa } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, Truck, Landmark, FileText, FileSpreadsheet, Plus, Trash , Trash2, Receipt, Hash, DollarSign, Scale} from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import BulkUploadPanel from '../BulkUploadPanel';
import { isAuthorizedToDelete } from '../../utils/authUtils';
import GestorItDeleteModuleRecords from '../GestorItDeleteModuleRecords';
import DeleteSingleRecordModal from '../DeleteSingleRecordModal';
import { sortRecordsByDateDesc } from '../../utils/dateUtils';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraDisposicionVertedero({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<IBitacoraDisposicionVertedero[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [recordToDelete, setRecordToDelete] = useState<IBitacoraDisposicionVertedero | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getCurrentTimeStr = () => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [responsable, setResponsable] = useState(userEmail || 'Ing. de Planta');
  
  // Boletas de Pago AMSA (1 a N)
  const [boletasAmsa, setBoletasAmsa] = useState<BoletaPagoAmsa[]>([
    { id: '1', numeroBoleta: '', pesajeLbs: 0, montoQuetzales: 0, observaciones: '' }
  ]);

  const [totalViajes, setTotalViajes] = useState(0);
  const [totalPacas, setTotalPacas] = useState(0);
  const [totalPesaje, setTotalPesaje] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  // Default 4 trips pre-selected as requested by user
  const createInitialFilas = (): FilaDisposicionVertedero[] => [
    { camion: 'Camión 01', placa: '', noPaseSalida: '', noBoletaAmsa: '', cantidadPacas: 0, pesaje: 0, horaSalida: getCurrentTimeStr(), nombrePiloto: '', correlativoPacas: '' },
    { camion: 'Camión 02', placa: '', noPaseSalida: '', noBoletaAmsa: '', cantidadPacas: 0, pesaje: 0, horaSalida: getCurrentTimeStr(), nombrePiloto: '', correlativoPacas: '' },
    { camion: 'Camión 03', placa: '', noPaseSalida: '', noBoletaAmsa: '', cantidadPacas: 0, pesaje: 0, horaSalida: getCurrentTimeStr(), nombrePiloto: '', correlativoPacas: '' },
    { camion: 'Camión 04', placa: '', noPaseSalida: '', noBoletaAmsa: '', cantidadPacas: 0, pesaje: 0, horaSalida: getCurrentTimeStr(), nombrePiloto: '', correlativoPacas: '' },
  ];

  const [filas, setFilas] = useState<FilaDisposicionVertedero[]>([]);

  useEffect(() => {
    if (filas.length === 0) {
      setFilas(createInitialFilas());
    }
    fetchRegistros();
  }, []);

  // Compute calculated metrics
  useEffect(() => {
    const activeTrucks = filas.filter(f => (f.placa.trim() !== '' || f.camion.trim() !== '') && (f.cantidadPacas > 0 || (f.pesaje && f.pesaje > 0))).length;
    const sumPacas = filas.reduce((a, b) => a + (Number(b.cantidadPacas) || 0), 0);
    const sumPesaje = filas.reduce((a, b) => a + (Number(b.pesaje) || 0), 0);
    setTotalViajes(activeTrucks);
    setTotalPacas(sumPacas);
    setTotalPesaje(sumPesaje);
  }, [filas]);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_disposicion_vertedero'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: IBitacoraDisposicionVertedero[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as IBitacoraDisposicionVertedero);
      });
      setRegistros(sortRecordsByDateDesc(docs, 'fecha'));
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_vert_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };
  const canDelete = isAuthorizedToDelete(userEmail);

  const handleConfirmDelete = async () => {
    if (!recordToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'bitacora_disposicion_vertedero', recordToDelete.id));
      setRegistros(prev => prev.filter(r => r.id !== recordToDelete.id));
      setRecordToDelete(null);
      fetchRegistros();
    } catch (err) {
      console.error('Error al eliminar registro:', err);
      setMsg({ text: 'Error al eliminar el registro de la base de datos.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handlers for Boletas AMSA (1 a N)
  const handleAddBoleta = () => {
    setBoletasAmsa(prev => [
      ...prev,
      { id: String(Date.now() + Math.random()), numeroBoleta: '', pesajeLbs: 0, montoQuetzales: 0, observaciones: '' }
    ]);
  };

  const handleRemoveBoleta = (index: number) => {
    if (boletasAmsa.length <= 1) {
      setBoletasAmsa([{ id: '1', numeroBoleta: '', pesajeLbs: 0, montoQuetzales: 0, observaciones: '' }]);
      return;
    }
    setBoletasAmsa(prev => prev.filter((_, i) => i !== index));
  };

  const handleBoletaChange = (index: number, field: keyof BoletaPagoAmsa, val: any) => {
    setBoletasAmsa(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Handlers for Trips / Filas
  const handleRowChange = (index: number, field: keyof FilaDisposicionVertedero, val: any) => {
    const updated = [...filas];
    updated[index] = { ...updated[index], [field]: val };
    setFilas(updated);
  };

  const handleAddRow = () => {
    setFilas([
      ...filas,
      {
        camion: `Camión ${String(filas.length + 1).padStart(2, '0')}`,
        placa: '',
        noPaseSalida: '',
        noBoletaAmsa: boletasAmsa[0]?.numeroBoleta || '',
        cantidadPacas: 0,
        pesaje: 0,
        horaSalida: getCurrentTimeStr(),
        nombrePiloto: '',
        correlativoPacas: ''
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (filas.length <= 1) return;
    const updated = filas.filter((_, i) => i !== index);
    setFilas(updated);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPacas === 0) {
      setMsg({ text: 'Debe ingresar al menos un camión con pacas para poder registrar el defogue.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Enviando registro de vertedero a Firebase...', type: 'info' });

    // Clean and prepare boletas list
    const validBoletas = boletasAmsa.filter(b => b.numeroBoleta && b.numeroBoleta.trim() !== '');
    const boletaSummary = validBoletas.length > 0 
      ? validBoletas.map(b => b.numeroBoleta.trim()).join(', ')
      : (boletasAmsa[0]?.numeroBoleta?.trim() || '');

    const nuevoRegistro: IBitacoraDisposicionVertedero = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable,
      noBoletaAmsa: boletaSummary,
      boletasAmsa: validBoletas.length > 0 ? validBoletas : boletasAmsa,
      totalViajes,
      totalPacas,
      totalPesaje,
      filas,
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2025', seccion: 'Todas', cambio: 'Creación de bitácora de defogue y despacho a vertederos delegados', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_disposicion_vertedero'), nuevoRegistro);
      generateAndDownloadPDF('disposicion_vertedero', nuevoRegistro);
      setMsg({ text: 'Los datos de despacho a vertedero se depositaron satisfactoriamente en Firestore y se ha generado el reporte PDF oficial SGI.', type: 'success' });
      setObservaciones('');
      setBoletasAmsa([{ id: '1', numeroBoleta: '', pesajeLbs: 0, montoQuetzales: 0, observaciones: '' }]);
      
      // Reset the rows to 4 default trips
      setFilas(createInitialFilas());
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_vert_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('disposicion_vertedero', nuevoRegistro);
      setMsg({ text: 'Almacenado localmente y PDF generado con éxito. La base de datos no está disponible temporalmente.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (registro: IBitacoraDisposicionVertedero) => {
    generateAndDownloadExcel('disposicion_vertedero', registro);
  };

  return (
    <div id="bitacora-vertedero-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Return Row */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <div className="flex items-center gap-2">
          <GestorItDeleteModuleRecords
            collectionName="bitacora_disposicion_vertedero"
            moduleTitle="Bitácora de Disposición Final de DSH a Vertedero"
            formCode="F-OPR-04"
            userEmail={userEmail}
            onDeleted={fetchRegistros}
            recordCount={registros.length}
            localStorageBackupKey="biotrash_vert_bk"
            variant="header-button"
          />
          <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Módulo F-OPR-04
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          <form id="bitacora-vertedero-form" onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Disposición Final de DSH (Vertedero Autorizado)" />

            {/* Subheader Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha de Despacho:
                </label>
                <input
                  id="date-vert-input"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-2 text-slate-800 font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Responsable de Despacho:
                </label>
                <input
                  id="responsable-vert-input"
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-2 text-slate-800 font-bold outline-none"
                  required
                />
              </div>

              {/* Real-time counters matching PDF block */}
              <div className="space-y-1 bg-amber-50 border border-amber-100 rounded-lg p-3 col-span-1 md:col-span-2 grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-amber-600 tracking-wider">Total de Viajes (Defogue):</span>
                  <span className="text-xl font-extrabold text-amber-800 block">{totalViajes} VIAJES</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-amber-600 tracking-wider">Total de Pacas Despachadas:</span>
                  <span className="text-xl font-extrabold text-amber-800 block">{totalPacas} PACAS</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-amber-600 tracking-wider">Total de Pesaje (LBS):</span>
                  <span className="text-xl font-extrabold text-amber-800 block">{totalPesaje.toLocaleString()} LBS</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN DINÁMICA: BOLETAS DE PAGO DE AMSA (1 A LA N) */}
            <div id="seccion-boletas-amsa" className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-600 text-white rounded-lg shadow-xs">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      Boletas de Pago de AMSA (1 a la N)
                      <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">
                        {boletasAmsa.length} {boletasAmsa.length === 1 ? 'Boleta' : 'Boletas'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      Registre una o múltiples boletas de pago emitidas por AMSA para el control y cruce de defogue.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-add-boleta-amsa"
                  type="button"
                  onClick={handleAddBoleta}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-900 bg-amber-200 hover:bg-amber-300 border border-amber-400 font-bold px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Boleta AMSA ({boletasAmsa.length + 1})
                </button>
              </div>

              {/* Lista dinámica de Boletas de Pago AMSA (1 a N) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {boletasAmsa.map((bol, bIdx) => (
                  <div key={bol.id || bIdx} className="bg-white border border-amber-200 rounded-lg p-3 shadow-2xs space-y-2 relative">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                        <Receipt className="w-3 h-3 text-amber-700" /> Boleta AMSA #{bIdx + 1}
                      </span>
                      {boletasAmsa.length > 1 && (
                        <button
                          id={`btn-remove-boleta-${bIdx}`}
                          type="button"
                          onClick={() => handleRemoveBoleta(bIdx)}
                          className="text-red-500 hover:text-red-700 p-0.5 rounded transition text-xs font-bold flex items-center gap-0.5"
                          title="Eliminar esta boleta de pago"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                          <Hash className="w-3 h-3 text-amber-600" /> N° Boleta de Pago AMSA:
                        </label>
                        <input
                          id={`boleta-amsa-num-${bIdx}`}
                          type="text"
                          value={bol.numeroBoleta}
                          onChange={(e) => handleBoletaChange(bIdx, 'numeroBoleta', e.target.value)}
                          placeholder="Ej. AMSA-2026-08492"
                          className="w-full bg-amber-50/40 border border-amber-300 rounded px-2 py-1.5 text-xs font-bold text-amber-950 focus:bg-white focus:border-amber-600 outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Scale className="w-3 h-3 text-slate-400" /> Pesaje Boleta (LBS):
                        </label>
                        <input
                          id={`boleta-amsa-pesaje-${bIdx}`}
                          type="number"
                          min={0}
                          value={bol.pesajeLbs || ''}
                          onChange={(e) => handleBoletaChange(bIdx, 'pesajeLbs', parseFloat(e.target.value) || 0)}
                          placeholder="0 lbs"
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-slate-400" /> Monto Pago (Q):
                        </label>
                        <input
                          id={`boleta-amsa-monto-${bIdx}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={bol.montoQuetzales || ''}
                          onChange={(e) => handleBoletaChange(bIdx, 'montoQuetzales', parseFloat(e.target.value) || 0)}
                          placeholder="Q 0.00"
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Datalist to easily autocomplete boletas in table rows */}
              <datalist id="boletas-amsa-autocomplete-list">
                {boletasAmsa.filter(b => b.numeroBoleta && b.numeroBoleta.trim() !== '').map((b, idx) => (
                  <option key={idx} value={b.numeroBoleta.trim()}>
                    {`Boleta AMSA #${idx + 1} (${b.pesajeLbs || 0} LBS)`}
                  </option>
                ))}
              </datalist>
            </div>

            {/* TABLA DE VIAJES / CAMIONES (4 PRESELECCIONADOS POR DEFECTO) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-1.5 text-amber-700">
                  <Truck className="w-4 h-4" /> Registro de Viajes y Camiones de Disposición ({filas.length} viajes)
                </h3>
                <span className="text-[10px] text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {filas.length} VIAJES CONFIGURADOS
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                <table id="vertedero-form-table" className="w-full text-xs text-left text-slate-600 min-w-[920px]">
                  <thead className="bg-[#fef3c7] text-amber-800 uppercase p-2 font-semibold text-[10px] border-b border-amber-200">
                    <tr>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-36">CAMIÓN / TRANSPORTE</th>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-24 text-center">PLACA</th>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-24 text-center">N° PASE SALIDA</th>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-32 text-center text-amber-900 bg-amber-100/60">N° BOLETA AMSA</th>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-20 text-center">HORA SALIDA</th>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-36 text-center">PILOTO</th>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-24 text-center">N° CORRELATIVO</th>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-20 text-center">PACAS</th>
                      <th className="px-2 py-2.5 border-r border-slate-300 w-20 text-center">PESO (LBS)</th>
                      <th className="px-2 py-2.5 text-center w-10">ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-mono text-center">
                    {filas.map((f, index) => (
                      <tr key={index} className="hover:bg-amber-50/10">
                        <td className="px-1 py-1 border-r border-slate-200">
                          <input
                            id={`camion-input-${index}`}
                            type="text"
                            value={f.camion}
                            onChange={(e) => handleRowChange(index, 'camion', e.target.value)}
                            placeholder="Camión XX"
                            className="bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 w-full px-1 py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200">
                          <input
                            id={`placa-input-${index}`}
                            type="text"
                            value={f.placa}
                            onChange={(e) => handleRowChange(index, 'placa', e.target.value.toUpperCase())}
                            placeholder="C-XXXX"
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-semibold text-slate-800 w-full py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200">
                          <input
                            id={`salida-input-${index}`}
                            type="text"
                            value={f.noPaseSalida}
                            onChange={(e) => handleRowChange(index, 'noPaseSalida', e.target.value)}
                            placeholder="PS-XXX"
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-semibold text-slate-800 w-full py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200 bg-amber-50/30">
                          <input
                            id={`boleta-amsa-input-${index}`}
                            type="text"
                            list="boletas-amsa-autocomplete-list"
                            value={f.noBoletaAmsa !== undefined ? f.noBoletaAmsa : (boletasAmsa[0]?.numeroBoleta || '')}
                            onChange={(e) => handleRowChange(index, 'noBoletaAmsa', e.target.value)}
                            placeholder={boletasAmsa[0]?.numeroBoleta || "AMSA-XXXX"}
                            className="bg-amber-50/50 border border-amber-200 text-center rounded text-xs font-bold text-amber-900 w-full py-1 focus:bg-white focus:border-amber-500 outline-none"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200">
                          <input
                            id={`hora-salida-input-${index}`}
                            type="text"
                            value={f.horaSalida || ''}
                            className="bg-slate-100 border border-slate-200 text-center rounded text-xs font-semibold text-slate-500 w-full py-1 cursor-not-allowed outline-none"
                            disabled
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200">
                          <input
                            id={`piloto-input-${index}`}
                            type="text"
                            value={f.nombrePiloto || ''}
                            onChange={(e) => handleRowChange(index, 'nombrePiloto', e.target.value)}
                            placeholder="Nombre del Piloto"
                            className="bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 w-full px-1 py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200">
                          <input
                            id={`correlativo-input-${index}`}
                            type="text"
                            value={f.correlativoPacas || ''}
                            onChange={(e) => handleRowChange(index, 'correlativoPacas', e.target.value)}
                            placeholder="P-XXXX"
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-semibold text-slate-800 w-full py-1 focus:bg-white outline-none font-mono"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200 text-center">
                          <input
                            id={`pacas-vert-input-${index}`}
                            type="number"
                            value={f.cantidadPacas}
                            min={0}
                            onChange={(e) => handleRowChange(index, 'cantidadPacas', parseInt(e.target.value) || 0)}
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-extrabold text-slate-800 w-full py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200 text-center">
                          <input
                            id={`pesaje-vert-input-${index}`}
                            type="number"
                            value={f.pesaje !== undefined ? f.pesaje : 0}
                            min={0}
                            onChange={(e) => handleRowChange(index, 'pesaje', parseInt(e.target.value) || 0)}
                            placeholder="0 LBS"
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-extrabold text-slate-800 w-full py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            id={`btn-remove-row-${index}`}
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            title="Eliminar este viaje"
                            className="text-red-500 hover:text-red-700 transition cursor-pointer p-1"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add row button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  id="btn-add-row-vertedero"
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-950 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-bold transition focus:outline-none cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Viaje / Camión ({filas.length + 1})
                </button>
                <span className="text-[11px] text-slate-400 font-mono">
                  Configurado por defecto: 4 viajes iniciales (1 a N dinámico)
                </span>
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales al Proceso de Defogue:</label>
              <textarea
                id="observaciones-vertedero"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Rellene con novedades mecánicas del vagón de transporte, verificaciones mecánicas de básculas o del portón de salida fiscal..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>

            {/* Changing history and signatures */}
            <FormFooter />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div id="vertedero-feedback-msg" className="flex-1 text-xs px-4 py-2 rounded-lg font-medium bg-amber-55 text-amber-900 border border-amber-200">
                  {msg.text}
                </div>
              )}
              <button
                id="btn-submit-vertedero"
                type="submit"
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Sincronizar Despacho'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <BulkUploadPanel tipo="disposicion_vertedero" userEmail={userEmail} onSuccess={fetchRegistros} />

          <div className="bg-gradient-to-br from-amber-950 to-orange-950 text-white border border-amber-800/50 rounded-xl p-5 space-y-4 shadow-md">
            <h3 className="font-extrabold text-xs uppercase text-slate-200 tracking-wider flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-400" /> Vertedero Sanitario Autorizado
            </h3>
            <p className="text-xs text-amber-200/80 leading-normal">
              Asegurar la desinfección total de los residuos tratados antes del despacho definitivo al vertedero autorizado es ley sanitaria nacional (Acuerdo Gub. 509R).
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b pb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" /> Viajes de Defogue
            </h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">Aún no existen registros de Vertederos en Firebase.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registros.map((reg) => (
                  <div key={reg.id} className="border border-slate-100 hover:border-amber-200 rounded-lg p-3 bg-slate-50 transition text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span>{reg.fecha}</span>
                      <span className="text-amber-700 font-bold">{reg.totalViajes} Viajes</span>
                    </div>
                    {reg.noBoletaAmsa && (
                      <div className="text-amber-800 font-bold mt-0.5 font-mono text-[11px] flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-amber-600 inline" /> Boleta(s) AMSA: {reg.noBoletaAmsa}
                      </div>
                    )}
                    <div className="text-slate-500 mt-0.5 font-mono text-[11px]">Resp: {reg.responsable}</div>
                    <div className="text-slate-600 font-bold mt-1">
                      {reg.totalPacas} Pacas | {reg.totalPesaje !== undefined ? reg.totalPesaje.toLocaleString() : 0} LBS
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleExportExcel(reg)}
                        className="text-amber-700 hover:text-amber-800 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => generateAndDownloadPDF('disposicion_vertedero', reg)}
                        className="text-rose-600 hover:text-rose-800 flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-rose-500" /> Descargar PDF (SGI)
                      </button>
                        {canDelete && reg.id && (
                          <>
                            <span className="text-slate-300 font-mono text-[10px]">|</span>
                            <button
                              type="button"
                              onClick={() => setRecordToDelete(reg)}
                              className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-0.5 text-[10px] cursor-pointer"
                              title="Eliminar Registro"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" /> Eliminar
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal for single record deletion */}
      <DeleteSingleRecordModal
        isOpen={!!recordToDelete}
        title="Eliminar Registro de Disposición en Vertedero"
        itemIdentifier={recordToDelete?.id}
        details={[
          { label: 'Fecha', value: recordToDelete?.fecha || '' },
          { label: 'Responsable', value: recordToDelete?.responsable || '' },
          { label: 'Boleta(s) Pago AMSA', value: recordToDelete?.noBoletaAmsa || '—' },
          { label: 'Total Pacas', value: String(recordToDelete?.totalPacas || '0') },
          { label: 'Total Pesaje', value: `${recordToDelete?.totalPesaje?.toLocaleString() || 0} LBS` },
          { label: 'Observaciones', value: recordToDelete?.observaciones || '—' },
        ]}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
}
