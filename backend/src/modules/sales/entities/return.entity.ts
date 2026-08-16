import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { ReturnStatus } from '../../../common/enums/return-status.enum';
import { User } from '../../users/entities/user.entity';
import { Sale } from './sale.entity';
import { ReturnItem } from './return-item.entity';

@Entity('returns')
export class Return {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'return_number', type: 'varchar', length: 40, unique: true })
  returnNumber: string;

  @Column({ name: 'sale_id', type: 'bigint' })
  saleId: number;

  @Column({ name: 'processed_by', type: 'bigint' })
  processedBy: number;

  @Column({ name: 'return_time', type: 'timestamp' })
  returnTime: Date;

  @Column({ name: 'refund_total', type: 'numeric', precision: 14, scale: 2 })
  refundTotal: string;

  @Column({ name: 'refund_method', type: 'varchar', length: 20 })
  refundMethod: RefundMethod;

  @Column({ type: 'varchar', length: 20 })
  status: ReturnStatus;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Sale)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'processed_by' })
  processor: User;

  @OneToMany(() => ReturnItem, (item) => item.ret, {
    cascade: true,
    eager: true,
  })
  items: ReturnItem[];
}
