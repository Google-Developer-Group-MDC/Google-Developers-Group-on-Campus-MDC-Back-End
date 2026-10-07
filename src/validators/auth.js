import { z } from "zod";
import { email } from "./common.js";

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});
