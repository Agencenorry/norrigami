"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  brief: string;
  url: string;
  notes: string;
  sprints: string;
  zoning: string | null;
  copy: string | null;
  miroUrl: string | null;
  miroBoardId: string | null;
  copyBrief: string;
  keywords: string;
}

type View = "home" | "project";
type ProjectStep = "brief" | "zoning" | "copy-brief" | "copy";

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconFigma({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

function IconMiro({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

function IconUxPilot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconZoning({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconPen({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-full border-2 border-[#E5E5E5] border-t-[#2E1343] animate-spin ${className || "w-6 h-6"}`}
      role="status"
      aria-label="Chargement"
    />
  );
}

function buildUxPilotPrompt(zoning: string | null, copy: string | null) {
  return `Génère des wireframes low-fidelity pour ce site web.

CONTRAINTES LOW-FI STRICTES :
- Formes géométriques simples uniquement : rectangles, lignes, cercles
- Pas de couleurs réelles : uniquement niveaux de gris (#F5F5F5, #E5E5E5, #CCCCCC, #999999, #333333)
- Pas d'images réelles : remplace par des rectangles gris avec une croix dedans
- Texte en blocs : les titres en barres grises épaisses, les paragraphes en lignes fines
- Boutons : rectangles avec bordure, sans style
- Icônes : cercles ou carrés simples
- Navigation : barre rectangulaire avec liens en texte simple
- L'objectif est de représenter la STRUCTURE et le CONTENU, pas le style visuel

ZONING (structure des pages) :
${zoning || ""}

COPYWRITING (contenu textuel) :
${copy || ""}

Instructions : Génère une page à la fois en commençant par la page d'accueil.
Représente chaque bloc du zoning comme une zone rectangulaire clairement délimitée.
Indique le nom du bloc en petit texte gris en haut de chaque zone.
Place le copy réel dans chaque bloc sous forme de texte simple.`;
}

function extractPages(zoning: string): { name: string; content: string }[] {
  const pages: { name: string; content: string }[] = [];
  const lines = zoning.split("\n");
  let currentPage: { name: string; content: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isMdHeader = trimmed.match(/^#{1,2}\s+(.+)/);
    const isPagePrefix = trimmed.match(/^Page\s*:\s*(.+)/i);
    const isDashHeader = trimmed.match(/^-{3,}\s*(.+)\s*-{3,}/);

    const isUppercaseTitle =
      (!trimmed.startsWith("*") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("#") &&
        !trimmed.includes(":") &&
        trimmed.length > 3 &&
        /^[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒÆ0-9\s\-\/'.()]+$/i.test(trimmed) &&
        trimmed === trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().normalize("NFC")) ||
      (/^[A-Z0-9\s\-\/'.()ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒÆ]+$/.test(trimmed) &&
        trimmed.length > 3 &&
        !trimmed.startsWith("*") &&
        !trimmed.startsWith("-"));

    const match = isMdHeader || isPagePrefix || isDashHeader;
    const pageName = match
      ? match[1].trim()
      : isUppercaseTitle
        ? trimmed
        : null;

    if (pageName) {
      if (currentPage) pages.push(currentPage);
      currentPage = { name: pageName, content: line + "\n" };
    } else if (currentPage) {
      currentPage.content += line + "\n";
    }
  }

  if (currentPage) pages.push(currentPage);
  if (pages.length === 0) pages.push({ name: "Site complet", content: zoning });
  return pages;
}

const btnPrimary =
  "bg-[#2E1343] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#3d1a5a] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const btnSecondary =
  "bg-white border border-[#E5E5E5] text-[#220D31] rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#F5F5F5] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const field =
  "w-full bg-white border border-[#E5E5E5] rounded-lg p-3 text-sm text-[#220D31] placeholder-[#9B9B9B] focus:outline-none focus:border-[#2E1343] resize-none transition-colors";
const card = "bg-white border border-[#E5E5E5] rounded-xl p-5 hover:border-[#2E1343] transition-colors";

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [step, setStep] = useState<ProjectStep>("brief");
  const [ngrokUrl] = useState(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("kore-ngrok") ?? localStorage.getItem("norrigami-ngrok") ?? "")
      : ""
  );
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [brief, setBrief] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [sprints, setSprints] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const [hasExistingZoning, setHasExistingZoning] = useState(false);
  const [zoningPdf, setZoningPdf] = useState<File | null>(null);
  const [loadingImportZoning, setLoadingImportZoning] = useState(false);

  const [copyBrief, setCopyBrief] = useState("");
  const [copyBriefFile, setCopyBriefFile] = useState<File | null>(null);
  const [keywords, setKeywords] = useState("");
  const [keywordsFile, setKeywordsFile] = useState<File | null>(null);

  const [loadingZoning, setLoadingZoning] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [loadingMiro, setLoadingMiro] = useState(false);
  const [loadingMiroCopy, setLoadingMiroCopy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string; files?: string[] }[]>(
    []
  );
  const [chatInput, setChatInput] = useState("");
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"zoning" | "copy">("zoning");

  const [copyPages, setCopyPages] = useState<{ name: string; content: string }[]>([]);
  const [activeCopyPage, setActiveCopyPage] = useState<string>("");
  const [generatingPageIndex, setGeneratingPageIndex] = useState<number>(-1);

  const [uxPilotOpen, setUxPilotOpen] = useState(false);
  const [figJamNotice, setFigJamNotice] = useState<{ apiUrl: string; projectId: string } | null>(null);

  const uxPilotPromptText = useMemo(
    () => buildUxPilotPrompt(currentProject?.zoning ?? null, currentProject?.copy ?? null),
    [currentProject?.zoning, currentProject?.copy]
  );

  useEffect(() => {
    fetchProjects();
    const savedNgrok =
      localStorage.getItem("kore-ngrok") ?? localStorage.getItem("norrigami-ngrok");
    if (savedNgrok) {
      localStorage.setItem("kore-ngrok", savedNgrok);
    }
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (data.projects) {
        setProjects(
          data.projects.map((p: Record<string, string>) => ({
            id: p.id,
            name: p.name,
            createdAt: p.created_at,
            brief: p.brief || "",
            url: p.url || "",
            notes: p.notes || "",
            sprints: p.sprints || "",
            zoning: p.zoning || null,
            copy: p.copy || null,
            miroUrl: p.miro_url || null,
            miroBoardId: p.miro_board_id || null,
            copyBrief: p.copy_brief || "",
            keywords: p.keywords || "",
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const saveProject = async (project: Project) => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
  };

  const createProject = () => {
    const project: Project = {
      id: `project-${Date.now()}`,
      name: "Nouveau projet",
      createdAt: new Date().toISOString(),
      brief: "",
      url: "",
      notes: "",
      sprints: "",
      zoning: null,
      copy: null,
      miroUrl: null,
      miroBoardId: null,
      copyBrief: "",
      keywords: "",
    };
    setCurrentProject(project);
    setBrief("");
    setUrl("");
    setNotes("");
    setSprints("");
    setPdfUrl("");
    setFiles([]);
    setCopyBrief("");
    setCopyBriefFile(null);
    setKeywords("");
    setKeywordsFile(null);
    setHasExistingZoning(false);
    setZoningPdf(null);
    setStep("brief");
    setError(null);
    setView("project");
  };

  const openProject = (project: Project) => {
    setCurrentProject(project);
    setBrief(project.brief);
    setUrl(project.url);
    setNotes(project.notes);
    setSprints(project.sprints || "");
    setCopyBrief(project.copyBrief || "");
    setKeywords(project.keywords || "");
    setHasExistingZoning(false);
    setZoningPdf(null);
    setStep(project.copy ? "copy" : project.zoning ? "zoning" : "brief");
    setError(null);
    setView("project");
  };

  const updateProject = async (updated: Partial<Project>) => {
    if (!currentProject) return;
    const newProject = { ...currentProject, ...updated };
    setCurrentProject(newProject);
    setProjects((prev) => {
      const all = prev.filter((p) => p.id !== newProject.id);
      return [newProject, ...all];
    });
    await saveProject(newProject);
  };

  const deleteProject = async (id: string) => {
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const pdfs = Array.from(incoming).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleImportZoning = async () => {
    if (!zoningPdf) return;
    setLoadingImportZoning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", zoningPdf);
      const response = await fetch("/api/import-zoning", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const projectName = zoningPdf.name.replace(".pdf", "").slice(0, 40) || "Projet sans nom";
      await updateProject({ zoning: data.zoning, name: projectName });
      setStep("zoning");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur import zoning");
    } finally {
      setLoadingImportZoning(false);
    }
  };

  function parseZoningForFigJam(zoningText: string) {
    const pages: {
      cleanLabel: string;
      type: string;
      sprint: number | null;
      sections: { label: string; objective: string }[];
    }[] = [];
    const lines = zoningText.split("\n");
    let currentPage: (typeof pages)[0] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^#{1,3} /)) {
        const rawLabel = trimmed.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").trim();
        if (
          rawLabel.toLowerCase().includes("zoning") ||
          rawLabel.toLowerCase().includes("architecture") ||
          rawLabel.length < 2
        )
          continue;
        if (currentPage) pages.push(currentPage);
        const sprintMatch = rawLabel.match(/\[Sprint\s*(\d+)\]/i);
        const sprint = sprintMatch ? parseInt(sprintMatch[1]) : null;
        const cleanLabel = rawLabel.replace(/\[Sprint\s*\d+\]/gi, "").trim();
        const type =
          cleanLabel.toLowerCase().includes("mention") ||
          cleanLabel.toLowerCase().includes("politique") ||
          cleanLabel.toLowerCase().includes("404")
            ? "utility"
            : pages.length === 0
              ? "main"
              : "secondary";
        currentPage = { cleanLabel, type, sprint, sections: [] };
      } else if (trimmed.startsWith("- ") && currentPage) {
        const content = trimmed.slice(2);
        const boldMatch = content.match(/^\*\*([^*]+)\*\*/);
        const label = boldMatch
          ? boldMatch[1].replace(/\s*:\s*$/, "").trim()
          : content.split(":")[0].replace(/\*\*/g, "").trim();
        const objective = content
          .replace(/^\*\*[^*]+\*\*\s*:?\s*/, "")
          .replace(/^\s*:\s*/, "")
          .replace(/\*\*/g, "")
          .trim();
        if (label.length > 1) currentPage.sections.push({ label, objective });
      }
    }
    if (currentPage) pages.push(currentPage);
    return pages.filter((p) => p.cleanLabel && p.sections.length > 0);
  }

  const handleGenerateZoning = async () => {
    if (!brief.trim() && files.length === 0 && !pdfUrl.trim()) return;
    setLoadingZoning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("brief", brief);
      formData.append("url", url);
      formData.append("notes", notes);
      formData.append("sprints", sprints);
      formData.append("pdfUrl", pdfUrl);
      files.forEach((f) => formData.append("files", f));
      const response = await fetch("/api/generate-zoning", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const projectName = brief.slice(0, 40) || "Projet sans nom";
      await updateProject({ zoning: data.zoning, brief, url, notes, sprints, name: projectName });
      setStep("zoning");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoadingZoning(false);
    }
  };

  const handleExportMiro = async () => {
    if (!currentProject?.zoning) return;
    setLoadingMiro(true);
    setError(null);
    try {
      const response = await fetch("/api/miro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoningText: currentProject.zoning,
          projectName: currentProject.name,
          sprints: currentProject.sprints,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await updateProject({ miroUrl: data.boardUrl, miroBoardId: data.boardId });
      window.open(data.boardUrl, "_blank");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur Miro");
    } finally {
      setLoadingMiro(false);
    }
  };

  const handleExportFigJam = async () => {
    if (!currentProject?.zoning) return;
    setError(null);
    try {
      const pages = parseZoningForFigJam(currentProject.zoning);
      const response = await fetch("/api/figjam-zoning/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProject.id, projectName: currentProject.name, pages }),
      });
      if (!response.ok) throw new Error("Erreur sauvegarde");
      const apiUrl = ngrokUrl ? `${ngrokUrl}/api/figjam-zoning` : `https://kore.vercel.app/api/figjam-zoning`;
      setFigJamNotice({ apiUrl, projectId: currentProject.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur export FigJam");
    }
  };

  const handleGenerateCopy = async () => {
    if (!currentProject?.zoning) return;
    setLoadingCopy(true);
    setError(null);

    const pages = extractPages(currentProject.zoning);

    const initialCopyPages = pages.map((p) => ({ name: p.name, content: "" }));
    setCopyPages(initialCopyPages);
    setActiveCopyPage(pages[0].name);
    setGeneratingPageIndex(0);
    setStep("copy");
    setActiveTab("copy");

    let context = "Voici les informations pour générer le copywriting :\n\n";
    if (brief) context += `### Brief client\n${brief}\n\n`;
    if (url) context += `### URL du site existant\n${url}\n\n`;
    if (notes) context += `### Notes d'entretien\n${notes}\n\n`;
    if (copyBrief) context += `### Brief copywriting\n${copyBrief}\n\n`;
    if (keywords) context += `### Mots-clés SEO\n${keywords}\n\n`;

    try {
      const results: { name: string; content: string }[] = [...initialCopyPages];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        setGeneratingPageIndex(i);
        setActiveCopyPage(page.name);

        const formData = new FormData();
        formData.append("pageName", page.name);
        formData.append("pageContent", page.content);
        formData.append("context", context);
        if (currentProject.zoning) formData.append("fullZoning", currentProject.zoning);

        const response = await fetch("/api/generate-copy", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erreur serveur");

        results[i] = { name: page.name, content: data.copy };
        setCopyPages([...results]);

        if (i < pages.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      setGeneratingPageIndex(-1);

      const fullCopy = results.map((p) => p.content).join("\n\n");
      await updateProject({ copy: fullCopy, copyBrief, keywords });
      setCurrentProject((prev) => (prev ? { ...prev, copy: fullCopy } : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("copy-brief");
      setGeneratingPageIndex(-1);
    } finally {
      setLoadingCopy(false);
    }
  };

  const handleExportCopyToMiro = async () => {
    if (!currentProject?.copy || !currentProject?.miroBoardId) return;
    setLoadingMiroCopy(true);
    setError(null);
    try {
      const response = await fetch("/api/miro-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: currentProject.miroBoardId,
          copyText: currentProject.copy,
          zoningText: currentProject.zoning,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.open(currentProject.miroUrl || "", "_blank");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur export copy Miro");
    } finally {
      setLoadingMiroCopy(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() && chatFiles.length === 0) return;
    if (!currentProject) return;
    const userMessage = {
      role: "user" as const,
      content: chatInput,
      files: chatFiles.map((f) => f.name),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    const inputSnapshot = chatInput;
    const filesSnapshot = [...chatFiles];
    setChatInput("");
    setChatFiles([]);
    setChatLoading(true);
    try {
      const formData = new FormData();
      formData.append("message", inputSnapshot);
      formData.append("zoning", currentProject.zoning || "");
      formData.append("copy", currentProject.copy || "");
      formData.append("history", JSON.stringify(chatMessages));
      filesSnapshot.forEach((f) => formData.append("files", f));
      const response = await fetch("/api/chat", { method: "POST", body: formData });
      const data = await response.json();
      console.log("CHAT DATA:", JSON.stringify(data));
      if (!response.ok) throw new Error(data.error);

      let assistantText = "";
      if (data.updatedZoning) {
        assistantText =
          data.message && data.message.length < 200 && !data.message.includes('"updatedZoning"')
            ? data.message
            : "Zoning mis à jour ✓";
        setCurrentProject((prev) => (prev ? { ...prev, zoning: data.updatedZoning } : prev));
        await updateProject({ zoning: data.updatedZoning });
      } else if (data.updatedCopy) {
        assistantText =
          data.message && data.message.length < 200 && !data.message.includes('"updatedCopy"')
            ? data.message
            : "Copy mis à jour ✓";
        setCurrentProject((prev) => (prev ? { ...prev, copy: data.updatedCopy } : prev));
        await updateProject({ copy: data.updatedCopy });
      } else {
        assistantText = data.message || "Fait.";
      }

      setChatMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erreur : " + (err instanceof Error ? err.message : "Inconnue"),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderCorrectionChat = () => (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconPen className="w-4 h-4 text-[#220D31]" />
          <span className="text-sm font-semibold text-[#220D31]">Demander une correction</span>
        </div>
        {chatMessages.length > 0 && (
          <button
            type="button"
            onClick={() => setChatMessages([])}
            className="text-xs text-[#6B6B6B] hover:text-[#220D31]"
          >
            Effacer
          </button>
        )}
      </div>
      {chatMessages.length > 0 && (
        <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-[#220D31] text-white" : "bg-[#F5F5F5] text-[#220D31]"
                }`}
              >
                {msg.content}
                {msg.files && msg.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.files.map((f, fi) => (
                      <span key={fi} className="text-xs opacity-70 bg-white/20 rounded px-2 py-0.5">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-[#F5F5F5] rounded-xl px-4 py-3">
                <Spinner className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="px-6 py-4 space-y-3">
        {chatFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chatFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs text-[#220D31]"
              >
                {f.name}
                <button
                  type="button"
                  onClick={() => setChatFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-[#6B6B6B] hover:text-[#220D31]"
                >
                  <IconTrash className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChat();
              }
            }}
            placeholder='Ex: "Rends le ton plus direct" ou colle les retours du client...'
            rows={2}
            className={field}
          />
          <div className="flex gap-2 shrink-0">
            <label className={`${btnSecondary} cursor-pointer inline-flex items-center gap-1 py-2 px-3`}>
              <IconUpload className="w-4 h-4" />
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setChatFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }}
              />
            </label>
            <button
              type="button"
              onClick={handleChat}
              disabled={(!chatInput.trim() && chatFiles.length === 0) || chatLoading}
              className={btnPrimary}
            >
              →
            </button>
          </div>
        </div>
        <p className="text-xs text-[#6B6B6B]">
          Entrée pour envoyer · Shift+Entrée pour saut de ligne · Upload pour partager les retours client
        </p>
      </div>
    </div>
  );

  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## "))
        return (
          <h2 key={i} className="text-xl font-semibold text-[#220D31] mt-8 mb-3">
            {line.replace("## ", "")}
          </h2>
        );
      if (line.startsWith("### "))
        return (
          <h3 key={i} className="text-base font-medium text-[#333333] mt-5 mb-2">
            {line.replace("### ", "")}
          </h3>
        );
      if (line.startsWith("- "))
        return (
          <li key={i} className="ml-4 text-[#555555] text-sm list-disc">
            {line.slice(2)}
          </li>
        );
      if (line.startsWith("---")) return <hr key={i} className="border-[#E5E5E5] my-4" />;
      if (line.match(/^\*\*.+\*\*$/))
        return (
          <p key={i} className="font-semibold text-[#220D31] mt-3 text-sm">
            {line.replace(/\*\*/g, "")}
          </p>
        );
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return (
        <p key={i} className="text-[#555555] text-sm leading-relaxed">
          {line.replace(/\*\*/g, "")}
        </p>
      );
    });
  };

  const canGenerate = brief.trim() || files.length > 0 || pdfUrl.trim();
  const figJamApiUrl = ngrokUrl ? `${ngrokUrl}/api/figjam-zoning` : `https://kore.vercel.app/api/figjam-zoning`;

  if (view === "home") {
    return (
      <main className="min-h-screen bg-[#FAFAFA] text-[#220D31]">
        <div className="border-b border-[#E5E5E5] bg-white px-8 py-5 flex items-center justify-between relative">
          <Image src="/logo-kore-02.svg" alt="Kore" width={160} height={32} className="h-8 w-auto" unoptimized />
          <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-xs text-[#6B6B6B] uppercase tracking-widest">Zoning · Copywriting CRO/SEO</span>
          </div>
          <button type="button" onClick={createProject} className={btnPrimary}>
            Nouveau projet
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold mb-2 text-[#220D31]">Projets</h1>
            <p className="text-[#6B6B6B] text-sm">Retrouvez tous vos projets clients.</p>
          </div>

          {loadingProjects ? (
            <div className="text-center py-24 flex flex-col items-center gap-4">
              <Spinner className="w-8 h-8" />
              <p className="text-[#6B6B6B] text-sm">Chargement des projets...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <IconZoning className="w-12 h-12 mx-auto text-[#E5E5E5]" />
              <p className="text-[#6B6B6B]">Aucun projet pour l&apos;instant</p>
              <button type="button" onClick={createProject} className={btnPrimary}>
                Créer mon premier projet
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`group flex items-center justify-between ${card} cursor-pointer`}
                  onClick={() => openProject(project)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg flex items-center justify-center text-[#220D31]">
                      {project.copy ? (
                        <span className="text-[#16A34A] text-lg leading-none">✓</span>
                      ) : project.zoning ? (
                        <IconZoning className="w-5 h-5" />
                      ) : (
                        <IconPen className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[#220D31] truncate">{project.name}</div>
                      <div className="text-xs text-[#6B6B6B] mt-0.5 flex flex-wrap items-center gap-3">
                        <span>{new Date(project.createdAt).toLocaleDateString("fr-FR")}</span>
                        {project.zoning && <span className="text-[#2E1343]">Zoning ✓</span>}
                        {project.copy && <span className="text-[#16A34A]">Copy ✓</span>}
                        {project.miroUrl && <span className="text-[#6B6B6B]">Miro ✓</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[#6B6B6B] hover:text-[#220D31] transition-all cursor-pointer p-2 shrink-0"
                    aria-label="Supprimer le projet"
                  >
                    <IconTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#220D31]">
      {figJamNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog">
          <div className="bg-white border border-[#E5E5E5] rounded-xl max-w-lg w-full p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#220D31] mb-2">Zoning prêt pour FigJam</h3>
            <p className="text-sm text-[#6B6B6B] mb-4">
              Dans FigJam, ouvre le plugin Kore et renseigne l&apos;URL et l&apos;ID du projet ci-dessous.
            </p>
            <div className="text-xs font-mono bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-3 space-y-2 mb-4">
              <div>
                <span className="text-[#6B6B6B]">URL : </span>
                {figJamNotice.apiUrl}
              </div>
              <div>
                <span className="text-[#6B6B6B]">ID : </span>
                {figJamNotice.projectId}
              </div>
            </div>
            <button type="button" className={btnPrimary} onClick={() => setFigJamNotice(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {uxPilotOpen && currentProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog">
          <div className="bg-white border border-[#E5E5E5] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-lg">
            <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-[#220D31] flex items-center gap-2">
                <IconUxPilot className="w-5 h-5 shrink-0" />
                Prompt UX Pilot
              </h3>
              <button
                type="button"
                className="text-[#6B6B6B] hover:text-[#220D31] p-1 text-xl leading-none w-8 h-8 flex items-center justify-center"
                onClick={() => setUxPilotOpen(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <pre className="text-xs text-[#555555] whitespace-pre-wrap font-sans bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 max-h-80 overflow-y-auto">
                {uxPilotPromptText}
              </pre>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`${btnPrimary} inline-flex items-center gap-2`}
                  onClick={() => navigator.clipboard.writeText(uxPilotPromptText)}
                >
                  <IconCopy className="w-4 h-4" />
                  Copier le prompt
                </button>
                <a
                  href="https://uxpilot.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btnSecondary} inline-flex items-center gap-2 no-underline`}
                >
                  Ouvrir UX Pilot →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-[#E5E5E5] bg-white px-8 py-5 flex items-center justify-between relative">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => {
              setView("home");
              fetchProjects();
            }}
            className="text-sm text-[#6B6B6B] hover:text-[#220D31] cursor-pointer shrink-0"
          >
            ← Projets
          </button>
          <div className="w-px h-5 bg-[#E5E5E5] shrink-0" />
          <button
            type="button"
            onClick={() => {
              setView("home");
              fetchProjects();
            }}
            className="p-0 border-0 bg-transparent cursor-pointer shrink-0"
            aria-label="Retour à l’accueil"
          >
            <Image src="/logo-kore-02.svg" alt="Kore" width={160} height={32} className="h-8 w-auto shrink-0" unoptimized />
          </button>
        </div>
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-xs text-[#6B6B6B] uppercase tracking-widest">Zoning · Copywriting CRO/SEO</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {[
            { key: "brief", label: "Brief" },
            { key: "zoning", label: "Zoning" },
            { key: "copy-brief", label: "Brief copy" },
            { key: "copy", label: "Copywriting" },
          ].map((s, i) => {
            const order = ["brief", "zoning", "copy-brief", "copy"];
            const isDone = order.indexOf(step) > order.indexOf(s.key);
            const isActive = step === s.key;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 text-xs ${isActive ? "text-[#220D31] font-medium" : isDone ? "text-[#6B6B6B]" : "text-[#9B9B9B]"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? "bg-[#2E1343] text-white"
                        : isActive
                          ? "bg-[#2E1343] text-white"
                          : "bg-[#F5F5F5] text-[#6B6B6B] border border-[#E5E5E5]"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < 3 && <div className="w-6 h-px bg-[#E5E5E5] hidden sm:block" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {step === "brief" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-semibold mb-2 text-[#220D31]">Brief client</h1>
              <p className="text-[#6B6B6B] text-sm">Renseignez les informations disponibles pour générer le zoning.</p>
            </div>

            <div
              onClick={() => setHasExistingZoning(!hasExistingZoning)}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                hasExistingZoning ? "bg-[#F5F5F5] border-[#2E1343]" : "bg-white border-[#E5E5E5] hover:border-[#2E1343]"
              }`}
            >
              <div className="flex items-center gap-3">
                <IconUpload className="w-5 h-5 text-[#6B6B6B]" />
                <div>
                  <div className="text-sm font-medium text-[#220D31]">J&apos;ai déjà un zoning</div>
                  <div className="text-xs text-[#6B6B6B]">Importer un PDF de zoning existant et passer directement au copywriting</div>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${
                  hasExistingZoning ? "bg-[#2E1343]" : "bg-[#E5E5E5]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${hasExistingZoning ? "translate-x-4" : "translate-x-0"}`}
                />
              </div>
            </div>

            {hasExistingZoning ? (
              <div className="space-y-4">
                <div
                  onClick={() => document.getElementById("zoning-pdf-input")?.click()}
                  className="border-2 border-dashed border-[#E5E5E5] hover:border-[#2E1343] bg-white rounded-xl p-10 text-center cursor-pointer transition-colors"
                >
                  <IconUpload className="w-8 h-8 mx-auto mb-3 text-[#6B6B6B]" />
                  <div className="text-[#6B6B6B] text-sm">
                    {zoningPdf ? (
                      <span className="text-[#220D31] font-medium">{zoningPdf.name}</span>
                    ) : (
                      <>
                        Glissez votre PDF de zoning ici ou <span className="text-[#220D31] underline">parcourir</span>
                      </>
                    )}
                  </div>
                  <div className="text-[#9B9B9B] text-xs mt-1">PDF du zoning fourni par le client ou l&apos;équipe</div>
                </div>
                <input
                  id="zoning-pdf-input"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setZoningPdf(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {loadingImportZoning ? (
                  <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8 text-center space-y-4">
                    <Spinner className="w-8 h-8 mx-auto" />
                    <p className="text-[#6B6B6B] text-sm">Import et reformatage du zoning...</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleImportZoning}
                    disabled={!zoningPdf}
                    className={`${btnPrimary} w-full`}
                  >
                    Importer le zoning et passer au copywriting →
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-[#6B6B6B]">Brief client</label>
                  <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder={"Secteur d'activité, cibles, objectifs, positionnement, pages souhaitées..."}
                    rows={6}
                    className={field}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-[#6B6B6B]">URL du site existant</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://anciensite-client.fr"
                    className={field}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-[#6B6B6B]">Notes d&apos;entretien</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes prises lors du rendez-vous client, verbatims, remarques..."
                    rows={4}
                    className={field}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-[#6B6B6B]">Sprints</label>
                  <textarea
                    value={sprints}
                    onChange={(e) => setSprints(e.target.value)}
                    placeholder={"Sprint 1 : Accueil, Footer\nSprint 2 : Services, À propos\nSprint 3 : Cas clients, Contact"}
                    rows={4}
                    className={field}
                  />
                  <p className="text-xs text-[#6B6B6B]">Indiquez les pages par sprint pour que FigJam/Miro les colorie par sprint.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-widest text-[#6B6B6B]">Documents PDF</label>
                  <div
                    onClick={() => document.getElementById("file-input")?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      handleFiles(e.dataTransfer.files);
                    }}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      dragging ? "border-[#2E1343] bg-[#F5F5F5]" : "border-[#E5E5E5] hover:border-[#2E1343] bg-white"
                    }`}
                  >
                    <IconUpload className="w-6 h-6 mx-auto mb-2 text-[#6B6B6B]" />
                    <div className="text-[#6B6B6B] text-sm">
                      Glissez vos PDFs ici ou <span className="text-[#220D31] underline">parcourir</span>
                    </div>
                    <div className="text-[#9B9B9B] text-xs mt-1">Plaquettes, decks, briefs, présentations...</div>
                  </div>
                  <input id="file-input" type="file" multiple accept=".pdf" onChange={(e) => handleFiles(e.target.files)} className="hidden" />

                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs text-[#220D31]"
                        >
                          {f.name}
                          <button type="button" onClick={() => removeFile(i)} className="text-[#6B6B6B] hover:text-[#220D31] cursor-pointer p-0.5" aria-label="Retirer">
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-[#6B6B6B]">Ou coller l&apos;URL d&apos;un PDF en ligne</label>
                    <input
                      type="url"
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      placeholder="https://exemple.fr/plaquette.pdf"
                      className={field}
                    />
                  </div>
                </div>

                {loadingZoning ? (
                  <div className="bg-white border border-[#E5E5E5] rounded-2xl p-10 space-y-6 text-center">
                    <Spinner className="w-10 h-10 mx-auto" />
                    <div>
                      <h2 className="text-lg font-semibold text-[#220D31]">Génération du zoning...</h2>
                      <p className="text-[#6B6B6B] text-sm mt-1">Cela peut prendre 1 minute</p>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={handleGenerateZoning} disabled={!canGenerate} className={btnPrimary}>
                    Générer le zoning →
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {step === "zoning" && currentProject?.zoning && (
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-[#6B6B6B] uppercase tracking-widest mb-1">{currentProject?.name}</p>
                <h1 className="text-2xl font-semibold text-[#220D31]">Zoning généré</h1>
                <p className="text-[#6B6B6B] text-sm mt-1">Relisez et corrigez avant de passer au copywriting.</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(currentProject.zoning || "")}
                  className={`${btnSecondary} inline-flex items-center gap-2 text-xs py-2`}
                >
                  <IconCopy className="w-4 h-4" />
                  Copier
                </button>
                <button
                  type="button"
                  onClick={handleExportMiro}
                  disabled={loadingMiro}
                  className={`${btnPrimary} inline-flex items-center gap-2 text-xs py-2 disabled:opacity-50`}
                >
                  <IconMiro className="w-4 h-4" />
                  {loadingMiro ? "Export..." : "Zoning Miro"}
                </button>
                <button
                  type="button"
                  onClick={handleExportFigJam}
                  className="inline-flex items-center gap-2 text-xs py-2 px-4 rounded-lg font-medium transition-colors cursor-pointer bg-[#E4C6FB] text-[#220D31] border border-[#E4C6FB] hover:bg-[#d9b0f8] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <IconZoning className="w-4 h-4" />
                  Zoning FigJam
                </button>
                {currentProject.miroUrl && (
                  <a
                    href={currentProject.miroUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btnSecondary} inline-flex items-center gap-1 text-xs py-2 no-underline`}
                  >
                    Ouvrir Miro →
                  </a>
                )}
              </div>
            </div>

            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl p-4 flex items-start gap-3">
              <IconFigma className="w-5 h-5 text-[#220D31] shrink-0 mt-0.5" />
              <div>
                <div className="text-[#220D31] text-xs font-semibold uppercase tracking-widest mb-1">Plugin FigJam</div>
                <div className="text-[#6B6B6B] text-xs leading-relaxed">
                  URL : <span className="text-[#220D31] font-mono">{figJamApiUrl}</span>
                  <br />
                  ID : <span className="text-[#220D31] font-mono">{currentProject.id}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8">
              <div>{renderMarkdown(currentProject.zoning)}</div>
            </div>

            {renderCorrectionChat()}

            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[#220D31] text-sm font-semibold">Zoning validé ?</div>
                <div className="text-[#6B6B6B] text-xs mt-1">Passez au brief copywriting pour générer les textes.</div>
              </div>
              <button type="button" onClick={() => setStep("copy-brief")} className={`${btnPrimary} whitespace-nowrap shrink-0`}>
                Brief copywriting →
              </button>
            </div>
          </div>
        )}

        {step === "copy-brief" && (
          <div className="space-y-8">
            <div>
              <p className="text-xs text-[#6B6B6B] uppercase tracking-widest mb-1">{currentProject?.name}</p>
              <h1 className="text-2xl font-semibold text-[#220D31]">Brief copywriting</h1>
              <p className="text-[#6B6B6B] text-sm mt-1">Fournissez le brief copy et les mots-clés SEO pour générer les textes.</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-[#6B6B6B]">Brief copywriting</label>
              <textarea
                value={copyBrief}
                onChange={(e) => setCopyBrief(e.target.value)}
                placeholder="Collez ici votre brief copywriting : angle éditorial, ton, cibles, messages clés, éléments de différenciation..."
                rows={8}
                className={field}
              />
              <div
                onClick={() => document.getElementById("copy-brief-file")?.click()}
                className="border-2 border-dashed border-[#E5E5E5] hover:border-[#2E1343] rounded-xl p-5 text-center cursor-pointer transition-colors bg-white"
              >
                <div className="text-[#6B6B6B] text-sm inline-flex items-center justify-center gap-2">
                  <IconUpload className="w-4 h-4" />
                  Ou uploader le brief en <span className="text-[#220D31] underline">PDF</span>
                </div>
              </div>
              <input id="copy-brief-file" type="file" accept=".pdf" onChange={(e) => setCopyBriefFile(e.target.files?.[0] || null)} className="hidden" />
              {copyBriefFile && (
                <div className="flex items-center gap-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs text-[#220D31] w-fit">
                  {copyBriefFile.name}
                  <button type="button" onClick={() => setCopyBriefFile(null)} className="text-[#6B6B6B] hover:text-[#220D31] cursor-pointer" aria-label="Retirer">
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-[#6B6B6B]">Mots-clés SEO</label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Collez ici vos mots-clés SEO, un par ligne ou séparés par des virgules..."
                rows={5}
                className={field}
              />
              <div
                onClick={() => document.getElementById("keywords-file")?.click()}
                className="border-2 border-dashed border-[#E5E5E5] hover:border-[#2E1343] rounded-xl p-5 text-center cursor-pointer transition-colors bg-white"
              >
                <div className="text-[#6B6B6B] text-sm inline-flex items-center justify-center gap-2">
                  <IconUpload className="w-4 h-4" />
                  Ou uploader les mots-clés en <span className="text-[#220D31] underline">CSV</span>
                </div>
              </div>
              <input id="keywords-file" type="file" accept=".csv" onChange={(e) => setKeywordsFile(e.target.files?.[0] || null)} className="hidden" />
              {keywordsFile && (
                <div className="flex items-center gap-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs text-[#220D31] w-fit">
                  {keywordsFile.name}
                  <button type="button" onClick={() => setKeywordsFile(null)} className="text-[#6B6B6B] hover:text-[#220D31] cursor-pointer" aria-label="Retirer">
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-4 flex-wrap">
              <button type="button" onClick={() => setStep("zoning")} className={btnSecondary}>
                ← Retour au zoning
              </button>
              {loadingCopy ? (
                <div className="flex-1 bg-white border border-[#E5E5E5] rounded-2xl p-6 text-center space-y-3 min-w-[200px]">
                  <Spinner className="w-8 h-8 mx-auto" />
                  <p className="text-[#6B6B6B] text-sm">Génération du copywriting en cours...</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateCopy}
                  disabled={!copyBrief.trim() && !copyBriefFile}
                  className={`${btnPrimary} flex-1 min-w-[200px]`}
                >
                  Générer le copywriting →
                </button>
              )}
            </div>
          </div>
        )}

        {step === "copy" && (copyPages.length > 0 || currentProject?.copy) && (
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-[#6B6B6B] uppercase tracking-widest mb-1">{currentProject?.name}</p>
                <h1 className="text-2xl font-semibold text-[#220D31]">Livrables complets</h1>
                <p className="text-[#6B6B6B] text-sm mt-1">
                  {loadingCopy
                    ? `Génération en cours... (${copyPages.filter((p) => p.content).length}/${copyPages.length} pages)`
                    : "Zoning et copywriting prêts."}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button type="button" onClick={() => setStep("copy-brief")} className={`${btnSecondary} text-xs py-2`}>
                  Regénérer le copy
                </button>
                {!loadingCopy && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText((currentProject?.zoning || "") + "\n\n" + (currentProject?.copy || ""))}
                      className={`${btnSecondary} inline-flex items-center gap-2 text-xs py-2`}
                    >
                      <IconCopy className="w-4 h-4" />
                      Copier tout
                    </button>
                    <button
                      type="button"
                      onClick={handleExportFigJam}
                      className="inline-flex items-center gap-2 text-xs py-2 px-4 rounded-lg font-medium transition-colors cursor-pointer bg-[#E4C6FB] text-[#220D31] border border-[#E4C6FB] hover:bg-[#d9b0f8] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <IconZoning className="w-4 h-4" />
                      Zoning FigJam
                    </button>
                    {currentProject?.copy && (
                      <button
                        type="button"
                        onClick={() => setUxPilotOpen(true)}
                        className={`${btnPrimary} inline-flex items-center gap-2 text-xs py-2`}
                      >
                        <IconUxPilot className="w-4 h-4" />
                        Générer prompt UX Pilot
                      </button>
                    )}
                    {currentProject?.miroUrl && (
                      <a
                        href={currentProject.miroUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${btnSecondary} inline-flex items-center gap-1 text-xs py-2 no-underline`}
                      >
                        <IconMiro className="w-4 h-4" />
                        Ouvrir Miro →
                      </a>
                    )}
                    {currentProject?.miroBoardId && (
                      <button
                        type="button"
                        onClick={handleExportCopyToMiro}
                        disabled={loadingMiroCopy}
                        className={`${btnPrimary} inline-flex items-center gap-2 text-xs py-2 disabled:opacity-50`}
                      >
                        <IconMiro className="w-4 h-4" />
                        {loadingMiroCopy ? "Export..." : "Wireframes Miro"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-1 bg-white border border-[#E5E5E5] p-1 rounded-lg w-fit">
              {(["zoning", "copy"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2 ${
                    activeTab === tab ? "bg-[#2E1343] text-white" : "text-[#6B6B6B] hover:text-[#220D31] hover:bg-[#F5F5F5]"
                  }`}
                >
                  {tab === "zoning" ? (
                    <>
                      <IconZoning className="w-4 h-4" /> Zoning
                    </>
                  ) : (
                    <>
                      <IconPen className="w-4 h-4" /> Copywriting
                    </>
                  )}
                </button>
              ))}
            </div>

            {activeTab === "copy" && copyPages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {copyPages.map((page, i) => {
                  const isGenerating = generatingPageIndex === i;
                  const isDone = page.content !== "";
                  const isActive = activeCopyPage === page.name;
                  return (
                    <button
                      key={page.name}
                      type="button"
                      onClick={() => isDone && setActiveCopyPage(page.name)}
                      disabled={!isDone}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                        ${isActive && isDone ? "bg-[#2E1343] border-[#2E1343] text-white" : ""}
                        ${!isActive && isDone ? "bg-white border-[#E5E5E5] text-[#220D31] hover:border-[#2E1343] cursor-pointer" : ""}
                        ${isGenerating ? "bg-[#F5F5F5] border-[#E5E5E5] text-[#6B6B6B] cursor-wait" : ""}
                        ${!isDone && !isGenerating ? "bg-[#F5F5F5] border-[#E5E5E5] text-[#9B9B9B] cursor-not-allowed opacity-60" : ""}
                      `}
                    >
                      {isGenerating && <span className="w-2 h-2 rounded-full bg-[#2E1343] animate-pulse inline-block" />}
                      {isDone && !isGenerating && <span className="text-[#16A34A] text-xs">✓</span>}
                      {page.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8">
              {activeTab === "zoning" ? (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(currentProject?.zoning || "")}
                      className={`${btnSecondary} inline-flex items-center gap-2 text-xs py-2`}
                    >
                      <IconCopy className="w-4 h-4" />
                      Copier
                    </button>
                  </div>
                  <div>{renderMarkdown(currentProject?.zoning || "")}</div>
                </>
              ) : (
                <>
                  {copyPages.length > 0 ? (
                    <>
                      <div className="flex justify-end mb-4">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(copyPages.find((p) => p.name === activeCopyPage)?.content || "")}
                          className={`${btnSecondary} inline-flex items-center gap-2 text-xs py-2`}
                        >
                          <IconCopy className="w-4 h-4" />
                          Copier cette page
                        </button>
                      </div>
                      {copyPages.find((p) => p.name === activeCopyPage)?.content ? (
                        <div>{renderMarkdown(copyPages.find((p) => p.name === activeCopyPage)?.content || "")}</div>
                      ) : (
                        <div className="text-center py-12 flex flex-col items-center gap-3">
                          <Spinner className="w-8 h-8" />
                          <p className="text-[#6B6B6B] text-sm">Génération en cours...</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>{renderMarkdown(currentProject?.copy || "")}</div>
                  )}
                </>
              )}
            </div>

            {!loadingCopy && renderCorrectionChat()}

            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl p-4 flex items-start gap-3">
              <IconFigma className="w-5 h-5 text-[#220D31] shrink-0 mt-0.5" />
              <div>
                <div className="text-[#220D31] text-xs font-semibold uppercase tracking-widest mb-1">Plugin FigJam</div>
                <div className="text-[#6B6B6B] text-xs leading-relaxed">
                  URL : <span className="text-[#220D31] font-mono">{figJamApiUrl}</span>
                  <br />
                  ID : <span className="text-[#220D31] font-mono">{currentProject?.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
