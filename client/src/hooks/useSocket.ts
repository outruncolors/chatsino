import { useCallback, useMemo, useRef } from "react";
import * as config from "config";

export function useSocket() {
  const socket = useRef<null | WebSocket>(null);
  const initialized = useRef(false);
  const initialize = useCallback(() => {
    if (!socket.current && !initialized.current) {
      socket.current = new WebSocket(config.SOCKET_SERVER_ADDRESS);

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
  }, []);

  return useMemo(
    () => ({
      socket: socket.current,
      initialize,
    }),
    [initialize]
  );
}
