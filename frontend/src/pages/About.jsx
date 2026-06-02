import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";

export default function About() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[var(--bg)] page-transition" data-testid="about-page">
      {user && <Navbar />}
      <main className="max-w-[900px] mx-auto px-6 lg:px-10 py-16">
        <h1 className="font-brush text-[44px] sm:text-[64px] leading-none mb-6 hero-title">
          <span className="text-white">WHAT IS </span><span className="text-[var(--purple)]">LASTLAP?</span>
        </h1>
        <div className="font-mono-crt text-[18px] sm:text-[20px] text-[var(--muted)] space-y-6 leading-relaxed">
          <p className="row-animate stagger-1">LASTLAP IS A RACING-CULTURE QUEST PLATFORM. RIDERS COMPLETE DAILY MISSIONS, EARN LAP POINTS, BUILD A CREW, AND CLIMB THE GLOBAL GRID.</p>
          <p className="row-animate stagger-2">EVERY MISSION YOU FINISH PUSHES YOU CLOSER TO THE FRONT OF THE PACK. EVERY RIDER YOU REFER LIGHTS UP YOUR TIMING SCREEN.</p>
          <p className="row-animate stagger-3">FINAL LAP DEFINES EVERYTHING.</p>
        </div>
        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <Link to="/" className="btn-primary-ll py-3 px-6 w-full sm:w-auto cta-pulse" data-testid="about-cta-dashboard">ENTER THE TRACK</Link>
          {!user && <Link to="/register" className="btn-ghost-ll py-3 px-6 w-full sm:w-auto cta-pulse" data-testid="about-cta-register">JOIN THE GRID</Link>}
        </div>
      </main>
      {user && <Footer />}
    </div>
  );
}
