import { useCallback, useMemo, useRef } from "react";
import * as config from "config";

export function useSocket(ticket: string) {
  const socket = useRef<null | WebSocket>(null);
  const initialized = useRef(false);
  const initialize = useCallback(() => {
    if (!socket.current && !initialized.current) {
      const url = new URL(config.SOCKET_SERVER_ADDRESS);

      url.search = new URLSearchParams({
        ticket,
      }).toString();

      socket.current = new WebSocket(url);

      socket.current.onopen = function handleSocketOpen(event) {
        console.info("Opened connection.", event);
      };

      socket.current.onclose = function handleSocketClose(event) {
        console.info("Closed connection.", event);
        socket.current = null;
        initialized.current = false;
      };

      socket.current.onerror = function handleSocketError(event) {
        console.error("Encountered error.", event);
      };

      socket.current.onmessage = function handleSocketMessage(event) {
        console.info("Received message.", event);
      };

      initialized.current = true;
    }
  }, [ticket]);

  return useMemo(
    () => ({
      socket: socket.current,
      initialize,
    }),
    [initialize]
  );
}
