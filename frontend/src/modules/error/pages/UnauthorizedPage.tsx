/**
 * Unauthorized / Access Denied page
 */

import React from "react";

export const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
      <p className="text-slate-600">You don&apos;t have permission to access this resource.</p>
    </div>
  </div>
);
