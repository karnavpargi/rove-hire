import { Module } from '@nestjs/common';
import { StateMachineService } from './state-machine.service';

/**
 * StateMachineModule encapsulates the candidate pipeline state machine logic.
 * Depends on PrismaModule (globally available) for database access.
 *
 * Export StateMachineService so other modules (e.g., CandidateModule)
 * can delegate status transitions to it.
 */
@Module({
  providers: [StateMachineService],
  exports: [StateMachineService],
})
export class StateMachineModule {}
