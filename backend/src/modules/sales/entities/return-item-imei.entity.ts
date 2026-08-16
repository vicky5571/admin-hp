import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { ReturnItem } from './return-item.entity';

@Entity('return_item_imeis')
export class ReturnItemImei {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'return_item_id', type: 'bigint' })
  returnItemId: number;

  @Column({ name: 'imei_unit_id', type: 'bigint' })
  imeiUnitId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ReturnItem, (item) => item.imeis)
  @JoinColumn({ name: 'return_item_id' })
  returnItem: ReturnItem;

  @ManyToOne(() => ImeiUnit)
  @JoinColumn({ name: 'imei_unit_id' })
  imeiUnit: ImeiUnit;
}
