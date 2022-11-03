import * as yup from "yup";
import * as config from "./config";

const PASSWORD_MESSAGE = `A password must include a minimum of ${config.MINIMUM_PASSWORD_SIZE} characters.`;

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
