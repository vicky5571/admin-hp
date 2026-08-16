import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tax_classes')
export class TaxClass {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ name: 'rate_percent', type: 'numeric', precision: 5, scale: 2 })
  ratePercent: string;

  @Column({ name: 'is_inclusive', type: 'boolean', default: false })
  isInclusive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
