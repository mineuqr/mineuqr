# LONG-TERM QUALITY GATE

Public contract is tRPC class (`FORBIDDEN` vs `INTERNAL_SERVER_ERROR`) plus stable Commercial error classes. Future consumers should call `throwCommercialOccupancyTrpcError` rather than inventing POS- or menu-specific occupancy errors.

G-04 Express JSON `code` remains the register-path client field. tRPC clients already read `error.data.code` as the tRPC code; occupancy unavailable is no longer `FORBIDDEN`.
