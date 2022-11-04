import { useCallback, useMemo } from "react";
import { axios } from "helpers";
import { ServerResponse } from "shared";

export function useAuthentication() {
  const validate = useCallback(async () => {
    try {
      const response = await makeRequest<{
        client: {
          username: string;
          kind: string;
          permissionLevel: string;
          permissions: string[];
        }; // TODO: Shared type of AuthenticatedClient
      }>("get", "/validate");

      return response.client;
    } catch (error) {
      console.error({ error }, "Unable to validate.");
      throw error;
    }
  }, []);

  const signin = useCallback(async (username: string, password: string) => {
    try {
      await makeRequest<void>("post", "/signin", {
        username,
        password,
      });
    } catch (error) {
      console.error({ error }, "Unable to sign in.");
      throw error;
    }
  }, []);

  const signout = useCallback(async () => {
    try {
      await makeRequest<void>("post", "/signout");
      window.location.reload();
    } catch (error) {
      console.error({ error }, "Unable to sign out.");
      throw error;
    }
  }, []);

  const signup = useCallback(
    async (username: string, password: string, passwordAgain: string) => {
      try {
        await makeRequest<void>("post", "/signup", {
          username,
          password,
          passwordAgain,
        });

        window.location.reload();
      } catch (error) {
        console.error({ error }, "Unable to sign up.");
        throw error;
      }
    },
    []
  );

  const requestTicket = useCallback(async () => {
    try {
      const { ticket } = await makeRequest<{ ticket: string }>(
        "get",
        "/ticket"
      );

      return ticket;
    } catch (error) {
      console.error({ error }, "Unable to retrieve a ticket.");
      throw error;
    }
  }, []);

  return useMemo(
    () => ({
      validate,
      signin,
      signout,
      signup,
      requestTicket,
    }),
    [validate, signin, signout, signup, requestTicket]
  );
}

// #region Helpers
async function makeRequest<T>(
  method: "get" | "post",
  route: string,
  body?: Record<string, string>
): Promise<T> {
  const response = await axios[method](route, body);
  const data = response.data as ServerResponse<T>;

  if (!data.error && data.result === "OK") {
    return data.data;
  } else {
    throw new Error(data.message);
  }
}
// #endregion
