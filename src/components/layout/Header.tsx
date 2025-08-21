'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Camera, Menu, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Camera className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">Loopar</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <SignedIn>
            <Link 
              href="/dashboard" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Panel
            </Link>
            <Link 
              href="/dashboard/new" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Crear Postal
            </Link>
          </SignedIn>
          <Link 
            href="/help" 
            className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            Ayuda
          </Link>
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center space-x-4">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Iniciar Sesión
              </Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button size="sm">
                Comenzar
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8"
                }
              }}
            />
          </SignedIn>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 space-y-4">
            <SignedIn>
              <Link 
                href="/dashboard" 
                className="block text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Panel
              </Link>
              <Link 
                href="/dashboard/new" 
                className="block text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Crear Postal
              </Link>
            </SignedIn>
            <Link 
              href="/help" 
              className="block text-sm font-medium transition-colors hover:text-primary flex items-center gap-1"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <HelpCircle className="h-4 w-4" />
              Ayuda
            </Link>
            <SignedIn>
              <div className="pt-2">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8"
                    }
                  }}
                />
              </div>
            </SignedIn>
            <SignedOut>
              <div className="space-y-2">
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Iniciar Sesión
                  </Button>
                </SignInButton>
                <SignInButton mode="modal">
                  <Button size="sm" className="w-full">
                    Comenzar
                  </Button>
                </SignInButton>
              </div>
            </SignedOut>
          </div>
        </div>
      )}
    </header>
  );
}