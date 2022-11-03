import { useCallback, useState } from "react";
import { useAuthentication } from "hooks";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { ClientSignupSchema, clientSignupSchema } from "shared";

type Props = {
  onSignup(): unknown;
};

const INITIAL_SIGNUP_VALUES: ClientSignupSchema = {
  username: "",
  password: "",
  passwordAgain: "",
};

export function Signup({ onSignup }: Props) {
  const { handleSubmit, error } = useSignupForm(onSignup);

  return (
    <Formik
      initialValues={INITIAL_SIGNUP_VALUES}
      validationSchema={clientSignupSchema}
      onSubmit={handleSubmit}
    >
      <Form>
        <legend>Sign up</legend>

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

        <label htmlFor="passwordAgain">
          Password (again) <br />
          <Field
            id="passwordAgain"
            name="passwordAgain"
            type="password"
            placeholder="8 or more characters (again)"
          />
          <ErrorMessage name="passwordAgain" />
        </label>

        <br />

        <button type="submit">Send</button>

        {error && <div style={{ color: "red" }}>{error}</div>}
      </Form>
    </Formik>
  );
}

function useSignupForm(onSignup: () => unknown) {
  const { signup } = useAuthentication();
  const [error, setError] = useState("");
  const handleSubmit = useCallback(
    ({ username, password, passwordAgain }: ClientSignupSchema) => {
      const handleSignup = async () => {
        try {
          await signup(username, password, passwordAgain);
          onSignup();
        } catch (error) {
          console.error("Unable to sign up.", error);
          setError("Failed to sign up");
        }
      };

      handleSignup();
    },
    [signup, onSignup]
  );

  return {
    handleSubmit,
    error,
  };
}
