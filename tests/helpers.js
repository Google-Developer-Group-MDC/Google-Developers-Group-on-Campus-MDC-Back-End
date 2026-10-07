import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Admin } from "../src/models/Admin.js";

let mongo;

export async function setupDatabase() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
}

export async function clearDatabase() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export async function teardownDatabase() {
  await mongoose.disconnect();
  await mongo?.stop();
}

export const app = createApp();
export const api = () => request(app);

export const ADMIN = { email: "admin@test.dev", password: "super-secret-password" };

export async function loginAsAdmin() {
  await Admin.create({ email: ADMIN.email, passwordHash: await Admin.hashPassword(ADMIN.password) });
  const res = await api().post("/api/auth/login").send(ADMIN);
  return res.body.token;
}

export const validMember = () => ({
  firstName: "Maria",
  lastName: "Lopez",
  email: "Maria.Lopez@mymdc.net",
  phone: "(305) 555-1234",
  major: "Computer Science",
  year: "Junior",
  interests: ["Web Development", "Cloud Computing"],
  hearAboutUs: "Campus Event",
  additionalInfo: "",
});

export const validPartner = () => ({
  companyName: "Acme Corp",
  contactName: "Jane Doe",
  email: "jane@acme.com",
  phone: "305-555-9876",
  website: "https://acme.com",
  streetAddress: "300 NE 2nd Ave",
  city: "Miami",
  state: "FL",
  zip: "33132",
  partnershipInterest: "Event Sponsorship",
  message: "We'd love to sponsor a hackathon.",
});
