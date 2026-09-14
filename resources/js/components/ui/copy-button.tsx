import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';
import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import type { ComponentProps } from 'react';

interface CopyButtonProps extends ComponentProps<typeof Button> {
    value: string;
    label?: string;
}

/**
 * Copy-to-clipboard button with an inline "Copied" state. Used across the
 * client-only tools so every output has the same affordance.
 */
export function CopyButton({ value, label = 'Copy', disabled, ...props }: CopyButtonProps) {
    const { copied, copy } = useClipboard();

    return (
        <Button type="button" variant="outline" size="sm" onClick={() => void copy(value)} disabled={disabled || value === ''} {...props}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : label}
        </Button>
    );
}
