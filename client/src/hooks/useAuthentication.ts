import { useCallback, useMemo } from "react";
import { axios } from "helpers";

let _csrf = "";

export function useAuthentication() {
  const validate = useCallback(async () => {
    try {
      const response = await makeRequest<{
        isValidated: boolean;
        csrfToken: string;
      }>("get", "/validate");

      _csrf = response.csrfToken;

      return response.isValidated;
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

  const signout = useCallback(() => {}, []);

  const signup = useCallback(() => {}, []);

  return useMemo(
    () => ({
      validate,
      signin,
      signout,
      signup,
    }),
    [validate, signin, signout, signup]
  );
}

// #region Helpers
interface AuthenticationResponse<T> {
  error: boolean;
  result: "OK" | "Error";
  message: string;
  data: T;
}

async function makeRequest<T>(
  method: "get" | "post",
  route: string,
  body?: Record<string, string>
): Promise<T> {
  const response = await axios[method](route, {
    ...body,
    _csrf,
  });
  const data = response.data as AuthenticationResponse<T>;

  if (!data.error && data.result === "OK") {
    return data.data;
  } else {
    throw new Error(data.message);
  }
}
// #endregion
