import { Link } from "react-router-dom";
import { Cloud } from "lucide-react";

export const LandingFooter = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Cloud className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold text-white">CloudHost</span>
            </div>
            <p className="text-sm text-slate-400">
              Fast, secure, and reliable hosting solutions for Algerian businesses. Priced in DZD with local support.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/hosting" className="hover:text-white transition">
                  Web Hosting
                </Link>
              </li>
              <li>
                <Link to="/vps" className="hover:text-white transition">
                  VPS Servers
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-white transition">
                  Features
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition">
                  Client Area
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Blog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Server Status
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Report Abuse
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
            <p>&copy; 2025 CloudHost. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition">
                Terms of Service
              </a>
              <a href="#" className="hover:text-white transition">
                SLA
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
