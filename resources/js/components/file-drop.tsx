import { UploadSimpleIcon } from '@phosphor-icons/react';
import { useRef, useState, type ReactNode } from 'react';

interface FileDropProps {
    /** Comma-separated accept list, e.g. "image/png,image/jpeg". */
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    onFiles: (files: File[]) => void;
    /** Icon shown above the label. Defaults to an upload arrow. */
    icon?: ReactNode;
    label: string;
    hint?: string;
    className?: string;
}

/**
 * Shared drag-and-drop / click file picker for the client-only tools. Purely
 * presentational: it hands the selected File[] back and lets the page validate.
 */
export default function FileDrop({ accept, multiple = false, disabled = false, onFiles, icon, label, hint, className = '' }: FileDropProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const open = () => {
        if (!disabled) {
            inputRef.current?.click();
        }
    };

    const handleFiles = (fileList: FileList | null | undefined) => {
        if (disabled || !fileList || fileList.length === 0) {
            return;
        }

        onFiles(Array.from(fileList));
    };

    const stateClass = dragOver
        ? 'border-primary text-primary'
        : disabled
          ? 'text-muted-foreground/50'
          : 'text-muted-foreground hover:border-primary/50';

    return (
        <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={label}
            aria-disabled={disabled}
            onClick={open}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open();
                }
            }}
            onDragOver={(event) => {
                event.preventDefault();

                if (!disabled) {
                    setDragOver(true);
                }
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                handleFiles(event.dataTransfer.files);
            }}
            className={`border-input flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center text-sm transition-colors ${stateClass} ${className}`}
        >
            <span className="size-6">{icon ?? <UploadSimpleIcon className="size-6" />}</span>
            <span className="font-medium">{label}</span>
            {hint && <span className="max-w-md text-xs">{hint}</span>}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                className="hidden"
                onChange={(event) => {
                    handleFiles(event.target.files);
                    event.target.value = '';
                }}
            />
        </div>
    );
}
