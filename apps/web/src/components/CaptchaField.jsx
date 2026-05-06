"use client";

import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  getCaptchaResponse,
  getCaptchaConfig,
  prepareCaptchaWidget,
  removeCaptcha,
  resetCaptcha,
} from "@/utils/hcaptchaClient";

function areStatusesEqual(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  for (const key of leftKeys) {
    if (left[key] !== right[key]) return false;
  }

  return true;
}

const CaptchaField = memo(forwardRef(function CaptchaField(
  { onChange, onStatusChange = () => {}, action = "auth" },
  ref,
) {
  const MAX_INIT_RETRIES = 2;
  const CLIENT_TOKEN_MAX_AGE_MS = 110 * 1000;
  const widgetContainerRef = useRef(null);
  const widgetStateRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onStatusChangeRef = useRef(onStatusChange);
  const lastStatusRef = useRef(null);
  const retryTimerRef = useRef(null);
  const tokenIssuedAtRef = useRef(0);
  const [token, setToken] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  function publishStatus(nextStatus) {
    if (areStatusesEqual(lastStatusRef.current, nextStatus)) {
      return;
    }
    lastStatusRef.current = nextStatus;
    onStatusChangeRef.current(nextStatus);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializeCaptcha() {
      try {
        const config = await getCaptchaConfig(action);
        if (cancelled) return;
        publishStatus({
          visible: true,
          siteKeyPresent: Boolean(config.siteKey),
          scriptLoaded: false,
          widgetRendered: false,
          error: config.siteKey ? null : "Missing CAPTCHA site key",
          mode: "checkbox",
          provider: config.provider || "hcaptcha",
          executeCount: 0,
        });
        if (!config.siteKey || !widgetContainerRef.current) {
          return;
        }
        widgetContainerRef.current.innerHTML = "";
        const widgetState = await prepareCaptchaWidget(widgetContainerRef.current, {
          action,
          onVerify: (nextToken) => {
            if (cancelled) return;
            tokenIssuedAtRef.current = Date.now();
            setToken(nextToken);
            onChangeRef.current(nextToken);
            publishStatus({
              visible: true,
              siteKeyPresent: true,
              scriptLoaded: true,
              widgetRendered: true,
              error: null,
              mode: "checkbox",
              provider: config.provider || "hcaptcha",
              executeCount: 1,
              tokenGenerated: Boolean(nextToken),
            });
          },
          onExpire: () => {
            if (cancelled) return;
            tokenIssuedAtRef.current = 0;
            setToken("");
            onChangeRef.current("");
            publishStatus({
              visible: true,
              siteKeyPresent: true,
              scriptLoaded: true,
              widgetRendered: true,
              error: "CAPTCHA expired",
              mode: "checkbox",
              provider: config.provider || "hcaptcha",
              executeCount: 0,
              tokenGenerated: false,
            });
          },
          onError: (error) => {
            if (cancelled) return;
            tokenIssuedAtRef.current = 0;
            setToken("");
            onChangeRef.current("");
            publishStatus({
              visible: true,
              siteKeyPresent: true,
              scriptLoaded: true,
              widgetRendered: true,
              error: error?.message || "Failed to render hCaptcha",
              mode: "checkbox",
              provider: config.provider || "hcaptcha",
              executeCount: 0,
              tokenGenerated: false,
            });
          },
        });
        widgetStateRef.current = widgetState;
        setRetryCount(0);
        if (cancelled) return;
        publishStatus({
          visible: true,
          siteKeyPresent: true,
          scriptLoaded: true,
          widgetRendered: true,
          error: null,
          mode: "checkbox",
          provider: widgetState.config.provider || "hcaptcha",
          executeCount: 0,
        });
      } catch (error) {
        if (cancelled) return;
        publishStatus({
          visible: true,
          siteKeyPresent: false,
          scriptLoaded: false,
          widgetRendered: false,
          error: error?.message || "Failed to load CAPTCHA configuration",
          mode: "checkbox",
          provider: "hcaptcha",
          executeCount: 0,
        });
        if (retryCount < MAX_INIT_RETRIES) {
          retryTimerRef.current = window.setTimeout(() => {
            setRetryCount((count) => count + 1);
            setRetryNonce((value) => value + 1);
          }, 1200);
        }
      }
    }

    initializeCaptcha();

    return () => {
      cancelled = true;
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      const widgetId = widgetStateRef.current?.widgetId;
      widgetStateRef.current = null;
      if (widgetContainerRef.current) {
        widgetContainerRef.current.innerHTML = "";
      }
      if (widgetId !== undefined) {
        removeCaptcha(widgetId).catch(() => {});
      }
    };
  }, [action, retryCount, retryNonce]);

  async function resetCurrentCaptcha() {
    tokenIssuedAtRef.current = 0;
    setToken("");
    onChangeRef.current("");
    publishStatus({
      visible: true,
      siteKeyPresent: true,
      scriptLoaded: true,
      widgetRendered: true,
      error: null,
      mode: "checkbox",
      provider: widgetStateRef.current?.config?.provider || "hcaptcha",
      executeCount: 0,
      tokenGenerated: false,
    });
    if (widgetStateRef.current?.widgetId !== undefined) {
      await resetCaptcha(widgetStateRef.current.widgetId, action);
    }
  }

  useImperativeHandle(ref, () => ({
    async executeCaptcha() {
      if (
        token &&
        tokenIssuedAtRef.current &&
        Date.now() - tokenIssuedAtRef.current > CLIENT_TOKEN_MAX_AGE_MS
      ) {
        await resetCurrentCaptcha();
        publishStatus({
          visible: true,
          siteKeyPresent: true,
          scriptLoaded: true,
          widgetRendered: true,
          error: "CAPTCHA expired",
          mode: "checkbox",
          provider: widgetStateRef.current?.config?.provider || "hcaptcha",
          executeCount: 0,
          tokenGenerated: false,
        });
        return "";
      }

      if (widgetStateRef.current?.widgetId !== undefined) {
        const liveToken = await getCaptchaResponse(widgetStateRef.current.widgetId);
        publishStatus({
          visible: true,
          siteKeyPresent: true,
          scriptLoaded: true,
          widgetRendered: true,
          error: liveToken ? null : "Missing solved CAPTCHA token",
          mode: "checkbox",
          provider: widgetStateRef.current?.config?.provider || "hcaptcha",
          executeCount: liveToken ? 1 : 0,
          tokenGenerated: Boolean(liveToken),
        });
        if (liveToken) {
          if (liveToken !== token) {
            setToken(liveToken);
            onChangeRef.current(liveToken);
          }
          return liveToken;
        }
      }
      return token;
    },
    async resetCaptcha() {
      await resetCurrentCaptcha();
    },
  }), [action, token]);

  return (
    <div className="space-y-2">
      <div ref={widgetContainerRef} />
      {retryCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            setRetryCount(0);
            setRetryNonce((value) => value + 1);
          }}
          className="text-xs font-inter text-[#3D6B5E] underline underline-offset-2"
        >
          Reload CAPTCHA
        </button>
      ) : null}
      <p className="text-xs text-gray-500 font-inter leading-relaxed">
        This site is protected by hCaptcha and its{" "}
        <a href="https://www.hcaptcha.com/privacy" target="_blank" rel="noreferrer" className="underline">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="https://www.hcaptcha.com/terms" target="_blank" rel="noreferrer" className="underline">
          Terms of Service
        </a>{" "}
        apply.
      </p>
    </div>
  );
}), (prevProps, nextProps) => prevProps.action === nextProps.action);

export default CaptchaField;
