/**
 * Home Page
 *
 * Landing page for the application
 *
 * @module pages/HomePage
 */

import React from "react";

export const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6" style={{ color: "#38ada9" }}>
          CloudManager
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Enterprise Cloud & Hosting Management Platform
        </p>
        <p className="text-gray-500 mb-12">
          Manage your cloud infrastructure, customers, tickets, and more.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/register"
            className="px-6 py-3 rounded-md text-white font-semibold"
            style={{ backgroundColor: "#38ada9" }}
          >
            Get Started
          </a>
          <a
            href="/login"
            className="px-6 py-3 rounded-md border-2 font-semibold"
            style={{ borderColor: "#38ada9", color: "#38ada9" }}
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
};

HomePage.displayName = "HomePage";
