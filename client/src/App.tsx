import { useEffect, useRef, useState } from "react";
import { Signin } from "components";
import { useAuthentication } from "hooks";

export function App() {
  const { validate, signout } = useAuthentication();
  const initiallyValidated = useRef(false);
  const [validating, setValidating] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

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
        Signed in.
        <button type="button" onClick={signout} />
      </p>
    );
  }

  if (signingUp) {
    return <p>Sign up.</p>;
  }

  return <Signin onSignin={() => setSignedIn(true)} />;
}
