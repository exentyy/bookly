"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallationState = "loading" | "installed" | "ios" | "browser";

function getInstallationState(): InstallationState {
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
  if (standalone) return "installed";

  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ? "ios"
    : "browser";
}

function subscribeInstallationState(onChange: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  window.addEventListener("pageshow", onChange);
  return () => {
    displayMode.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
    window.removeEventListener("pageshow", onChange);
  };
}

export function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const installationState = useSyncExternalStore(subscribeInstallationState, getInstallationState, () => "loading");

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (installationState === "loading" || installationState === "installed") return null;

  if (installationState === "ios") {
    return (
      <div className="pwa-install-wrap">
        <button className="profile-action" onClick={() => setShowIosHelp((open) => !open)} aria-expanded={showIosHelp}>
          <Share size={17} /> Установить на экран «Домой» <span className="profile-action-arrow">{showIosHelp ? "−" : "＋"}</span>
        </button>
        {showIosHelp && <p className="pwa-install-help">В Safari нажмите «Поделиться», затем выберите «На экран Домой».</p>}
      </div>
    );
  }

  return (
    <button className="profile-action" onClick={async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    }}>
      <Download size={17} /> Установить BOOKLY <span className="profile-action-arrow">＋</span>
    </button>
  );
}
