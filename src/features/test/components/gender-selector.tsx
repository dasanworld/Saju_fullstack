"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface GenderSelectorProps {
  value?: string;
  onChange: (gender: "male" | "female") => void;
}

export const GenderSelector = ({ value, onChange }: GenderSelectorProps) => {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className="flex gap-4"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="male" id="male" />
        <Label htmlFor="male" className="cursor-pointer">
          남성
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="female" id="female" />
        <Label htmlFor="female" className="cursor-pointer">
          여성
        </Label>
      </div>
    </RadioGroup>
  );
};
