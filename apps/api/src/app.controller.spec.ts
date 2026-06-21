import { describe, it, expect } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  const controller = new AppController(new AppService());

  it('returns ok from public health endpoint', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
