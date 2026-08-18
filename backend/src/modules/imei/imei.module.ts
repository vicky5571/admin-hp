import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoodsReceipt } from '../inventory/entities/goods-receipt.entity';
import { Return } from '../sales/entities/return.entity';
import { Sale } from '../sales/entities/sale.entity';
import { ImeiUnit } from './entities/imei-unit.entity';
import { ImeiController } from './imei.controller';
import { ImeiService } from './imei.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImeiUnit, Sale, Return, GoodsReceipt]),
  ],
  controllers: [ImeiController],
  providers: [ImeiService],
  exports: [ImeiService],
})
export class ImeiModule {}
