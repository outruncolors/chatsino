import { useAuthentication, useSocket } from "hooks";
import { useCallback, useEffect, useRef, useState } from "react";

export function Chatsino() {
  const retrievingTicket = useRef(false);
  const [ticket, setTicket] = useState("");
  const [ticketError, setTicketError] = useState("");
  const { requestTicket, signout } = useAuthentication();
  const handleEnter = useCallback(async () => {
    try {
      if (!retrievingTicket.current) {
        retrievingTicket.current = true;
        const retrievedTicket = await requestTicket();
        setTicket(retrievedTicket);
      }
    } catch (error) {
      console.error("Unable to retrieve ticket");

      setTicketError(
        "There was an issue authenticating with the socket server."
      );
    } finally {
      retrievingTicket.current = false;
    }
  }, [requestTicket]);

  if (ticketError) {
    return <span>{ticketError}</span>;
  }

  return (
    <div>
      Chatsino <br />
      {ticket ? (
        <Lobby ticket={ticket} />
      ) : (
        <>
          <button type="button" onClick={handleEnter}>
            Enter
          </button>
          <button type="button" onClick={signout}>
            Sign out
          </button>
        </>
      )}
    </div>
  );
}

interface LobbyProps {
  ticket: string;
}

function Lobby({ ticket }: LobbyProps) {
  const { initialize } = useSocket(ticket);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initialize();
    }
  });

  return <div>Lobby</div>;
}
