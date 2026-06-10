import { createFileRoute } from "@tanstack/react-router";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const Route = createFileRoute("/b/markee/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-primary/30">
      <OnboardingFlow />
    </div>
  );
}
