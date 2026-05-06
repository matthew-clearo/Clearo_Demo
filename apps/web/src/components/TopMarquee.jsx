"use client";

export default function TopMarquee() {
  const marqueeMessage =
    "Clearo just landed in Australia! The new medical imaging search engine helping you find the right scan. Now live in Melbourne, Australia. More cities coming soon!";

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl">
        {/* pill-shaped white banner */}
        <div className="w-full overflow-hidden rounded-full border border-black/20 bg-white">
          <div className="clearo-marquee" aria-label="Announcement">
            <div className="clearo-marquee__track">
              <span className="clearo-marquee__item">{marqueeMessage}</span>
              <span className="clearo-marquee__sep">•</span>
              <span className="clearo-marquee__item">{marqueeMessage}</span>
              <span className="clearo-marquee__sep">•</span>
            </div>
            <div className="clearo-marquee__track" aria-hidden="true">
              <span className="clearo-marquee__item">{marqueeMessage}</span>
              <span className="clearo-marquee__sep">•</span>
              <span className="clearo-marquee__item">{marqueeMessage}</span>
              <span className="clearo-marquee__sep">•</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes clearoMarquee {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-100%, 0, 0);
          }
        }

        .clearo-marquee {
          display: flex;
          align-items: center;
          gap: 0;
          white-space: nowrap;
          color: #000;
          padding: 10px 14px;
        }

        .clearo-marquee__track {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          animation: clearoMarquee 34s linear infinite;
          will-change: transform;
        }

        .clearo-marquee__item {
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .clearo-marquee__sep {
          font-size: 12px;
          opacity: 0.55;
        }

        /* pause on hover */
        .clearo-marquee:hover .clearo-marquee__track {
          animation-play-state: paused;
        }

        /* pause when keyboard focusing anything inside */
        .clearo-marquee:focus-within .clearo-marquee__track {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .clearo-marquee__track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
