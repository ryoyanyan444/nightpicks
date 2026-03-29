import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl font-bold text-white">404</p>
          <h1 className="mt-4 text-xl font-bold text-white">
            ページが見つかりません
          </h1>
          <p className="mt-2 text-gray-500">
            お探しのページは移動または削除された可能性があります。
          </p>
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-night-600 hover:bg-night-500 text-white rounded-lg transition-colors"
          >
            トップページに戻る
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
