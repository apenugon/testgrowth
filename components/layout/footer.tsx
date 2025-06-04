import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Growth Arena. All rights reserved.{" "}
            <Link 
              href="/privacy" 
              className="text-emerald-600 hover:text-emerald-500 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
} 