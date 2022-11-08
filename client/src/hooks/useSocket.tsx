import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import * as config from "config";
import { useAuthentication } from "./useAuthentication";
import { useClient } from "./useClient";

type RequestArg = string | number | null;

export interface SocketContextType {
  socket: null | WebSocket;
  initialized: boolean;
  initialize: () => void;
  makeRequest: (kind: string, args: RequestArg[]) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  initialized: false,
  initialize() {},
  makeRequest() {},
});

export function SocketProvider({ children }: PropsWithChildren) {
  const { requestTicket } = useAuthentication();
  const { client } = useClient();
  const socket = useRef<null | WebSocket>(null);
  const [initialized, setInitialized] = useState(false);
  const attemptingToReconnect = useRef<null | NodeJS.Timeout>(null);

  const initialize = useCallback(async () => {
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

        setInitialized(true);
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
  }, [requestTicket]);

  const makeRequest = useCallback(
    (kind: string, args: RequestArg[] = []) => {
      if (client) {
        const request = {
          kind,
          args,
        };

        socket.current?.send(JSON.stringify(request));
      }
    },
    [client]
  );

  const value = useMemo(
    () => ({
      socket: socket.current,
      initialized,
      initialize,
      makeRequest,
    }),
    [initialized, initialize, makeRequest]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
