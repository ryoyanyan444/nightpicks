import Link from "next/link";
import { CATEGORIES, SITE_NAME } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-dark-950 border-t border-dark-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold text-white">{SITE_NAME}</span>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              ナイトワーカーのための情報メディア。
              <br />
              毎日チェックしたくなる業界ニュース、テクニック、インタビューをお届け。
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              カテゴリ
            </h3>
            <ul className="space-y-2">
              {Object.entries(CATEGORIES).map(([slug, { name }]) => (
                <li key={slug}>
                  <Link
                    href={`/category/${slug}`}
                    className="text-sm text-gray-500 hover:text-night-300 transition-colors"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              夜ピク
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-500 hover:text-night-300 transition-colors">
                  サイトについて
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-night-300 transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-500 hover:text-night-300 transition-colors">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-dark-800 text-center">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
