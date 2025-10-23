import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInternationalization } from '@/contexts/InternationalizationContext';
import { Country, AVAILABLE_COUNTRIES, COUNTRIES } from '@/types/internationalization';
import { Globe, Check } from 'lucide-react';

interface CountrySelectorProps {
  variant?: 'dropdown' | 'select';
  className?: string;
}

export function CountrySelector({ variant = 'dropdown', className }: CountrySelectorProps) {
  const { currentCountry, countryConfig, setCountry } = useInternationalization();
  const [isOpen, setIsOpen] = useState(false);

  const handleCountryChange = (country: Country) => {
    setCountry(country);
    setIsOpen(false);
  };

  if (variant === 'select') {
    return (
      <Select value={currentCountry} onValueChange={handleCountryChange}>
        <SelectTrigger className={`w-[200px] ${className}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{countryConfig.flag}</span>
            <span className="font-medium">{countryConfig.name}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_COUNTRIES.map((country) => {
            const config = COUNTRIES[country];
            return (
              <SelectItem key={country} value={country}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.flag}</span>
                  <span>{config.name}</span>
                  <span className="text-muted-foreground text-sm">
                    ({config.currencySymbol})
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 ${className}`}
        >
          <Globe className="w-4 h-4" />
          <span className="text-lg">{countryConfig.flag}</span>
          <span className="font-medium">{countryConfig.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {AVAILABLE_COUNTRIES.map((country) => {
          const config = COUNTRIES[country];
          const isSelected = country === currentCountry;
          
          return (
            <DropdownMenuItem
              key={country}
              onClick={() => handleCountryChange(country)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <span className="text-lg">{config.flag}</span>
              <div className="flex-1">
                <div className="font-medium">{config.name}</div>
                <div className="text-sm text-muted-foreground">
                  {config.currencySymbol} • {config.language.toUpperCase()}
                </div>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Componente compacto para mobile
export function CountrySelectorCompact({ className }: { className?: string }) {
  const { currentCountry, countryConfig, setCountry } = useInternationalization();

  return (
    <Select value={currentCountry} onValueChange={setCountry}>
      <SelectTrigger className={`w-auto ${className}`}>
        <div className="flex items-center gap-1">
          <span className="text-lg">{countryConfig.flag}</span>
          <span className="text-sm font-medium">{countryConfig.code}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_COUNTRIES.map((country) => {
          const config = COUNTRIES[country];
          return (
            <SelectItem key={country} value={country}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.flag}</span>
                <span>{config.name}</span>
                <span className="text-muted-foreground text-sm">
                  ({config.currencySymbol})
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
