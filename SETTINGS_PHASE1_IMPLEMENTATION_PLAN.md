# Settings Tab - Phase 1 Implementation Plan
## Hospital Management System

**Version:** 1.0  
**Date:** 2024-12-16  
**Status:** Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Features Scope](#features-scope)
3. [UI/UX Design](#uiux-design)
4. [Component Structure](#component-structure)
5. [User Flows](#user-flows)
6. [API Integration](#api-integration)
7. [Implementation Steps](#implementation-steps)
8. [Testing Checklist](#testing-checklist)

---

## Overview

### Purpose
The Settings tab provides users with the ability to manage their profile, hospital information, and system preferences. Phase 1 focuses on essential settings that are most commonly used and critical for system configuration.

### Target Users
- **All Users**: Can view and edit their own profile, change password
- **Admin/PlatformOwner**: Can edit hospital information and system preferences

### Goals
- Provide intuitive interface for managing user profile
- Allow hospital administrators to configure organization details
- Enable system-wide preference management
- Maintain consistency with existing UI patterns

---

## Features Scope

### 1. Profile Settings
**Access Level:** All authenticated users

**Features:**
- View current user profile information
  - Full name
  - Email address
  - Role
  - Status
  - Account creation date
  - Last login date
- Edit profile information
  - Update full name
  - Update email address
- Change password
  - Current password verification
  - New password with strength requirements
  - Password confirmation

**Business Rules:**
- Users can only edit their own profile
- Email must be unique within the tenant
- Password must meet security requirements (min 8 chars, alphanumeric)
- Password change requires current password verification

---

### 2. Hospital/Organization Settings
**Access Level:** Admin and PlatformOwner only

**Features:**
- View hospital/organization information
  - Hospital name
  - Contact information (email, phone, mobile)
  - Address (street, city, state, postal code, country)
  - Registration details (registration number, license number)
  - Tax information (Tax ID, PAN number)
  - Logo (display current logo if available)
- Edit hospital information
  - Update all above fields
  - Upload/update logo (future enhancement - Phase 2)

**Business Rules:**
- Only admins and platform owners can edit
- All fields are optional but validated when provided
- Email, phone, and mobile must be in valid formats
- Tax ID and PAN must follow country-specific formats

---

### 3. System Preferences
**Access Level:** Admin and PlatformOwner only

**Features:**
- View current system preferences
  - Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY)
  - Time format (12h, 24h)
  - Timezone (IANA timezone identifier)
  - Currency (code, symbol, position)
  - Number format (decimal separator, thousands separator)
  - Language (en, hi, mr, etc.)
- Edit system preferences
  - Update all preference fields
  - Changes apply tenant-wide

**Business Rules:**
- Only admins and platform owners can edit
- Preferences are tenant-scoped
- Default values are provided if not set
- Changes take effect immediately

---

## UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [Profile Settings] [Hospital Settings] [System] │  │  ← Horizontal Tabs
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  Tab Content Area                                │  │
│  │  (Changes based on selected tab)                │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Consistency**: Follow existing UI patterns from other tabs (Manage Staff, IPD, etc.)
2. **Clarity**: Clear section headers and field labels
3. **Validation**: Real-time validation with helpful error messages
4. **Feedback**: Success/error toasts for all actions
5. **Accessibility**: Proper labels, keyboard navigation, ARIA attributes

### Visual Design

**Color Scheme:**
- Primary actions: Sky blue gradient (`from-sky-500 to-teal-500`)
- Success: Emerald green
- Errors: Rose red
- Background: White cards with slate borders

**Typography:**
- Headers: `text-sm font-semibold text-slate-900`
- Labels: `text-slate-600 text-sm`
- Inputs: `text-sm`
- Help text: `text-xs text-slate-500`

**Spacing:**
- Section padding: `p-6`
- Field spacing: `gap-4`
- Form padding: `px-4 py-3`

---

## Component Structure

### Main Settings Component

```
src/components/settings/
├── Settings.tsx                 # Main container with tabs
├── ProfileSettings.tsx          # Profile settings tab content
├── HospitalSettings.tsx         # Hospital settings tab content
├── SystemPreferences.tsx        # System preferences tab content
└── components/
    ├── ProfileForm.tsx          # Profile edit form
    ├── ChangePasswordForm.tsx  # Password change form
    ├── HospitalForm.tsx        # Hospital info edit form
    └── PreferencesForm.tsx     # System preferences form
```

### Component Hierarchy

```
Settings (Main Container)
├── Tab Navigation (Horizontal Tabs)
│   ├── Profile Settings Tab
│   ├── Hospital Settings Tab
│   └── System Preferences Tab
│
├── ProfileSettings
│   ├── Profile Information Display
│   ├── ProfileForm (Edit Profile)
│   └── ChangePasswordForm
│
├── HospitalSettings
│   ├── Hospital Information Display
│   └── HospitalForm (Edit Hospital Info)
│
└── SystemPreferences
    ├── Current Preferences Display
    └── PreferencesForm (Edit Preferences)
```

---

## User Flows

### Flow 1: View and Edit Profile

```
1. User clicks "Settings" in sidebar
2. Settings page loads with "Profile Settings" tab active
3. User sees their profile information:
   - Full name (editable)
   - Email (editable)
   - Role (read-only)
   - Status (read-only)
   - Created date (read-only)
   - Last login (read-only)
4. User clicks "Edit Profile" button
5. Form opens with current values pre-filled
6. User updates name and/or email
7. User clicks "Save Changes"
8. API call to PATCH /auth/me
9. Success toast: "Profile updated successfully"
10. Form closes, updated information displayed
```

### Flow 2: Change Password

```
1. User is on Profile Settings tab
2. User clicks "Change Password" button
3. Modal/form opens with password fields:
   - Current Password (required)
   - New Password (required, min 8 chars)
   - Confirm Password (required, must match)
4. User enters passwords
5. Real-time validation:
   - Current password field shows error if incorrect
   - New password shows strength indicator
   - Confirm password shows error if doesn't match
6. User clicks "Change Password"
7. API call to POST /auth/change-password
8. Success toast: "Password changed successfully"
9. Form closes and clears
10. User is logged out (optional security measure)
```

### Flow 3: Edit Hospital Information (Admin Only)

```
1. Admin clicks "Settings" in sidebar
2. Admin clicks "Hospital Settings" tab
3. Admin sees hospital information:
   - Hospital name
   - Contact details
   - Address
   - Registration info
   - Tax info
   - Logo (if available)
4. Admin clicks "Edit Hospital Information" button
5. Form opens with current values pre-filled
6. Admin updates fields
7. Real-time validation for:
   - Email format
   - Phone format
   - Tax ID format
   - PAN format
8. Admin clicks "Save Changes"
9. API call to PATCH /tenants/{tenant_id}
10. Success toast: "Hospital information updated successfully"
11. Form closes, updated information displayed
```

### Flow 4: Update System Preferences (Admin Only)

```
1. Admin clicks "Settings" in sidebar
2. Admin clicks "System Preferences" tab
3. Admin sees current preferences:
   - Date format: DD/MM/YYYY
   - Time format: 24h
   - Timezone: Asia/Kolkata
   - Currency: ₹ INR
   - Number format: 1,234.56
   - Language: English
4. Admin clicks "Edit Preferences" button
5. Form opens with current values pre-filled
6. Admin updates preferences:
   - Selects date format from dropdown
   - Selects time format (12h/24h)
   - Selects timezone from searchable dropdown
   - Selects currency from dropdown
   - Configures number format
   - Selects language
7. Admin clicks "Save Preferences"
8. API call to PATCH /settings/preferences
9. Success toast: "Preferences updated successfully"
10. Form closes, updated preferences displayed
11. System applies new preferences immediately
```

---

## API Integration

### API Service Files

**Create:** `src/services/settingsApi.ts`

```typescript
// Profile Settings APIs
- getCurrentUser(): Promise<User>
- updateProfile(data: UpdateProfileRequest): Promise<User>
- changePassword(data: ChangePasswordRequest): Promise<void>

// Hospital Settings APIs
- getHospitalDetails(tenantId: string): Promise<HospitalDetails>
- updateHospitalDetails(tenantId: string, data: UpdateHospitalRequest): Promise<HospitalDetails>

// System Preferences APIs
- getPreferences(tenantId?: string): Promise<SystemPreferences>
- updatePreferences(data: UpdatePreferencesRequest, tenantId?: string): Promise<SystemPreferences>
```

### Redux Integration (Optional)

Consider creating a settings slice if state management is needed:
- `src/redux/settingsSlice.ts`
- Actions: `fetchPreferences`, `updatePreferences`, `fetchProfile`, etc.

---

## Implementation Steps

### Step 1: Create API Service Layer

1. Create `src/services/settingsApi.ts`
2. Implement all API methods following existing patterns
3. Use `apiClient` for authenticated requests
4. Include proper error handling
5. Add TypeScript interfaces for all request/response types

**Files to create:**
- `src/services/settingsApi.ts`

**Estimated Time:** 2-3 hours

---

### Step 2: Create Settings Components

1. Create main `Settings.tsx` component with tab navigation
2. Create `ProfileSettings.tsx` component
3. Create `HospitalSettings.tsx` component
4. Create `SystemPreferences.tsx` component
5. Create form components:
   - `ProfileForm.tsx`
   - `ChangePasswordForm.tsx`
   - `HospitalForm.tsx`
   - `PreferencesForm.tsx`

**Files to create:**
- `src/components/settings/Settings.tsx`
- `src/components/settings/ProfileSettings.tsx`
- `src/components/settings/HospitalSettings.tsx`
- `src/components/settings/SystemPreferences.tsx`
- `src/components/settings/components/ProfileForm.tsx`
- `src/components/settings/components/ChangePasswordForm.tsx`
- `src/components/settings/components/HospitalForm.tsx`
- `src/components/settings/components/PreferencesForm.tsx`

**Estimated Time:** 8-10 hours

---

### Step 3: Integrate with Main App

1. Update `src/app/page.tsx`:
   - Add "settings" to `activeSection` type
   - Add settings section rendering
   - Import Settings component

2. Verify sidebar navigation already works (Settings link exists)

**Files to modify:**
- `src/app/page.tsx`

**Estimated Time:** 1 hour

---

### Step 4: Add Form Validation

1. Use `react-hook-form` for all forms (consistent with existing forms)
2. Add validation rules:
   - Email format validation
   - Password strength validation
   - Required field validation
   - Format validations (phone, tax ID, PAN)
3. Display validation errors inline

**Files to modify:**
- All form components

**Estimated Time:** 3-4 hours

---

### Step 5: Add Error Handling

1. Integrate `getErrorMessage` utility
2. Display user-friendly error messages
3. Handle API errors gracefully
4. Show appropriate toasts for success/error

**Files to modify:**
- All settings components

**Estimated Time:** 2 hours

---

### Step 6: Add Loading States

1. Add loading skeletons for initial data fetch
2. Add loading indicators for form submissions
3. Disable forms during API calls

**Files to modify:**
- All settings components

**Estimated Time:** 1-2 hours

---

### Step 7: Testing

1. Test all user flows
2. Test validation
3. Test error handling
4. Test role-based access
5. Test responsive design

**Estimated Time:** 4-5 hours

---

## Detailed Component Specifications

### 1. Settings.tsx (Main Container)

**Props:** None

**State:**
- `activeTab`: `"profile" | "hospital" | "preferences"`
- `loading`: boolean

**Features:**
- Horizontal tab navigation
- Tab content switching
- Consistent styling with other tabs (Manage Staff, IPD)

**UI Structure:**
```tsx
<div className="space-y-6">
  {/* Tab Navigation */}
  <div className="flex items-center border-b border-slate-200">
    <button>Profile Settings</button>
    <button>Hospital Settings</button>
    <button>System Preferences</button>
  </div>
  
  {/* Tab Content */}
  {activeTab === "profile" && <ProfileSettings />}
  {activeTab === "hospital" && <HospitalSettings />}
  {activeTab === "preferences" && <SystemPreferences />}
</div>
```

---

### 2. ProfileSettings.tsx

**Props:** None

**State:**
- `profile`: User | null
- `loading`: boolean
- `showEditForm`: boolean
- `showPasswordForm`: boolean

**Features:**
- Display current profile information
- Edit profile button
- Change password button
- Profile information card layout

**UI Structure:**
```tsx
<div className="space-y-6">
  {/* Profile Information Card */}
  <div className="rounded-xl border border-slate-200 bg-white p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">Profile Information</h3>
      <button onClick={handleEdit}>Edit Profile</button>
    </div>
    
    {/* Profile Details Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Full Name, Email, Role, Status, etc. */}
    </div>
  </div>
  
  {/* Change Password Card */}
  <div className="rounded-xl border border-slate-200 bg-white p-6">
    <h3 className="text-lg font-semibold mb-4">Security</h3>
    <button onClick={handleChangePassword}>Change Password</button>
  </div>
  
  {/* Modals */}
  {showEditForm && <ProfileFormModal />}
  {showPasswordForm && <ChangePasswordFormModal />}
</div>
```

---

### 3. HospitalSettings.tsx

**Props:** None

**State:**
- `hospital`: HospitalDetails | null
- `loading`: boolean
- `showEditForm`: boolean
- `isAdmin`: boolean (check from auth)

**Features:**
- Display hospital information
- Edit button (admin only)
- Read-only view for non-admins
- Organized sections (Contact, Address, Registration, Tax)

**UI Structure:**
```tsx
<div className="space-y-6">
  {!isAdmin && (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-700">
        Only administrators can edit hospital information.
      </p>
    </div>
  )}
  
  {/* Hospital Information Card */}
  <div className="rounded-xl border border-slate-200 bg-white p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">Hospital Information</h3>
      {isAdmin && <button onClick={handleEdit}>Edit Information</button>}
    </div>
    
    {/* Sections */}
    <div className="space-y-6">
      {/* Contact Information */}
      {/* Address */}
      {/* Registration Details */}
      {/* Tax Information */}
    </div>
  </div>
  
  {showEditForm && <HospitalFormModal />}
</div>
```

---

### 4. SystemPreferences.tsx

**Props:** None

**State:**
- `preferences`: SystemPreferences | null
- `loading`: boolean
- `showEditForm`: boolean
- `isAdmin`: boolean

**Features:**
- Display current preferences
- Edit button (admin only)
- Read-only view for non-admins
- Preference preview (show formatted example)

**UI Structure:**
```tsx
<div className="space-y-6">
  {!isAdmin && (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-700">
        Only administrators can edit system preferences.
      </p>
    </div>
  )}
  
  {/* Preferences Card */}
  <div className="rounded-xl border border-slate-200 bg-white p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">System Preferences</h3>
      {isAdmin && <button onClick={handleEdit}>Edit Preferences</button>}
    </div>
    
    {/* Preferences Display */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Date Format, Time Format, Timezone, Currency, etc. */}
    </div>
    
    {/* Preview Section */}
    <div className="mt-6 p-4 bg-slate-50 rounded-lg">
      <h4 className="text-sm font-semibold mb-2">Preview</h4>
      <p>Date: {formatDate(new Date(), preferences.date_format)}</p>
      <p>Time: {formatTime(new Date(), preferences.time_format)}</p>
      <p>Amount: {formatCurrency(1234.56, preferences.currency)}</p>
    </div>
  </div>
  
  {showEditForm && <PreferencesFormModal />}
</div>
```

---

## Form Specifications

### ProfileForm.tsx

**Fields:**
- Full Name (text input, required)
- Email (email input, required, unique validation)

**Validation:**
- Full name: 1-255 characters
- Email: Valid email format, unique within tenant

**Submit:**
- PATCH /auth/me
- Show success toast
- Refresh profile data

---

### ChangePasswordForm.tsx

**Fields:**
- Current Password (password input, required)
- New Password (password input, required)
- Confirm Password (password input, required)

**Validation:**
- Current password: Required, must match
- New password: Min 8 chars, alphanumeric
- Confirm password: Must match new password
- New password: Cannot be same as current

**Submit:**
- POST /auth/change-password
- Show success toast
- Optionally log user out for security

---

### HospitalForm.tsx

**Sections:**

1. **Basic Information**
   - Hospital Name (text input)

2. **Contact Information**
   - Email (email input)
   - Phone (text input)
   - Mobile (text input)

3. **Address**
   - Street (text input)
   - City (text input)
   - State (text input)
   - Postal Code (text input)
   - Country (text input or dropdown)

4. **Registration Details**
   - Registration Number (text input)
   - License Number (text input)

5. **Tax Information**
   - Tax ID (text input)
   - PAN Number (text input)

**Validation:**
- Email: Valid format
- Phone/Mobile: Valid format
- Tax ID: Valid format
- PAN: 10 characters, alphanumeric

**Submit:**
- PATCH /tenants/{tenant_id}
- Show success toast
- Refresh hospital data

---

### PreferencesForm.tsx

**Fields:**

1. **Date & Time**
   - Date Format (dropdown: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY)
   - Time Format (dropdown: 12h, 24h)
   - Timezone (searchable dropdown with IANA timezones)

2. **Currency**
   - Currency Code (searchable dropdown: INR, USD, EUR, etc.)
   - Currency Symbol (text input, auto-filled based on code)
   - Symbol Position (dropdown: before, after)

3. **Number Format**
   - Decimal Separator (dropdown: ., ,)
   - Thousands Separator (dropdown: ., ,, space)

4. **Language**
   - Language (dropdown: en, hi, mr, etc.)

**Validation:**
- All fields: Valid enum values
- Timezone: Valid IANA identifier
- Currency Code: Valid ISO 4217 code

**Submit:**
- PATCH /settings/preferences
- Show success toast
- Refresh preferences data
- Apply preferences immediately

---

## Testing Checklist

### Functional Testing

#### Profile Settings
- [ ] View profile information displays correctly
- [ ] Edit profile form opens with current values
- [ ] Update profile with valid data succeeds
- [ ] Update profile with duplicate email fails
- [ ] Change password with correct current password succeeds
- [ ] Change password with incorrect current password fails
- [ ] Change password with weak password fails
- [ ] Change password with mismatched confirm password fails
- [ ] Form validation works correctly
- [ ] Success/error toasts display correctly

#### Hospital Settings
- [ ] View hospital information displays correctly (all users)
- [ ] Edit button only visible to admins
- [ ] Non-admins see read-only message
- [ ] Edit form opens with current values
- [ ] Update hospital info with valid data succeeds
- [ ] Update with invalid email format fails
- [ ] Update with invalid tax ID format fails
- [ ] All sections display correctly
- [ ] Form validation works correctly

#### System Preferences
- [ ] View preferences displays correctly (all users)
- [ ] Edit button only visible to admins
- [ ] Non-admins see read-only message
- [ ] Edit form opens with current values
- [ ] Update preferences with valid data succeeds
- [ ] Update with invalid timezone fails
- [ ] Update with invalid currency code fails
- [ ] Preview section updates correctly
- [ ] Preferences apply immediately after save

### UI/UX Testing
- [ ] Tab navigation works smoothly
- [ ] Forms are responsive (mobile, tablet, desktop)
- [ ] Loading states display correctly
- [ ] Error messages are clear and helpful
- [ ] Success messages are informative
- [ ] Forms have proper focus management
- [ ] Keyboard navigation works
- [ ] Accessibility (ARIA labels, screen readers)

### Security Testing
- [ ] Non-admins cannot edit hospital settings
- [ ] Non-admins cannot edit system preferences
- [ ] Users can only edit their own profile
- [ ] Password change requires current password
- [ ] API calls include proper authentication
- [ ] Sensitive data is not exposed

### Integration Testing
- [ ] All API calls work correctly
- [ ] Error handling works for network errors
- [ ] Error handling works for API errors
- [ ] Data refreshes after successful updates
- [ ] Preferences apply to other parts of the app

---

## Dependencies

### New Dependencies
None required - all dependencies already exist in the project:
- `react-hook-form` (already used)
- `sonner` (for toasts, already used)
- `lucide-react` (for icons, already used)
- `axios` (for API calls, already used)

### Existing Utilities
- `src/utils/errorHandler.ts` - Error message extraction
- `src/utils/auth.ts` - Authentication utilities
- `src/utils/format.ts` - Formatting utilities (may need to extend)

---

## Timeline Estimate

| Task | Estimated Time |
|------|----------------|
| API Service Layer | 2-3 hours |
| Component Creation | 8-10 hours |
| Main App Integration | 1 hour |
| Form Validation | 3-4 hours |
| Error Handling | 2 hours |
| Loading States | 1-2 hours |
| Testing | 4-5 hours |
| **Total** | **21-27 hours** |

**Note:** This is a rough estimate. Actual time may vary based on complexity and any unforeseen issues.

---

## Future Enhancements (Post Phase 1)

1. **Profile Picture Upload**
   - Upload profile picture
   - Crop and resize functionality
   - Preview before save

2. **Two-Factor Authentication**
   - Enable/disable 2FA
   - QR code generation
   - Backup codes

3. **Email Verification**
   - Send verification email
   - Verify email address
   - Resend verification

4. **Password Reset**
   - Forgot password flow
   - Email-based reset
   - Security questions

5. **Session Management**
   - View active sessions
   - Logout from all devices
   - Session timeout settings

6. **Notification Preferences**
   - Email notification settings
   - SMS notification settings
   - In-app notification preferences

7. **Theme Customization**
   - Light/dark mode toggle
   - Color scheme customization
   - UI density options

8. **Advanced Preferences**
   - Invoice number format
   - Token number format
   - Auto-assignment rules
   - Default values for forms

---

## Notes

1. **Consistency**: Follow existing patterns from Manage Staff, IPD, and other tabs
2. **Accessibility**: Ensure all forms are keyboard navigable and screen reader friendly
3. **Performance**: Use React.memo and useCallback where appropriate
4. **Error Messages**: Make error messages user-friendly and actionable
5. **Loading States**: Provide clear feedback during API calls
6. **Validation**: Validate on both client and server side
7. **Security**: Never expose sensitive information in error messages
8. **Testing**: Test with different user roles and permissions

---

## Approval

**Prepared by:** AI Assistant  
**Date:** 2024-12-16  
**Status:** Ready for Implementation

**Next Steps:**
1. Review and approve this plan
2. Backend team implements APIs (see API spec document)
3. Frontend team implements UI components
4. Integration and testing
5. Deployment

---

## Appendix: Design Mockups

### Settings Tab Navigation
```
┌─────────────────────────────────────────────────────┐
│  Settings                                            │
├─────────────────────────────────────────────────────┤
│  [Profile Settings] [Hospital Settings] [System]    │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  Tab Content Area                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Profile Settings View
```
┌─────────────────────────────────────────────────────┐
│  Profile Information                    [Edit]      │
├─────────────────────────────────────────────────────┤
│  Full Name:        Dr. John Smith                   │
│  Email:            john.smith@hospital.com          │
│  Role:             Admin                            │
│  Status:           Active                           │
│  Created:          15 Jan 2024                      │
│  Last Login:       16 Dec 2024, 08:00 AM            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Security                                           │
├─────────────────────────────────────────────────────┤
│  [Change Password]                                   │
└─────────────────────────────────────────────────────┘
```

### Hospital Settings View
```
┌─────────────────────────────────────────────────────┐
│  Hospital Information                  [Edit]      │
├─────────────────────────────────────────────────────┤
│  Hospital Name:    City General Hospital            │
│                                                      │
│  Contact Information                                │
│  Email:            info@citygeneral.com             │
│  Phone:            +91-9876543210                   │
│  Mobile:           9876543210                       │
│                                                      │
│  Address                                           │
│  Street:           123 Medical Street              │
│  City:             Mumbai                           │
│  State:            Maharashtra                      │
│  Postal Code:      400001                           │
│  Country:          India                            │
│                                                      │
│  Registration Details                               │
│  Registration #:   HOSP-2020-001                    │
│  License #:        LIC-12345                        │
│                                                      │
│  Tax Information                                    │
│  Tax ID:           GST123456789                     │
│  PAN Number:       ABCDE1234F                       │
└─────────────────────────────────────────────────────┘
```

### System Preferences View
```
┌─────────────────────────────────────────────────────┐
│  System Preferences                    [Edit]       │
├─────────────────────────────────────────────────────┤
│  Date Format:        DD/MM/YYYY                     │
│  Time Format:        24h                            │
│  Timezone:           Asia/Kolkata                  │
│  Currency:           ₹ INR (before)                 │
│  Number Format:      1,234.56                       │
│  Language:           English                        │
│                                                      │
│  Preview                                             │
│  Date: 16/12/2024                                   │
│  Time: 14:30                                         │
│  Amount: ₹1,234.56                                  │
└─────────────────────────────────────────────────────┘
```

---

**End of Document**

