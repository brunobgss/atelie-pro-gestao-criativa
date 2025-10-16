import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface MobileFormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
}

export function MobileFormField({ 
  label, 
  children, 
  required = false, 
  error, 
  className 
}: MobileFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        {children}
      </div>
      {error && (
        <p className="text-sm text-destructive animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  containerClassName?: string;
}

export function MobileInput({ 
  label, 
  required = false, 
  error, 
  containerClassName,
  className,
  ...props 
}: MobileInputProps) {
  return (
    <MobileFormField 
      label={label} 
      required={required} 
      error={error}
      className={containerClassName}
    >
      <Input
        className={cn(
          "h-12 text-base transition-all duration-200",
          "focus:ring-2 focus:ring-primary focus:border-transparent",
          "placeholder:text-muted-foreground",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        {...props}
      />
    </MobileFormField>
  );
}

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  containerClassName?: string;
}

export function MobileTextarea({ 
  label, 
  required = false, 
  error, 
  containerClassName,
  className,
  ...props 
}: MobileTextareaProps) {
  return (
    <MobileFormField 
      label={label} 
      required={required} 
      error={error}
      className={containerClassName}
    >
      <Textarea
        className={cn(
          "min-h-[120px] text-base transition-all duration-200",
          "focus:ring-2 focus:ring-primary focus:border-transparent",
          "placeholder:text-muted-foreground resize-none",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        {...props}
      />
    </MobileFormField>
  );
}

interface MobileSelectProps {
  label: string;
  required?: boolean;
  error?: string;
  containerClassName?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function MobileSelect({ 
  label, 
  required = false, 
  error, 
  containerClassName,
  placeholder = "Selecione...",
  value,
  onValueChange,
  children
}: MobileSelectProps) {
  return (
    <MobileFormField 
      label={label} 
      required={required} 
      error={error}
      className={containerClassName}
    >
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger 
          className={cn(
            "h-12 text-base transition-all duration-200",
            "focus:ring-2 focus:ring-primary focus:border-transparent",
            error && "border-destructive focus:ring-destructive"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {children}
        </SelectContent>
      </Select>
    </MobileFormField>
  );
}

interface MobileFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export function MobileForm({ children, onSubmit, className }: MobileFormProps) {
  return (
    <form 
      onSubmit={onSubmit}
      className={cn(
        "space-y-6 p-4 sm:p-6",
        "bg-card rounded-lg border shadow-sm",
        className
      )}
    >
      {children}
    </form>
  );
}

interface MobileFormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFormActions({ children, className }: MobileFormActionsProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row gap-3 pt-4 border-t",
      "sticky bottom-0 bg-card/95 backdrop-blur-sm",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function MobileSubmitButton({ 
  isLoading = false, 
  loadingText = "Salvando...", 
  children, 
  className,
  disabled,
  ...props 
}: MobileSubmitButtonProps) {
  return (
    <Button
      type="submit"
      className={cn(
        "h-12 text-base font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        isLoading && "opacity-70 cursor-not-allowed",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </Button>
  );
}

// Mobile-optimized card component
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export function MobileCard({ 
  children, 
  className, 
  onClick, 
  interactive = false 
}: MobileCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-lg border shadow-sm transition-all duration-200",
        "p-4 sm:p-6",
        interactive && "hover:shadow-md hover:-translate-y-1 cursor-pointer",
        "active:scale-95 active:transition-transform",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Mobile-optimized grid layout
interface MobileGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}

export function MobileGrid({ 
  children, 
  className, 
  cols = 1 
}: MobileGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };

  return (
    <div className={cn(
      "grid gap-4 sm:gap-6",
      gridCols[cols],
      className
    )}>
      {children}
    </div>
  );
}
