import 'dotenv/config';

const PAYPAL_API_BASE = "https://api.sandbox.paypal.com";

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");
  
  console.log("PAYPAL_CLIENT_ID:", process.env.PAYPAL_CLIENT_ID ? "SET (" + process.env.PAYPAL_CLIENT_ID.substring(0, 10) + "...)" : "NOT SET");
  console.log("PAYPAL_SECRET:", process.env.PAYPAL_SECRET ? "SET" : "NOT SET");
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("Auth Error:", response.status, error);
    throw new Error(`Failed to get PayPal access token: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Access token obtained successfully");
  return data.access_token;
}

async function createOrder(accessToken) {
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
          reference_id: "plan-2-user-1",
          description: "Test Plan",
          amount: {
            currency_code: "USD",
            value: "49.00",
          },
          custom_id: JSON.stringify({ userId: 1, planId: 2 }),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: "https://www.mineuqr.com/subscription/success",
            cancel_url: "https://www.mineuqr.com/subscription/cancel",
            user_action: "PAY_NOW",
            locale: "ar-SA",
          },
        },
      },
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("Create Order Error:", response.status, error);
    throw new Error(`Failed to create order`);
  }
  
  const data = await response.json();
  console.log("Order created:", data.id);
  console.log("Checkout URL: https://www.sandbox.paypal.com/checkoutnow?token=" + data.id);
  return data;
}

try {
  const token = await getAccessToken();
  await createOrder(token);
} catch (e) {
  console.error("Final Error:", e.message);
}
