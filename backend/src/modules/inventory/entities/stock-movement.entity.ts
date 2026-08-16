import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MovementType } from '../../../common/enums/movement-type.enum';
import { Product } from '../../catalog/entities/product.entity';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { User } from '../../users/entities/user.entity';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @CreateDateColumn({ name: 'movement_time' })
  movementTime: Date;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @Column({ name: 'imei_unit_id', type: 'bigint', nullable: true })
  imeiUnitId: number | null;

  @Column({ name: 'movement_type', type: 'varchar', length: 20 })
  movementType: MovementType;

  @Column({ type: 'int' })
  qty: number;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 14, scale: 2, nullable: true })
  unitCost: string | null;

  @Column({ name: 'ref_type', type: 'varchar', length: 30 })
  refType: string;

  @Column({ name: 'ref_id', type: 'bigint' })
  refId: number;

  @Column({ name: 'reason_code', type: 'varchar', length: 30, nullable: true })
  reasonCode: string | null;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ImeiUnit)
  @JoinColumn({ name: 'imei_unit_id' })
  imeiUnit: ImeiUnit | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
