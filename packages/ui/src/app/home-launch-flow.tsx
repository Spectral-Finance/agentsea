"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { HomeAgentPick } from "./home-agent-pick";
import { HomeCloudPick } from "./home-cloud-pick";
import type { HomeAgentVm, HomeCloudVm } from "./landing-from-manifest";

export type HomeLaunchFlowProps = {
  agents: HomeAgentVm[];
  cloudOptions: HomeCloudVm[];
  agentCloudAvailability: Record<string, string[]>;
};

export const HomeLaunchFlow = memo(function HomeLaunchFlowComp({
  agents,
  cloudOptions,
  agentCloudAvailability,
}: HomeLaunchFlowProps) {
  const searchParams = useSearchParams();
  const cloudSectionRef = useRef<HTMLElement>(null);
  const cloudTitleRef = useRef<HTMLHeadingElement>(null);

  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string | null>(null);

  const handleSelectAgent = useCallback((slug: string) => {
    setSelectedAgentSlug(slug);

    requestAnimationFrame(() => {
      cloudSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      cloudTitleRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const agentParam = searchParams.get("agent");
    if (!agentParam) return;

    const agent = agents.find((a) => a.slug === agentParam);
    if (!agent?.chatVerified || !agent.available) return;

    setSelectedAgentSlug(agentParam);

    requestAnimationFrame(() => {
      cloudSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams, agents]);

  return (
    <>
      <HomeAgentPick
        agents={agents}
        selectedAgentSlug={selectedAgentSlug}
        onSelectAgent={handleSelectAgent}
      />
      <HomeCloudPick
        cloudOptions={cloudOptions}
        agents={agents}
        agentCloudAvailability={agentCloudAvailability}
        selectedAgentSlug={selectedAgentSlug}
        sectionRef={cloudSectionRef}
        titleRef={cloudTitleRef}
      />
    </>
  );
});
