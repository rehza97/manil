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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-600 p-12 flex-col justify-center text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Cloud className="h-10 w-10" />
            <span className="text-3xl font-bold">CloudManager</span>
          </div>
          <h1 className="text-4xl font-bold mb-6">
            Enterprise Cloud & Hosting Management
          </h1>
          <p className="text-xl text-blue-100 leading-relaxed">
            Complete 360° platform for managing cloud infrastructure, customer
            relationships, and business operations. Built in Algeria, for
            Algeria.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-white/20 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-white/20 rounded-full border-2 border-white"></div>
            </div>
            <span className="text-blue-100">Join 500+ Algerian businesses</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <Cloud className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-slate-900">
                CloudManager
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{title}</h2>
            <p className="text-slate-600">{subtitle}</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">{children}</div>

          <div className="text-center mt-6">
            <p className="text-slate-600">
              {footerText}{" "}
              <Link
                to={footerLink}
                className="text-blue-600 hover:text-blue-700 font-medium"
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
