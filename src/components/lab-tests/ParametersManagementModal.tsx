"use client";

import { useEffect, useState } from "react";
import { labTestsApi, LabTestParameter, CreateLabTestParameterRequest, UpdateLabTestParameterRequest } from "@/services/labTestsApi";
import { Modal } from "../common/Modal";
import { ParameterForm } from "./ParameterForm";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Loader2, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";

interface ParametersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCode: string;
  testName: string;
}

export function ParametersManagementModal({
  isOpen,
  onClose,
  testCode,
  testName,
}: ParametersManagementModalProps) {
  const [parameters, setParameters] = useState<LabTestParameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingParameter, setEditingParameter] = useState<LabTestParameter | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && testCode) {
      fetchParameters();
    } else {
      // Reset state when modal closes
      setParameters([]);
      setShowForm(false);
      setEditingParameter(null);
    }
  }, [isOpen, testCode]);

  const fetchParameters = async () => {
    setLoading(true);
    try {
      const data = await labTestsApi.getTestParameters(testCode);
      // Sort by display_order
      const sorted = [...data].sort((a, b) => a.display_order - b.display_order);
      setParameters(sorted);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch parameters");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingParameter(null);
    setShowForm(true);
  };

  const handleEditClick = (parameter: LabTestParameter) => {
    setEditingParameter(parameter);
    setShowForm(true);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingParameter(null);
  };

  const handleFormSubmit = async (data: CreateLabTestParameterRequest | UpdateLabTestParameterRequest) => {
    setSubmitting(true);
    try {
      if (editingParameter) {
        // Update existing parameter
        await labTestsApi.updateParameter(testCode, editingParameter.id, data as UpdateLabTestParameterRequest);
        toast.success("Parameter updated successfully");
      } else {
        // Create new parameter
        await labTestsApi.createParameter(testCode, data as CreateLabTestParameterRequest);
        toast.success("Parameter added successfully");
      }
      setShowForm(false);
      setEditingParameter(null);
      await fetchParameters();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || `Failed to ${editingParameter ? "update" : "create"} parameter`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (parameter: LabTestParameter) => {
    if (!confirm(`Are you sure you want to delete parameter "${parameter.parameter_name}"?`)) {
      return;
    }

    setDeletingId(parameter.id);
    try {
      await labTestsApi.deleteParameter(testCode, parameter.id);
      toast.success("Parameter deleted successfully");
      await fetchParameters();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to delete parameter");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (parameter: LabTestParameter) => {
    try {
      await labTestsApi.updateParameter(testCode, parameter.id, {
        is_active: !parameter.is_active,
      });
      toast.success(`Parameter ${!parameter.is_active ? "activated" : "deactivated"}`);
      await fetchParameters();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to update parameter status");
    }
  };

  const getNormalRangeDisplay = (param: LabTestParameter): string => {
    if (param.normal_text) return param.normal_text;
    if (param.normal_min !== null && param.normal_max !== null) {
      return `${param.normal_min}-${param.normal_max}`;
    }
    if (param.normal_min !== null) return `≥${param.normal_min}`;
    if (param.normal_max !== null) return `≤${param.normal_max}`;
    return "-";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Parameters - ${testName} (${testCode})`}
      size="xl"
    >
      {showForm ? (
        <ParameterForm
          parameter={editingParameter || undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isSubmitting={submitting}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {parameters.length} parameter{parameters.length !== 1 ? "s" : ""} configured
            </p>
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
            >
              <Plus className="h-4 w-4" />
              Add Parameter
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              <span className="ml-3 text-slate-600">Loading parameters...</span>
            </div>
          ) : parameters.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-slate-600">No parameters found</p>
              <p className="mt-2 text-sm text-slate-500">
                Add parameters to define what values need to be collected for this test.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Normal Range
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Gender
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Age Range
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parameters.map((param) => (
                      <tr
                        key={param.id}
                        className={`transition hover:bg-slate-50 ${
                          !param.is_active ? "bg-slate-50/50 opacity-75" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {param.display_order}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {param.parameter_code}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {param.parameter_name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{param.unit}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {getNormalRangeDisplay(param)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {param.gender === "ALL" ? "All" : param.gender === "M" ? "Male" : "Female"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {param.age_min}-{param.age_max}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(param)}
                            className={`pill text-xs ${
                              param.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {param.is_active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(param)}
                              className="rounded-lg p-1.5 text-sky-600 transition hover:bg-sky-50"
                              title="Edit parameter"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(param)}
                              disabled={deletingId === param.id}
                              className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                              title="Delete parameter"
                            >
                              {deletingId === param.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

