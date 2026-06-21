import type { PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Global validation pipe for GraphQL mutation inputs.
 * Validates all input DTOs decorated with class-validator decorators.
 *
 * Transforms plain objects to class instances, runs validation,
 * and returns structured errors with field paths.
 *
 * Requirements: 23.5, 23.6
 */
@Injectable()
export class GraphQLValidationPipe implements PipeTransform {
  async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    if (!metatype || !this.shouldValidate(metatype)) {
      return value;
    }

    // Skip validation for null/undefined nullable args
    if (value === undefined || value === null) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
    });

    if (errors.length > 0) {
      const formattedErrors = errors.map((error) => {
        const constraints = error.constraints ?? {};
        const messages = Object.values(constraints);
        return {
          field: error.property,
          message: messages[0] ?? 'Invalid value',
        };
      });

      throw new BadRequestException({
        message: 'Input validation failed',
        code: 'VALIDATION_ERROR',
        field: formattedErrors[0]?.field,
        details: formattedErrors.map((e) => `${e.field}: ${e.message}`).join('; '),
      });
    }

    return value;
  }

  /**
   * Determine if the metatype should be validated.
   * Skip primitives and built-in types.
   */
  private shouldValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: Array<new (...args: unknown[]) => unknown> = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }
}
