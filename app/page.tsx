"use client";

import { useState, useEffect } from "react";

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

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [step, setStep] = useState<ProjectStep>("brief");
  const [ngrokUrl, setNgrokUrl] = useState("");

  // Form zoning
  const [brief, setBrief] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [sprints, setSprints] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  // Form copy
  const [copyBrief, setCopyBrief] = useState("");
  const [copyBriefFile, setCopyBriefFile] = useState<File | null>(null);
  const [keywords, setKeywords] = useState("");
  const [keywordsFile, setKeywordsFile] = useState<File | null>(null);

  // Loading
  const [loadingZoning, setLoadingZoning] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [loadingMiro, setLoadingMiro] = useState(false);
  const [loadingMiroCopy, setLoadingMiroCopy] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Feedback
  const [feedback, setFeedback] = useState("");
  const [feedbackTarget, setFeedbackTarget] = useState<"zoning" | "copy">("zoning");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"zoning" | "copy">("zoning");

  useEffect(() => {
    const saved = localStorage.getItem("agent-melina-projects");
    if (saved) setProjects(JSON.parse(saved));
    const savedNgrok = localStorage.getItem("agent-melina-ngrok");
    if (savedNgrok) setNgrokUrl(savedNgrok);
  }, []);

  const saveProjects = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem("agent-melina-projects", JSON.stringify(updated));
  };

  const createProject = () => {
    const project: Project = {
      id: `project-${Date.now()}`,
      name: "Nouveau projet",
      createdAt: new Date().toISOString(),
      brief: "", url: "", notes: "", sprints: "",
      zoning: null, copy: null,
      miroUrl: null, miroBoardId: null,
      copyBrief: "", keywords: "",
    };
    setCurrentProject(project);
    setBrief(""); setUrl(""); setNotes(""); setSprints("");
    setPdfUrl(""); setFiles([]);
    setCopyBrief(""); setCopyBriefFile(null);
    setKeywords(""); setKeywordsFile(null);
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
    setStep(project.copy ? "copy" : project.zoning ? "zoning" : "brief");
    setError(null);
    setView("project");
  };

  const updateProject = (updated: Partial<Project>) => {
    if (!currentProject) return;
    const newProject = { ...currentProject, ...updated };
    setCurrentProject(newProject);
    const all = projects.filter((p) => p.id !== newProject.id);
    saveProjects([newProject, ...all]);
  };

  const deleteProject = (id: string) => {
    saveProjects(projects.filter((p) => p.id !== id));
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const pdfs = Array.from(incoming).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  function parseZoningForFigJam(zoningText: string) {
    const pages: { cleanLabel: string; type: string; sprint: number | null; sections: { label: string; objective: string }[] }[] = [];
    const lines = zoningText.split("\n");
    let currentPage: typeof pages[0] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/^#{1,3} /)) {
        const rawLabel = trimmed.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").trim();
        if (
          rawLabel.toLowerCase().includes("zoning") ||
          rawLabel.toLowerCase().includes("architecture") ||
          rawLabel.length < 2
        ) continue;

        if (currentPage) pages.push(currentPage);

        const sprintMatch = rawLabel.match(/\[Sprint\s*(\d+)\]/i);
        const sprint = sprintMatch ? parseInt(sprintMatch[1]) : null;
        const cleanLabel = rawLabel.replace(/\[Sprint\s*\d+\]/gi, "").trim();
        const type =
          cleanLabel.toLowerCase().includes("mention") ||
          cleanLabel.toLowerCase().includes("politique") ||
          cleanLabel.toLowerCase().includes("404")
            ? "utility"
            : pages.length === 0 ? "main" : "secondary";

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
      updateProject({ zoning: data.zoning, brief, url, notes, sprints, name: projectName });
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

      updateProject({ miroUrl: data.boardUrl, miroBoardId: data.boardId });
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
        body: JSON.stringify({
          projectId: currentProject.id,
          projectName: currentProject.name,
          pages,
        }),
      });

      if (!response.ok) throw new Error("Erreur sauvegarde");

      const apiUrl = ngrokUrl
        ? `${ngrokUrl}/api/figjam-zoning`
        : `http://localhost:3000/api/figjam-zoning`;

      alert(
        `✓ Zoning prêt pour FigJam !\n\nDans FigJam, ouvre le plugin Agent Mélina et renseigne :\n\n• URL : ${apiUrl}\n• ID du projet : ${currentProject.id}`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur export FigJam");
    }
  };

  const handleGenerateCopy = async () => {
    if (!currentProject?.zoning) return;
    setLoadingCopy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("zoning", currentProject.zoning);
      formData.append("brief", brief);
      formData.append("url", url);
      formData.append("notes", notes);
      formData.append("copyBrief", copyBrief);
      formData.append("keywords", keywords);
      if (copyBriefFile) formData.append("copyBriefFile", copyBriefFile);
      if (keywordsFile) formData.append("keywordsFile", keywordsFile);

      const response = await fetch("/api/generate-copy", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      updateProject({ copy: data.copy, copyBrief, keywords });
      setStep("copy");
      setActiveTab("copy");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
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

  const handleFeedback = async () => {
    if (!feedback.trim() || !currentProject) return;
    setFeedbackLoading(true);

    const current = feedbackTarget === "zoning" ? currentProject.zoning : currentProject.copy;
    const systemPrompt = feedbackTarget === "zoning"
      ? "Tu es un expert en architecture web et UX. Tu vas corriger et améliorer un zoning de site web selon les instructions données."
      : "Tu es un expert en copywriting CRO, SEO et GEO. Tu vas corriger et améliorer un copywriting de site web selon les instructions données.";

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, feedback, systemPrompt, brief, notes, url }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (feedbackTarget === "zoning") updateProject({ zoning: data.result });
      else updateProject({ copy: data.result });
      setFeedback("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-semibold text-amber-400 mt-8 mb-3">{line.replace("## ", "")}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-amber-200 mt-5 mb-2">{line.replace("### ", "")}</h3>;
      if (line.startsWith("- ")) return <li key={i} className="ml-4 text-zinc-300 text-sm list-disc">{line.slice(2)}</li>;
      if (line.startsWith("---")) return <hr key={i} className="border-zinc-800 my-4" />;
      if (line.match(/^\*\*.+\*\*$/)) return <p key={i} className="font-semibold text-zinc-200 mt-3">{line.replace(/\*\*/g, "")}</p>;
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return <p key={i} className="text-zinc-400 text-sm leading-relaxed">{line}</p>;
    });
  };

  const canGenerate = brief.trim() || files.length > 0 || pdfUrl.trim();

  // ————————————————————————————
  // VUE ACCUEIL
  // ————————————————————————————
  if (view === "home") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-zinc-950 font-bold text-sm">M</div>
            <div>
              <div className="font-semibold text-sm">Agent Mélina</div>
              <div className="text-xs text-zinc-600 uppercase tracking-widest">Zoning · Copywriting CRO/SEO</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ngrokUrl}
                onChange={(e) => {
                  setNgrokUrl(e.target.value);
                  localStorage.setItem("agent-melina-ngrok", e.target.value);
                }}
                placeholder="https://xxxx.ngrok-free.app"
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 w-64"
              />
              <span className="text-xs text-zinc-600 whitespace-nowrap">URL ngrok</span>
            </div>
            <button onClick={createProject} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer">
              + Nouveau projet
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold mb-2">Projets</h1>
            <p className="text-zinc-500 text-sm">Retrouvez tous vos projets clients.</p>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <div className="text-5xl">📁</div>
              <p className="text-zinc-500">Aucun projet pour l'instant</p>
              <button onClick={createProject} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer">
                Créer mon premier projet
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-5 hover:border-zinc-600 transition-colors cursor-pointer"
                  onClick={() => openProject(project)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-950/50 border border-amber-900/30 rounded-xl flex items-center justify-center text-amber-400 text-lg">
                      {project.copy ? "✅" : project.zoning ? "🗂" : "📝"}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-200">{project.name}</div>
                      <div className="text-xs text-zinc-600 mt-0.5 flex items-center gap-3">
                        <span>{new Date(project.createdAt).toLocaleDateString("fr-FR")}</span>
                        {project.zoning && <span className="text-amber-600">Zoning ✓</span>}
                        {project.copy && <span className="text-green-600">Copy ✓</span>}
                        {project.miroUrl && <span className="text-blue-600">Miro ✓</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all cursor-pointer text-lg"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ————————————————————————————
  // VUE PROJET
  // ————————————————————————————
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setView("home")} className="text-zinc-600 hover:text-zinc-300 cursor-pointer text-sm">← Projets</button>
          <div className="w-px h-5 bg-zinc-800" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-zinc-950 font-bold text-sm">M</div>
            <div className="font-semibold text-sm">{currentProject?.name || "Nouveau projet"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                <div className={`flex items-center gap-2 text-xs ${isActive ? "text-amber-400" : isDone ? "text-zinc-400" : "text-zinc-600"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                    isDone ? "bg-amber-500 border-amber-500 text-zinc-950" :
                    isActive ? "border-amber-500 text-amber-400" :
                    "border-zinc-700 text-zinc-600"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span>{s.label}</span>
                </div>
                {i < 3 && <div className="w-6 h-px bg-zinc-800" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {error && <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

        {/* ———— ÉTAPE 1 : BRIEF ———— */}
        {step === "brief" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-semibold mb-2">Brief client</h1>
              <p className="text-zinc-500 text-sm">Renseignez les informations disponibles pour générer le zoning.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Brief client</label>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Secteur d'activité, cibles, objectifs, positionnement, pages souhaitées..." rows={6} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500">URL du site existant</label>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://anciensite-client.fr" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Notes d'entretien</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes prises lors du rendez-vous client, verbatims, remarques..." rows={4} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Sprints</label>
              <textarea value={sprints} onChange={(e) => setSprints(e.target.value)} placeholder={"Sprint 1 : Accueil, Footer\nSprint 2 : Services, À propos\nSprint 3 : Cas clients, Contact"} rows={4} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors" />
              <p className="text-xs text-zinc-600">Indiquez les pages par sprint pour que FigJam/Miro les colorie par sprint.</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Documents PDF</label>
              <div
                onClick={() => document.getElementById("file-input")?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-amber-500/50 bg-amber-500/5" : "border-zinc-800 hover:border-zinc-600"}`}
              >
                <div className="text-2xl mb-2">📎</div>
                <div className="text-zinc-500 text-sm">Glissez vos PDFs ici ou <span className="text-amber-400 underline">parcourir</span></div>
                <div className="text-zinc-700 text-xs mt-1">Plaquettes, decks, briefs, présentations...</div>
              </div>
              <input id="file-input" type="file" multiple accept=".pdf" onChange={(e) => handleFiles(e.target.files)} className="hidden" />

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-amber-950/30 border border-amber-900/30 rounded-lg px-3 py-1.5 text-xs text-amber-400">
                      📄 {f.name}
                      <button onClick={() => removeFile(i)} className="text-zinc-600 hover:text-zinc-400 cursor-pointer">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-zinc-600">Ou coller l'URL d'un PDF en ligne</label>
                <input type="url" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://exemple.fr/plaquette.pdf" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
            </div>

            {loadingZoning ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 space-y-6 text-center">
                <div className="text-3xl animate-pulse">✦</div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-200">Génération du zoning...</h2>
                  <p className="text-zinc-500 text-sm mt-1">Cela peut prendre 1 minute</p>
                </div>
                <div className="flex gap-2 justify-center">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={handleGenerateZoning} disabled={!canGenerate} className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold px-8 py-4 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed">
                Générer le zoning →
              </button>
            )}
          </div>
        )}

        {/* ———— ÉTAPE 2 : ZONING ———— */}
        {step === "zoning" && currentProject?.zoning && (
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Zoning généré</h1>
                <p className="text-zinc-500 text-sm mt-1">Relisez et corrigez avant de passer au copywriting.</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => navigator.clipboard.writeText(currentProject.zoning || "")} className="border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-lg text-xs text-zinc-400 transition-colors cursor-pointer">
                  📋 Copier
                </button>
                <button onClick={handleExportMiro} disabled={loadingMiro} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer disabled:cursor-not-allowed">
                  {loadingMiro ? "Export..." : "🟦 Exporter vers Miro"}
                </button>
                <button onClick={handleExportFigJam} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer">
                  🎨 Exporter vers FigJam
                </button>
                {currentProject.miroUrl && (
                  <a href={currentProject.miroUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 border border-blue-800 text-blue-400 px-4 py-2 rounded-lg text-xs hover:bg-blue-950/30 transition-colors">
                    Ouvrir Miro →
                  </a>
                )}
              </div>
            </div>

            {/* Info FigJam si ngrokUrl renseigné */}
            {ngrokUrl && (
              <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-4 flex items-start gap-3">
                <span className="text-lg">🎨</span>
                <div>
                  <div className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-1">Plugin FigJam</div>
                  <div className="text-zinc-500 text-xs leading-relaxed">
                    URL : <span className="text-zinc-300 font-mono">{ngrokUrl}/api/figjam-zoning</span><br />
                    ID : <span className="text-zinc-300 font-mono">{currentProject.id}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <div>{renderMarkdown(currentProject.zoning)}</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✏️</span>
                <div className="text-sm font-semibold text-zinc-200">Corriger le zoning</div>
              </div>
              {feedbackLoading ? (
                <div className="text-center py-4">
                  <div className="text-2xl animate-pulse mb-2">✦</div>
                  <p className="text-zinc-400 text-sm">Correction en cours...</p>
                </div>
              ) : (
                <>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={`Ex: "Ajoute une page Témoignages" ou "Le sprint 2 doit inclure la page Contact"`} rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors" />
                  <button onClick={() => { setFeedbackTarget("zoning"); handleFeedback(); }} disabled={!feedback.trim()} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed">
                    Envoyer la correction →
                  </button>
                </>
              )}
            </div>

            <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-amber-400 text-sm font-semibold">Zoning validé ?</div>
                <div className="text-zinc-500 text-xs mt-1">Passez au brief copywriting pour générer les textes.</div>
              </div>
              <button onClick={() => setStep("copy-brief")} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer whitespace-nowrap">
                Brief copywriting →
              </button>
            </div>
          </div>
        )}

        {/* ———— ÉTAPE 3 : BRIEF COPY ———— */}
        {step === "copy-brief" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-semibold">Brief copywriting</h1>
              <p className="text-zinc-500 text-sm mt-1">Fournissez le brief copy et les mots-clés SEO pour générer les textes.</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Brief copywriting</label>
              <textarea value={copyBrief} onChange={(e) => setCopyBrief(e.target.value)} placeholder="Collez ici votre brief copywriting : angle éditorial, ton, cibles, messages clés, éléments de différenciation..." rows={8} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors" />
              <div onClick={() => document.getElementById("copy-brief-file")?.click()} className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-xl p-5 text-center cursor-pointer transition-colors">
                <div className="text-zinc-500 text-sm">📎 Ou uploader le brief en <span className="text-amber-400 underline">PDF</span></div>
              </div>
              <input id="copy-brief-file" type="file" accept=".pdf" onChange={(e) => setCopyBriefFile(e.target.files?.[0] || null)} className="hidden" />
              {copyBriefFile && (
                <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-900/30 rounded-lg px-3 py-1.5 text-xs text-amber-400 w-fit">
                  📄 {copyBriefFile.name}
                  <button onClick={() => setCopyBriefFile(null)} className="text-zinc-600 hover:text-zinc-400 cursor-pointer">✕</button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-zinc-500">Mots-clés SEO</label>
              <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Collez ici vos mots-clés SEO, un par ligne ou séparés par des virgules..." rows={5} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors" />
              <div onClick={() => document.getElementById("keywords-file")?.click()} className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-xl p-5 text-center cursor-pointer transition-colors">
                <div className="text-zinc-500 text-sm">📎 Ou uploader les mots-clés en <span className="text-amber-400 underline">CSV</span></div>
              </div>
              <input id="keywords-file" type="file" accept=".csv" onChange={(e) => setKeywordsFile(e.target.files?.[0] || null)} className="hidden" />
              {keywordsFile && (
                <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-900/30 rounded-lg px-3 py-1.5 text-xs text-amber-400 w-fit">
                  📊 {keywordsFile.name}
                  <button onClick={() => setKeywordsFile(null)} className="text-zinc-600 hover:text-zinc-400 cursor-pointer">✕</button>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep("zoning")} className="border border-zinc-800 hover:border-zinc-600 text-zinc-400 font-medium px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer">
                ← Retour au zoning
              </button>
              {loadingCopy ? (
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
                  <div className="text-2xl animate-pulse">✦</div>
                  <p className="text-zinc-400 text-sm">Génération du copywriting en cours...</p>
                  <div className="flex gap-2 justify-center">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              ) : (
                <button onClick={handleGenerateCopy} disabled={!copyBrief.trim() && !copyBriefFile} className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold px-8 py-3 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed">
                  Générer le copywriting →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ———— ÉTAPE 4 : COPYWRITING ———— */}
        {step === "copy" && currentProject?.copy && (
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Livrables complets</h1>
                <p className="text-zinc-500 text-sm mt-1">Zoning et copywriting prêts.</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => navigator.clipboard.writeText((currentProject.zoning || "") + "\n\n" + (currentProject.copy || ""))} className="border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-lg text-xs text-zinc-400 transition-colors cursor-pointer">
                  📋 Copier tout
                </button>
                {currentProject.miroUrl && (
                  <a href={currentProject.miroUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 border border-blue-800 text-blue-400 px-4 py-2 rounded-lg text-xs hover:bg-blue-950/30 transition-colors">
                    🟦 Ouvrir Miro →
                  </a>
                )}
                {currentProject.miroBoardId && (
                  <button onClick={handleExportCopyToMiro} disabled={loadingMiroCopy} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer disabled:cursor-not-allowed">
                    {loadingMiroCopy ? "Export en cours..." : "🟦 Exporter wireframes vers Miro"}
                  </button>
                )}
                <button onClick={handleExportFigJam} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer">
                  🎨 Exporter vers FigJam
                </button>
              </div>
            </div>

            <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl w-fit">
              {(["zoning", "copy"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeTab === tab ? "bg-zinc-800 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>
                  {tab === "zoning" ? "🗂 Zoning" : "✍️ Copywriting"}
                </button>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <div className="flex justify-end mb-4">
                <button onClick={() => navigator.clipboard.writeText(activeTab === "zoning" ? (currentProject.zoning || "") : (currentProject.copy || ""))} className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                  📋 Copier
                </button>
              </div>
              <div>{renderMarkdown(activeTab === "zoning" ? (currentProject.zoning || "") : (currentProject.copy || ""))}</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✏️</span>
                <div className="text-sm font-semibold text-zinc-200">Demander une correction</div>
              </div>
              <div className="flex gap-2">
                {(["zoning", "copy"] as const).map((t) => (
                  <button key={t} onClick={() => setFeedbackTarget(t)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${feedbackTarget === t ? "border-amber-500/50 bg-amber-950/30 text-amber-400" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                    {t === "zoning" ? "🗂 Corriger le zoning" : "✍️ Corriger le copywriting"}
                  </button>
                ))}
              </div>
              {feedbackLoading ? (
                <div className="text-center py-4">
                  <div className="text-2xl animate-pulse mb-2">✦</div>
                  <p className="text-zinc-400 text-sm">Correction en cours...</p>
                </div>
              ) : (
                <>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={`Ex: "Le ton est trop formel" ou "Ajoute une page Témoignages"`} rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors" />
                  <button onClick={handleFeedback} disabled={!feedback.trim()} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed">
                    Envoyer la correction →
                  </button>
                </>
              )}
            </div>

            <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-5 flex gap-4">
              <span className="text-lg">👁</span>
              <div>
                <div className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-1">Note pour Mélina</div>
                <div className="text-zinc-500 text-sm leading-relaxed">
                  Utilise "Exporter wireframes vers Miro" pour ajouter le copywriting mis en situation dans le board Miro existant.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}