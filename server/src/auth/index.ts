import uuid4 from "uuid4";

export interface ChatsinoClient {
  id: string;
  name: string;
}

const EXAMPLE_CLIENT: ChatsinoClient = {
  id: uuid4(),
  name: "Bob",
};

export function authenticate() {
  return Promise.resolve(EXAMPLE_CLIENT);
}
