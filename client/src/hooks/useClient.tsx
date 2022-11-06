import React, {
  createContext,
  Dispatch,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";

export type ClientPermissionLevel =
  | "visitor"
  | "user"
  | "admin:limited"
  | "admin:unlimited";

export interface AuthenticatedClient {
  id: string;
  username: string;
  permissionLevel: ClientPermissionLevel;
}

export interface ClientContextType {
  client: null | AuthenticatedClient;
  chips: number;
  setClient: Dispatch<React.SetStateAction<null | AuthenticatedClient>>;
  setChips: Dispatch<React.SetStateAction<number>>;
}

const ClientContext = createContext<ClientContextType>({
  client: null,
  chips: 0,
  setClient() {},
  setChips() {},
});

export function ClientProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<null | AuthenticatedClient>(null);
  const [chips, setChips] = useState(0);
  const value = useMemo(
    () => ({
      client,
      chips,
      setClient,
      setChips,
    }),
    [client, chips]
  );

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

export function useClient() {
  return useContext(ClientContext);
}
