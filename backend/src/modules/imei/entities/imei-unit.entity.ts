import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ImeiStatus } from '../../../common/enums/imei-status.enum';
import { Product } from '../../catalog/entities/product.entity';

@Entity('imei_units')
export class ImeiUnit {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  imei: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @Column({ type: 'varchar', length: 20 })
  status: ImeiStatus;

  @Column({ name: 'current_location', type: 'varchar', length: 30, default: 'STORE' })
  currentLocation: string;

  @Column({ name: 'last_ref_type', type: 'varchar', length: 30, nullable: true })
  lastRefType: string | null;

  @Column({ name: 'last_ref_id', type: 'bigint', nullable: true })
  lastRefId: number | null;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
