# REBUILD-5DB — Customer Success Ownership Adoption

**Program:** ADMIN-DASHBOARD-REBUILD-5D  
**Phase:** 5DB — Customer Success Asset Adoption

---

## Workspace Assets

| Asset (5B) | Registry id | Owner component | Surface |
|------------|-------------|-----------------|---------|
| Accounts Workspace | `accounts-workspace` | `CustomerSuccessAccountsSection` | `/admin/operations` |
| Tenants Workspace | `tenants-workspace` | `CustomerSuccessTenantsSection` | `/admin/operations` |
| Communications | `communications-workspace` | `CustomerSuccessCommunicationsSection` | `/admin/operations` |
| Subscription Health | `subscription-health` | `CustomerSuccessHealthSection` | `/admin/commercial` |
| Needs Attention | `needs-attention` | `CustomerSuccessAttentionSection` | `/admin/commercial` |
| Subscription Lifecycle Actions | `subscription-lifecycle-actions` | `CustomerSuccessAccountsSection` (dialogs) | operations |
| Trial Lifecycle Display | `trial-lifecycle-display` | `CustomerSuccessAccountsSection` (status badges) | operations |
| Customer Health Indicators | `customer-health-indicators` | `CustomerSuccessHealthSection` | commercial |

---

## API Ownership

| Procedure | Registry id |
|-----------|-------------|
| `admin.getOwnerOverviewList` | `api-get-owner-overview-list` |
| `admin.getOwnerOverview` | `api-get-owner-overview` |
| `admin.getSubscriptionOverview` | `api-get-subscription-overview` |
| `admin.listRestaurants` | `api-list-restaurants` |
| `admin.createSubscriberAccount` | `api-create-subscriber-account` |
| `admin.createUserSubscriptionByAdmin` | `api-create-user-subscription` |
| `admin.updateUserSubscriptionByAdmin` | `api-update-user-subscription` |
| `admin.deleteUserSubscriptionByAdmin` | `api-delete-user-subscription` |
| `admin.sendCustomNotification` | `api-send-custom-notification` |
| `admin.sendBulkNotification` | `api-send-bulk-notification` |

---

## Helper Ownership

| Module | Registry id |
|--------|-------------|
| `ownerCommercialDisplay.ts` | `helper-owner-commercial-display` |
| `CommercialReadService.ts` | `helper-commercial-read-service` |

---

## Security Assets (NOT adopted by CS)

These remain **Security-owned** per REBUILD-5B/5D boundary rules:

| Control | Location | Owner |
|---------|----------|-------|
| Role edit | Accounts workspace UI | **Security** |
| Classification edit | Accounts workspace UI | **Security** |
| Create internal user | Accounts workspace UI | **Security** |
| Delete user | Accounts workspace UI | **Security** |
| Platform account guards | Accounts workspace UI | **Security** |
| `updateUserRole` API | server | **Security** |
| `updateAccountClassification` API | server | **Security** |
| `createInternalUser` API | server | **Security** |
| `deleteUser` API | server | **Security** |

---

## Data Dependency (not ownership)

`useCustomerSuccessCommercialData` re-exports `useReportsCommercialOverviewData` — CS consumes Reports query for health/attention widgets on commercial page. Ownership of `getCommercialOverview` remains **Reports**.

---

## Compatibility Shims

| Legacy import | Re-exports |
|---------------|------------|
| `AccountsTab` | `CustomerSuccessAccountsSection` |
| `TenantsTab` | `CustomerSuccessTenantsSection` |
| `CommunicationsTab` | `CustomerSuccessCommunicationsSection` |
| `CommercialCustomerSuccessSections` | `CustomerSuccessCommercialSections` |
