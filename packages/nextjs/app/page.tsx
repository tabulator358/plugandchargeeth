"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  BoltIcon, 
  ClockIcon, 
  StarIcon, 
  CheckCircleIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  PlayIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  RocketLaunchIcon
} from "@heroicons/react/24/outline";

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,_var(--tw-gradient-stops))] from-purple-500/20 via-cyan-500/20 to-purple-500/20 animate-spin-slow"></div>
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${10 + Math.random() * 20}s`
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section ref={heroRef} className="min-h-screen flex items-center justify-center px-4 relative">
        {/* Dynamic gradient following mouse */}
        <div 
          className="absolute inset-0 opacity-30 transition-all duration-1000 ease-out"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.3), transparent 40%)`
          }}
        />
        
        <div className="relative z-10 text-center max-w-6xl mx-auto">
          <div className={`transition-all duration-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
            {/* Glitch effect title */}
            <div className="relative mb-8">
              <h1 className="text-7xl md:text-9xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient-x">
                Plug. Charge. Go.
          </h1>
              <div className="absolute inset-0 text-7xl md:text-9xl font-black bg-gradient-to-r from-pink-500 via-cyan-400 to-purple-500 bg-clip-text text-transparent opacity-20 blur-sm animate-pulse">
                Plug. Charge. Go.
              </div>
            </div>
            
            <p className="text-2xl md:text-3xl text-cyan-300 mb-6 max-w-4xl mx-auto font-light">
              The future of EV charging — powered by <span className="text-purple-400 font-bold">crypto</span>.
            </p>
            <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              We're building an open Plug&Charge protocol that lets any EV instantly authenticate and pay on any charger — no apps, no accounts, no cards.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full text-white font-bold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  <RocketLaunchIcon className="w-6 h-6" />
                  Join the open charging revolution
                </span>
              </button>
              <button className="group px-8 py-4 border-2 border-cyan-400 rounded-full text-cyan-400 font-bold text-lg transition-all duration-300 hover:bg-cyan-400 hover:text-black hover:scale-105">
                <span className="flex items-center gap-2">
                  <PlayIcon className="w-6 h-6" />
                  Explore how it works
                </span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Crypto-themed floating elements */}
        <div className="absolute top-20 left-10 w-24 h-24 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full animate-pulse blur-sm"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-full animate-bounce blur-sm"></div>
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full animate-ping blur-sm"></div>
        
        {/* Hexagonal grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-red-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              The broken charging experience
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Today's EV drivers are tech-savvy pioneers. Yet, charging your car still feels like 2010 — fragmented apps, endless sign-ups, and payment chaos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-pulse">⚡</div>
                <h3 className="text-xl font-bold mb-4 text-red-400">Fragmented Networks</h3>
                <p className="text-gray-300">
                  100+ major charging networks across Europe — no unified standard
                </p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-bounce">🕒</div>
                <h3 className="text-xl font-bold mb-4 text-orange-400">Time Wasted</h3>
                <p className="text-gray-300">
                  20+ minutes average to register just to start charging once at new provider
                </p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-red-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-ping">💬</div>
                <h3 className="text-xl font-bold mb-4 text-yellow-400">Poor Experience</h3>
                <p className="text-gray-300">
                  Average public ratings show charging stations lag behind
                </p>
              </div>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-yellow-500/5"></div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">
                Average Public Ratings
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center group">
                  <div className="text-4xl font-black text-green-400 mb-2 group-hover:scale-110 transition-transform duration-300">4.4⭐</div>
                  <p className="text-lg text-gray-300">Hotels</p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{width: '88%'}}></div>
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-4xl font-black text-yellow-400 mb-2 group-hover:scale-110 transition-transform duration-300">4.3⭐</div>
                  <p className="text-lg text-gray-300">Gas stations</p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{width: '86%'}}></div>
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-4xl font-black text-red-400 mb-2 group-hover:scale-110 transition-transform duration-300">2.6⭐</div>
                  <p className="text-lg text-gray-300">Charging stations</p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{width: '52%'}}></div>
                  </div>
                </div>
              </div>
              <p className="text-center text-xl font-semibold mt-8 text-gray-300">
                EV charging should be simpler than fueling, not worse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Insight Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
              Why this matters
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Charging is a simple technology. Every EV already carries a secure identifier (ISO-15118 standard). Combine that with blockchain-based escrow and cryptographic payments — and you unlock true Plug&Charge for everyone.
          </p>
        </div>

          <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm p-12 rounded-3xl border border-cyan-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-teal-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-teal-400"></div>
            <div className="relative z-10 text-center">
              <h3 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                A seamless experience, trustless by design.
              </h3>
              <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-12">
                <div className="group text-center">
                  <div className="relative w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto border border-cyan-500/30 group-hover:border-cyan-400/60 transition-all duration-300 group-hover:scale-110">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full animate-pulse"></div>
                    <BoltIcon className="w-12 h-12 text-cyan-400 relative z-10" />
                  </div>
                  <p className="font-bold text-cyan-400 text-lg">ISO-15118</p>
                  <p className="text-sm text-gray-400">Secure ID</p>
                </div>
                <div className="text-4xl text-cyan-400 font-bold animate-pulse">+</div>
                <div className="group text-center">
                  <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-4 mx-auto border border-blue-500/30 group-hover:border-blue-400/60 transition-all duration-300 group-hover:scale-110">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full animate-pulse"></div>
                    <GlobeAltIcon className="w-12 h-12 text-blue-400 relative z-10" />
                  </div>
                  <p className="font-bold text-blue-400 text-lg">Blockchain</p>
                  <p className="text-sm text-gray-400">Trustless</p>
                </div>
                <div className="text-4xl text-blue-400 font-bold animate-pulse">=</div>
                <div className="group text-center">
                  <div className="relative w-24 h-24 bg-gradient-to-br from-teal-500/20 to-green-500/20 rounded-full flex items-center justify-center mb-4 mx-auto border border-teal-500/30 group-hover:border-teal-400/60 transition-all duration-300 group-hover:scale-110">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-green-500/10 rounded-full animate-pulse"></div>
                    <CheckCircleIcon className="w-12 h-12 text-teal-400 relative z-10" />
                  </div>
                  <p className="font-bold text-teal-400 text-lg">Plug&Charge</p>
                  <p className="text-sm text-gray-400">For Everyone</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-900/5 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Our protocol
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
              We've developed a secure, open protocol that allows:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-bounce">🏪</div>
                <h3 className="text-xl font-bold mb-4 text-green-400">Local Charging Stations</h3>
                <p className="text-gray-300">
                  Join the network with zero integration friction
                </p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-pulse">🚗</div>
                <h3 className="text-xl font-bold mb-4 text-emerald-400">Drivers</h3>
                <p className="text-gray-300">
                  Pay automatically, directly, and transparently
                </p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-teal-500/20 hover:border-teal-500/40 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-ping">🤝</div>
                <h3 className="text-xl font-bold mb-4 text-teal-400">Global Environmental Impact</h3>
                <p className="text-gray-300">
                  Fund public chargers easily
                </p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-bounce">🏢</div>
                <h3 className="text-xl font-bold mb-4 text-cyan-400">Large Providers</h3>
                <p className="text-gray-300">
                  Connect to a shared on-chain standard
                </p>
              </div>
            </div>
          </div>

          <div className="relative text-center bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm p-12 rounded-3xl border border-green-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400"></div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                This is not just another app — it's a foundation for a new ecosystem.
              </h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Plug&Charge — empowering the future automotive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 bg-clip-text text-transparent">
              Under the hood
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Built on <span className="text-purple-400 font-bold">Ethereum</span>. Designed for <span className="text-blue-400 font-bold">Base</span>. Secure, composable, and open-source.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-pulse">🧩</div>
                <h3 className="text-lg font-bold mb-2 text-purple-400">PlugAndChargeCore</h3>
                <p className="text-sm text-gray-400">handles escrow & sessions</p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 hover:scale-105 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-bounce">🚗</div>
                <h3 className="text-lg font-bold mb-2 text-violet-400">VehicleRegistry</h3>
                <p className="text-sm text-gray-400">links EV identifiers securely</p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 hover:scale-105 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-ping">⚡</div>
                <h3 className="text-lg font-bold mb-2 text-indigo-400">ChargerRegistry</h3>
                <p className="text-sm text-gray-400">trust and metadata for charging points</p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-bounce">💳</div>
                <h3 className="text-lg font-bold mb-2 text-blue-400">USDC</h3>
                <p className="text-sm text-gray-400">stable and universal settlement layer</p>
              </div>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm p-8 rounded-3xl border border-purple-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-violet-500/5 to-indigo-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-400"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="relative">
                  <CpuChipIcon className="w-10 h-10 text-purple-400" />
                  <div className="absolute inset-0 w-10 h-10 bg-purple-400/20 rounded-full animate-ping"></div>
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Core Components
                </span>
              </div>
              <div className="text-center">
                <p className="text-lg text-gray-300 leading-relaxed">
                  Each component is designed to work seamlessly together, creating a robust and scalable infrastructure for the future of EV charging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-900/5 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-pink-400 via-rose-500 to-red-500 bg-clip-text text-transparent">
              Why blockchain?
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Crypto isn't just for finance — it's for frictionless trust. By combining open ledgers, digital identities, and programmable escrow, we can make EV charging instant, fair, and global.
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm p-12 rounded-3xl border border-pink-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-rose-500/5 to-red-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-rose-500 to-red-400"></div>
            <div className="relative z-10 text-center">
              <h3 className="text-4xl font-bold mb-8 bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent">
                It's the perfect use case for the decentralized economy — real-world utility that drivers can feel every day.
              </h3>
              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="group text-center">
                  <div className="relative w-20 h-20 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-full flex items-center justify-center mb-4 mx-auto border border-pink-500/30 group-hover:border-pink-400/60 transition-all duration-300 group-hover:scale-110">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-full animate-pulse"></div>
                    <BoltIcon className="w-10 h-10 text-pink-400 relative z-10" />
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-pink-400">Instant</h4>
                  <p className="text-gray-400">No waiting, no friction</p>
                </div>
                <div className="group text-center">
                  <div className="relative w-20 h-20 bg-gradient-to-br from-rose-500/20 to-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto border border-rose-500/30 group-hover:border-rose-400/60 transition-all duration-300 group-hover:scale-110">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-full animate-pulse"></div>
                    <CheckCircleIcon className="w-10 h-10 text-rose-400 relative z-10" />
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-rose-400">Fair</h4>
                  <p className="text-gray-400">Transparent pricing</p>
                </div>
                <div className="group text-center">
                  <div className="relative w-20 h-20 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-full flex items-center justify-center mb-4 mx-auto border border-red-500/30 group-hover:border-red-400/60 transition-all duration-300 group-hover:scale-110">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-full animate-pulse"></div>
                    <GlobeAltIcon className="w-10 h-10 text-red-400 relative z-10" />
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-red-400">Global</h4>
                  <p className="text-gray-400">Works everywhere</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Footer Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/5 to-transparent"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Ready to shape the future of mobility?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join us in building the infrastructure that will power the next generation of electric vehicles.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full text-white font-bold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center gap-2">
                <RocketLaunchIcon className="w-6 h-6" />
                Start Enjoying Plug&Charge Experience
              </span>
            </button>
            <button className="group px-8 py-4 border-2 border-cyan-400 rounded-full text-cyan-400 font-bold text-lg transition-all duration-300 hover:bg-cyan-400 hover:text-black hover:scale-105">
              <span className="flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6" />
                Connect Your Charger
              </span>
            </button>
            <button className="group px-8 py-4 border-2 border-purple-400 rounded-full text-purple-400 font-bold text-lg transition-all duration-300 hover:bg-purple-400 hover:text-black hover:scale-105">
              <span className="flex items-center gap-2">
                <PlayIcon className="w-6 h-6" />
              </span>
            </button>
          </div>

          <div className="border-t border-gray-700/50 pt-12">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <h3 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  PlugAndCharge.ETH
                </h3>
                <p className="text-gray-400">© 2025 PlugAndCharge.ETH. Built with ❤️ on EVM</p>
              </div>
              <div className="flex space-x-8">
                <Link href="/plug-and-charge" className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 font-medium">
                  Demo
                </Link>
                <Link href="/debug" className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 font-medium">
                  Debug
                </Link>
                <Link href="/blockexplorer" className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 font-medium">
                  Explorer
                </Link>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-700/50">
              <p className="text-gray-500">
                © 2024 PlugAndCharge.ETH. Built with ❤️ on <span className="text-purple-400">Ethereum</span> & <span className="text-blue-400">Base</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
      </div>
  );
};

export default LandingPage;