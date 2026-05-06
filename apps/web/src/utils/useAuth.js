import { useCallback } from 'react';
import { signIn, signOut } from "@auth/create/react";
import { sanitizeCallbackUrl } from "@/utils/safeRedirect";

function useAuth() {
  const callbackUrl = typeof window !== 'undefined' 
    ? sanitizeCallbackUrl(new URLSearchParams(window.location.search).get('callbackUrl'))
    : null;

  const signInWithCredentials = useCallback((options = {}) => {
    return signIn("credentials-signin", {
      ...options,
      callbackUrl: callbackUrl ?? options.callbackUrl
    });
  }, [callbackUrl])

  const signUpWithCredentials = useCallback((options) => {
    return signIn("credentials-signup", {
      ...options,
      callbackUrl: callbackUrl ?? options.callbackUrl
    });
  }, [callbackUrl])

  const signInWithGoogle = useCallback((options) => {
    return signIn("google", {
      ...options,
      callbackUrl: callbackUrl ?? options.callbackUrl
    });
  }, [callbackUrl]);
  const signInWithApple = useCallback((options) => {
    return signIn("apple", {
      ...options,
      callbackUrl: callbackUrl ?? options.callbackUrl
    });
  }, [callbackUrl]);

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signInWithGoogle,
    signInWithApple,
    signOut,
  }
}

export default useAuth;
