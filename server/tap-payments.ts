import { ENV } from "./_core/env";

const TAP_API_BASE = "https://api.tap.company/v2";

function getHeaders() {
  if (!ENV.tapSecretKey) {
    throw new Error("TAP_SECRET_KEY is not configured");
  }
  return {
    Authorization: `Bearer ${ENV.tapSecretKey}`,
    "Content-Type": "application/json",
    accept: "application/json",
  };
}

export interface CreateTapChargeParams {
  amount: number;
  currency: string;
  description: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: { countryCode: number; number: string };
  redirectUrl: string;
  postUrl: string;
  metadata?: Record<string, string>;
  reference?: { transaction: string; order: string };
  langCode?: "ar" | "en";
}

export interface TapChargeResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  transaction?: {
    url?: string;
    created?: string;
    authorization_id?: string;
  };
  redirect?: {
    status?: string;
    url?: string;
  };
  reference?: {
    transaction?: string;
    order?: string;
  };
  customer?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  metadata?: Record<string, string>;
  receipt?: {
    id?: string;
    email?: string;
  };
}

export async function createTapCharge(
  params: CreateTapChargeParams
): Promise<TapChargeResponse> {
  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: params.currency,
    customer_initiated: true,
    threeDSecure: true,
    save_card: false,
    description: params.description,
    source: { id: "src_all" },
    redirect: { url: params.redirectUrl },
    post: { url: params.postUrl },
    customer: {
      first_name: params.customerFirstName,
      last_name: params.customerLastName || params.customerFirstName,
      email: params.customerEmail,
      ...(params.customerPhone
        ? {
            phone: {
              country_code: params.customerPhone.countryCode,
              number: params.customerPhone.number,
            },
          }
        : {}),
    },
    lang_code: params.langCode || "ar",
  };

  if (params.metadata) {
    body.metadata = params.metadata;
  }

  if (params.reference) {
    body.reference = params.reference;
  }

  const response = await fetch(`${TAP_API_BASE}/charges/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Tap] Create charge error:", errorText);
    throw new Error(`Failed to create Tap charge: ${response.status}`);
  }

  const data = (await response.json()) as TapChargeResponse;
  return data;
}

export async function retrieveTapCharge(
  chargeId: string
): Promise<TapChargeResponse> {
  const response = await fetch(`${TAP_API_BASE}/charges/${chargeId}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Tap] Retrieve charge error:", errorText);
    throw new Error(`Failed to retrieve Tap charge: ${response.status}`);
  }

  return (await response.json()) as TapChargeResponse;
}
