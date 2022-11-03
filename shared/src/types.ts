export interface ServerResponse<T> {
  error: boolean;
  result: "OK" | "Error";
  message: string;
  data: T;
}
