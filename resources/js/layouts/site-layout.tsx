import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { SiteSidebar } from '@/components/site-sidebar';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { toolForPath } from '@/lib/tools';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';

interface SiteLayoutProps {
    children: React.ReactNode;
    wide?: boolean;
}

function currentTitle(url: string): string {
    const path = url
        .replace(/^https?:\/\/[^/]+/, '')
        .split('?')[0]
        .replace(/\/$/, '');

    if (path === '') {
        return 'Home';
    }

    if (path.startsWith('/blog/')) {
        return 'Article';
    }

    const tool = toolForPath(path);

    if (tool) {
        return tool.title;
    }

    return { '/blog': 'Blog', '/tools': 'Utilities' }[path] ?? 'vmasdani';
}

export default function SiteLayout({ children, wide = false }: SiteLayoutProps) {
    const { url } = usePage();

    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': 'calc(var(--spacing) * 64)',
                    '--header-height': 'calc(var(--spacing) * 14)',
                } as React.CSSProperties
            }
        >
            <SiteSidebar variant="inset" />
            <SidebarInset>
                <header className="bg-background/80 sticky top-0 z-40 flex h-(--header-height) shrink-0 items-center gap-2 border-b backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
                    <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                        <h1 className="text-base font-medium">{currentTitle(url)}</h1>
                        <div className="ml-auto">
                            <AppearanceToggleDropdown />
                        </div>
                    </div>
                </header>

                <div className={cn('flex flex-1 justify-center px-4 py-6 sm:px-6 lg:px-8', wide ? '' : '')}>
                    <div className={cn('w-full', wide ? 'max-w-5xl' : 'max-w-3xl')}>{children}</div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
