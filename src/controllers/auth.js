import { Admin } from "../models/Admin.js";
import { signToken } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";

export async function login(req, res) {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select("+passwordHash");
  if (!admin || !(await admin.verifyPassword(password))) {
    throw new HttpError(401, "Invalid email or password");
  }
  admin.lastLoginAt = new Date();
  await admin.save();
  res.json({ token: signToken(admin), admin: admin.toJSON() });
}

export function me(req, res) {
  res.json({ admin: req.admin.toJSON() });
}
