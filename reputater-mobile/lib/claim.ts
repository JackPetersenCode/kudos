import { apiFetch } from "./api";

export type InitiateResult = {
  status: "approved" | "verification_required";
  method?: string;
  message: string;
  availableMethods?: string[];
  businessWebsite?: string | null;
  businessPhone?: string | null;
};

export async function initiateClaim(businessId: string): Promise<InitiateResult> {
  const res = await apiFetch(`/public/business/${businessId}/claim/initiate`, { method: "POST" });
  return res.json();
}

export async function sendEmailCode(businessId: string, verificationEmail: string): Promise<{ claimId: string; message: string }> {
  const res = await apiFetch(`/public/business/${businessId}/claim/send-email-code`, {
    method: "POST",
    body: JSON.stringify({ verificationEmail }),
  });
  return res.json();
}

export async function sendSmsCode(businessId: string): Promise<{ claimId: string; message: string }> {
  const res = await apiFetch(`/public/business/${businessId}/claim/send-sms-code`, { method: "POST" });
  return res.json();
}

export async function verifyClaimCode(businessId: string, code: string): Promise<{ message: string }> {
  const res = await apiFetch(`/public/business/${businessId}/claim/verify-code`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return res.json();
}

export async function submitManualClaim(businessId: string, verificationNote: string) {
  const res = await apiFetch(`/public/business/${businessId}/claim/manual`, {
    method: "POST",
    body: JSON.stringify({ verificationNote }),
  });
  return res.json();
}
