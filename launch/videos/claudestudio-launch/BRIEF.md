---
workflow: product-launch-video
flow: automation
storyboard: no
mode: autonomous
message: "Your agent's taste becomes measurable, and fixable."
destination: youtube
aspect: 1920x1080
language: en
audience: developers who use coding agents (Claude Code, Codex, Cursor) to build frontends
length: 40s
angle: before-after
---

## Intent

Launch film for claudestudio, an open-source agent skill that makes coding agents design websites like top studios. Every rule is measured from 99 live studio sites. The user asked for "a really good launch video" made with the motion-director skill; no questions, build it.

## Assets

- assets/shots/*-hero.jpg — the nine example sites built with the skill (1440x900 heroes); the range beat cuts through them.
- site: https://arjunkshah12345-hash.github.io/claudestudio-skill/ — the brand: paper #FCFCFB, ink #121211, redline #E8321F, Bricolage Grotesque + JetBrains Mono.

## Customizations

- No narration. Kinetic type on music + designed SFX (motion-director: transients on the frame, drop on the title reveal).
- Signature: the redline. Red dimension lines measure the AI-default page, then the values roll to the measured studio values.

## Notes

- HeyGen not signed in: music generated locally with MusicGen (two stems, cut together so the drop lands on the title), SFX from the bundled library.
- AGENTS.md bans sub-agent fan-out, so frames are built by the orchestrator in one composition instead of per-frame workers.
