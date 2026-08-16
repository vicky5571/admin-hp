import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';

@Entity('goods_receipt_item_imeis')
export class GoodsReceiptItemImei {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'goods_receipt_item_id', type: 'bigint' })
  goodsReceiptItemId: number;

  @Column({ name: 'imei_unit_id', type: 'bigint' })
  imeiUnitId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => GoodsReceiptItem, (item) => item.imeis)
  @JoinColumn({ name: 'goods_receipt_item_id' })
  goodsReceiptItem: GoodsReceiptItem;

  @ManyToOne(() => ImeiUnit)
  @JoinColumn({ name: 'imei_unit_id' })
  imeiUnit: ImeiUnit;
}
