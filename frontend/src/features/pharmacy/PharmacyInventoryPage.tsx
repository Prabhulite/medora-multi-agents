import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { prescriptionsApi } from '../clinical/prescriptions.api';
import type { Prescription } from '../../types';
import { pharmacyApi, type DispenseRecord, type DispenseStockPayload, type InventoryBatch, type PharmacyPatientCandidate, type ReceiveStockPayload } from './pharmacy.api';
import './PharmacyInventoryPage.css';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function dateLabel(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

function daysToExpiry(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

function stockTone(row: InventoryBatch): 'success' | 'warning' | 'danger' {
  if (row.quantity <= row.reorderLevel) return 'danger';
  if (daysToExpiry(row.expiryDate) <= 90) return 'warning';
  return 'success';
}

export function PharmacyInventoryPage() {
  const { user } = useAuth();
  const canReceive = hasPermission(user, 'pharmacy.inventory.create');
  const canDispense = hasPermission(user, 'pharmacy.inventory.update');
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<'receive' | 'dispense' | 'history' | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setInventory(await pharmacyApi.listInventory());
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load pharmacy inventory'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    units: inventory.reduce((total, row) => total + row.quantity, 0),
    batches: inventory.length,
    lowStock: inventory.filter((row) => row.quantity <= row.reorderLevel).length,
    expiring: inventory.filter((row) => daysToExpiry(row.expiryDate) <= 90).length,
  }), [inventory]);

  const columns = useMemo<TableColumn<InventoryBatch>[]>(() => [
    { key: 'medication', header: 'Medication', render: (row) => <div><div className="ui-table__cell-title">{row.medicationName}</div><div className="ui-table__cell-sub">{row.medicationCode || 'Medication'} · Batch {row.batchNumber}</div></div> },
    { key: 'expiry', header: 'Expiry', render: (row) => <div><div>{dateLabel(row.expiryDate)}</div><div className="ui-table__cell-sub">{daysToExpiry(row.expiryDate) < 0 ? 'Expired' : `${daysToExpiry(row.expiryDate)} days remaining`}</div></div> },
    { key: 'quantity', header: 'On hand', render: (row) => <div><strong>{row.quantity}</strong><div className="ui-table__cell-sub">Reorder at {row.reorderLevel}</div></div> },
    { key: 'pricing', header: 'Price', render: (row) => <div><div>{currency.format(row.sellingPrice)}</div><div className="ui-table__cell-sub">Cost {currency.format(row.purchasePrice)}</div></div> },
    { key: 'location', header: 'Location', render: (row) => row.storageLocation || 'Not assigned' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={stockTone(row)}>{row.quantity <= row.reorderLevel ? 'Low stock' : daysToExpiry(row.expiryDate) <= 90 ? 'Review soon' : 'In stock'}</Badge> },
  ], []);

  const saveReceipt = async (payload: ReceiveStockPayload) => {
    setSaving(true); setError(''); setNotice('');
    try {
      await pharmacyApi.receiveStock(payload);
      setModal(null); setNotice('Stock received and inventory updated.'); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to receive stock')); }
    finally { setSaving(false); }
  };

  const saveDispense = async (payload: DispenseStockPayload) => {
    setSaving(true); setError(''); setNotice('');
    try {
      await pharmacyApi.dispenseStock(payload);
      setModal(null); setNotice('Stock dispensed and inventory updated.'); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to dispense stock')); }
    finally { setSaving(false); }
  };

  return <div className="pharmacy-page">
    <PageHeader title="Pharmacy inventory" subtitle="Monitor medicine availability, expiry risk, and stock movements." actions={<div className="pharmacy-actions"><Button variant="secondary" size="sm" onClick={() => setModal('history')}>Dispense history</Button>{canDispense && <Button variant="secondary" size="sm" onClick={() => setModal('dispense')}>Dispense stock</Button>}{canReceive && <Button size="sm" onClick={() => setModal('receive')}>Receive stock</Button>}</div>} />
    {error ? <Alert tone="error">{error}</Alert> : null}
    {notice ? <Alert tone="success">{notice}</Alert> : null}
    <div className="pharmacy-kpis" aria-label="Pharmacy inventory summary">
      <article><span>Units on hand</span><strong>{summary.units.toLocaleString('en-IN')}</strong><small>Across {summary.batches} batches</small></article>
      <article className="pharmacy-kpi--green"><span>Active batches</span><strong>{summary.batches}</strong><small>Tracked inventory lots</small></article>
      <article className="pharmacy-kpi--amber"><span>Low stock</span><strong>{summary.lowStock}</strong><small>At or below reorder level</small></article>
      <article className="pharmacy-kpi--red"><span>Expiry watch</span><strong>{summary.expiring}</strong><small>Expiring within 90 days</small></article>
    </div>
    <section className="pharmacy-section">
      <div className="pharmacy-section__heading"><div><span className="pharmacy-eyebrow">STOCK CONTROL</span><h2>Inventory batches</h2><p>Use FEFO handling: issue medicines with the nearest expiry first.</p></div></div>
      <Table columns={columns} rows={inventory} rowKey={(row) => row.id} loading={loading} onRefresh={() => void load()} searchText={(row) => `${row.medicationName} ${row.medicationCode} ${row.batchNumber} ${row.storageLocation || ''}`} searchPlaceholder="Search medicine, batch, or location" emptyMessage="No inventory batches found. Receive stock to start tracking medicines." />
    </section>
    {modal === 'receive' && canReceive ? <ReceiveStockForm saving={saving} onClose={() => setModal(null)} onSubmit={(payload) => void saveReceipt(payload)} /> : null}
    {modal === 'dispense' && canDispense ? <DispenseStockForm inventory={inventory} saving={saving} onClose={() => setModal(null)} onSubmit={(payload) => void saveDispense(payload)} /> : null}
    {modal === 'history' ? <DispenseHistory onClose={() => setModal(null)} /> : null}
  </div>;
}

function ReceiveStockForm({ saving, onClose, onSubmit }: { saving: boolean; onClose: () => void; onSubmit: (payload: ReceiveStockPayload) => void }) {
  const [form, setForm] = useState({ medicationId: '', batchNumber: '', expiryDate: '', purchasePrice: '', sellingPrice: '', quantity: '', reorderLevel: '10', storageLocation: '', reference: '' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title="Receive stock" eyebrow="NEW STOCK RECEIPT" onClose={onClose}><form className="pharmacy-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ medicationId: Number(form.medicationId), batchNumber: form.batchNumber, expiryDate: form.expiryDate, purchasePrice: Number(form.purchasePrice), sellingPrice: Number(form.sellingPrice), quantity: Number(form.quantity), reorderLevel: Number(form.reorderLevel), storageLocation: form.storageLocation || null, reference: form.reference || null }); }}><div className="pharmacy-form__grid"><Input label="Medication ID" type="number" min="1" required value={form.medicationId} onChange={(event) => update('medicationId', event.target.value)} placeholder="Catalog medication ID" /><Input label="Batch number" required value={form.batchNumber} onChange={(event) => update('batchNumber', event.target.value)} placeholder="e.g. PARA-2026-A" /><Input label="Expiry date" type="date" required value={form.expiryDate} onChange={(event) => update('expiryDate', event.target.value)} /><Input label="Quantity received" type="number" min="1" required value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /><Input label="Purchase price" type="number" min="0" step="0.01" required value={form.purchasePrice} onChange={(event) => update('purchasePrice', event.target.value)} /><Input label="Selling price" type="number" min="0" step="0.01" required value={form.sellingPrice} onChange={(event) => update('sellingPrice', event.target.value)} /><Input label="Reorder level" type="number" min="0" value={form.reorderLevel} onChange={(event) => update('reorderLevel', event.target.value)} /><Input label="Storage location" value={form.storageLocation} onChange={(event) => update('storageLocation', event.target.value)} placeholder="Main pharmacy · Shelf A" /></div><Input label="Reference" value={form.reference} onChange={(event) => update('reference', event.target.value)} placeholder="Supplier invoice or GRN number" /><FormFooter saving={saving} onClose={onClose} submitLabel="Receive stock" /></form></ModalShell>;
}

function PharmacyPatientPicker({ patientId, onSelect, optional = false }: { patientId: string; onSelect: (id: string) => void; optional?: boolean }) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<PharmacyPatientCandidate[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (query.trim().length < 2 || patientId) { setMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { void pharmacyApi.patients(query.trim()).then((rows) => { if (active) { setMatches(rows); setError(''); } }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to search patients')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, patientId]);
  return <div className="pharmacy-patient-picker"><Input label={optional ? 'Patient (optional)' : 'Search patient by name or MRD'} value={query} onChange={(event) => { setQuery(event.target.value); onSelect(''); }} placeholder="Search name or MRD (2+ characters)" />{matches.length > 0 && <Select label="Matching patients" value={patientId} onChange={(event) => { const patient = matches.find((row) => String(row.id) === event.target.value); onSelect(event.target.value); if (patient) setQuery(`${patient.fullName} (${patient.mrdNumber})`); }} options={[{ value: '', label: 'Select a patient' }, ...matches.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} />}{patientId && <small>Selected patient ID: {patientId}</small>}{error && <Alert tone="error">{error}</Alert>}</div>;
}

function DispenseStockForm({ inventory, saving, onClose, onSubmit }: { inventory: InventoryBatch[]; saving: boolean; onClose: () => void; onSubmit: (payload: DispenseStockPayload) => void }) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [lookupError, setLookupError] = useState('');
  const [form, setForm] = useState({ batchId: '', quantity: '', patientId: '', prescriptionId: '', reference: '' });
  useEffect(() => {
    if (!form.patientId || !Number.isInteger(Number(form.patientId)) || Number(form.patientId) < 1) { setPrescriptions([]); return; }
    let active = true;
    prescriptionsApi.listByPatient(Number(form.patientId)).then((rows) => { if (active) setPrescriptions(rows.filter((row) => row.status === 'active' && !!row.medicationId && !!row.quantityPrescribed)); }).catch((err) => { if (active) setLookupError(getErrorMessage(err, 'Unable to load prescriptions')); });
    return () => { active = false; };
  }, [form.patientId]);
  const selectedPrescription = prescriptions.find((row) => String(row.id) === form.prescriptionId);
  const sortedInventory = [...inventory].filter((row) => !selectedPrescription || row.medicationId === selectedPrescription.medicationId).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  const selected = inventory.find((row) => String(row.id) === form.batchId);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === 'patientId' ? { prescriptionId: '', batchId: '' } : {}), ...(key === 'prescriptionId' ? { batchId: '' } : {}) }));
  return <ModalShell title="Dispense stock" eyebrow="PHARMACY ISSUE" onClose={onClose}>{lookupError && <Alert tone="error">{lookupError}</Alert>}<form className="pharmacy-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ batchId: Number(form.batchId), quantity: Number(form.quantity), patientId: form.patientId ? Number(form.patientId) : null, prescriptionId: form.prescriptionId ? Number(form.prescriptionId) : null, reference: form.reference || null }); }}><div className="pharmacy-form__grid"><PharmacyPatientPicker patientId={form.patientId} onSelect={(id) => update('patientId', id)} optional /><Select label="Active catalog prescription" value={form.prescriptionId} onChange={(event) => update('prescriptionId', event.target.value)} options={[{ value: '', label: 'General stock issue' }, ...prescriptions.map((row) => ({ value: row.id, label: `${row.medicineName} · ${row.quantityPrescribed} units prescribed` }))]} /></div><Select label="Batch (FEFO order)" required value={form.batchId} onChange={(event) => update('batchId', event.target.value)} options={[{ value: '', label: sortedInventory.length ? 'Select a batch' : 'No matching stock available' }, ...sortedInventory.map((row) => ({ value: String(row.id), label: `${row.medicationName} · ${row.batchNumber} · ${row.quantity} units` }))]} /><div className="pharmacy-fefo-note" role="status"><strong>FEFO suggestion:</strong> {selected ? `Issue batch ${selected.batchNumber} first (${dateLabel(selected.expiryDate)} expiry, ${selected.quantity} units available).` : 'Select a batch to see its availability.'}</div><div className="pharmacy-form__grid"><Input label="Quantity to dispense" type="number" min="1" max={selected?.quantity || undefined} required value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /><Input label="Reference" value={form.reference} onChange={(event) => update('reference', event.target.value)} placeholder="Dispensing note or issue number" /></div><FormFooter saving={saving} onClose={onClose} submitLabel="Dispense stock" disabled={!sortedInventory.length} /></form></ModalShell>;
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="pharmacy-modal-backdrop" role="presentation" onClick={onClose}><section className="pharmacy-modal" role="dialog" aria-modal="true" aria-labelledby="pharmacy-modal-title" onClick={(event) => event.stopPropagation()}><div className="pharmacy-modal__header"><div><span className="pharmacy-eyebrow">{eyebrow}</span><h2 id="pharmacy-modal-title">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></div>{children}</section></div>;
}

function FormFooter({ saving, onClose, submitLabel, disabled = false }: { saving: boolean; onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="pharmacy-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={disabled}>{submitLabel}</Button></div>;
}

export default PharmacyInventoryPage;

function DispenseHistory({ onClose }: { onClose: () => void }) {
  const [patientId, setPatientId] = useState('');
  const [rows, setRows] = useState<DispenseRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const search = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { setRows(await pharmacyApi.listDispenses(Number(patientId))); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load dispense history')); }
    finally { setLoading(false); }
  };
  return <ModalShell title="Dispense history" eyebrow="PATIENT FULFILLMENT" onClose={onClose}><form className="pharmacy-form" onSubmit={(event) => void search(event)}><div className="pharmacy-form__grid"><PharmacyPatientPicker patientId={patientId} onSelect={(id) => { setPatientId(id); setRows([]); }} /><Button type="submit" loading={loading} disabled={!patientId}>Search</Button></div></form>{error && <Alert tone="error">{error}</Alert>}<div className="pharmacy-form">{rows.length ? rows.map((row) => <p key={row.id}><strong>{row.batch?.medication?.brandName || 'Medication'}</strong> · {Math.abs(row.quantity)} units · Batch {row.batch?.batchNumber || '—'} · {row.prescription ? `Prescription #${row.prescription.id}` : 'General stock issue'} · {new Date(row.createdAt).toLocaleString()} · {row.createdBy?.fullName || 'Staff'}</p>) : <p>No dispense records loaded.</p>}</div></ModalShell>;
}
