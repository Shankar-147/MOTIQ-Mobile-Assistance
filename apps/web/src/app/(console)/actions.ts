"use server";

import { redirect } from "next/navigation";
import { clearSessionCookies } from "@/lib/session";

export async function logoutAction() {
  clearSessionCookies();
  redirect("/login");
}
