import Link from "next/link";
import type { Metadata } from "next";

import { loadManifest } from "@grid-spawn/sdk/node";

import { agentImageFromSlug, resolveLaunchCloud } from "../landing-from-manifest";
import { SiteHeader } from "../site-header";
import { SpawnLaunchView } from "../spawn-launch-view";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Spawn — Grid Spawn",
  description: "Install Grid Spawn and launch your agent on the cloud or locally.",
};

type CliGuidePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function CliGuidePage({ searchParams }: CliGuidePageProps) {
  const resolved = (await searchParams) ?? {};
  const agentSlug = firstParam(resolved.agent);
  const cloudParam = firstParam(resolved.cloud);

  const manifest = await loadManifest(false);
  const agentMeta = agentSlug ? manifest.agents[agentSlug] : undefined;
  const launch = resolveLaunchCloud(manifest, agentSlug, cloudParam);

  return (
    <div className={styles["page"]}>
      <SiteHeader />
      <main className={styles["main"]}>
        {launch && agentSlug && agentMeta ? (
          <SpawnLaunchView
            agentSlug={agentSlug}
            agentName={agentMeta.name}
            agentImage={agentImageFromSlug(agentSlug)}
            cloudSlug={launch.cloudSlug}
            cloudName={launch.cloudName}
          />
        ) : (
          <div className={styles["fallback"]}>
            <h1 className={styles["fallback__title"]}>Pick an agent and provider</h1>
            <p className={styles["fallback__p"]}>
              {agentSlug && agentMeta ? (
                <>
                  Choose where to run {agentMeta.name} on the{" "}
                  <Link href={`/?agent=${encodeURIComponent(agentSlug)}`} className={styles["fallback__link"]}>
                    homepage
                  </Link>
                  .
                </>
              ) : (
                <>
                  Start on the{" "}
                  <Link href="/" className={styles["fallback__link"]}>
                    homepage
                  </Link>{" "}
                  — pick an agent, then a cloud provider.
                </>
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
