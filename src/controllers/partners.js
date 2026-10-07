import { Partner } from "../models/Partner.js";
import { partnerEmails, sendInBackground, sendMail } from "../services/email.js";

export async function createPartner(req, res) {
  const { company_website: honeypot, ...data } = req.body;
  if (honeypot) return res.status(201).json({ message: "Thank you for your interest!" });

  const partner = await Partner.create(data);
  sendInBackground(partnerEmails(partner).map(sendMail));
  res.status(201).json({ message: "Thank you for your interest!", id: partner.id });
}
