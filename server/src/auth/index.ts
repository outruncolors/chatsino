import uuid4 from "uuid4";
import { now } from "helpers";

export interface ChatsinoClient {
  id: string;
  username: string;
  connectedAt: number;
}

const EXAMPLE_CLIENT: ChatsinoClient = {
  id: uuid4(),
  username: "Bob",
  connectedAt: now(),
};

export function authenticate() {
  return Promise.resolve(EXAMPLE_CLIENT);
}
