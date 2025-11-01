# Mental Health Support and Monitoring System

An interactive, educational web platform to help users learn about mental health, track their well‑being, access self‑help strategies, find emergency contacts, and connect with peers or professionals.

- Repository: [WalterMatsinhe/MentalHealthProject](https://github.com/WalterMatsinhe/MentalHealthProject)
- Live demo: [metal-heath-project.vercel.app](https://metal-heath-project.vercel.app)
- Default branch: `main`
- Tech mix (approx.): JavaScript (~55.7%), HTML (~22.8%), CSS (~21.5%)

---

## Problem Statement

Mental health issues such as stress, anxiety, and depression are increasingly affecting young adults, yet many lack access to affordable, reliable, and easily accessible support. Traditional solutions like counseling centers or helplines are often underutilized due to stigma, limited awareness, or accessibility barriers. There is a need for a digital platform that empowers users to understand and manage their mental well-being, track their progress over time, access educational resources, and connect with peers or professionals for support. Additionally, the platform should provide tools for generating personalized reports to help users gain insights into their mental health trends.

## Objectives

- Raise awareness by providing accessible mental health education.
- Support well-being through self-help strategies and emergency contacts.
- Enable users to track mood and mental health consistently.
- Provide peer and professional support through online interaction.
- Generate personalized reports to help users analyze their progress.

---

## Features

The platform is designed around these core modules. Depending on the current codebase state, some modules may be “Planned” and can be implemented iteratively.

- Education (Awareness)
  - Curated articles
  - Condition overviews (stress, anxiety, depression), coping strategies
- Self‑Help (Immediate Support)
  - Guided breathing, grounding techniques, journaling prompts
  - Resource links and emergency contacts (hotlines, local services)
- Mood & Wellness Tracking
  - Daily mood check‑ins (e.g., 1–5 scale + tags + notes)
  - Optional screening questionnaires (e.g., PHQ‑9, GAD‑7) with clear disclaimers
- Community & Professional Support
  - Peer interaction (e.g., moderated chat/forum) 
  - Professional directory or referral links 
- Personalized Reports & Insights
  - Trend charts for mood over time
  - Streaks, triggers, tags, and summary insights
  - Export/print/share a personal wellness report

> Important: This project is not a substitute for professional medical advice or therapy. Include clear disclaimers and crisis resources.

---

## Architecture Overview

- Frontend: HTML, CSS, JavaScript
  - Works as a static site; can run locally without a backend.
  - Interactivity for trackers, UI state, and simple persistence via LocalStorage.
- Backend (Planned/Optional):
  - If enabling accounts, sync, or community features: Node.js + a database with auth.
  - API design to store mood entries, journals, and assessments securely.
- Deployment: Vercel
  - Auto‑deploy on push to `main` when connected.

---

## Data and Privacy

- Local-only mode: Store data in the browser (LocalStorage/IndexedDB). User can clear data anytime.
- Cloud mode (if added): Require explicit consent, secure auth, encrypted transport (HTTPS), and clear data retention controls.
- Anonymization: Avoid storing personal identifiers unless necessary; provide data export and deletion options.
- Ethics: Add disclaimers, crisis links, and moderation for any community feature.

---

## Getting Started

You can view the live site at the link above. To run locally:

### Prerequisites
- A modern web browser (Chrome, Edge, Firefox, Safari)
- Optional: Lightweight static server (VS Code Live Server, `serve`, or Python http.server)

### Local Run (quick start)
```bash
git clone https://github.com/WalterMatsinhe/MentalHeathProject.git
cd MentalHeathProject
# Open index.html in your browser OR start a static server:
```

### Local Run (with a static server)
- VS Code + Live Server:
  - Open the folder in VS Code → Right‑click `index.html` → “Open with Live Server”
- Using npx:
  ```bash
  npx serve .
  ```

  Go to http://localhost:8080

---

## Project Structure

The exact structure may differ; update this section to match the repository.

```
MentalHeathProject/
├─ index.html
├─ /css
│  └─ styles.css
├─ /js
│  └─ main.js
├─ /assets
│  ├─ images/
│  └─ icons/
└─ README.md
```

Suggested pages/components:
- Home (overview + quick links)
- Learn (education hub)
- Self‑Help (exercises, resources)
- Track (mood check‑ins, journal)
- Reports (charts, summaries)
- Support (community/pro, if enabled)
- Crisis (emergency contacts)

---

## Implementation Guide (Phase Plan)

- Phase 1: Core static site
  - Content pages (Education, Resources, Crisis)
  - Basic UI and responsive design
- Phase 2: Local tracking
  - Mood tracker with LocalStorage
  - Journaling with search/filter
  - Basic charts (e.g., Chart.js) and summaries
- Phase 3: Assessments and reports
  - PHQ‑9/GAD‑7 with disclaimers, scoring, and exportable report
  - Trends, tags, triggers
- Phase 4: Optional cloud & community
  - Auth, profile, server‑side storage
  - Moderated peer support features
  - Professional directory and referrals

---

## Accessibility

- Use semantic HTML (landmarks, headings)
- Sufficient color contrast and scalable typography
- Alt text for images; aria labels for interactive elements
- Full keyboard navigation and focus states
- Test with screen readers when possible

---

## Configuration (Optional)

If you add third‑party services later, document variables in a `.env` (do not commit):
```
# Example placeholders
API_BASE_URL=
PUBLIC_ANALYTICS_KEY=
```

---

## Roadmap

- [ ] Expand educational content and references
- [ ] Implement mood tracker (LocalStorage) and journaling
- [ ] Add assessments (PHQ‑9, GAD‑7) with safe messaging
- [ ] Generate personalized reports with charts
- [ ] Crisis page with global and local emergency contacts
- [ ] Accessibility audit and improvements
- [ ] Optional: Auth + cloud sync (privacy‑first)
- [ ] Optional: Peer support (moderated) and professional directory
- [ ] Optional: i18n (multi‑language support)

---



## Acknowledgments

- Educators and peers who reviewed the project
- Public resources and organizations promoting mental health awareness
- Any icon/image libraries used (credit their licenses)

---

## Contact

- Author: [@WalterMatsinhe](https://github.com/WalterMatsinhe)
- Feedback: Open an issue in the repository
