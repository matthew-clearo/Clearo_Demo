import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useAsyncError,
  useRouteError,
} from 'react-router';

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  Component,
} from 'react';
import './global.css';

// @ts-ignore
import { SessionProvider } from '@auth/create/react';
import { serializeError } from 'serialize-error';
import { Toaster } from 'sonner';
// @ts-ignore
import { LoadFonts } from 'virtual:load-fonts.jsx';
import type { Route } from './+types/root';
import EnvironmentBanner from '@/components/EnvironmentBanner';
import VisitorTracker from '@/components/VisitorTracker';
import { ConsentProvider } from '@/components/privacy/ConsentProvider';
// @ts-ignore
import PortalGate from '@/components/PortalGate';
// @ts-ignore
import IdleTimeout from '@/components/IdleTimeout';
import { initSentryClient, captureClientError } from '@/utils/monitoring/sentry.client';

export const links = () => [];

const LoadFontsSSR = import.meta.env.SSR ? LoadFonts : null;
if (import.meta.hot) {
  import.meta.hot.on('update-font-links', (urls: string[]) => {
    // remove old font links
    for (const link of document.querySelectorAll('link[data-auto-font]')) {
      link.remove();
    }

    // add new ones
    for (const url of urls) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.autoFont = 'true';
      document.head.appendChild(link);
    }
  });
}

function SharedErrorBoundary({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children?: ReactNode;
}): React.ReactElement {
  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
    >
      <div className="bg-[#18191B] text-[#F2F2F2] rounded-lg p-4 max-w-md w-full mx-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-[#F2F2F2] rounded-full flex items-center justify-center">
              <span className="text-black text-[1.125rem] leading-none">!</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-col gap-1">
              <p className="font-light text-[#F2F2F2] text-sm">App Error Detected</p>
              <p className="text-[#959697] text-sm font-light">
                It looks like an error occurred while trying to use your app.
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * NOTE: we have a shared error boundary for the app, but then we also expose
 * this in case something goes wrong outside of the normal user's app flow.
 * React-router will mount this one
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <SharedErrorBoundary isOpen={true} />;
}

function InternalErrorBoundary({ error: errorArg }: Route.ErrorBoundaryProps) {
  const routeError = useRouteError();
  const asyncError = useAsyncError();
  const error = errorArg ?? asyncError ?? routeError;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const animateTimer = setTimeout(() => setIsOpen(true), 100);
    return () => clearTimeout(animateTimer);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(serializeError(error)));
  }, [error]);

  return (
    <SharedErrorBoundary isOpen={isOpen}>
      <button
        className="flex flex-row items-center justify-center gap-[4px] outline-none transition-colors rounded-[8px] border-[1px] bg-[#2C2D2F] hover:bg-[#414243] active:bg-[#555658] border-[#414243] text-white text-sm px-[8px] py-[4px] w-fit"
        type="button"
        onClick={handleCopy}
      >
        Copy error
      </button>
    </SharedErrorBoundary>
  );
}

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = { hasError: boolean; error: unknown | null };

class ErrorBoundaryWrapper extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error(error, info);
    captureClientError(error, {
      extra: { componentStack: (info as { componentStack?: string })?.componentStack },
      tags: { boundary: 'ErrorBoundaryWrapper' },
    });
  }

  render() {
    if (this.state.hasError) {
      return <InternalErrorBoundary error={this.state.error} params={{}} />;
    }
    return this.props.children;
  }
}


export function Layout({ children }: { children: ReactNode }) {
  useEffect(() => {
    initSentryClient();
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Clearo AI summary" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Clearo full AI-readable site description" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {LoadFontsSSR ? <LoadFontsSSR /> : null}
      </head>
      <body>
        <noscript>
          Clearo is a medical imaging booking platform. Compare MRI, CT,
          X-ray and ultrasound prices across listed clinics, view appointment
          options, and book appointments online. AI-readable summaries are available at
          /llms.txt and /llms-full.txt.
        </noscript>
        <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
        <Toaster position="bottom-right" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <ConsentProvider>
        <IdleTimeout />
        <EnvironmentBanner />
        <VisitorTracker />
        <PortalGate>
          <Outlet />
        </PortalGate>
      </ConsentProvider>
    </SessionProvider>
  );
}
