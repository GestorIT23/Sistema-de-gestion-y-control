import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { isAuthorizedToDelete } from '../utils/authUtils';
import { Trash2, AlertTriangle, ShieldAlert, X, Check, Loader2 } from 'lucide-react';

interface Props {
  collectionName?: string;
  moduleTitle?: string;
  moduleKey?: string;
  moduleName?: string;
  formCode?: string;
  userEmail: string;
  onDeleted: () => void | Promise<void>;
  recordCount?: number;
  localStorageBackupKey?: string;
  variant?: 'header-button' | 'card-button' | 'compact';
}

export default function GestorItDeleteModuleRecords({
  collectionName,
  moduleTitle,
  moduleKey,
  moduleName,
  formCode,
  userEmail,
  onDeleted,
  recordCount,
  localStorageBackupKey,
  variant = 'compact'
}: Props) {
  const effectiveCollectionName = collectionName || moduleKey || '';
  const effectiveModuleTitle = moduleTitle || moduleName || effectiveCollectionName;
  const isAuthorized = isAuthorizedToDelete(userEmail);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthorized) {
    return null;
  }

  const handleDeleteAll = async () => {
    if (confirmInput.trim().toUpperCase() !== 'ELIMINAR') {
      setErrorMsg('Debe escribir exactamente la palabra "ELIMINAR" para autorizar esta acción.');
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMsg('');
      setProgressMsg('Consultando registros en base de datos...');

      const colRef = collection(db, effectiveCollectionName);
      const snapshot = await getDocs(colRef);
      const totalDocs = snapshot.docs.length;

      if (totalDocs === 0) {
        setProgressMsg('No hay documentos en Firestore para eliminar.');
        if (localStorageBackupKey) {
          try {
            localStorage.removeItem(localStorageBackupKey);
          } catch (e) {
            console.error('Error clearing local storage backup:', e);
          }
        }
        await onDeleted();
        setTimeout(() => {
          setIsDeleting(false);
          setIsOpen(false);
          setConfirmInput('');
          alert(`Formulario "${effectiveModuleTitle}": No se encontraron documentos previos.`);
        }, 500);
        return;
      }

      setProgressMsg(`Eliminando ${totalDocs} registros de ${effectiveModuleTitle}...`);

      // Delete in batches of 400 (Firestore maximum batch size is 500)
      const docs = snapshot.docs;
      const CHUNK_SIZE = 400;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((d) => {
          batch.delete(doc(db, effectiveCollectionName, d.id));
        });
        await batch.commit();
        setProgressMsg(`Eliminados ${Math.min(i + CHUNK_SIZE, totalDocs)} de ${totalDocs} registros...`);
      }

      // Clear local storage backup if configured
      if (localStorageBackupKey) {
        try {
          localStorage.removeItem(localStorageBackupKey);
        } catch (e) {
          console.error('Error clearing local storage backup:', e);
        }
      }

      // Notify parent to refresh list
      await onDeleted();

      setIsDeleting(false);
      setIsOpen(false);
      setConfirmInput('');
      alert(`✅ Éxito: Se han eliminado todos los ${totalDocs} registros de "${effectiveModuleTitle}" (${effectiveCollectionName}) correctamente. Las demás bitácoras se mantienen intactas.`);
    } catch (err: any) {
      console.error('Error al eliminar registros de la colección:', err);
      setIsDeleting(false);
      setErrorMsg(`Error al ejecutar eliminación: ${err.message || 'Error desconocido'}`);
    }
  };

  return (
    <>
      {/* Trigger Button based on variant */}
      {variant === 'header-button' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
          title={`Acción exclusiva Gestor IT: Eliminar únicamente los registros de ${effectiveModuleTitle}`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          <span>Vaciar Formulario (Gestor IT)</span>
        </button>
      ) : variant === 'card-button' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
          title={`Acción exclusiva Gestor IT: Eliminar únicamente los registros de ${effectiveModuleTitle}`}
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          <span>Eliminar todos los registros de este formulario</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded border border-rose-200 font-bold flex items-center gap-1 text-[11px] transition cursor-pointer"
          title={`Acción exclusiva Gestor IT: Eliminar únicamente los registros de ${effectiveModuleTitle}`}
        >
          <Trash2 className="w-3 h-3 text-rose-600" />
          <span>Eliminar todos los registros de este formulario</span>
        </button>
      )}

      {/* Safety Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-900 to-rose-800 text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-700/80 rounded-xl border border-rose-400/30">
                  <ShieldAlert className="w-6 h-6 text-rose-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-950/80 text-rose-200 px-2 py-0.5 rounded border border-rose-500/30">
                      Gestor IT · Nivel Administrativo
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    Eliminar Registros de este Formulario
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setIsOpen(false)}
                disabled={isDeleting}
                className="text-rose-200 hover:text-white p-1 rounded-lg hover:bg-rose-700/50 transition cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-slate-800">
              {/* Form Target Info Box */}
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-rose-950 font-semibold">
                  <span>Formulario Objetivo:</span>
                  <span className="font-bold font-mono text-rose-800">{formCode || 'SGI'}</span>
                </div>
                <div className="font-bold text-sm text-slate-900">
                  {effectiveModuleTitle}
                </div>
                <div className="flex justify-between items-center text-slate-600 font-mono text-[11px] pt-1 border-t border-rose-100">
                  <span>Colección Firestore:</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-700 font-bold">{effectiveCollectionName}</span>
                </div>
                {recordCount !== undefined && (
                  <div className="flex justify-between items-center text-slate-600 font-mono text-[11px]">
                    <span>Registros visualizados:</span>
                    <span className="font-bold text-slate-800">{recordCount} registros</span>
                  </div>
                )}
              </div>

              {/* Strict Scope Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Alcance estricto y seguro:
                </div>
                <p className="leading-relaxed text-[11.5px] text-amber-950">
                  Esta acción eliminará <strong>ÚNICAMENTE</strong> los registros almacenados en este formulario específico.
                  Las demás 16 bitácoras, reportes de recolección y cuentas de usuario <strong>NO serán modificados ni eliminados</strong>.
                </p>
              </div>

              {/* Confirmation Input */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700">
                  Para confirmar, escriba la palabra <span className="font-mono text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-black">ELIMINAR</span> a continuación:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Escriba ELIMINAR"
                  disabled={isDeleting}
                  className="w-full px-3.5 py-2.5 border-2 border-rose-200 focus:border-rose-600 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none transition uppercase tracking-widest placeholder:text-slate-400 placeholder:tracking-normal disabled:bg-slate-100"
                />
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Progress Message */}
              {progressMsg && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
                  {progressMsg}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={isDeleting || confirmInput.trim().toUpperCase() !== 'ELIMINAR'}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando registros...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Vaciar únicamente este formulario
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
