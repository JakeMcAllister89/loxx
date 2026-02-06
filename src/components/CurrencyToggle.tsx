import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      <Button
        variant={currency === 'GBP' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => setCurrency('GBP')}
      >
        £ GBP
      </Button>
      <Button
        variant={currency === 'EUR' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => setCurrency('EUR')}
      >
        € EUR
      </Button>
    </div>
  );
}
