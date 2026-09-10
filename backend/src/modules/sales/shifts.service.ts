import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RoleName } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/types/auth-user.type';
import { paginateMeta } from '../../common/utils/pagination.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CashMovement, CashMovementType } from './entities/cash-movement.entity';
import { CashierShift, ShiftStatus } from './entities/cashier-shift.entity';
import { Payment } from './entities/payment.entity';
import { Sale } from './entities/sale.entity';
import {
  CashMovementDto,
  CloseShiftDto,
  ListShiftsQueryDto,
  OpenShiftDto,
} from './dto/shift.dto';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(CashierShift)
    private readonly shiftRepo: Repository<CashierShift>,
    @InjectRepository(CashMovement)
    private readonly movementRepo: Repository<CashMovement>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getActiveShift(userId: number): Promise<CashierShift | null> {
    return this.shiftRepo.findOne({
      where: { userId, status: ShiftStatus.OPEN },
      relations: ['user', 'movements'],
      order: { openedAt: 'DESC' },
    });
  }

  async openShift(user: AuthUser, dto: OpenShiftDto): Promise<CashierShift> {
    const existing = await this.getActiveShift(user.id);
    if (existing) {
      throw new ConflictException(
        'An open shift already exists for this cashier. Please close it before opening a new one.',
      );
    }

    const openingBalance = dto.openingBalance ?? 0;
    const shift = this.shiftRepo.create({
      userId: user.id,
      registerName: dto.registerName || 'Register 1',
      status: ShiftStatus.OPEN,
      openedAt: new Date(),
      openingBalance: openingBalance.toFixed(2),
      totalCashSales: '0.00',
      totalCashRefunds: '0.00',
      totalCashIn: '0.00',
      totalCashOut: '0.00',
      expectedEndingCash: openingBalance.toFixed(2),
      notes: dto.notes ?? null,
    });

    const saved = await this.shiftRepo.save(shift);

    await this.auditLogsService.log({
      userId: user.id,
      action: 'SHIFT_OPENED',
      entityType: 'CASHIER_SHIFT',
      entityId: Number(saved.id),
      metadataJson: {
        registerName: saved.registerName,
        openingBalance,
      },
    });

    return saved;
  }

  async recordCashMovement(
    user: AuthUser,
    dto: CashMovementDto,
  ): Promise<CashMovement> {
    const shift = await this.getActiveShift(user.id);
    if (!shift) {
      throw new BadRequestException(
        'No active open shift found for this cashier. Please open a shift first.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const movement = manager.create(CashMovement, {
        shiftId: shift.id,
        userId: user.id,
        movementType: dto.movementType,
        amount: dto.amount.toFixed(2),
        reason: dto.reason,
      });

      const savedMovement = await manager.save(CashMovement, movement);

      // Recalculate totals
      await this.syncShiftTotals(shift.id, manager);

      await this.auditLogsService.log({
        userId: user.id,
        action:
          dto.movementType === CashMovementType.CASH_IN
            ? 'SHIFT_CASH_IN'
            : 'SHIFT_CASH_OUT',
        entityType: 'CASH_MOVEMENT',
        entityId: Number(savedMovement.id),
        metadataJson: {
          shiftId: shift.id,
          amount: dto.amount,
          reason: dto.reason,
        },
      });

      return savedMovement;
    });
  }

  async closeShift(user: AuthUser, dto: CloseShiftDto): Promise<CashierShift> {
    const shift = await this.getActiveShift(user.id);
    if (!shift) {
      throw new BadRequestException('No active open shift found to close.');
    }

    return this.dataSource.transaction(async (manager) => {
      const calculated = await this.calculateShiftTotals(shift.id, manager);

      const actualEndingCash = dto.actualEndingCash;
      const expectedEndingCash = parseFloat(calculated.expectedEndingCash);
      const cashDifference = actualEndingCash - expectedEndingCash;

      shift.status = ShiftStatus.CLOSED;
      shift.closedAt = new Date();
      shift.totalCashSales = calculated.totalCashSales;
      shift.totalCashRefunds = calculated.totalCashRefunds;
      shift.totalCashIn = calculated.totalCashIn;
      shift.totalCashOut = calculated.totalCashOut;
      shift.expectedEndingCash = calculated.expectedEndingCash;
      shift.actualEndingCash = actualEndingCash.toFixed(2);
      shift.cashDifference = cashDifference.toFixed(2);
      if (dto.notes) {
        shift.notes = shift.notes
          ? `${shift.notes}\nClose Note: ${dto.notes}`
          : `Close Note: ${dto.notes}`;
      }

      const closed = await manager.save(CashierShift, shift);

      await this.auditLogsService.log({
        userId: user.id,
        action: 'SHIFT_CLOSED',
        entityType: 'CASHIER_SHIFT',
        entityId: Number(closed.id),
        metadataJson: {
          registerName: closed.registerName,
          openingBalance: closed.openingBalance,
          expectedEndingCash: closed.expectedEndingCash,
          actualEndingCash: closed.actualEndingCash,
          cashDifference: closed.cashDifference,
        },
      });

      return closed;
    });
  }

  async calculateShiftTotals(
    shiftId: number,
    manager?: import('typeorm').EntityManager,
  ) {
    const mgr = manager ?? this.dataSource.manager;

    const shift = await mgr.findOne(CashierShift, {
      where: { id: shiftId },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const openingBalance = parseFloat(shift.openingBalance) || 0;

    // 1. Cash sales in this shift
    const cashSalesRaw = await mgr
      .createQueryBuilder(Payment, 'p')
      .innerJoin('p.sale', 's')
      .where('s.shiftId = :shiftId', { shiftId })
      .andWhere("s.status != 'VOIDED'")
      .andWhere("p.method = 'CASH'")
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .getRawOne();

    const totalCashSales = parseFloat(cashSalesRaw?.total || '0');

    // 2. Cash movements
    const movements = await mgr.find(CashMovement, {
      where: { shiftId },
    });

    let totalCashIn = 0;
    let totalCashOut = 0;
    for (const m of movements) {
      const amt = parseFloat(m.amount) || 0;
      if (m.movementType === CashMovementType.CASH_IN) {
        totalCashIn += amt;
      } else {
        totalCashOut += amt;
      }
    }

    const totalCashRefunds = 0; // extensible for direct cash refunds
    const expectedEndingCash =
      openingBalance + totalCashSales + totalCashIn - totalCashOut - totalCashRefunds;

    return {
      openingBalance: openingBalance.toFixed(2),
      totalCashSales: totalCashSales.toFixed(2),
      totalCashRefunds: totalCashRefunds.toFixed(2),
      totalCashIn: totalCashIn.toFixed(2),
      totalCashOut: totalCashOut.toFixed(2),
      expectedEndingCash: expectedEndingCash.toFixed(2),
    };
  }

  async syncShiftTotals(
    shiftId: number,
    manager?: import('typeorm').EntityManager,
  ) {
    const mgr = manager ?? this.dataSource.manager;
    const totals = await this.calculateShiftTotals(shiftId, mgr);
    await mgr.update(CashierShift, { id: shiftId }, {
      totalCashSales: totals.totalCashSales,
      totalCashRefunds: totals.totalCashRefunds,
      totalCashIn: totals.totalCashIn,
      totalCashOut: totals.totalCashOut,
      expectedEndingCash: totals.expectedEndingCash,
    });
  }

  async generateShiftReport(shiftId: number, user?: AuthUser) {
    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId },
      relations: ['user', 'movements', 'sales', 'sales.payments'],
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (
      user &&
      user.role === RoleName.CASHIER &&
      Number(shift.userId) !== Number(user.id)
    ) {
      throw new ForbiddenException(
        'Cashiers can only access their own shift reports',
      );
    }

    const calculated = await this.calculateShiftTotals(shiftId);

    // Payments by method breakdown
    const paymentBreakdownRaw = await this.dataSource
      .createQueryBuilder(Payment, 'p')
      .innerJoin('p.sale', 's')
      .where('s.shiftId = :shiftId', { shiftId })
      .andWhere("s.status != 'VOIDED'")
      .select('p.method', 'method')
      .addSelect('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'total')
      .groupBy('p.method')
      .getRawMany();

    const paymentBreakdown = paymentBreakdownRaw.map((r) => ({
      method: r.method,
      count: parseInt(r.count, 10),
      total: parseFloat(r.total || '0').toFixed(2),
    }));

    // Sales summary
    const salesCount = shift.sales?.filter((s) => s.status !== 'VOIDED').length || 0;
    const grossSales = shift.sales
      ?.filter((s) => s.status !== 'VOIDED')
      .reduce((sum, s) => sum + (parseFloat(s.grandTotal) || 0), 0) || 0;
    const totalDiscounts = shift.sales
      ?.filter((s) => s.status !== 'VOIDED')
      .reduce((sum, s) => sum + (parseFloat(s.discountTotal) || 0), 0) || 0;
    const totalTax = shift.sales
      ?.filter((s) => s.status !== 'VOIDED')
      .reduce((sum, s) => sum + (parseFloat(s.taxTotal) || 0), 0) || 0;

    return {
      shift: {
        id: shift.id,
        registerName: shift.registerName,
        status: shift.status,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        cashier: shift.user ? { id: shift.user.id, fullName: shift.user.fullName, username: shift.user.username } : null,
        notes: shift.notes,
      },
      cashSummary: {
        openingBalance: shift.openingBalance,
        totalCashSales: calculated.totalCashSales,
        totalCashRefunds: calculated.totalCashRefunds,
        totalCashIn: calculated.totalCashIn,
        totalCashOut: calculated.totalCashOut,
        expectedEndingCash: calculated.expectedEndingCash,
        actualEndingCash: shift.actualEndingCash,
        cashDifference: shift.cashDifference,
      },
      salesSummary: {
        totalTransactions: salesCount,
        grossSales: grossSales.toFixed(2),
        totalDiscounts: totalDiscounts.toFixed(2),
        totalTax: totalTax.toFixed(2),
      },
      paymentBreakdown,
      movements: shift.movements?.map((m) => ({
        id: m.id,
        movementType: m.movementType,
        amount: m.amount,
        reason: m.reason,
        createdAt: m.createdAt,
      })),
      reportType: shift.status === ShiftStatus.CLOSED ? 'Z_REPORT' : 'X_REPORT',
    };
  }

  async findAll(query: ListShiftsQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const qb = this.shiftRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('s.movements', 'm')
      .orderBy('s.openedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.userId) {
      qb.andWhere('s.userId = :userId', { userId: query.userId });
    }
    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      meta: paginateMeta(total, page, limit),
    };
  }
}
