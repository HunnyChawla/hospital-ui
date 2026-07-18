"use client";

import { useEffect, useState } from "react";
import { labTestsApi, PrescriptionField } from "@/services/labTestsApi";
import { Modal } from "../common/Modal";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Loader2, Plus, Edit, Trash2, X } from "lucide-react";

interface PrescriptionFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCode: string;
  testName: string;
}

export function PrescriptionFieldsModal({
  isOpen,
  onClose,
  testCode,
  testName,
}: PrescriptionFieldsModalProps) {
  const [fields, setFields] = useState<PrescriptionField[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "dropdown" | "number">("text");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen && testCode) {
      fetchFields();
    }
  }, [isOpen, testCode]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const data = await labTestsApi.listPrescriptionFields(testCode);
      setFields(data.sort((a, b) => a.display_order - b.display_order));
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to fetch prescription fields");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOption.trim() && !dropdownOptions.includes(newOption.trim())) {
      setDropdownOptions([...dropdownOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setDropdownOptions(dropdownOptions.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setEditingFieldId(null);
    setShowForm(false);
    setFieldName("");
    setFieldType("text");
    setDropdownOptions([]);
    setNewOption("");
    setIsRequired(false);
    setDisplayOrder(fields.length + 1);
    setIsActive(true);
  };

  const handleEditClick = (field: PrescriptionField) => {
    setEditingFieldId(field.id);
    setFieldName(field.field_name);
    setFieldType(field.field_type);
    setDropdownOptions(field.dropdown_options || []);
    setIsRequired(field.is_required);
    setDisplayOrder(field.display_order);
    setIsActive(field.is_active);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) {
      toast.error("Field name is required");
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        field_name: fieldName,
        field_type: fieldType,
        dropdown_options: fieldType === "dropdown" ? dropdownOptions : null,
        is_required: isRequired,
        display_order: Number(displayOrder),
        is_active: isActive,
      };

      if (editingFieldId) {
        await labTestsApi.updatePrescriptionField(testCode, editingFieldId, data);
        toast.success("Prescription field updated successfully");
      } else {
        await labTestsApi.createPrescriptionField(testCode, data);
        toast.success("Prescription field created successfully");
      }
      
      resetForm();
      fetchFields();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to save prescription field");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (fieldId: string) => {
    if (!confirm("Are you sure you want to delete this prescription field?")) return;
    
    try {
      await labTestsApi.deletePrescriptionField(testCode, fieldId);
      toast.success("Prescription field deleted successfully");
      fetchFields();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to delete prescription field");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Prescription Fields - ${testName}`}
      size="lg"
    >
      <div className="space-y-4">
        {showForm ? (
          <form onSubmit={handleSubmit} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">
              {editingFieldId ? "Edit Field" : "Add Prescription Field"}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Field Name *</label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 bg-white"
                  placeholder="e.g. Eye, Eye Location"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Field Type *</label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 bg-white"
                >
                  <option value="text">Text Input</option>
                  <option value="number">Number Input</option>
                  <option value="dropdown">Dropdown Select</option>
                </select>
              </div>
            </div>

            {fieldType === "dropdown" && (
              <div className="border-t border-slate-200 pt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Dropdown Options</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-sky-400 bg-white"
                    placeholder="Add option"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="bg-sky-500 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-sky-600 font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dropdownOptions.map((opt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 rounded px-2 py-0.5 text-xs font-semibold">
                      {opt}
                      <button type="button" onClick={() => handleRemoveOption(i)} className="text-sky-500 hover:text-sky-700">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {dropdownOptions.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No options added yet</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Display Order</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-sky-400 bg-white"
                  min="1"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded border-slate-300 text-sky-500 focus:ring-sky-400 h-4 w-4"
                />
                <label htmlFor="isRequired" className="text-xs font-semibold text-slate-600 cursor-pointer">Required</label>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-sky-500 focus:ring-sky-400 h-4 w-4"
                />
                <label htmlFor="isActive" className="text-xs font-semibold text-slate-600 cursor-pointer">Active</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow hover:shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                {editingFieldId ? "Save Changes" : "Create Field"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setDisplayOrder(fields.length + 1);
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl px-4 py-2 text-xs font-semibold hover:shadow-md shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              Add Prescription Field
            </button>
          </div>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
            <div className="col-span-1 text-center">Order</div>
            <div className="col-span-3">Field Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-center">Required</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            </div>
          ) : fields.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 italic">
              No custom prescription fields configured for this test.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {fields.map((field) => (
                <div key={field.id} className="grid grid-cols-12 items-center px-4 py-3 text-xs text-slate-800">
                  <div className="col-span-1 text-center font-mono font-bold text-slate-500">{field.display_order}</div>
                  <div className="col-span-3 font-semibold text-slate-900">{field.field_name}</div>
                  <div className="col-span-2 capitalize text-slate-600">{field.field_type}</div>
                  <div className="col-span-2 text-center">
                    {field.is_required ? (
                      <span className="inline-flex items-center justify-center text-rose-600 font-bold bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5">Yes</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`pill px-2 py-0.5 ${field.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}>
                      {field.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleEditClick(field)}
                      className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded"
                      title="Edit field"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(field.id)}
                      className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                      title="Delete field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
