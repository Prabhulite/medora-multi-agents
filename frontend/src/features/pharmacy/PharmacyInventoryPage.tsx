import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { pharmacyApi, type DispenseRecord, type DispenseStockPayload, type InventoryBatch, type PharmacyPatientCandidate, type ReceiveStockPayload, type StockMovement } from './pharmacy.api';
import './PharmacyInventoryPage.css';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function dateLabel(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function daysToExpiry(value: string) {
  const today = new Date();
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

function stockTone(row: InventoryBatch): 'success' | 'warning' | 'danger' {
  if (daysToExpiry(row.expiryDate) < 0 || row.quantity === 0) return 'danger';
  if (row.quantity <= row.reorderLevel) return 'danger';
  if (daysToExpiry(row.expiryDate) <= 90) return 'warning';
  return 'success';
}

export function PharmacyInventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const alertFilter = ['low-stock', 'expired-stock', 'expiring-stock'].includes(searchParams.get('alert') ?? '') ? searchParams.get('alert') : null;
  const { user } = useAuth();
  const canReceive = hasPermission(user, 'pharmacy.inventory.create');
  const canDispense = hasPermission(user, 'pharmacy.inventory.update');
  const canAdjust = hasPermission(user, 'pharmacy.inventory.adjust');
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<'receive' | 'dispense' | 'history' | 'adjust' | 'movements' | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatch | null>(null);

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
    lowStock: inventory.filter((row) => daysToExpiry(row.expiryDate) >= 0 && row.quantity <= row.reorderLevel).length,
    expired: inventory.filter((row) => row.quantity > 0 && daysToExpiry(row.expiryDate) < 0).length,
    expiring: inventory.filter((row) => row.quantity > 0 && daysToExpiry(row.expiryDate) >= 0 && daysToExpiry(row.expiryDate) <= 90).length,
  }), [inventory]);
  const visibleInventory = useMemo(() => inventory.filter((row) => {
    const remaining = daysToExpiry(row.expiryDate);
    if (alertFilter === 'low-stock') return remaining >= 0 && row.quantity <= row.reorderLevel;
    if (alertFilter === 'expired-stock') return remaining < 0 && row.quantity > 0;
    if (alertFilter === 'expiring-stock') return remaining >= 0 && remaining <= 90 && row.quantity > 0;
    return true;
  }), [inventory, alertFilter]);
  const chooseAlert = (alert: string | null) => setSearchParams(alert ? { alert } : {});

  const columns = useMemo<TableColumn<InventoryBatch>[]>(() => [
    { key: 'medication', header: 'Medication', render: (row) => <div><div className="ui-table__cell-title">{row.medicationName}</div><div className="ui-table__cell-sub">{row.medicationCode || 'Medication'} · Batch {row.batchNumber}</div></div> },
    { key: 'expiry', header: 'Expiry', render: (row) => <div><div>{dateLabel(row.expiryDate)}</div><div className="ui-table__cell-sub">{daysToExpiry(row.expiryDate) < 0 ? 'Expired' : `${daysToExpiry(row.expiryDate)} days remaining`}</div></div> },
    { key: 'quantity', header: 'On hand', render: (row) => <div><strong>{row.quantity}</strong><div className="ui-table__cell-sub">Reorder at {row.reorderLevel}</div></div> },
    { key: 'pricing', header: 'Price', render: (row) => <div><div>{currency.format(row.sellingPrice)}</div><div className="ui-table__cell-sub">Cost {currency.format(row.purchasePrice)}</div></div> },
    { key: 'location', header: 'Location', render: (row) => row.storageLocation || 'Not assigned' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={stockTone(row)}>{daysToExpiry(row.expiryDate) < 0 ? 'Expired' : row.quantity === 0 ? 'Out of stock' : row.quantity <= row.reorderLevel ? 'Low stock' : daysToExpiry(row.expiryDate) <= 90 ? 'Review soon' : 'In stock'}</Badge> },
    { key: 'actions', header: 'Actions', render: (row) => <div className="pharmacy-actions"><Button size="sm" variant="secondary" onClick={() => { setSelectedBatch(row); setModal('movements'); }}>Movements</Button>{canAdjust && <Button size="sm" variant="secondary" onClick={() => { setSelectedBatch(row); setModal('adjust'); }}>Adjust count</Button>}</div> },
  ], [canAdjust]);

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
  const saveAdjustment = async (countedQuantity: number, reason: string) => {
    if (!selectedBatch) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await pharmacyApi.adjustStock(selectedBatch.id, selectedBatch.quantity, countedQuantity, reason);
      setModal(null); setSelectedBatch(null); setNotice(`Stock count adjusted by ${result.difference > 0 ? '+' : ''}${result.difference} units.`); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to adjust stock count')); }
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
      <article className="pharmacy-kpi--red"><span>Expired stock</span><strong>{summary.expired}</strong><small>Expired batches with stock</small></article><article className="pharmacy-kpi--amber"><span>Expiry watch</span><strong>{summary.expiring}</strong><small>Usable batches expiring within 90 days</small></article>
    </div>
    <section className="pharmacy-section">
      <div className="pharmacy-section__heading"><div><span className="pharmacy-eyebrow">STOCK CONTROL</span><h2>Inventory batches</h2><p>Use FEFO handling: issue medicines with the nearest expiry first.</p></div></div>
      <div className="pharmacy-alert-filters" role="group" aria-label="Filter inventory by stock alert">{([['All batches', null], ['Low stock', 'low-stock'], ['Expired stock', 'expired-stock'], ['Expiry watch', 'expiring-stock']] as const).map(([label, value]) => <button key={label} type="button" className={alertFilter === value ? 'is-active' : ''} aria-pressed={alertFilter === value} onClick={() => chooseAlert(value)}>{label}</button>)}</div>
      <Table columns={columns} rows={visibleInventory} rowKey={(row) => row.id} loading={loading} onRefresh={() => void load()} searchText={(row) => `${row.medicationName} ${row.medicationCode} ${row.batchNumber} ${row.storageLocation || ''}`} searchPlaceholder="Search medicine, batch, or location" emptyMessage={alertFilter ? 'No batches match this stock alert.' : 'No inventory batches found. Receive stock to start tracking medicines.'} />
    </section>
    {modal === 'receive' && canReceive ? <ReceiveStockForm saving={saving} onClose={() => setModal(null)} onSubmit={(payload) => void saveReceipt(payload)} /> : null}
    {modal === 'dispense' && canDispense ? <DispenseStockForm inventory={inventory} saving={saving} onClose={() => setModal(null)} onSubmit={(payload) => void saveDispense(payload)} /> : null}
    {modal === 'history' ? <DispenseHistory onClose={() => setModal(null)} /> : null}
    {modal === 'adjust' && selectedBatch && canAdjust ? <AdjustStockForm batch={selectedBatch} saving={saving} error={error} onClose={() => setModal(null)} onSubmit={(count, reason) => void saveAdjustment(count, reason)} /> : null}
    {modal === 'movements' && selectedBatch ? <StockMovements batch={selectedBatch} onClose={() => setModal(null)} /> : null}
  </div>;
}

