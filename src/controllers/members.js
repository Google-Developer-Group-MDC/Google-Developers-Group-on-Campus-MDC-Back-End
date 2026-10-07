import { Member } from "../models/Member.js";
import { memberEmails, sendInBackground, sendMail } from "../services/email.js";
import { HttpError } from "../utils/httpError.js";

export async function createMember(req, res) {
  const { company_website: honeypot, ...data } = req.body;
  // Pretend success for bots so they don't retry with different payloads.
  if (honeypot) return res.status(201).json({ message: "Welcome to the community!" });

  if (await Member.exists({ email: data.email })) {
    throw new HttpError(409, "This email is already registered as a member. Welcome back! 👋");
  }

  let member;
  try {
    member = await Member.create(data);
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, "This email is already registered as a member.");
    throw error;
  }

  sendInBackground(memberEmails(member).map(sendMail));
  res.status(201).json({ message: "Welcome to the community!", id: member.id });
}
