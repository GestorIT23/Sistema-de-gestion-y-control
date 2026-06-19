import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraEntregaContenedores as IBitacoraEntregaContenedores, FilaEntregaContenedor } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, CheckSquare, Plus, Trash2, ArrowLeft, Download, Database, LayoutGrid, FileText, FileSpreadsheet } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraEntregaContenedores({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<IBitacoraEntregaContenedores[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [responsable, setResponsable] = useState(userEmail || 'Ing. de Logística');
  const [totalContenedores, setTotalContenedores] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  // Checkboxes
  const [tapaderaBuenEstado, setTapaderaBuenEstado] = useState(true);
  const [cuerpoBuenEstado, setCuerpoBuenEstado] = useState(true);
  const [llantasBuenEstado, setLlantasBuenEstado] = useState(true);
  const [haladorBuenEstado, setHaladorBuenEstado] = useState(true);

  // Table rows
  const [filas, setFilas] = useState<FilaEntregaContenedor[]>([]);

  const [nuevaRuta, setNuevaRuta] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState(0);
  const [nuevaFirmaRecibe, setNuevaFirmaRecibe] = useState('');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_entrega_contenedores'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: IBitacoraEntregaContenedores[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as IBitacoraEntregaContenedores);
      });
      setRegistros(docs);
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_cont_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleAddFila = () => {
    if (!nuevaRuta || nuevaCantidad <= 0 || !nuevaFirmaRecibe) {
      setMsg({ text: 'Por favor, complete todos los campos para registrar la ruta.', type: 'error' });
      return;
    }
    const updatedRows = [...filas, { ruta: nuevaRuta, cantidad: nuevaCantidad, firmaRecibe: nuevaFirmaRecibe }];
    setFilas(updatedRows);
    
    // Auto calculate total containers sum
    const total = updatedRows.reduce((a, b) => a + b.cantidad, 0);
    setTotalContenedores(total);

    setNuevaRuta('');
    setNuevaCantidad(0);
    setNuevaFirmaRecibe('');
    setMsg({ text: '', type: '' });
  };

  const handleRemoverFila = (idx: number) => {
    const updatedRows = filas.filter((_, i) => i !== idx);
    setFilas(updatedRows);
    setTotalContenedores(updatedRows.reduce((a, b) => a + b.cantidad, 0));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filas.length === 0) {
      setMsg({ text: 'Debe ingresar al menos una ruta con contenedores rojos entregados.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Guardando datos en Firebase...', type: 'info' });

    const nuevoRegistro: IBitacoraEntregaContenedores = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable,
      totalContenedores: parseInt(totalContenedores as any) || filas.reduce((a, b) => a + b.cantidad, 0),
      filas,
      estadoGeneral: {
        tapaderaBuenEstado,
        cuerpoBuenEstado,
        llantasBuenEstado,
        haladorBuenEstado
      },
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2026', seccion: 'Todas', cambio: 'Creación del formato inicial - SGC Control de Operación', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_entrega_contenedores'), nuevoRegistro);
      generateAndDownloadPDF('entrega_contenedores', nuevoRegistro);
      setMsg({ text: 'La entrega de contenedores rojos se ha guardado exitosamente en Firestore y se ha generado el reporte PDF oficial SGC.', type: 'success' });
      setObservaciones('');
      setFilas([]);
      setTotalContenedores(0);
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_cont_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('entrega_contenedores', nuevoRegistro);
      setMsg({ text: 'Guardado localmente y PDF generado con éxito. La base de datos no está disponible temporalmente.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (registro: IBitacoraEntregaContenedores) => {
    generateAndDownloadExcel('entrega_contenedores', registro);
  };

  return (
    <div id="bitacora-contenedores-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Módulo de Control F-OPR-000 / Format N° 2
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Creator Section */}
        <div className="lg:col-span-2 space-y-6">
          <form id="bitacora-contenedores-form" onSubmit={handleGuardar} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Entrega de Contenedores Rojos al Departamento de Logística" />

            {/* Sub-Header Metadata Inputs (Redesigned matching PDF) */}
            <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-300 text-xs font-mono bg-white">
              <div className="grid grid-cols-12 bg-slate-50">
                <div className="col-span-4 p-3 font-bold text-slate-600 uppercase border-r border-slate-300 flex items-center gap-1.5 bg-[#fafbfc]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha:
                </div>
                <div className="col-span-8 p-2 flex items-center">
                  <input
                    id="fecha-input-containers"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-slate-800 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-12">
                <div className="col-span-4 p-3 font-bold text-slate-600 uppercase border-r border-slate-300 flex items-center gap-1.5 bg-[#fafbfc]">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Responsable:
                </div>
                <div className="col-span-8 p-2 flex items-center">
                  <input
                    id="responsable-input-containers"
                    type="text"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-slate-800 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 bg-[#f0f9ff]">
                <div className="col-span-4 p-3 font-bold text-[#0284c7] uppercase border-r border-slate-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-sky-500" /> Total Contenedores:
                </div>
                <div className="col-span-8 p-2 flex items-center font-bold text-sky-800 text-base">
                  <input
                    id="total-contenedores-input"
                    type="number"
                    value={totalContenedores}
                    onChange={(e) => setTotalContenedores(parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent border-0 outline-none font-bold text-sky-800"
                    placeholder="Auto-calculado o modificado"
                  />
                </div>
              </div>
            </div>

            {/* Central Form Layout featuring subtable on left and checklist on right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              
              {/* Columns Table Input (Col span 7) */}
              <div className="md:col-span-8 space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Cantidad Entregada por Ruta</h3>
                </div>

                <div className="grid grid-cols-12 gap-2 p-3 bg-sky-50/50 border border-sky-100 rounded-lg">
                  <div className="col-span-6 space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Ruta de Recolección</label>
                    <input
                      id="new-route-name"
                      type="text"
                      value={nuevaRuta}
                      onChange={(e) => setNuevaRuta(e.target.value)}
                      placeholder="Ej. Ruta 05 Central"
                      className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Cantidad</label>
                    <input
                      id="new-route-cant"
                      type="number"
                      value={nuevaCantidad}
                      onChange={(e) => setNuevaCantidad(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded text-xs px-1 py-1.5 outline-none text-center"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Firma Recibe</label>
                    <input
                      id="new-route-firma"
                      type="text"
                      value={nuevaFirmaRecibe}
                      onChange={(e) => setNuevaFirmaRecibe(e.target.value)}
                      placeholder="Nombre"
                      className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    <button
                      id="btn-add-container-row"
                      type="button"
                      onClick={handleAddFila}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded p-2 flex items-center justify-center transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table id="delivery-containers-table" className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-[#e0f2fe] text-sky-800 uppercase p-2 font-semibold text-[10px]">
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-300">Ruta</th>
                        <th className="px-3 py-2 border-r border-slate-300 text-center w-24">Cantidad</th>
                        <th className="px-3 py-2 border-r border-slate-300 w-32">Firma Quien Recibe</th>
                        <th className="px-2 py-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filas.map((f, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-700 font-medium">{f.ruta}</td>
                          <td className="px-3 py-2 border-r border-slate-200 text-center font-bold text-slate-800">{f.cantidad}</td>
                          <td className="px-3 py-2 border-r border-slate-200 italic font-mono text-slate-600">{f.firmaRecibe}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              id={`remove-container-row-${index}`}
                              type="button"
                              onClick={() => handleRemoverFila(index)}
                              className="text-red-500 hover:text-red-700 focus:outline-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Checklist Section on Right (Col span 5) */}
              <div className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500" /> Estado de Contenedores
                </h4>

                <div className="space-y-3">
                  <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition cursor-pointer">
                    <input
                      id="checkbox-tapadera"
                      type="checkbox"
                      checked={tapaderaBuenEstado}
                      onChange={(e) => setTapaderaBuenEstado(e.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Tapadera en buen estado</span>
                      <span className="text-[10px] text-slate-400">Verificar cierre hermético completo.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition cursor-pointer">
                    <input
                      id="checkbox-cuerpo"
                      type="checkbox"
                      checked={cuerpoBuenEstado}
                      onChange={(e) => setCuerpoBuenEstado(e.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Cuerpo en buen estado</span>
                      <span className="text-[10px] text-slate-400">Sin grietas, roturas o fugas líquidas.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition cursor-pointer">
                    <input
                      id="checkbox-llantas"
                      type="checkbox"
                      checked={llantasBuenEstado}
                      onChange={(e) => setLlantasBuenEstado(e.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Llantas en buen estado</span>
                      <span className="text-[10px] text-slate-400">Eje firme y rodamiento sin atascos.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition cursor-pointer">
                    <input
                      id="checkbox-halador"
                      type="checkbox"
                      checked={haladorBuenEstado}
                      onChange={(e) => setHaladorBuenEstado(e.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Halador en buen estado</span>
                      <span className="text-[10px] text-slate-400">Mango de empuje íntegro y rígido.</span>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            {/* Obs generales */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales en el Proceso de Entrega:</label>
              <textarea
                id="observaciones-containers"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Declare estado de desinfección, incidencias con las tapas marcadas, reemplazo de ruedas auxiliares, etc..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 transition"
              />
            </div>

            {/* Footer Signatures */}
            <FormFooter />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div id="containers-feedback-msg" className="flex-1 text-xs px-4 py-2 rounded-lg font-medium bg-sky-50 text-sky-800 border border-sky-200">
                  {msg.text}
                </div>
              )}
              <button
                id="btn-save"
                type="submit"
                disabled={saving}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Entrega'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3">
            <h3 className="font-extrabold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-sky-400" /> Registro de Contenedores
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Esta sección controla la trazabilidad logística de los contenedores rojos retornados de las rutas hospitalarias para su higienización inmediata.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b pb-2">Histórico Logístico</h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">Sin historiales disponibles en Firebase.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registros.map((reg) => (
                  <div key={reg.id} className="border border-slate-100 hover:border-sky-200 rounded-lg p-3 bg-slate-50 transition text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span>{reg.fecha}</span>
                      <span className="text-sky-600 font-bold">{reg.totalContenedores} Pzas</span>
                    </div>
                    <div className="text-slate-500 mt-1">SGC Resp: {reg.responsable}</div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${reg.estadoGeneral?.tapaderaBuenEstado ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>Tapa</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${reg.estadoGeneral?.cuerpoBuenEstado ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>Cuerpo</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${reg.estadoGeneral?.llantasBuenEstado ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>Llantas</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleExportExcel(reg)}
                        className="text-[#0284c7] hover:text-sky-800 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => generateAndDownloadPDF('entrega_contenedores', reg)}
                        className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 text-[10px] cursor-pointer"
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