function AdjustStockForm({ batch, saving, error, onClose, onSubmit }: { batch: InventoryBatch; saving: boolean; error: string; onClose: () => void; onSubmit: (countedQuantity: number, reason: string) => void }) {
  const [count, setCount] = useState(String(batch.quantity));
  const [reason, setReason] = useState('');
  const difference = Number(count) - batch.quantity;
  return <ModalShell title={`Adjust count · ${batch.medicationName}`} eyebrow={`BATCH ${batch.batchNumber}`} onClose={onClose}><form className="pharmacy-form" onSubmit={(event) => { event.preventDefault(); onSubmit(Number(count), reason.trim()); }}><p>Current stock: <strong>{batch.quantity} units</strong>. Enter the quantity physically counted. The difference will be recorded in the stock ledger.</p><Input label="Counted quantity" type="number" min="0" max="1000000" required value={count} onChange={(event) => setCount(event.target.value)} /><p className="pharmacy-count-difference">Adjustment: {Number.isFinite(difference) && count !== '' ? `${difference > 0 ? '+' : ''}${difference} units` : 'Enter a count'}</p><Input label="Reason for adjustment" required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Physical count variance, damaged stock, or correction" />{error && <Alert tone="error">{error}</Alert>}<FormFooter saving={saving} onClose={onClose} submitLabel="Record adjustment" disabled={count === '' || !Number.isInteger(Number(count)) || Number(count) < 0 || difference === 0 || reason.trim().length < 5} /></form></ModalShell>;
}

