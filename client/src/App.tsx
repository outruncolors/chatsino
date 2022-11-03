import { useEffect, useRef, useState } from "react";
import { Signin, Signup } from "components";
import { useAuthentication } from "hooks";

export function App() {
  const { validate, signout } = useAuthentication();
  const initiallyValidated = useRef(false);
  const [validating, setValidating] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!initiallyValidated.current) {
      initiallyValidated.current = true;

      validate()
        .then(setSignedIn)
        .then(() => setValidating(false));
    }
  }, [validate]);

  if (validating) {
    return <p>Validating...</p>;
  }

  if (signedIn) {
    return (
      <p>
        Signed in. <br />
        <button type="button" onClick={signout}>
          Sign out
        </button>
      </p>
    );
  }

  return (
    <section>
      <Signin onSignin={() => setSignedIn(true)} />
      <hr />
      <Signup onSignup={() => setSignedIn(true)} />
    </section>
  );
}
