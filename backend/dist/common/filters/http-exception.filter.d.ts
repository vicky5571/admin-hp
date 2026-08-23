import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
export declare class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): Response<any, Record<string, any>>;
    private mapCode;
}
