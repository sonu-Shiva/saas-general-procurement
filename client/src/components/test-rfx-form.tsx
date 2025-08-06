import React from 'react';
import { Button } from "@/components/ui/button";

interface TestRfxFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TestRfxForm({ onClose, onSuccess }: TestRfxFormProps) {
  console.log("TestRfxForm rendering successfully!");
  
  return (
    <div className="p-6 bg-white border-2 border-red-500">
      <h2 className="text-2xl font-bold mb-4">Test RFx Form</h2>
      <p className="mb-4">This is a minimal test form to check if the dialog works.</p>
      <div className="flex gap-4">
        <Button onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button onClick={onSuccess}>
          Test Success
        </Button>
      </div>
    </div>
  );
}