export const ONBOARDING_STORAGE_KEY = "tres-finos-onboarding-v1-dismissed";

export const isOnboardingDismissed = () =>
  typeof window !== "undefined" && window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";

export const dismissOnboarding = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
};
