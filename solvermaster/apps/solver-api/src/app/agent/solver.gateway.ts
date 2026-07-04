/**
 * Socket.io gateway: the single FE↔BE channel for the agent-driven flow.
 *
 * Flow: FE emits `solve:start` (once, on the first "Dalej") → we start the agent
 * fire-and-forget and immediately ack the sessionId. As the agent calls its
 * `show_*` tools we relay `ui:show` directives; the FE navigates + renders.
 */
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import type { Socket } from 'socket.io';
import { AgentRunnerService } from './agent-runner.service';
import { SOCKET_EVENTS, SolveStartPayload } from './contract';

@WebSocketGateway({ cors: { origin: '*' } })
export class SolverGateway {
  private readonly log = new Logger('SolverGateway');

  constructor(private readonly runner: AgentRunnerService) {}

  @SubscribeMessage(SOCKET_EVENTS.solveStart)
  handleSolveStart(
    @MessageBody() body: SolveStartPayload,
    @ConnectedSocket() client: Socket,
  ): { ok: boolean; sessionId?: string; error?: string } {
    const statement = (body?.statement ?? '').trim();
    const sessionId = body?.sessionId || randomUUID().replace(/-/g, '').slice(0, 12);

    if (!statement) {
      client.emit(SOCKET_EVENTS.solveError, { sessionId, message: 'statement is required' });
      return { ok: false, error: 'statement is required' };
    }

    this.log.log(`solve:start · session=${sessionId} · client=${client.id}`);

    this.runner.run({
      sessionId,
      problem: { statement, title: body?.title },
      emit: (directive) => client.emit(SOCKET_EVENTS.uiShow, directive),
      onDone: (session) => client.emit(SOCKET_EVENTS.solveDone, { sessionId, session }),
      onError: (message) => client.emit(SOCKET_EVENTS.solveError, { sessionId, message }),
    });

    return { ok: true, sessionId };
  }
}
