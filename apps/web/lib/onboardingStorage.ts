export const ONBOARDING_STORAGE_KEY = "tres-finos-onboarding-v1-dismissed";

export const ONBOARDING_CHANGE_EVENT = "tres-finos-onboarding-dismissed";

export const subscribeOnboardingDismissed = (onChange: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(ONBOARDING_CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(ONBOARDING_CHANGE_EVENT, handler);
  };
};

export const getOnboardingDismissedSnapshot = (): boolean =>
  typeof window !== "undefined" && window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";

/** Server has no localStorage; assume not dismissed so first paint matches most users. */
export const getOnboardingDismissedServerSnapshot = (): boolean => false;

export const dismissOnboarding = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  window.dispatchEvent(new Event(ONBOARDING_CHANGE_EVENT));
};
