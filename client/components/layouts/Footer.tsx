// components/footer.tsx - Version ultra compatible
import Link from 'next/link';
import { Database, Link2, Share2, Briefcase, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/api' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Security', href: '/security' },
    ],
  },
];

interface SocialLink {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const socialLinks: SocialLink[] = [
  {
    href: 'https://github.com',
    icon: <Link2 className="h-5 w-5" />,
    label: 'GitHub',
  },
  {
    href: 'https://twitter.com',
    icon: <Share2 className="h-5 w-5" />,
    label: 'Twitter',
  },
  {
    href: 'https://linkedin.com',
    icon: <Briefcase className="h-5 w-5" />,
    label: 'LinkedIn',
  },
  {
    href: 'mailto:contact@esbhub.com',
    icon: <Mail className="h-5 w-5" />,
    label: 'Email',
  },
];

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear: number = new Date().getFullYear();

  return (
    <footer className={cn('bg-background border-t', className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">ESB Hub</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              Plateforme d'intégration multi-systèmes moderne pour connecter,
              transformer et orchestrer vos flux de données en temps réel.
            </p>
            <div className="flex space-x-2">
              {socialLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  aria-label={link.label}
                >
                  {link.icon}
                </Link>
              ))}
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-sm mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {currentYear} ESB Hub. Tous droits réservés.
          </p>
          <div className="flex items-center space-x-4">
            <span className="text-muted-foreground text-sm">Version 1.0.0</span>
            <span className="text-muted-foreground text-sm">
              Status:{' '}
              <span className="inline-flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                Operational
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}