import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medication } from './Medication.js';
import { PurchaseOrder } from './PurchaseOrder.js';

@Entity({ name: 'purchase_order_items' })
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'purchase_order_id', type: 'int', unsigned: true }) purchaseOrderId!: number;
  @ManyToOne(() => PurchaseOrder, (order) => order.items, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'purchase_order_id' }) order!: PurchaseOrder;
  @Column({ name: 'medication_id', type: 'int', unsigned: true }) medicationId!: number;
  @ManyToOne(() => Medication, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'medication_id' }) medication!: Medication;
  @Column({ type: 'int', unsigned: true }) quantity!: number;
  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 }) unitPrice!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) total!: string;
  @Column({ name: 'received_quantity', type: 'int', unsigned: true, default: 0 }) receivedQuantity!: number;
}
