
import type { ReactNode } from "react";

export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/_anoobhab_/",
  linkedin: "https://www.linkedin.com/in/anubhab-chakraborty-4h28s",
  github: "https://github.com/Anubhab36",
};

function SocialIcon({
  name,
}: {
  name: "instagram" | "linkedin" | "github";
}) {
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle
          cx="17.5"
          cy="6.5"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    );
  }

  if (name === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 8.5V19M5 5.2v.2M10 19v-6.1c0-2 1-3.2 2.8-3.2s2.8 1.2 2.8 3.2V19M10 10v9M3 3h18v18H3z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 19c-4 1.2-4-2-5-2.5M13 21v-3.1c0-.9.1-1.6-.5-2.2 3.3-.4 6.8-1.6 6.8-7.2a5.6 5.6 0 0 0-1.5-3.9 5.2 5.2 0 0 0-.1-3.8s-1.2-.4-4 1.5a13.7 13.7 0 0 0-7.2 0C3.7.4 2.5.8 2.5.8a5.2 5.2 0 0 0-.1 3.8A5.6 5.6 0 0 0 .9 8.5c0 5.6 3.5 6.8 6.8 7.2-.6.5-.6 1.1-.6 2.2V21"
        transform="translate(2 1) scale(.9)"
      />
    </svg>
  );
}

export default function DeveloperFooter({
  social = false,
  children,
}: {
  social?: boolean;
  children?: ReactNode;
}) {
  return (
    <footer
      className={`developer-footer ${
        social ? "developer-footer-results" : ""
      }`}
    >
      {children}

      <div className="developer-game-name">THE LAST CLUE</div>
      <div className="developer-credit">
        Developed by Anubhab Chakraborty
      </div>

      {social && (
        <nav
          className="developer-socials"
          aria-label="Developer social profiles"
        >
          <a
            href={SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
          >
            <SocialIcon name="instagram" />
          </a>

          <a
            href={SOCIAL_LINKS.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
          >
            <SocialIcon name="linkedin" />
          </a>

          <a
            href={SOCIAL_LINKS.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <SocialIcon name="github" />
          </a>
        </nav>
      )}
    </footer>
  );
}
