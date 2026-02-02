# Confirmation Dialog - Usage Guide

## Overview

A reusable confirmation dialog component that replaces browser's native `confirm()` with a beautiful, consistent UI.

## Components Created

1. **`ConfirmationDialog`** - The main dialog component
2. **`useConfirm`** - React hook for easier integration (optional)

---

## Method 1: Direct Component Usage (Recommended for DiagnosesPanel)

### Import

```tsx
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
```

### State Management

```tsx
const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
```

### Trigger Dialog

```tsx
const handleDeleteClick = (id: string, name: string) => {
  setDeleteConfirmation({ id, name });
};
```

### Handle Confirmation

```tsx
const handleDeleteConfirm = async () => {
  if (!deleteConfirmation) return;
  
  try {
    await deleteItem(deleteConfirmation.id);
    toast.success("Item deleted successfully");
    setDeleteConfirmation(null);
  } catch (error) {
    toast.error("Failed to delete item");
  }
};
```

### Render Dialog

```tsx
<ConfirmationDialog
  isOpen={!!deleteConfirmation}
  onClose={() => setDeleteConfirmation(null)}
  onConfirm={handleDeleteConfirm}
  title="Delete Item"
  message={`Are you sure you want to delete "${deleteConfirmation?.name}"?`}
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
  isLoading={isDeleting}
/>
```

---

## Method 2: Using the Hook (Alternative)

### Import

```tsx
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { useConfirm } from "@/hooks/useConfirm";
```

### Setup Hook

```tsx
const { confirmState, confirm, closeConfirm } = useConfirm();
```

### Use in Handler

```tsx
const handleDelete = async (id: string, name: string) => {
  const confirmed = await confirm({
    title: "Delete Item",
    message: `Are you sure you want to delete "${name}"?`,
    confirmText: "Delete",
    variant: "danger"
  });
  
  if (confirmed) {
    // Perform delete action
    await deleteItem(id);
    toast.success("Item deleted");
  }
};
```

### Render Dialog

```tsx
<ConfirmationDialog {...confirmState} />
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Controls dialog visibility |
| `onClose` | `() => void` | - | Called when dialog is closed |
| `onConfirm` | `() => void` | - | Called when user confirms |
| `title` | `string` | - | Dialog title |
| `message` | `string` | - | Dialog message/description |
| `confirmText` | `string` | `"Confirm"` | Text for confirm button |
| `cancelText` | `string` | `"Cancel"` | Text for cancel button |
| `variant` | `"danger" \| "warning" \| "info"` | `"danger"` | Dialog style variant |
| `isLoading` | `boolean` | `false` | Shows loading state |

---

## Variants

### Danger (Red)
Use for destructive actions like delete, remove, etc.
```tsx
variant="danger"
```

### Warning (Amber)
Use for actions that need caution but aren't destructive.
```tsx
variant="warning"
```

### Info (Blue)
Use for informational confirmations.
```tsx
variant="info"
```

---

## Examples

### Delete Confirmation

```tsx
<ConfirmationDialog
  isOpen={showDeleteDialog}
  onClose={() => setShowDeleteDialog(false)}
  onConfirm={handleDelete}
  title="Delete Patient Record"
  message="Are you sure you want to delete this patient record? This action cannot be undone."
  confirmText="Delete"
  variant="danger"
/>
```

### Finalize Action

```tsx
<ConfirmationDialog
  isOpen={showFinalizeDialog}
  onClose={() => setShowFinalizeDialog(false)}
  onConfirm={handleFinalize}
  title="Finalize Prescription"
  message="Once finalized, this prescription cannot be edited. Continue?"
  confirmText="Finalize"
  variant="warning"
/>
```

### Info Confirmation

```tsx
<ConfirmationDialog
  isOpen={showSendDialog}
  onClose={() => setShowSendDialog(false)}
  onConfirm={handleSend}
  title="Send Notification"
  message="Send notification to all registered users?"
  confirmText="Send"
  variant="info"
/>
```

---

## Migration from `window.confirm()`

### Before

```tsx
const handleDelete = async (id: string, name: string) => {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
  
  await deleteItem(id);
};
```

### After

```tsx
const [deleteConfirmation, setDeleteConfirmation] = useState<{id: string, name: string} | null>(null);

const handleDeleteClick = (id: string, name: string) => {
  setDeleteConfirmation({ id, name });
};

const handleDeleteConfirm = async () => {
  if (!deleteConfirmation) return;
  await deleteItem(deleteConfirmation.id);
  setDeleteConfirmation(null);
};

// In JSX
<button onClick={() => handleDeleteClick(item.id, item.name)}>Delete</button>

<ConfirmationDialog
  isOpen={!!deleteConfirmation}
  onClose={() => setDeleteConfirmation(null)}
  onConfirm={handleDeleteConfirm}
  title="Delete Item"
  message={`Are you sure you want to delete "${deleteConfirmation?.name}"?`}
  variant="danger"
/>
```

---

## Files

- **Component**: `/src/components/common/ConfirmationDialog.tsx`
- **Hook**: `/src/hooks/useConfirm.ts`
- **Example Usage**: `/src/components/master-data/DiagnosesPanel.tsx`
