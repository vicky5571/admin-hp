import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { SaleItem } from './sale-item.entity';

@Entity('sale_item_imeis')
export class SaleItemImei {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'sale_item_id', type: 'bigint' })
  saleItemId: number;

  @Column({ name: 'imei_unit_id', type: 'bigint' })
  imeiUnitId: number;

  @ManyToOne(() => SaleItem, (item) => item.imeis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_item_id' })
  saleItem: SaleItem;

  @ManyToOne(() => ImeiUnit)
  @JoinColumn({ name: 'imei_unit_id' })
  imeiUnit: ImeiUnit;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
