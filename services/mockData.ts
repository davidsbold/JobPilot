export const mockJobs = {
  arbeitnow: [
    {
      "slug": "it-systemadministrator-mwd-1",
      "title": "IT Systemadministrator (m/w/d)",
      "company_name": "Tech Solutions GmbH",
      "location": "Berlin",
      "remote": false,
      "url": "https://arbeitnow.com/jobs/1",
      "tags": ["IT", "Systemadministration", "Windows"],
      "job_types": ["full_time"],
      "created_at": Math.floor(Date.now() / 1000) - 86400 * 2, // 2 days ago
      "description": "Wir suchen einen erfahrenen IT Systemadministrator für unsere Windows-Umgebung. Zu Ihren Aufgaben gehören die Verwaltung von Active Directory, Exchange Server und VMware. Kenntnisse in PowerShell sind von Vorteil. Erfahrung mit Ticketsystemen wie Jira ist ein Muss."
    },
    {
      "slug": "junior-linux-admin-2",
      "title": "Junior Linux Administrator (Quereinsteiger willkommen)",
      "company_name": "Open Source Innovators",
      "location": "München",
      "remote": true,
      "url": "https://arbeitnow.com/jobs/2",
      "tags": ["Linux", "Junior", "Remote"],
      "job_types": ["full_time", "part_time"],
      "created_at": Math.floor(Date.now() / 1000) - 86400 * 5, // 5 days ago
      "description": "Möchten Sie als Quereinsteiger in die IT? Wir suchen einen motivierten Junior Linux Admin. Sie lernen den Umgang mit Debian, Apache und Bash-Scripting. Wichtig sind Lernbereitschaft und Teamarbeit. Grundkenntnisse in TCP/IP sind erforderlich."
    }
  ],
  adzuna: [
    {
      "title": "IT Support Engineer (m/w/d)",
      "company": { "display_name": "Connectify AG" },
      "location": { "display_name": "Hamburg" },
      "created": new Date(Date.now() - 86400000 * 8).toISOString(), // 8 days ago
      "redirect_url": "https://adzuna.com/jobs/1",
      "description": "Als IT Support Engineer unterstützen Sie unsere Mitarbeiter bei technischen Problemen. Sie arbeiten mit unserem Ticketsystem, verwalten M365-Konten und sind für das Onboarding neuer Mitarbeiter zuständig. Fließende Deutsch- und Englischkenntnisse sind erforderlich. ITIL-Zertifizierung ist ein Plus.",
      "category": { "label": "IT Jobs" }
    },
    {
        "title": "Fachinformatiker Systemintegration / IT-Administrator (m/w/d)",
        "company": { "display_name": "CloudNine Systems" },
        "location": { "display_name": "Frankfurt am Main" },
        "created": new Date(Date.now() - 86400000 * 12).toISOString(), // 12 days ago
        "redirect_url": "https://adzuna.com/jobs/2",
        "description": "Für den Ausbau unserer Cloud-Infrastruktur suchen wir einen Fachinformatiker. Sie arbeiten mit Azure, Docker und Kubernetes. Erfahrung in der Automatisierung mit Ansible und Python ist gewünscht. Kenntnisse in den Bereichen Firewall und VPN sind ebenfalls wichtig.",
        "category": { "label": "IT Jobs" }
    }
  ]
};