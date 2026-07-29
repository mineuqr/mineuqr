/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Device security ownership — no authentication redesign.
 */

export const DEVICE_SECURITY_CAPABILITIES = [
  "provisioning_token",
  "device_credentials",
  "certificate_ready",
  "secure_registration",
  "revocation",
  "rotation",
  "trust_state",
] as const;

export type DeviceSecurityCapabilityId =
  (typeof DEVICE_SECURITY_CAPABILITIES)[number];

export type DeviceSecurityArchitecture = {
  id: DeviceSecurityCapabilityId;
  title: string;
  maturity: "architecture" | "reserved";
  notes: string;
};

export const DEVICE_SECURITY_ARCHITECTURE: readonly DeviceSecurityArchitecture[] =
  [
    {
      id: "provisioning_token",
      title: "Provisioning Token",
      maturity: "architecture",
      notes: "Ownership of provisioning token metadata — not Auth Platform redesign.",
    },
    {
      id: "device_credentials",
      title: "Device Credentials",
      maturity: "architecture",
      notes: "Device credential metadata ownership.",
    },
    {
      id: "certificate_ready",
      title: "Certificate Ready",
      maturity: "reserved",
      notes: "Certificate lifecycle reserved for future.",
    },
    {
      id: "secure_registration",
      title: "Secure Registration",
      maturity: "architecture",
      notes: "Secure enrollment flow architecture — no implementation.",
    },
    {
      id: "revocation",
      title: "Revocation",
      maturity: "architecture",
      notes: "Device trust revocation ownership.",
    },
    {
      id: "rotation",
      title: "Rotation",
      maturity: "architecture",
      notes: "Credential / token rotation ownership.",
    },
    {
      id: "trust_state",
      title: "Trust State",
      maturity: "architecture",
      notes: "Operational trust posture for devices.",
    },
  ] as const;

export const DEVICE_SECURITY_DOES_NOT_REDESIGN = [
  "authentication_platform",
  "user_identity",
  "session_auth",
  "oauth",
] as const;
