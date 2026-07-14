import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraControlIncineracion, FilaControlIncineracion } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, Flame, Timer, Activity, FileText, FileSpreadsheet } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import BulkUploadPanel from '../BulkUploadPanel';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraControlIncineracionModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraControlIncineracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [incinerador, setIncinerador] = useState('Incinerador Pyro-Alpha 2000');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [responsable, setResponsable] = useState(userEmail || 'Operador de Incineración');
  const [duracionProceso, setDuracionProceso] = useState('4.5 Horas');
  const [totalLibras, setTotalLibras] = useState(0);

  const [horaInicio, setHoraInicio] = useState('06:00');
  const [horaFin, setHoraFin] = useState('10:30');
  const [tempCombustion, setTempCombustion] = useState(850); // Grados Celsius (recommended SGI)
  const [tempPostCombustion, setTempPostCombustion] = useState(1100); // Grados Celsius (standard regulation)
  const [cantidadPolvoFin, setCantidadPolvoFin] = useState(15); // Lbs of ash
  const [combustibleUsado, setCombustibleUsado] = useState('Gas Propano / Diesel');
  const [combustibleCantidad, setCombustibleCantidad] = useState(48); // Gallons

  const [observaciones, setObservaciones] = useState('');

  // 7 standard process entries matches PDF
  const [filas, setFilas] = useState<FilaControlIncineracion[]>([
    { ingreso: 'CANTIDAD DE LIBRAS INGRESO 01', libras: 0 },
    { ingreso: 'CANTIDAD DE LIBRAS INGRESO 02', libras: 0 },
    { ingreso: 'CANTIDAD DE LIBRAS INGRESO 03', libras: 0 },
    { ingreso: 'CANTIDAD DE LIBRAS INGRESO 04', libras: 0 },
    { ingreso: 'CANTIDAD DE LIBRAS INGRESO 05', libras: 0 },
    { ingreso: 'CANTIDAD DE LIBRAS INGRESO 06', libras: 0 },
    { ingreso: 'CANTIDAD DE LIBRAS INGRESO 07', libras: 0 }
  ]);

  useEffect(() => {
    fetchRegistros();
  }, []);

  // Recalculates total libras
  useEffect(() => {
    const sumLbs = filas.reduce((a, b) => a + (Number(b.libras) || 0), 0);
    setTotalLibras(sumLbs);
  }, [filas]);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_control_incineracion'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraControlIncineracion[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraControlIncineracion);
      });
      setRegistros(docs);
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_inci_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (index: number, val: number) => {
    const updated = [...filas];
    updated[index] = { ...updated[index], libras: val };
    setFilas(updated);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalLibras === 0) {
      setMsg({ text: 'Debe ingresar peso en los ingresos de incineración antes de guardar.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Registrando control de incineración en Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraControlIncineracion = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable,
      incinerador,
      duracionProceso,
      totalLibras,
      horaInicio,
      horaFin,
      tempCombustion,
      tempPostCombustion,
      cantidadPolvoFin,
      combustibleUsado,
      combustibleCantidad,
      filas,
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2025', seccion: 'Todas', cambio: 'Creación de bitácora patrón de temperatura y combustión de incinerador principal', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_control_incineracion'), nuevoRegistro);
      generateAndDownloadPDF('control_incineracion', nuevoRegistro);
      setMsg({ text: 'La bitácora de incineración se ha guardado exitosamente en Firestore y ya se generó el PDF oficial SGI.', type: 'success' });
      setObservaciones('');
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_inci_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('control_incineracion', nuevoRegistro);
      setMsg({ text: 'Guardado localmente y PDF generado con éxito. La base de datos no está disponible temporalmente.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (registro: BitacoraControlIncineracion) => {
    generateAndDownloadExcel('control_incineracion', registro);
  };

  return (
    <div id="bitacora-incineracion-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Return Line */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Módulo H F-OPR-000 / Format N° 5
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Core Form (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          <form id="bitacora-incineracion-form" onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Control de Incineración de RPBI" />

            {/* Base parameters mimicking original form layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Incinerador:</label>
                <input
                  id="incinerador-model"
                  type="text"
                  value={incinerador}
                  onChange={(e) => setIncinerador(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Fecha de Proceso:</label>
                <input
                  id="fecha-proceso"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Duridad (Duración):</label>
                <input
                  id="duracion-proceso"
                  type="text"
                  value={duracionProceso}
                  onChange={(e) => setDuracionProceso(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Nombre Del Responsable:</label>
                <input
                  id="nombre-responsable"
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none"
                  required
                />
              </div>

              {/* Total Calculated Weight Show */}
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 flex flex-col justify-center">
                <span className="block text-[9px] uppercase font-bold text-orange-600 tracking-wider">Total de Libras Ingresadas:</span>
                <span className="text-lg font-extrabold text-orange-850 block">{totalLibras} LBS</span>
              </div>
            </div>

            {/* Layout divided horizontally: left side has operational times & temps, right side has Lbs Subtable inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              
              {/* Left Side: Operational Variables Inputs (Col span 5) */}
              <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 text-rose-700">
                  <Activity className="w-4 h-4" /> Parámetros Operativos
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Hora Inicio:</label>
                    <input
                      id="hora-inicio"
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Hora Fin:</label>
                    <input
                      id="hora-fin"
                      type="time"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold text-center"
                    />
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Cámara de Combustión (°C):</label>
                    <input
                      id="temp-combustion"
                      type="number"
                      value={tempCombustion}
                      onChange={(e) => setTempCombustion(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold"
                    />
                    <p className="text-[9px] text-slate-400">Recomendado: {`>= 850 °C`} (Normas ISO)</p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Cámara Post Combustión (°C):</label>
                    <input
                      id="temp-post"
                      type="number"
                      value={tempPostCombustion}
                      onChange={(e) => setTempPostCombustion(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold"
                    />
                    <p className="text-[9px] text-slate-400">Recomendado: {`>= 1100 °C`}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase text-slate-600">Combustible:</label>
                      <input
                        id="combustible"
                        type="text"
                        value={combustibleUsado}
                        onChange={(e) => setCombustibleUsado(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-[11px] rounded p-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase text-slate-600">Cant (Gls):</label>
                      <input
                        id="combustible-cant"
                        type="number"
                        value={combustibleCantidad}
                        onChange={(e) => setCombustibleCantidad(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded p-1 text-center font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Ceniza / Polvo Fino Final (Lbs):</label>
                    <input
                      id="polvo-fin"
                      type="number"
                      value={cantidadPolvoFin}
                      onChange={(e) => setCantidadPolvoFin(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-55 border border-slate-300 rounded p-1.5 outline-none font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Right Side: Libra Subtable (Col span 7) */}
              <div className="md:col-span-7 space-y-3">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide border-b pb-2">Ingresos de Material de Carga</h4>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                  <table id="incineracion-lbs-table" className="w-full text-xs text-left text-slate-600 h-96">
                    <thead className="bg-[#fef2f2] text-rose-800 uppercase p-2 font-semibold text-[10px] border-b">
                      <tr>
                        <th className="px-4 py-2 border-r border-slate-300">INGRESO NÚMERO</th>
                        <th className="px-4 py-2 text-center w-40">CANTIDAD DE LIBRAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filas.map((f, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 border-r font-mono text-slate-700">{f.ingreso}</td>
                          <td className="px-4 py-1.5 text-center font-mono">
                            <input
                              id={`ingreso-cant-${index}`}
                              type="number"
                              value={f.libras}
                              min={0}
                              onChange={(e) => handleRowChange(index, parseInt(e.target.value) || 0)}
                              className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-bold text-slate-800 w-28 py-1 focus:bg-white outline-none"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Obs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales Durante el Proceso:</label>
              <textarea
                id="observaciones-incineradora"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Declare estado de las alarmas sonoras, variabilidad en la presión hidráulica del empujador o mermas de hollín..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 transition"
              />
            </div>

            {/* Change controls + signatures */}
            <FormFooter />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div id="incineracion-feedback-msg" className="flex-1 text-xs px-4 py-2 rounded-lg font-medium bg-red-50 text-red-800 border border-red-200">
                  {msg.text}
                </div>
              )}
              <button
                id="btn-save-incin"
                type="submit"
                disabled={saving}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Sincronizar Incinerador'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar History (col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          <BulkUploadPanel tipo="control_incineracion" userEmail={userEmail} onSuccess={fetchRegistros} />

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3">
            <h3 className="font-extrabold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" /> SGI Thermo-Destrucción
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Incinerar RPBI disminuye su volumen en un 95% y elimina por completo microorganismos patógenos. El SGI audita periódicamente las temperaturas de este módulo.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b pb-2">Históricos del Horno</h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">Sin registros de incinerador todavía.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registros.map((reg) => (
                  <div key={reg.id} className="border border-slate-100 hover:border-orange-250 rounded-lg p-3 bg-slate-50 transition text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span>{reg.fecha}</span>
                      <span className="text-orange-600 font-bold">{reg.totalLibras} lbs</span>
                    </div>
                    <div className="text-slate-500 mt-1 font-mono text-[10px] truncate">Máq: {reg.incinerador}</div>
                    <div className="flex justify-between mt-2 font-mono text-[10px] text-slate-500">
                      <span>C1: {reg.tempCombustion}°C</span>
                      <span>C2: {reg.tempPostCombustion}°C</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleExportExcel(reg)}
                        className="text-orange-700 hover:text-orange-900 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => generateAndDownloadPDF('control_incineracion', reg)}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-indigo-500" /> Descargar PDF (SGI)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
