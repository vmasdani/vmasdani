import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { toolCategories, toolPath, tools } from '@/lib/tools';
import { Link, usePage } from '@inertiajs/react';
import { BookOpenTextIcon, FacebookLogoIcon, GithubLogoIcon, HouseIcon, LinkedinLogoIcon, WrenchIcon } from '@phosphor-icons/react';

const blogNav = [
    { title: 'Home', href: '/', icon: HouseIcon },
    { title: 'Blog', href: '/blog', icon: BookOpenTextIcon },
];

const social = [
    { title: 'GitHub', href: 'https://github.com/vmasdani', icon: GithubLogoIcon },
    { title: 'LinkedIn', href: 'https://www.linkedin.com/in/%F0%9F%94%8Cvalian-masdani-67736215b/', icon: LinkedinLogoIcon },
    { title: 'Facebook', href: 'https://www.facebook.com/valianmasdani', icon: FacebookLogoIcon },
];

function currentPath(url: string): string {
    return (
        url
            .replace(/^https?:\/\/[^/]+/, '')
            .split('?')[0]
            .replace(/\/$/, '') || '/'
    );
}

function matches(path: string, href: string): boolean {
    if (href === '/') {
        return path === '/' || path.startsWith('/blog/');
    }

    return path === href || path.startsWith(`${href}/`);
}

export function SiteSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { url } = usePage();
    const path = currentPath(url);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <span className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-bold">
                                    v
                                </span>
                                <span className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Valian Masdani</span>
                                    <span className="text-muted-foreground truncate text-xs">Blog &amp; utilities</span>
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Blog</SidebarGroupLabel>
                    <SidebarMenu>
                        {blogNav.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild isActive={matches(path, item.href)} tooltip={item.title}>
                                    <Link href={item.href}>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>Utilities</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={path === '/tools'} tooltip="All tools">
                                <Link href="/tools">
                                    <WrenchIcon />
                                    <span>All tools</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {toolCategories.map((category) => {
                    const categoryTools = tools.filter((tool) => tool.category === category.id);

                    if (categoryTools.length === 0) {
                        return null;
                    }

                    return (
                        <SidebarGroup key={category.id}>
                            <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
                            <SidebarMenu>
                                {categoryTools.map((tool) => (
                                    <SidebarMenuItem key={tool.slug}>
                                        <SidebarMenuButton asChild isActive={matches(path, toolPath(tool.slug))} tooltip={tool.title}>
                                            <Link href={toolPath(tool.slug)}>
                                                <tool.icon />
                                                <span>{tool.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center gap-1 px-2 py-1.5">
                            {social.map((item) => (
                                <a
                                    key={item.title}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={item.title}
                                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
                                >
                                    <item.icon className="size-4" />
                                </a>
                            ))}
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
