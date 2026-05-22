import { ENV } from "./_core/env";

const PAYPAL_API_BASE = "https://api.sandbox.paypal.com";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now) {
    return cachedAccessToken.token;
  }

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.statusText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000, // Refresh 60 seconds before expiry
  };

  return data.access_token;
}

export interface CreateOrderParams {
  userId: number;
  planId: number;
  planName: string;
  amount: string;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}

export async function createPayPalOrder(params: CreateOrderParams): Promise<string> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `plan-${params.planId}-user-${params.userId}`,
          description: params.planName,
          amount: {
            currency_code: params.currency,
            value: params.amount,
          },
          custom_id: JSON.stringify({
            userId: params.userId,
            planId: params.planId,
          }),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
            user_action: "PAY_NOW",
            locale: "ar-SA",
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PayPal order: ${error}`);
  }

  const data = await response.json() as { id: string };
  return data.id;
}

export interface CaptureOrderParams {
  orderId: string;
}

export async function capturePayPalOrder(
  params: CaptureOrderParams
): Promise<{ id: string; status: string; payer: { email_address: string } }> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${params.orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to capture PayPal order: ${error}`);
  }

  const data = await response.json() as { id: string; status: string; payer: { email_address: string } };
  return data;
}

export async function getPayPalOrder(orderId: string): Promise<{ id: string; status: string }> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal order: ${error}`);
  }

  const data = await response.json() as { id: string; status: string };
  return data;
}
