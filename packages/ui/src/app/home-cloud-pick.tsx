"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, type RefObject } from "react";

import { LocalMachineLogo } from "./cloud-logos";
import { DIGITALOCEAN_LOGO_PATH, LINODE_LOGO_PATH } from "./home-public-constants";
import type { HomeAgentVm, HomeCloudVm } from "./landing-from-manifest";
import styles from "./page.module.scss";

export type HomeCloudPickProps = {
  cloudOptions: HomeCloudVm[];
  agents: HomeAgentVm[];
  agentCloudAvailability: Record<string, string[]>;
  selectedAgentSlug: string | null;
  sectionRef: RefObject<HTMLElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
};

function cloudLogo(slug: string, icon: string | null, className: string) {
  if (slug === "local") {
    return <LocalMachineLogo className={className} />;
  }
  if (slug === "digitalocean") {
    return (
      <Image
        src={DIGITALOCEAN_LOGO_PATH}
        alt=""
        width={44}
        height={44}
        className={styles["cloudCard__img"]}
        sizes="44px"
        unoptimized
      />
    );
  }
  if (slug === "linode") {
    return (
      <Image
        src={LINODE_LOGO_PATH}
        alt=""
        width={44}
        height={44}
        className={styles["cloudCard__img"]}
        sizes="44px"
        unoptimized
      />
    );
  }
  if (icon) {
    return (
      <Image
        src={icon}
        alt=""
        width={44}
        height={44}
        className={styles["cloudCard__img"]}
        sizes="44px"
        unoptimized
      />
    );
  }
  return <LocalMachineLogo className={className} />;
}

function cliHref(agentSlug: string, cloudSlug: string): string {
  return `/cli?agent=${encodeURIComponent(agentSlug)}&cloud=${encodeURIComponent(cloudSlug)}`;
}

export const HomeCloudPick = memo(function HomeCloudPickComp({
  cloudOptions,
  agents,
  agentCloudAvailability,
  selectedAgentSlug,
  sectionRef,
  titleRef,
}: HomeCloudPickProps) {
  if (!selectedAgentSlug) return null;

  const agent = agents.find((a) => a.slug === selectedAgentSlug);
  const availableClouds = agentCloudAvailability[selectedAgentSlug] ?? [];

  return (
    <section ref={sectionRef} className={styles["band"]} aria-labelledby="cloud-pick-title">
      <div className={styles["sectionHead"]}>
        <span className={styles["sectionHead__index"]} aria-hidden="true">
          2
        </span>
        <h2 id="cloud-pick-title" ref={titleRef} className={styles["sectionHead__title"]} tabIndex={-1}>
          Pick where to run
        </h2>
      </div>

      <p className={styles["cloudPickLead"]}>
        Where should <strong>{agent?.name ?? selectedAgentSlug}</strong> run?
      </p>

      <ul className={styles["cloudGrid"]}>
        {cloudOptions.map((c) => {
          const comingSoon = c.comingSoon;
          const availableForAgent = !comingSoon && availableClouds.includes(c.slug);
          const selectable = availableForAgent;

          let disabledReason: string | null = null;
          if (comingSoon) {
            disabledReason = "Coming soon";
          } else if (!availableForAgent) {
            disabledReason = `Not yet supported for ${agent?.name ?? "this agent"}`;
          }

          const cardClass = [
            styles["cloudCard"],
            selectable ? styles["cloudCard--clickable"] : "",
            !selectable ? styles["cloudCard--disabled"] : "",
          ]
            .filter(Boolean)
            .join(" ");

          const inner = (
            <>
              <div className={styles["cloudCard__top"]}>
                <div className={styles["cloudCard__logo"]} aria-hidden>
                  {cloudLogo(c.slug, c.icon, styles["cloudCard__logoSvg"] ?? "")}
                </div>
                <div className={styles["cloudCard__head"]}>
                  <h3 className={styles["cloudCard__name"]}>{c.name}</h3>
                  {comingSoon && <span className={styles["cloudCard__badge"]}>Coming soon</span>}
                </div>
              </div>
              <p className={styles["cloudCard__desc"]}>{c.description}</p>
              {disabledReason && !comingSoon && (
                <p className={styles["cloudCard__reason"]}>{disabledReason}</p>
              )}
            </>
          );

          return (
            <li key={c.slug}>
              {selectable ? (
                <Link href={cliHref(selectedAgentSlug, c.slug)} className={cardClass}>
                  {inner}
                </Link>
              ) : (
                <div className={cardClass} aria-disabled="true">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
});
