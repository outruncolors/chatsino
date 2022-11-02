import * as yup from "yup";
import * as config from "./config";

export const clientSigninSchema = yup.object({
  username: yup.string().required("A username is required to sign in."),
  password: yup
    .string()
    .min(
      config.MINIMUM_PASSWORD_SIZE,
      `A password must include a minimum of ${config.MINIMUM_PASSWORD_SIZE} characters.`
    )
    .required("A password is required to sign in."),
});

export interface ClientSigninSchema
  extends yup.InferType<typeof clientSigninSchema> {}

export const clientSignupSchema = clientSigninSchema.shape({
  passwordAgain: yup
    .string()
    .min(
      config.MINIMUM_PASSWORD_SIZE,
      `A password must include a minimum of ${config.MINIMUM_PASSWORD_SIZE} characters.`
    )
    .test({
      name: "match",
      exclusive: false,
      message: "Passwords must match.",
      test: (value, context) => {
        return value === context.parent.password;
      },
    })
    .required("Please re-enter your chosen password."),
});

export interface ClientSignupSchema
  extends yup.InferType<typeof clientSignupSchema> {}
