import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const convertRfxSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scope: z.string().min(1, "Scope is required"),
  type: z.enum(["rfp", "rfq"]),
  dueDate: z.string().min(1, "Due date is required"),
  budget: z.string().optional(),
  criteria: z.string().optional(),
  evaluationParameters: z.string().optional(),
});

type ConvertRfxData = z.infer<typeof convertRfxSchema>;

interface ConvertRfxFormProps {
  sourceRfx: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConvertRfxForm({ sourceRfx, onClose, onSuccess }: ConvertRfxFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<ConvertRfxData>({
    resolver: zodResolver(convertRfxSchema),
    defaultValues: {
      title: `${sourceRfx.title} - Follow Up`,
      scope: sourceRfx.scope || "",
      type: sourceRfx.type === "rfi" ? "rfp" : "rfq",
      dueDate: "",
      budget: sourceRfx.budget || "",
      criteria: sourceRfx.criteria || "",
      evaluationParameters: sourceRfx.evaluationParameters || "",
    },
  });

  const selectedType = form.watch("type");

  const convertRfxMutation = useMutation({
    mutationFn: async (data: ConvertRfxData) => {
      const response = await fetch("/api/rfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          scope: data.scope,
          type: data.type,
          dueDate: data.dueDate,
          budget: data.budget || undefined,
          bomId: sourceRfx.bomId || undefined,
          criteria: data.criteria || undefined,
          evaluationParameters: data.evaluationParameters || undefined,
          parentRfxId: sourceRfx.id, // Link to the source RFx
          status: "active",
        }),
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      onSuccess();
    },
  });

  const onSubmit = (data: ConvertRfxData) => {
    convertRfxMutation.mutate(data);
  };

  return (
    <div className="w-full p-6 space-y-6 bg-background">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Convert {sourceRfx.type.toUpperCase()} to {selectedType.toUpperCase()}
        </h2>
        <p className="text-muted-foreground">
          Creating a new {selectedType.toUpperCase()} based on "{sourceRfx.title}"
        </p>
        <div className="mt-2">
          <Badge variant="outline" className="text-xs">
            Source: {sourceRfx.type.toUpperCase()} - {sourceRfx.referenceNo}
          </Badge>
          {sourceRfx.bomId && (
            <Badge variant="outline" className="text-xs ml-2">
              BOM Linked
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Type Selection */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Convert To</h3>
              <p className="text-sm text-muted-foreground">Choose the target request type</p>
            </div>
            <div className="flex gap-3">
              {[
                { value: "rfp", label: "RFP", desc: "Request for Proposal", disabled: sourceRfx.type === "rfp" },
                { value: "rfq", label: "RFQ", desc: "Request for Quote", disabled: sourceRfx.type === "rfq" }
              ].map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={selectedType === type.value ? "default" : "outline"}
                  disabled={type.disabled}
                  className={`flex-1 h-auto p-4 text-left ${
                    selectedType === type.value ? "border-2 border-primary" : "border-2 border-border"
                  } ${type.disabled ? "opacity-50" : ""}`}
                  onClick={() => !type.disabled && form.setValue("type", type.value as any)}
                >
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs opacity-75">{type.desc}</div>
                    {type.disabled && <div className="text-xs text-muted-foreground mt-1">Already {type.label}</div>}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Updated Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter request title"
                  className="border-2 border-border focus:border-primary"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">New Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...form.register("dueDate")}
                  className="border-2 border-border focus:border-primary"
                />
                {form.formState.errors.dueDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope *</Label>
              <Textarea
                id="scope"
                {...form.register("scope")}
                rows={3}
                placeholder="Update the scope and requirements"
                className="border-2 border-border focus:border-primary"
              />
              {form.formState.errors.scope && (
                <p className="text-sm text-destructive">{form.formState.errors.scope.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (Optional)</Label>
              <Input
                id="budget"
                {...form.register("budget")}
                placeholder="e.g., ₹50,000 - ₹100,000"
                className="border-2 border-border focus:border-primary"
              />
            </div>
          </div>
        </Card>

        {/* Requirements and Criteria */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Requirements & Criteria</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="criteria">Requirements (Optional)</Label>
                <Textarea
                  id="criteria"
                  {...form.register("criteria")}
                  rows={4}
                  placeholder="Detailed requirements and specifications"
                  className="border-2 border-border focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evaluationParameters">Evaluation Criteria (Optional)</Label>
                <Textarea
                  id="evaluationParameters"
                  {...form.register("evaluationParameters")}
                  rows={3}
                  placeholder="How will proposals be evaluated? (e.g., price 40%, quality 30%, delivery 30%)"
                  className="border-2 border-border focus:border-primary"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="border-2 border-border">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={convertRfxMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {convertRfxMutation.isPending ? "Converting..." : `Create ${selectedType.toUpperCase()}`}
          </Button>
        </div>
      </form>
    </div>
  );
}