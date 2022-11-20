import * as yup from "yup";
import * as config from "./config";

type ClientPermissionLevel =
  | "visitor"
  | "user"
  | "admin:limited"
  | "admin:unlimited";

const PASSWORD_MESSAGE = `A password must include a minimum of ${config.MINIMUM_PASSWORD_SIZE} characters.`;

export const PERMISSION_RANKING: ClientPermissionLevel[] = [
  "visitor",
  "user",
  "admin:limited",
  "admin:unlimited",
];
export const clientSigninSchema = yup.object({
  username: yup.string().required("A username is required."),
  password: yup
    .string()
    .min(config.MINIMUM_PASSWORD_SIZE, PASSWORD_MESSAGE)
    .required(PASSWORD_MESSAGE),
});

export interface ClientSigninSchema
  extends yup.InferType<typeof clientSigninSchema> {}

export const clientSignupSchema = clientSigninSchema.shape({
  passwordAgain: yup
    .string()
    .min(config.MINIMUM_PASSWORD_SIZE, PASSWORD_MESSAGE)
    .test({
      name: "match",
      exclusive: false,
      message: "Passwords must match.",
      test: (value, context) => value === context.parent.password,
    })
    .required("Please re-enter your chosen password."),
});

export interface ClientSignupSchema
  extends yup.InferType<typeof clientSignupSchema> {}

export const adminPaySchema = yup.object({
  clientId: yup.number().required(),
  amount: yup.number().positive().min(1).required(),
});

export interface AdminPaySchema extends yup.InferType<typeof adminPaySchema> {}

export const adminChangePermissionSchema = yup.object({
  clientId: yup.number().required(),
  permissionLevel: yup.string().oneOf(PERMISSION_RANKING),
});

export interface AdminChangePermissionSchema
  extends yup.InferType<typeof adminChangePermissionSchema> {
  permissionLevel: ClientPermissionLevel;
}

export const socketMessageSchema = yup.object({
  kind: yup.string().required(),
  args: yup.object().optional().default({}),
});

export type SocketMessageSchema = Omit<
  yup.InferType<typeof socketMessageSchema>,
  "args"
> & {
  args: Record<string, unknown>;
};

export const authenticatedClientSchema = yup.object({
  id: yup.number().required(),
  username: yup.string().required(),
  permissionLevel: yup.string().oneOf(PERMISSION_RANKING).required(),
  chips: yup.number().required(),
  createdAt: yup.string().required(),
  updatedAt: yup.string().required(),
});

export const sourcedSocketMessageSchema = socketMessageSchema.shape({
  from: authenticatedClientSchema,
});

export interface SourcedSocketMessageSchema extends SocketMessageSchema {
  from: {
    id: number;
    username: string;
    permissionLevel: ClientPermissionLevel;
    chips: number;
    createdAt: string;
    updatedAt: string;
  };
}
