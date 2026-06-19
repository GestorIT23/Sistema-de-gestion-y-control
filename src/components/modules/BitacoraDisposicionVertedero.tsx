import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraDisposicionVertedero as IBitacoraDisposicionVertedero, FilaDisposicionVertedero } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, Truck, Landmark, FileText } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraDisposicionVertedero({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<IBitacoraDisposicionVertedero[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [responsable, setResponsable] = useState(userEmail || 'Ing. de Planta');
  const [totalViajes, setTotalViajes] = useState(0);
  const [totalPacas, setTotalPacas] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  // 11 trucks pre-populated as seen in PDF
  const [filas, setFilas] = useState<FilaDisposicionVertedero[]>([]);

  useEffect(() => {
    fetchRegistros();
  }, []);

  // Compute calculated metrics
  useEffect(() => {
    const activeTrucks = filas.filter(f => f.placa.trim() !== '' && f.cantidadPacas > 0).length;
    const sumPacas = filas.reduce((a, b) => a + (Number(b.cantidadPacas) || 0), 0);
    setTotalViajes(activeTrucks);
    setTotalPacas(sumPacas);
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
      setRegistros(docs);
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_vert_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (index: number, field: keyof FilaDisposicionVertedero, val: any) => {
    const updated = [...filas];
    updated[index] = { ...updated[index], [field]: val };
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

    const nuevoRegistro: IBitacoraDisposicionVertedero = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable,
      totalViajes,
      totalPacas,
      filas,
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2026', seccion: 'Todas', cambio: 'Creación de bitácora de defogue y despacho a vertederos delegados', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_disposicion_vertedero'), nuevoRegistro);
      generateAndDownloadPDF('disposicion_vertedero', nuevoRegistro);
      setMsg({ text: 'Los datos de despacho a vertedero se depositaron satisfactoriamente en Firestore y se ha generado el reporte PDF oficial SGC.', type: 'success' });
      setObservaciones('');
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

  const handleExportCSV = (registro: IBitacoraDisposicionVertedero) => {
    let csv = `BIOTRASH - Bitacora de Disposicion Final de RPBI a Vertedero Autorizado\n`;
    csv += `Fecha,Nombre Responsable,Total Viajes,Total Pacas Despachadas\n`;
    csv += `${registro.fecha},${registro.responsable},${registro.totalViajes},${registro.totalPacas}\n\n`;
    csv += `Camion,Placa,No Pase de Salida,Cantidad Pacas\n`;
    registro.filas.filter(f => f.cantidadPacas > 0).forEach(f => {
      csv += `${f.camion},${f.placa},${f.noPaseSalida},${f.cantidadPacas}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vertedero_${registro.fecha}.csv`);
    link.click();
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
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Módulo G F-OPR-000 / Format N° 4
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          <form id="bitacora-vertedero-form" onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Disposición Final de RPBI (Vertedero Autorizado)" />

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
              <div className="space-y-1 bg-amber-50 border border-amber-100 rounded-lg p-3 col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-amber-600 tracking-wider">Total de Viajes (Defogue):</span>
                  <span className="text-xl font-extrabold text-amber-800 block">{totalViajes} VIAJES</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-amber-600 tracking-wider">Total de Pacas Despachadas:</span>
                  <span className="text-xl font-extrabold text-amber-800 block">{totalPacas} PACAS</span>
                </div>
              </div>
            </div>

            {/* Sub-table with 11 Trucks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-1.5 text-amber-700">
                  <Truck className="w-4 h-4" /> Registro del Proceso de Disposición Final
                </h3>
                <span className="text-[10px] text-slate-400 font-mono font-bold">11 CAMIONES ESTÁNDAR</span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <table id="vertedero-form-table" className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-[#fef3c7] text-amber-800 uppercase p-2 font-semibold text-[10px] border-b border-amber-200">
                    <tr>
                      <th className="px-4 py-2.5 border-r border-slate-300 w-1/4">CAMIÓN / TRANSPORTE</th>
                      <th className="px-4 py-2.5 border-r border-slate-300 w-32 text-center">PLACA</th>
                      <th className="px-4 py-2.5 border-r border-slate-300 w-36 text-center">N° PASE DE SALIDA</th>
                      <th className="px-4 py-2.5 text-center">CANTIDAD PACAS DESPACHADAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-mono text-center">
                    {filas.map((f, index) => (
                      <tr key={index} className="hover:bg-amber-50/10">
                        <td className="px-4 py-1.5 border-r border-slate-200 bg-slate-50/50 font-bold text-slate-700 text-left">{f.camion}</td>
                        <td className="px-3 py-1 border-r border-slate-200">
                          <input
                            id={`placa-input-${index}`}
                            type="text"
                            value={f.placa}
                            onChange={(e) => handleRowChange(index, 'placa', e.target.value.toUpperCase())}
                            placeholder="C-XXXX"
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-semibold text-slate-800 w-24 py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-3 py-1 border-r border-slate-200">
                          <input
                            id={`salida-input-${index}`}
                            type="text"
                            value={f.noPaseSalida}
                            onChange={(e) => handleRowChange(index, 'noPaseSalida', e.target.value)}
                            placeholder="PS-XXX"
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-semibold text-slate-800 w-28 py-1 focus:bg-white outline-none"
                          />
                        </td>
                        <td className="px-3 py-1 text-center">
                          <input
                            id={`pacas-vert-input-${index}`}
                            type="number"
                            value={f.cantidadPacas}
                            min={0}
                            onChange={(e) => handleRowChange(index, 'cantidadPacas', parseInt(e.target.value) || 0)}
                            className="bg-slate-50 border border-slate-200 text-center rounded text-xs font-extrabold text-slate-800 w-16 py-1 focus:bg-white outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Sincronizar Despacho'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-amber-950 to-orange-950 text-white border border-amber-800/50 rounded-xl p-5 space-y-4 shadow-md">
            <h3 className="font-extrabold text-xs uppercase text-slate-200 tracking-wider flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-400" /> Vertedero Sanitarios Autorizado
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
                    <div className="text-slate-500 mt-1 font-mono text-[11px]">Resp: {reg.responsable}</div>
                    <div className="text-slate-600 font-bold mt-1">{reg.totalPacas} Pacas enviadas</div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleExportCSV(reg)}
                        className="text-amber-700 hover:text-amber-800 font-bold text-[10px] cursor-pointer"
                      >
                        Descargar CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => generateAndDownloadPDF('disposicion_vertedero', reg)}
                        className="text-rose-600 hover:text-rose-800 flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-rose-500" /> Descargar PDF (SGC)
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
