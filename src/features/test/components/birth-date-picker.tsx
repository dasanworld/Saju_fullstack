"use client";

import { useState, useEffect } from "react";
import { format, getYear, parse, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface BirthDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
}

const currentYear = getYear(new Date());

export const BirthDatePicker = ({ value, onChange }: BirthDatePickerProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setInputValue(format(value, "yyyy-MM-dd"));
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue.length === 10) {
      const parsedDate = parse(newValue, "yyyy-MM-dd", new Date());
      if (isValid(parsedDate) && parsedDate <= new Date() && parsedDate >= new Date("1900-01-01")) {
        onChange(parsedDate);
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
      setInputValue(format(date, "yyyy-MM-dd"));
    }
    setIsOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder="YYYY-MM-DD"
        value={inputValue}
        onChange={handleInputChange}
        className="flex-1"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(!value && "text-muted-foreground")}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            captionLayout="dropdown"
            fromYear={1900}
            toYear={currentYear}
            defaultMonth={value ?? new Date(1990, 0, 1)}
            disabled={(date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
            locale={ko}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
