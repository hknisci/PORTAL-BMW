// src/components/common/ExternalLink.tsx
import React from "react";
import { normalizeExternalUrl } from "@/utils/url";

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
};

export default function ExternalLink({
  href,
  children,
  className,
  title,
}: ExternalLinkProps) {
  const safeHref = normalizeExternalUrl(href);

  if (!safeHref) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title ?? safeHref}
    >
      {children}
    </a>
  );
}