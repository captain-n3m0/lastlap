import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";

export default function About() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[var(--bg)]" data-testid="about-page">
      {user && <Navbar />}
      <main className="max-w-[900px] mx-auto px-6 lg:px-10 py-16">
        <h1 className="font-brush text-[64px] leading-none mb-6">
          <span className="text-white">WHAT IS </span><span className="text-[var(--purple)]">LASTLAP?</span>
        </h1>
        <div className="font-mono-crt text-[20px] text-[var(--muted)] space-y-6 leading-relaxed">
          <p>LASTLAP IS A RACING-CULTURE QUEST PLATFORM. RIDERS COMPLETE DAILY MISSIONS, EARN LAP POINTS, BUILD A CREW, AND CLIMB THE GLOBAL GRID.</p>
          <p>EVERY MISSION YOU FINISH PUSHES YOU CLOSER TO THE FRONT OF THE PACK. EVERY RIDER YOU REFER LIGHTS UP YOUR TIMING SCREEN.</p>
          <p>FINAL LAP DEFINES EVERYTHING.</p>
        </div>
        <div className="mt-12 flex gap-3">
          <Link to="/" className="btn-primary-ll py-3 px-6" data-testid="about-cta-dashboard">ENTER THE TRACK</Link>
          {!user && <Link to="/register" className="btn-ghost-ll py-3 px-6" data-testid="about-cta-register">JOIN THE GRID</Link>}
        </div>
      </main>
      {user && <Footer />}
    </div>
  );
}
