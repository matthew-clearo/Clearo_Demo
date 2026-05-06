import { useNavigate } from 'react-router';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ backgroundColor: '#FBF8F3' }}
    >
      <span
        className="inline-block text-[10px] font-inter font-medium tracking-[0.08em] uppercase mb-6"
        style={{ backgroundColor: '#e8f3ee', color: '#3D6B5E', borderRadius: 4, padding: '3px 10px' }}
      >
        Page not found
      </span>

      <h1
        className="font-heading font-semibold text-gray-900 mb-4"
        style={{ fontSize: 'clamp(64px, 10vw, 120px)', lineHeight: '1', letterSpacing: '-0.03em', color: '#3D6B5E' }}
      >
        404
      </h1>

      <h2
        className="text-2xl lg:text-3xl font-heading font-semibold text-gray-900 mb-4"
        style={{ letterSpacing: '-0.025em' }}
      >
        This page doesn't exist
      </h2>

      <p
        className="text-base font-inter leading-relaxed max-w-md mb-10"
        style={{ color: '#555' }}
      >
        The page you're looking for may have been moved, removed, or never existed. Let's get you back on track.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-8 py-3.5 rounded-lg font-inter font-semibold text-base text-white hover:opacity-90 active:scale-[0.97] transition-all inline-flex items-center justify-center gap-2"
          style={{
            backgroundColor: '#3D6B5E',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <Home size={16} />
          Go Home
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-8 py-3.5 rounded-lg font-inter font-semibold text-base transition-all hover:bg-white/60 inline-flex items-center justify-center gap-2"
          style={{ border: '1.5px solid #3D6B5E', color: '#3D6B5E' }}
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </div>
  );
}
