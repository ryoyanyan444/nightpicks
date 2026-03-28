"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES } from "@/lib/constants";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold gradient-text tracking-tight">
              NIGHTPICKS
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {Object.entries(CATEGORIES).map(([slug, { name }]) => (
              <Link
                key={slug}
                href={`/category/${slug}`}
                className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-dark-800"
              >
                {name}
              </Link>
            ))}
          </nav>

          {/* Search + Mobile Menu */}
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="検索"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="メニュー"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-dark-800">
            <div className="flex flex-col gap-1">
              {Object.entries(CATEGORIES).map(([slug, { name }]) => (
                <Link
                  key={slug}
                  href={`/category/${slug}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-3 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                >
                  {name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