function StockMovements({ batch, onClose }: { batch: InventoryBatch; onClose: () => void }) {
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void pharmacyApi.movements(batch.id, page).then((result) => { if (active) { setRows(result.items); setTotal(result.total); } }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load stock movements')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [batch.id, page]);
  return <ModalShell title={`Stock movements · ${batch.medicationName}`} eyebrow={`BATCH ${batch.batchNumber}`} onClose={onClose}><div className="pharmacy-form"><p>Current stock: <strong>{batch.quantity} units</strong>. Showing {total} recorded movements.</p>{error && <Alert tone="error">{error}</Alert>}{loading ? <p>Loading movements…</p> : rows.length ? <div className="pharmacy-movements">{rows.map((row) => <article key={row.id}><strong>{row.type} · {row.quantity > 0 ? '+' : ''}{row.quantity} units</strong><span>{new Date(row.createdAt).toLocaleString('en-IN')} · {row.createdByName || 'Former staff'}</span>{row.reference && <span>Reference: {row.reference}</span>}{row.notes && <span>Reason / notes: {row.notes}</span>}{row.fefoOverrideReason && <span>FEFO exception: {row.fefoOverrideReason}</span>}</article>)}</div> : <p>No movements recorded.</p>}<div className="pharmacy-modal__footer"><Button type="button" variant="secondary" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {Math.max(1, Math.ceil(total / 25))}</span><Button type="button" variant="secondary" disabled={loading || page * 25 >= total} onClick={() => setPage(page + 1)}>Next</Button><Button type="button" onClick={onClose}>Close</Button></div></div></ModalShell>;
}

function ReceiveStockForm({ saving, onClose, onSubmit }: { saving: boolean; onClose: () => void; onSubmit: (payload: ReceiveStockPayload) => void }) {
  const [form, setForm] = useState({ medicationId: '', batchNumber: '', expiryDate: '', purchasePrice: '', sellingPrice: '', quantity: '', reorderLevel: '10', storageLocation: '', reference: '' });
  const [medications, setMedications] = useState<Awaited<ReturnType<typeof prescriptionsApi.listMedications>>>([]);
  const [catalogError, setCatalogError] = useState('');
  useEffect(() => {
    let active = true;
    void prescriptionsApi.listMedications().then((rows) => { if (active) setMedications(rows); }).catch((err) => { if (active) setCatalogError(getErrorMessage(err, 'Unable to load medication catalog')); });
    return () => { active = false; };
  }, []);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title="Receive stock" eyebrow="NEW STOCK RECEIPT" onClose={onClose}><form className="pharmacy-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ medicationId: Number(form.medicationId), batchNumber: form.batchNumber, expiryDate: form.expiryDate, purchasePrice: Number(form.purchasePrice), sellingPrice: Number(form.sellingPrice), quantity: Number(form.quantity), reorderLevel: Number(form.reorderLevel), storageLocation: form.storageLocation || null, reference: form.reference || null }); }}><div className="pharmacy-form__grid"><Select label="Catalog medication" required value={form.medicationId} onChange={(event) => update('medicationId', event.target.value)} options={[{ value: '', label: medications.length ? 'Select a medication' : 'No active medications available' }, ...medications.map((medication) => ({ value: medication.id, label: `${medication.brandName} ? ${medication.genericName} ? ${medication.medicineCode}` }))]} /><Input label="Batch number" required value={form.batchNumber} onChange={(event) => update('batchNumber', event.target.value)} placeholder="e.g. PARA-2026-A" /><Input label="Expiry date" type="date" required value={form.expiryDate} onChange={(event) => update('expiryDate', event.target.value)} /><Input label="Quantity received" type="number" min="1" required value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /><Input label="Purchase price" type="number" min="0" step="0.01" required value={form.purchasePrice} onChange={(event) => update('purchasePrice', event.target.value)} /><Input label="Selling price" type="number" min="0" step="0.01" required value={form.sellingPrice} onChange={(event) => update('sellingPrice', event.target.value)} /><Input label="Reorder level" type="number" min="0" value={form.reorderLevel} onChange={(event) => update('reorderLevel', event.target.value)} /><Input label="Storage location" value={form.storageLocation} onChange={(event) => update('storageLocation', event.target.value)} placeholder="Main pharmacy · Shelf A" /></div><Input label="Reference" value={form.reference} onChange={(event) => update('reference', event.target.value)} placeholder="Supplier invoice or GRN number" />{catalogError && <Alert tone="error">{catalogError}</Alert>}<FormFooter saving={saving} onClose={onClose} submitLabel="Receive stock" disabled={!medications.length || !form.medicationId} /></form></ModalShell>;
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
  const [form, setForm] = useState({ batchId: '', quantity: '', patientId: '', prescriptionId: '', reference: '', fefoOverrideReason: '' });
  useEffect(() => {
    if (!form.patientId || !Number.isInteger(Number(form.patientId)) || Number(form.patientId) < 1) { setPrescriptions([]); return; }
    let active = true;
    prescriptionsApi.listByPatient(Number(form.patientId)).then((rows) => { if (active) setPrescriptions(rows.filter((row) => row.status === 'active' && !!row.medicationId && !!row.quantityPrescribed)); }).catch((err) => { if (active) setLookupError(getErrorMessage(err, 'Unable to load prescriptions')); });
    return () => { active = false; };
  }, [form.patientId]);
  const selectedPrescription = prescriptions.find((row) => String(row.id) === form.prescriptionId);
  const sortedInventory = [...inventory].filter((row) => row.quantity > 0 && daysToExpiry(row.expiryDate) >= 0 && (!selectedPrescription || row.medicationId === selectedPrescription.medicationId)).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) || a.id - b.id);
  const selected = sortedInventory.find((row) => String(row.id) === form.batchId);
  const suggested = selected ? sortedInventory.find((row) => row.medicationId === selected.medicationId && row.quantity >= Math.max(1, Number(form.quantity) || 1)) : null;
  const needsFefoReason = !!selected && !!suggested && suggested.expiryDate < selected.expiryDate && Number(form.quantity) > 0 && Number(form.quantity) <= selected.quantity;
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === 'patientId' ? { prescriptionId: '', batchId: '' } : {}), ...(key === 'prescriptionId' ? { batchId: '' } : {}) }));
  return <ModalShell title="Dispense stock" eyebrow="PHARMACY ISSUE" onClose={onClose}>{lookupError && <Alert tone="error">{lookupError}</Alert>}<form className="pharmacy-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ batchId: Number(form.batchId), quantity: Number(form.quantity), patientId: form.patientId ? Number(form.patientId) : null, prescriptionId: form.prescriptionId ? Number(form.prescriptionId) : null, reference: form.reference || null, fefoOverrideReason: needsFefoReason ? form.fefoOverrideReason.trim() : null }); }}><div className="pharmacy-form__grid"><PharmacyPatientPicker patientId={form.patientId} onSelect={(id) => update('patientId', id)} optional /><Select label="Active catalog prescription" value={form.prescriptionId} onChange={(event) => update('prescriptionId', event.target.value)} options={[{ value: '', label: 'General stock issue' }, ...prescriptions.map((row) => ({ value: row.id, label: `${row.medicineName} · ${row.quantityPrescribed} units prescribed` }))]} /></div><Select label="Batch (FEFO order)" required value={form.batchId} onChange={(event) => update('batchId', event.target.value)} options={[{ value: '', label: sortedInventory.length ? 'Select a batch' : 'No matching stock available' }, ...sortedInventory.map((row) => ({ value: String(row.id), label: `${row.medicationName} · ${row.batchNumber} · ${row.quantity} units` }))]} /><div className="pharmacy-fefo-note" role="status"><strong>FEFO suggestion:</strong> {selected ? Number(form.quantity) > selected.quantity ? `Selected batch has only ${selected.quantity} units. Reduce the quantity or choose another batch.` : suggested && suggested.expiryDate < selected.expiryDate ? `Earlier eligible batch ${suggested.batchNumber} expires ${dateLabel(suggested.expiryDate)}. A reason is required to issue this later batch.` : `Selected batch ${selected.batchNumber} is the earliest eligible batch for this quantity (${dateLabel(selected.expiryDate)} expiry).` : 'Select a usable batch to see the earliest eligible stock.'}</div><div className="pharmacy-form__grid"><Input label="Quantity to dispense" type="number" min="1" max={selected?.quantity || undefined} required value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /><Input label="Reference" value={form.reference} onChange={(event) => update('reference', event.target.value)} placeholder="Dispensing note or issue number" /></div>{needsFefoReason && <Input label="Reason for FEFO exception" required minLength={5} maxLength={500} value={form.fefoOverrideReason} onChange={(event) => update("fefoOverrideReason", event.target.value)} placeholder="Why is the earlier batch unsuitable?" />}<FormFooter saving={saving} onClose={onClose} submitLabel="Dispense stock" disabled={!sortedInventory.length || (needsFefoReason && form.fefoOverrideReason.trim().length < 5)} /></form></ModalShell>;
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
