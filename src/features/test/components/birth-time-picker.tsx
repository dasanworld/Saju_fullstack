"use client";

import { Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BirthTimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}

export const BirthTimePicker = ({
  value,
  onChange,
  disabled,
}: BirthTimePickerProps) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const [hour, minute] = value ? value.split(":").map(Number) : [12, 0];

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour.padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${String(hour).padStart(2, "0")}:${newMinute.padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <Select
        value={String(hour)}
        onValueChange={handleHourChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, "0")}시
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>:</span>
      <Select
        value={String(minute)}
        onValueChange={handleMinuteChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, "0")}분
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
