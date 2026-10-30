import type { Socket } from 'socket.io-client';

export type OrderScope = { kind: 'staff' } | { kind: 'bill'; token: string };
export interface OrderSubscription {
  close(): void;
  retry(): void;
}

// Load the socket client only when there is an actual order to follow.
export function openOrderSocket(
  scope: OrderScope,
  refresh: () => void,
  connection: (connected: boolean) => void,
): OrderSubscription {
  let socket: Socket | undefined;
  let closed = false,
    importing = false;
  const retry = () => {
    if (closed || importing) return;
    if (socket) {
      if (!socket.connected && !socket.active) socket.connect();
      return;
    }
    importing = true;
    void import('socket.io-client')
      .then(({ io }) => {
        if (closed) return;
        socket = io({
          path: '/api/socket.io',
          transports: ['websocket'],
          withCredentials: true,
          autoConnect: false,
          auth: scope,
          reconnection: true,
        });
        socket.on('connect', () => {
          connection(true);
          refresh();
        });
        socket.on('disconnect', () => {
          connection(false);
          if (!closed) refresh();
        });
        socket.on('connect_error', () => connection(false));
        socket.on('orders:changed', refresh);
        socket.on('orders:idle', refresh);
        socket.connect();
      })
      .catch(() => connection(false))
      .finally(() => {
        importing = false;
      });
  };
  retry();
  return {
    retry,
    close() {
      closed = true;
      socket?.removeAllListeners();
      socket?.disconnect();
      connection(false);
    },
  };
}
