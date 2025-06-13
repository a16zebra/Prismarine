import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ChecklistPrismProps {
  label: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

export default function ChecklistPrism({
  label,
  defaultChecked = false,
  onChange,
}: ChecklistPrismProps) {
  const [checked, setChecked] = useState(defaultChecked);

  function toggleChecked() {
    const newVal = !checked;
    setChecked(newVal);
    onChange?.(newVal);
  }

  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="check" checked={checked} onCheckedChange={toggleChecked} />
      <Label htmlFor="check">{label}</Label>
    </div>
  )
}

