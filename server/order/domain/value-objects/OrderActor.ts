export type OrderActorRole = "owner" | "staff";

export type OrderActor = {
  role: OrderActorRole;
};

export function isStaffActor(actor: OrderActor): boolean {
  return actor.role === "owner" || actor.role === "staff";
}
