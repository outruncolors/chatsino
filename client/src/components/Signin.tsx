import { useCallback, useState } from "react";
import { useAuthentication } from "hooks";
import { Formik, FormikHelpers, Form, Field, ErrorMessage } from "formik";
import { ClientSigninSchema, clientSigninSchema } from "shared";

const INITIAL_SIGNIN_VALUES: ClientSigninSchema = {
  username: "",
  password: "",
};

export function Signin() {
  const { handleSubmit, error } = useSigninForm();

  return (
    <Formik
      initialValues={INITIAL_SIGNIN_VALUES}
      validationSchema={clientSigninSchema}
      onSubmit={handleSubmit}
    >
      <Form>
        <legend>Sign in</legend>

        <label htmlFor="username">
          Username <br />
          <Field
            id="username"
            name="username"
            placeholder="Enter a username"
            autoFocus={true}
          />
          <ErrorMessage name="username" />
        </label>

        <br />

        <label htmlFor="password">
          Password <br />
          <Field
            id="password"
            name="password"
            type="password"
            placeholder="8 or more characters"
          />
          <ErrorMessage name="password" />
        </label>

        <br />

        <button type="submit">Send</button>

        {error && <div style={{ color: "red" }}>{error}</div>}
      </Form>
    </Formik>
  );
}

function useSigninForm() {
  const { signin } = useAuthentication();
  const [error, setError] = useState("");
  const handleSubmit = useCallback(
    (
      { username, password }: ClientSigninSchema,
      formHelpers: FormikHelpers<ClientSigninSchema>
    ) => {
      const handleSignin = async () => {
        try {
          await signin(username, password);
        } catch (error) {
          console.error("Unable to sign in.", error);
          setError("Failed to sign in");
        }
      };

      handleSignin();
    },
    [signin]
  );

  return {
    handleSubmit,
    error,
  };
}
