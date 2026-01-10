"use client"

import { useEffect } from "react"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { FieldRow } from "./field-row"
import { FormPreview } from "./form-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, FileText } from "lucide-react"

export function FormBuilder() {
  const {
    fields,
    isLoadingFields,
    isSavingField,
    fetchFields,
    createField,
    updateField,
    deleteField,
  } = useOnboardingStore()

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const handleAddField = async () => {
    const maxSortOrder = Math.max(...fields.map((f) => f.sort_order), 0)
    await createField({
      field_label: "New Field",
      field_type: "text",
      placeholder: "",
      is_required: false,
      sort_order: maxSortOrder + 1,
    })
  }

  if (isLoadingFields && fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-[150px]">
      {/* Left: Field List (2/3 width) */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Intake Form Fields</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Customize the fields clients fill out during onboarding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fields configured</p>
              <p className="text-sm">Add your first field to get started</p>
            </div>
          ) : (
            fields
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onUpdate={updateField}
                  onDelete={deleteField}
                  isUpdating={isSavingField}
                />
              ))
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleAddField}
            disabled={isSavingField}
          >
            {isSavingField ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Add Field
          </Button>
        </CardContent>
      </Card>

      {/* Right: Form Preview (1/3 width) */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Form Preview</CardTitle>
          <CardDescription className="text-xs">
            Preview how the intake form will appear to clients
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <FormPreview fields={fields} />
        </CardContent>
      </Card>
    </div>
  )
}
