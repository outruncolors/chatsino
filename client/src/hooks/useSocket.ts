import { useCallback, useMemo, useRef } from "react";
import * as config from "config";
import { useAuthentication } from "./useAuthentication";

export function useSocket() {
  const { requestTicket } = useAuthentication();
  const socket = useRef<null | WebSocket>(null);
  const attemptingToReconnect = useRef<null | NodeJS.Timeout>(null);
  const initialize = useCallback(() => {
    const initializeSocket = async () => {
      try {
        if (socket.current) {
          socket.current.close();
          socket.current = null;
        }

        const ticket = await requestTicket();
        const url = new URL(config.SOCKET_SERVER_ADDRESS);

        url.search = new URLSearchParams({
          ticket,
        }).toString();

        socket.current = new WebSocket(url);

        socket.current.onopen = function handleSocketOpen(event) {
          console.info("Opened connection.", event);

          if (attemptingToReconnect.current) {
            clearInterval(attemptingToReconnect.current);
          }

          socket.current?.send(JSON.stringify({ foo: "bar" }));
        };

        socket.current.onclose = function handleSocketClose(event) {
          console.info("Closed connection.", event);

          attemptingToReconnect.current = setInterval(
            initialize,
            config.SOCKET_RECONNECT_ATTEMPT_RATE
          );
        };

        socket.current.onerror = function handleSocketError(event) {
          console.error("Encountered error.", event);
        };

        socket.current.onmessage = function handleSocketMessage(event) {
          console.info("Received message.", event);
        };
      } catch (error) {
        console.error("Unable to connect -- retrying soon.", error);
      }
    };

    initializeSocket();
  }, [requestTicket]);

  return useMemo(
    () => ({
      socket: socket.current,
      initialize,
    }),
    [initialize]
  );
}
