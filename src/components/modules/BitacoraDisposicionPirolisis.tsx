import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraDisposicionPirolisis as IBitacoraDisposicionPirolisis, FilaDisposicionPirolisis } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, Flame, FileSpreadsheet, FileText } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraDisposicionPirolisis({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<IBitacoraDisposicionPirolisis[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [responsable, setResponsable] = useState(userEmail || 'Supervisor de Pirólisis');
  const [totalLibras, setTotalLibras] = useState(0); // Standard factor
  const [totalPacas, setTotalPacas] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  // 11 Processes pre-populated as seen in PDF
  const [filas, setFilas] = useState<FilaDisposicionPirolisis[]>(() => {
    return Array.from({ length: 11 }, (_, i) => ({
      proceso: `Proceso ${String(i + 1).padStart(2, '0')}`,
      pacas: 0,
      noPaseTraslado: '',
      firmaRecibe: ''
    }));
  });

  useEffect(() => {
    fetchRegistros();
  }, []);

  // Recalculates total pacas when sub-values shift
  useEffect(() => {
    const sumPacas = filas.reduce((a, b) => a + (Number(b.pacas) || 0), 0);
    setTotalPacas(sumPacas);
    // Standard weight factor for RPBI bale (approx 75 lbs per bale)
    setTotalLibras(sumPacas * 75);
  }, [filas]);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_disposicion_pirolisis'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: IBitacoraDisposicionPirolisis[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as IBitacoraDisposicionPirolisis);
      });
      setRegistros(docs);
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_piro_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (index: number, field: keyof FilaDisposicionPirolisis, val: any) => {
    const updated = [...filas];
    updated[index] = { ...updated[index], [field]: val };
    setFilas(updated);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setMsg({ text: 'Guardando datos en Firebase...', type: 'info' });

    const nuevoRegistro: IBitacoraDisposicionPirolisis = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable,
      totalLibras,
      totalPacas,
      filas,
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2025', seccion: 'Todas', cambio: 'Formato de trazabilidad para transferencia y control de pirólisis', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_disposicion_pirolisis'), nuevoRegistro);
      generateAndDownloadPDF('disposicion_pirolisis', nuevoRegistro);
      setMsg({ text: 'Los datos de disposición final a pirólisis se han guardado exitosamente en Firestore y se ha generado el reporte PDF oficial SGI.', type: 'success' });
      setObservaciones('');
      setFilas(Array.from({ length: 11 }, (_, i) => ({
        proceso: `Proceso ${String(i + 1).padStart(2, '0')}`,
        pacas: 0,
        noPaseTraslado: '',
        firmaRecibe: ''
      })));
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_piro_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('disposicion_pirolisis', nuevoRegistro);
      setMsg({ text: 'Guardado localmente y PDF generado con éxito. La base de datos no está disponible temporalmente.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (registro: IBitacoraDisposicionPirolisis) => {
    generateAndDownloadExcel('disposicion_pirolisis', registro);
  };

  return (
    <div id="bitacora-pirolisis-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Breadcrumb row */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-portal"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
          Módulo F F-OPR-000 / Format N° 3
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form panel */}
        <div className="lg:col-span-2 space-y-6">
          <form id="bitacora-pirolisis-form" onSubmit={handleGuardar} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Disposición Final de RPBI a Pirólisis" />

            {/* General Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha del Proceso:
                </label>
                <input
                  id="date-piro-input"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-2 text-slate-800 font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Responsable del Proceso:
                </label>
                <input
                  id="responsable-piro-input"
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-2 text-slate-800 font-bold outline-none"
                  required
                />
              </div>

              {/* Total display parameters */}
              <div className="space-y-1 bg-red-50 border border-red-100 rounded-lg p-2.5 mt-2 col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-red-500 tracking-wider">Total de Pacas Trasladadas:</span>
                  <span className="text-xl font-bold text-red-800 block">{totalPacas} PACAS</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-red-500 tracking-wider">Total de Libras Estimadas:</span>
                  <span className="text-xl font-bold text-red-800 block">{totalLibras.toLocaleString()} LBS</span>
                </div>
              </div>
            </div>

            {/* Main Interactive Table (Populated with 11 processes) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-1.5 text-rose-700">
                  <Flame className="w-4 h-4" /> Registro del Traslado a Área de Pirólisis
                </h3>
                <span className="text-[10px] text-slate-400 font-mono font-bold">11 PROCESOS ESTÁNDAR</span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <table id="pirolisis-form-table" className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-[#fff1f2] text-rose-800 uppercase p-2 font-semibold text-[10px] border-b border-rose-100">
                    <tr>
                      <th className="px-4 py-2.5 border-r border-slate-300 w-1/4">PROCESO</th>
                      <th className="px-4 py-2.5 border-r border-slate-300 w-24 text-center">ANOTAR PACAS</th>
                      <th className="px-4 py-2.5 border-r border-slate-300 w-36 text-center">N° PASE TRASLADO</th>
                      <th className="px-4 py-2.5">FIRMA DE RECIBIDO EN TURNO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-mono">
                    {filas.map((f, index) => (
                      <tr key={index} className="hover:bg-rose-50/10">
                        <td className="px-4 py-1.5 border-r border-slate-200 bg-slate-50/50 font-bold text-slate-700">{f.proceso}</td>
                        <td className="px-3 py-1 border-r border-slate-200 text-center">
                          <input
                            id={`pacas-input-${index}`}
                            type="number"
                            value={f.pacas}
                            min={0}
                            onChange={(e) => handleRowChange(index, 'pacas', parseInt(e.target.value) || 0)}
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-bold text-slate-800 w-16 py-1 mx-auto focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-3 py-1 border-r border-slate-200 text-center">
                          <input
                            id={`pase-input-${index}`}
                            type="text"
                            value={f.noPaseTraslado}
                            onChange={(e) => handleRowChange(index, 'noPaseTraslado', e.target.value)}
                            placeholder="PT-XX"
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs text-slate-800 w-28 py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            id={`firma-piro-input-${index}`}
                            type="text"
                            value={f.firmaRecibe}
                            onChange={(e) => handleRowChange(index, 'firmaRecibe', e.target.value)}
                            placeholder="Nombre Receptor"
                            className="bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 w-full px-2 py-1 focus:bg-white outline-none font-sans"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Obs generales */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales al Proceso de Traslado de RPBI a Pirólisis:</label>
              <textarea
                id="observaciones-piro"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Rellene cualquier anomalía en los pases, estado mojado de bolsas, o variabilidad de peso de las pacas entregadas..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 transition"
              />
            </div>

            {/* Form Footer change control */}
            <FormFooter />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div id="piro-feedback-msg" className="flex-1 text-xs px-4 py-2 rounded-lg font-medium bg-red-50 text-red-800 border border-red-200">
                  {msg.text}
                </div>
              )}
              <button
                id="btn-submit-piro"
                type="submit"
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Sincronizar Disposición'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-rose-950 to-red-950 text-white border border-rose-800/50 rounded-xl p-5 space-y-4 shadow-md">
            <h3 className="font-extrabold text-xs uppercase text-slate-200 tracking-wider flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-400 animate-pulse" /> SGI Pirólisis Industrial
            </h3>
            <p className="text-xs text-rose-200/80 leading-normal">
              La pirólisis controlada asegura la descomposición térmica libre de oxígeno para residuos infecciosos. Se debe registrar obligatoriamente cada lote de pacas transferidas internamente.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b pb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-rose-600" /> Registro Histórico
            </h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">Aún no existen registros de Pirólisis en Firebase.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registros.map((reg) => (
                  <div key={reg.id} className="border border-slate-100 hover:border-rose-200 rounded-lg p-3 bg-slate-50 transition text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span>{reg.fecha}</span>
                      <span className="text-rose-600 font-bold">{reg.totalPacas} Pacas</span>
                    </div>
                    <div className="text-slate-500 mt-1 font-mono text-[11px]">Resp: {reg.responsable}</div>
                    <div className="text-slate-600 font-bold mt-1">{reg.totalLibras.toLocaleString()} LBS estimadas</div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleExportExcel(reg)}
                        className="text-rose-600 hover:text-rose-800 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => generateAndDownloadPDF('disposicion_pirolisis', reg)}
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
