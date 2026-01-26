import { Link } from "react-router-dom";
import { Cloud } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footerText: string;
  footerLink: string;
  footerLinkText: string;
}

export const AuthLayout = ({
  children,
  title,
  subtitle,
  footerText,
  footerLink,
  footerLinkText,
}: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-[linear-gradient(to_bottom_right,#38ada9,#2563eb,#3c6382)] p-12 text-white">
        <div className="max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Cloud className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">CloudManager</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight">
            Gestion cloud et hébergement pour entreprises
          </h1>
          <p className="text-lg leading-relaxed text-white/90">
            Plateforme 360° pour l&apos;infrastructure, les clients et les opérations. Conçue en Algérie, pour l&apos;Algérie.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full border-2 border-white bg-white/20" />
              <div className="h-8 w-8 rounded-full border-2 border-white bg-white/20" />
              <div className="h-8 w-8 rounded-full border-2 border-white bg-white/20" />
            </div>
            <span className="text-white/90">Rejoignez les entreprises algériennes qui nous font confiance</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 lg:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white">
                <Cloud className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-slate-900">
                CloudManager
              </span>
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
            <p className="text-slate-600">{subtitle}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">{children}</div>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              {footerText}{" "}
              <Link
                to={footerLink}
                className="font-medium text-brand-primary hover:text-brand-primary/90"
              >
                {footerLinkText}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
