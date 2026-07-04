import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { SessionStore } from './session.store';
import { SessionState, UiDirective } from './models';

// solver-api socket origin. Override via window.SOLVER_WS.
const DEFAULT_SOLVER_API_ORIGIN = 'https://solver-api-66obdg3tha-ew.a.run.app';
const WS_BASE: string = (globalThis as any).SOLVER_WS ?? DEFAULT_SOLVER_API_ORIGIN;

const EVENTS = {
  solveStart: 'solve:start',
  uiShow: 'ui:show',
  solveDone: 'solve:done',
  solveError: 'solve:error',
} as const;

/**
 * Single FE↔BE channel. On the first "Dalej" the FE emits `solve:start`; the
 * agent then drives the UI via `ui:show` directives (which component/route to
 * render). The FE never blocks waiting for the agent to finish.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly store = inject(SessionStore);
  private socket: Socket | null = null;

  private connect(): Socket {
    if (this.socket) return this.socket;
    this.socket = io(WS_BASE, { transports: ['websocket', 'polling'] });

    this.socket.on(EVENTS.uiShow, (d: UiDirective) => this.store.applyDirective(d));
    this.socket.on(EVENTS.solveDone, (msg: { sessionId: string; session: SessionState }) =>
      this.store.applyDone(msg.session),
    );
    this.socket.on(EVENTS.solveError, (msg: { message: string }) =>
      this.store.setSocketError(msg?.message || 'agent failed'),
    );
    return this.socket;
  }

  /** Kick off the agent (fire-and-forget). */
  startSolve(problem: { title?: string; statement: string }): void {
    const socket = this.connect();
    this.store.beginSolve(problem);
    socket.emit(EVENTS.solveStart, problem);
  }
}
