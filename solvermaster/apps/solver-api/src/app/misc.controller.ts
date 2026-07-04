import { Controller, Get } from '@nestjs/common';
import { MethodRegistry } from './domain/methods';

/** Root index, health, and method listing. */
@Controller()
export class MiscController {
  constructor(private readonly registry: MethodRegistry) {}

  @Get()
  index() {
    return {
      service: 'solver-api',
      endpoints: ['GET /health', 'GET /methods', 'POST /runs', 'GET /runs/:id'],
    };
  }

  @Get('health')
  health() {
    return { status: 'ok', methods: this.registry.available() };
  }

  @Get('methods')
  methods() {
    return { methods: this.registry.available() };
  }
}
