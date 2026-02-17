import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const countryCodes = [
  { code: "55", label: "🇧🇷 +55", country: "Brasil" },
  { code: "1", label: "🇺🇸 +1", country: "EUA/Canadá" },
  { code: "351", label: "🇵🇹 +351", country: "Portugal" },
  { code: "244", label: "🇦🇴 +244", country: "Angola" },
  { code: "258", label: "🇲🇿 +258", country: "Moçambique" },
  { code: "238", label: "🇨🇻 +238", country: "Cabo Verde" },
  { code: "245", label: "🇬🇼 +245", country: "Guiné-Bissau" },
  { code: "239", label: "🇸🇹 +239", country: "São Tomé" },
  { code: "670", label: "🇹🇱 +670", country: "Timor-Leste" },
  { code: "54", label: "🇦🇷 +54", country: "Argentina" },
  { code: "595", label: "🇵🇾 +595", country: "Paraguai" },
  { code: "598", label: "🇺🇾 +598", country: "Uruguai" },
  { code: "56", label: "🇨🇱 +56", country: "Chile" },
  { code: "57", label: "🇨🇴 +57", country: "Colômbia" },
  { code: "51", label: "🇵🇪 +51", country: "Peru" },
  { code: "58", label: "🇻🇪 +58", country: "Venezuela" },
  { code: "52", label: "🇲🇽 +52", country: "México" },
  { code: "34", label: "🇪🇸 +34", country: "Espanha" },
  { code: "33", label: "🇫🇷 +33", country: "França" },
  { code: "39", label: "🇮🇹 +39", country: "Itália" },
  { code: "44", label: "🇬🇧 +44", country: "Reino Unido" },
  { code: "49", label: "🇩🇪 +49", country: "Alemanha" },
  { code: "81", label: "🇯🇵 +81", country: "Japão" },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function CountryCodeSelect({ value, onChange, className }: CountryCodeSelectProps) {
  const selected = countryCodes.find(c => c.code === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "w-[85px] rounded-r-none border-r-0 bg-muted text-muted-foreground text-sm shrink-0 px-2 [&>svg]:ml-0 [&>svg]:shrink-0",
          className
        )}
      >
        <SelectValue>
          {selected ? `+${selected.code}` : `+${value}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[280px]">
        {countryCodes.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.label} — {c.country}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { countryCodes };
