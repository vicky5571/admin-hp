import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const SETTING_VALIDATORS: Record<
  string,
  (value: string) => string | void
> = {
  CURRENCY_CODE: (v) => {
    if (v.length < 2 || v.length > 10) return 'CURRENCY_CODE must be 2–10 characters';
  },
  TAX_MODE: (v) => {
    if (!['EXCLUSIVE', 'INCLUSIVE', 'NONE'].includes(v))
      return 'TAX_MODE must be one of: EXCLUSIVE, INCLUSIVE, NONE';
  },
  TAX_DEFAULT_RATE: (v) => {
    const n = Number(v);
    if (isNaN(n) || n < 0 || n > 100)
      return 'TAX_DEFAULT_RATE must be a number between 0 and 100';
  },
  RECEIPT_PREFIX: (v) => {
    if (v.length < 1 || v.length > 20)
      return 'RECEIPT_PREFIX must be 1–20 characters';
  },
  RECEIPT_FOOTER: (v) => {
    if (v.length > 500) return 'RECEIPT_FOOTER must be at most 500 characters';
  },
  RETURN_WINDOW_DAYS: (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 365)
      return 'RETURN_WINDOW_DAYS must be an integer between 0 and 365';
  },
  MAX_DISCOUNT_PERCENT_CASHIER: (v) => {
    const n = Number(v);
    if (isNaN(n) || n < 0 || n > 100)
      return 'MAX_DISCOUNT_PERCENT_CASHIER must be a number between 0 and 100';
  },
  SESSION_TIMEOUT_MINUTES: (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 1440)
      return 'SESSION_TIMEOUT_MINUTES must be an integer between 1 and 1440';
  },
  STORE_NAME: (v) => {
    if (v.length < 1 || v.length > 160)
      return 'STORE_NAME must be 1–160 characters';
  },
  STORE_ADDRESS: (v) => {
    if (v.length > 500) return 'STORE_ADDRESS must be at most 500 characters';
  },
  STORE_PHONE: (v) => {
    if (v.length > 40) return 'STORE_PHONE must be at most 40 characters';
  },
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly repo: Repository<AppSetting>,
  ) {}

  async findAll(): Promise<Record<string, string>> {
    const rows = await this.repo.find({ order: { key: 'ASC' } });
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  async updateMany(
    dto: UpdateSettingsDto,
    userId: number,
  ): Promise<Record<string, string>> {
    const errors: string[] = [];

    for (const item of dto.settings) {
      const validator = SETTING_VALIDATORS[item.key];
      if (!validator) {
        errors.push(`Unknown setting key: ${item.key}`);
        continue;
      }
      const msg = validator(item.value);
      if (msg) {
        errors.push(msg);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    for (const item of dto.settings) {
      const existing = await this.repo.findOneBy({ key: item.key });
      if (!existing) {
        throw new NotFoundException(`Setting not found: ${item.key}`);
      }
      existing.value = item.value;
      existing.updatedBy = userId;
      await this.repo.save(existing);
    }

    return this.findAll();
  }
}
