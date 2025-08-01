"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import { Download, ExternalLink, LogOut, Menu, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui";

export const NavbarSimple: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Características", href: "#features" },
    { label: "Precios", href: "#pricing" },
    { label: "Documentación", href: "/docs" },
    { label: "Soporte", href: "#footer" },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogin = () => {
    router.push("/sign-in");
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    setIsMobileMenuOpen(false);
  };

  const handleDashboard = () => {
    router.push("/dashboard");
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "glass-effect border-b border-gray-700/50 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <div className="w-10 h-10 energy-gradient rounded-xl flex items-center justify-center energy-shadow">
                <span className="text-white font-bold text-lg">⚡</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                FitAI
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className="text-gray-300 hover:text-white transition-colors font-medium hover:scale-105"
                  onClick={() => {
                    if (item.href.startsWith("/")) {
                      window.open(item.href, "_blank");
                    } else {
                      scrollToSection(item.href);
                    }
                  }}
                >
                  {item.label}
                  {item.href.startsWith("/") && (
                    <ExternalLink className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              {!mounted ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleLogin}>
                    Iniciar Sesión
                  </Button>
                  <Button size="sm" leftIcon={<Download className="w-4 h-4" />}>
                    Descargar
                  </Button>
                </>
              ) : isSignedIn ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleDashboard}>
                    <User className="w-4 h-4 mr-2" />
                    {user?.firstName || "Dashboard"}
                  </Button>
                  <SignOutButton>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Salir
                    </Button>
                  </SignOutButton>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={handleLogin}>
                    Iniciar Sesión
                  </Button>
                  <Button size="sm" leftIcon={<Download className="w-4 h-4" />}>
                    Descargar
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 glass-effect border-b border-gray-700/50 md:hidden">
          <div className="container-custom py-6">
            <div className="space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className="block w-full text-left text-gray-300 hover:text-white transition-colors font-medium py-2"
                  onClick={() => {
                    if (item.href.startsWith("/")) {
                      window.open(item.href, "_blank");
                    } else {
                      scrollToSection(item.href);
                    }
                  }}
                >
                  {item.label}
                  {item.href.startsWith("/") && (
                    <ExternalLink className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
              <div className="pt-4 border-t border-gray-700/50 space-y-3">
                {!mounted ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={handleLogin}
                    >
                      Iniciar Sesión
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      Descargar App
                    </Button>
                  </>
                ) : isSignedIn ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={handleDashboard}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {user?.firstName || "Dashboard"}
                    </Button>
                    <SignOutButton>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={handleSignOut}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                      </Button>
                    </SignOutButton>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={handleLogin}
                    >
                      Iniciar Sesión
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      Descargar App
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};
