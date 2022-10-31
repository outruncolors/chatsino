import { useCallback, useMemo } from "react";
import { axios } from "helpers";

interface AuthenticationResponse {
  error: boolean;
  result: "OK" | "Error";
  message: string;
}

export function useAuthentication() {
  const signin = useCallback(async (username: string, password: string) => {
    try {
      const response = await axios.post("/signin", { username, password });
      const data = response.data as AuthenticationResponse;

      if (!data.error && data.result === "OK") {
        console.info({ message: data.message }, "Successfully signed in.");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error({ error }, "Unable to sign in.");
    }
  }, []);

  return useMemo(
    () => ({
      signin,
    }),
    [signin]
  );
}
