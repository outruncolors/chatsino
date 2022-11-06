import { useCallback, useMemo } from "react";
import { makeRequest } from "helpers";
import { AuthenticatedClient } from "./useClient";

export function useAuthentication() {
  const validate = useCallback(async () => {
    try {
      const response = await makeRequest<{
        client: AuthenticatedClient;
        chips: number;
      }>("get", "/validate");

      return {
        client: response.client,
        chips: response.chips,
      };
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

      window.location.reload();
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
