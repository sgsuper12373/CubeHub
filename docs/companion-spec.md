# Cubby: Cubing companion — spec pointer

- Claude Doc (live, with comments): https://claude.ai/artifact/1e2w7i3NCzJm1Vm9SFSUho
- Google Doc copy: Drive > CubeHub > Features > "Cubby: Cubing companion" — https://docs.google.com/document/d/1OFSsNtAvRGuwewtn1N7ZFAVkajFzp9ykJa_4njenC1I/edit
- Repo copy: cubby-cubing-companion.md (Mermaid diagrams)

Decisions (Nov 23, 2026):
- Name: Cubby (final); players can rename it in Settings.
- Look: full body with eyes, eyebrows and a mouth; micro-expressions; theme-coloured stickers; mouth flaps, no lip sync.
- v1 is fully scripted: dock on every page (floating icon on mobile), versioned page tours with interactive steps, greetings, event reactions, BLD-mode solving animation.
- Beta tours: Timer, Learn, Drill Lab, Playground.
- Animation built in-house (SVG + Framer Motion) behind a CubbyRenderer interface (setInput / fire / onEvent) so a Rive file can be plugged in later.
- BLD timer mode not built yet; planned with a memo split set in preferences.
- AI pricing deferred to later versions.
- Roadmap: v1 scripted (Jan 2027 beta) -> v1.5 rule-based coach -> v2 skins/social -> v3 AI coach -> v4 smart-cube solve review.
- Hard rule: never animate or speak while the timer runs (except opt-in inspection coach and BLD animation).
