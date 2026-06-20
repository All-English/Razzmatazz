import z from "zod"

export const usernameValidator = z
  .string()
  .min(2, "errors:auth.usernameTooShort")
  .max(20, "errors:auth.usernameTooLong")

export const inviteCodeValidator = z
  .string()
  .length(4, "errors:auth.invalidInviteCode")
