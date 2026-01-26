/**
 * 404 / Page Not Found
 */

import React from "react";

export const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-slate-600">The page you&apos;re looking for doesn&apos;t exist.</p>
    </div>
  </div>
);
