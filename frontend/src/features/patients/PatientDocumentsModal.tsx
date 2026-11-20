import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { getErrorMessage } from '../../lib/api';
import { patientDocumentsApi, type PatientDocumentRow } from './patient-documents.api';
import './PatientActionModal.css';

export function PatientDocumentsModal({ patientId, patientName, canManage, onClose }: { patientId: number; patientName: string; canManage: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<PatientDocumentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => { try { setRows(await patientDocumentsApi.list(patientId)); } catch (err) { setError(getErrorMessage(err, 'Unable to load documents')); } };
  useEffect(() => { void load(); }, [patientId]);
  const add = async (file: File | undefined) => {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 1_000_000) { setError('Choose a PDF, JPG, or PNG up to 1 MB.'); return; }
    setBusy(true); setError('');
    try {
      const fileData = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read file')); reader.readAsDataURL(file); });
      await patientDocumentsApi.add(patientId, { name: file.name, fileName: file.name, mimeType: file.type, fileData });
      await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to upload document')); }
    finally { setBusy(false); }
  };
  const download = async (row: PatientDocumentRow) => {
    setError('');
    try { const documentRow = await patientDocumentsApi.get(patientId, row.id); const link = document.createElement('a'); link.href = documentRow.fileData; link.download = documentRow.fileName; link.click(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to download document')); }
  };
  const remove = async (row: PatientDocumentRow) => {
    if (!window.confirm(`Delete ${row.fileName}?`)) return;
    setBusy(true); setError('');
    try { await patientDocumentsApi.remove(patientId, row.id); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to delete document')); }
    finally { setBusy(false); }
  };
  return <div className="patient-action-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="patient-action-modal" role="dialog" aria-modal="true" aria-label="Patient documents"><header><div><h2>Patient Documents</h2><p>{patientName}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></header><div className="patient-action-modal__body">
    {error && <Alert tone="error">{error}</Alert>}
    {canManage && <label className="patient-action-upload">Upload PDF, JPG or PNG (up to 1 MB)<input type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={(event) => { void add(event.target.files?.[0]); event.target.value = ''; }} /></label>}
    {rows.length ? <div className="patient-action-list">{rows.map((row) => <article key={row.id}><div><strong>{row.name}</strong><small>{new Date(row.createdAt).toLocaleString()}</small></div><Button size="sm" variant="secondary" onClick={() => void download(row)}>Download</Button>{canManage && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove(row)}>Delete</Button>}</article>)}</div> : <p>No documents uploaded for this patient.</p>}
  </div><footer><Button variant="secondary" onClick={onClose}>Close</Button></footer></section></div>;
}
