import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ChevronRight,
  Eye,
  FileCode2,
  FolderArchive,
  FolderPlus,
  HardDrive,
  Menu,
  Moon,
  Palette,
  Package,
  Settings2,
  Share2,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { WizardSimulator } from './components/WizardSimulator';
import {
  OfflineIndicator,
  WindowsInstallButton,
} from './components/WindowsInstallButton';
import { FilesSection } from './components/sections/FilesSection';
import { IdentitySection } from './components/sections/IdentitySection';
import { PreviewExportSection } from './components/sections/PreviewExportSection';
import { RegistrySystemSection } from './components/sections/RegistrySystemSection';
import { ShortcutsSection } from './components/sections/ShortcutsSection';
import { WizardUiSection } from './components/sections/WizardUiSection';
import { PROJECT_TEMPLATES, formatBytes } from './data/presets';
import {
  InstallerProject,
  SectionId,
  UploadedAssets,
} from './types/installer';
import {
  exportProjectZip,
  getTotalSizeBytes,
  runPreflightChecklist,
  validateProject,
} from './utils/scriptGenerators';

const STORAGE_KEY = 'winpack_studio_project_v1';
const THEME_KEY = 'winpack_studio_theme_v1';

interface NavItem {
  id: SectionId;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'identity',
    label: 'Identitas & Engine',
    shortDesc: 'Metadata, GUID, Inno/NSIS/WiX',
    icon: Package,
  },
  {
    id: 'files',
    label: 'Berkas & Direktori',
    shortDesc: 'Biner .exe, DLL, folder target',
    icon: FolderArchive,
  },
  {
    id: 'shortcuts',
    label: 'Pintasan & Asosiasi',
    shortDesc: 'Start Menu, Desktop, ekstensi',
    icon: Share2,
  },
  {
    id: 'registry',
    label: 'Registri & Sistem',
    shortDesc: 'UAC, runtime, kunci registri',
    icon: Settings2,
  },
  {
    id: 'wizard',
    label: 'Tampilan Wizard',
    shortDesc: 'Banner, ikon, bahasa, EULA',
    icon: Palette,
  },
  {
    id: 'export',
    label: 'Pratinjau & Ekspor',
    shortDesc: 'Simulasi, skrip, bundel ZIP',
    icon: FileCode2,
  },
];

function loadInitialProject(): InstallerProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as InstallerProject;
      if (parsed && typeof parsed.appName === 'string' && Array.isArray(parsed.files)) {
        return parsed;
      }
    }
  } catch {
    // fallback to default template
  }
  return PROJECT_TEMPLATES[0].create();
}

export default function App() {
  const [project, setProject] = useState<InstallerProject>(loadInitialProject);
  const [assets, setAssets] = useState<UploadedAssets>({
    iconDataUrl: null,
    iconFileName: null,
    sidebarDataUrl: null,
    sidebarFileName: null,
  });
  const [activeSection, setActiveSection] = useState<SectionId>('identity');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const importJsonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // ignore storage quota errors
    }
  }, [project]);

  const showNotification = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const updateProject = (patch: Partial<InstallerProject>) => {
    setProject((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateAssets = (patch: Partial<UploadedAssets>) => {
    setAssets((prev) => ({ ...prev, ...patch }));
  };

  const issues = useMemo(() => validateProject(project), [project]);
  const issueCountBySection = useMemo(() => {
    const map: Partial<Record<SectionId, number>> = {};
    for (const issue of issues) {
      map[issue.section] = (map[issue.section] || 0) + 1;
    }
    return map;
  }, [issues]);

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];
  const currentIdx = NAV_ITEMS.findIndex((n) => n.id === activeSection);
  const totalBytes = getTotalSizeBytes(project);

  const handleQuickExport = async () => {
    const preflight = runPreflightChecklist(project);
    if (!preflight.readyToBuild) {
      setActiveSection('export');
      showNotification(
        `Pre-flight mendeteksi ${preflight.failedCount} pemeriksaan gagal. Tinjau Pre-flight Checklist sebelum mengunduh.`
      );
      return;
    }
    setExporting(true);
    try {
      await exportProjectZip(project, assets);
      showNotification('Bundel Windows Installer (.zip) berhasil diunduh.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportJson = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as InstallerProject;
        if (parsed && typeof parsed.appName === 'string' && Array.isArray(parsed.files)) {
          setProject(parsed);
          showNotification(`Proyek "${parsed.appName}" berhasil diimpor.`);
        } else {
          showNotification('Format berkas .winpack.json tidak valid.');
        }
      } catch {
        showNotification('Gagal membaca berkas JSON proyek.');
      }
    };
    reader.readAsText(file);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setProject(tpl.create());
    setAssets({
      iconDataUrl: null,
      iconFileName: null,
      sidebarDataUrl: null,
      sidebarFileName: null,
    });
    setTemplateModalOpen(false);
    setActiveSection('identity');
    showNotification(`Templat "${tpl.name}" diterapkan.`);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Wordmark */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
          Days WinInstaller
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Tutup menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active Project Summary & Template Trigger */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Proyek Aktif
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
            {project.appName || 'Tanpa Nama'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 truncate">
            v{project.appVersion} · {project.architecture.toUpperCase()} ·{' '}
            {project.engine === 'wix' ? '.msi' : '.exe'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Proyek Baru
          </button>
          <button
            type="button"
            onClick={() => importJsonRef.current?.click()}
            title="Impor proyek .winpack.json"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Impor
          </button>
          <input
            ref={importJsonRef}
            type="file"
            accept=".json,.winpack.json"
            onChange={(e) => {
              handleImportJson(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Authoring Workflow Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Tahapan perancangan installer">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const sectionIssues = issueCountBySection[item.id] ?? 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#0067C0]/10 dark:bg-[#3B9EFF]/15 text-[#0067C0] dark:text-[#60B0FF]'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate">
                    {idx + 1}. {item.label}
                  </span>
                  {sectionIssues > 0 && (
                    <span className="text-[11px] font-mono tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
                      {sectionIssues} catatan
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {item.shortDesc}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Workspace Utilities */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            {project.files.length} berkas
          </span>
          <span>{formatBytes(totalBytes)}</span>
        </div>
        <WindowsInstallButton onNotify={showNotification} />
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F3F5F8] dark:bg-[#0D131F] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-[#EBEEF3] dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#EBEEF3] dark:bg-[#111827] h-full shadow-xl z-10">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1-2 clean actions on right */}
        <header className="h-14 sticky top-0 z-30 bg-[#F3F5F8]/95 dark:bg-[#0D131F]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
              className="lg:hidden p-1.5 -ml-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0"
            >
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
                {project.appName || 'Proyek Installer'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentNav.label}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {activeSection !== 'export' && (
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-[#141C2B] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                Simulasi Wizard
              </button>
            )}
            <button
              type="button"
              disabled={exporting}
              onClick={handleQuickExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0067C0] hover:bg-[#0057A3] disabled:opacity-60 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Archive className="w-3.5 h-3.5" />
              {exporting ? 'Mengekspor...' : 'Ekspor .ZIP'}
            </button>
          </div>
        </header>

        {/* Active Section Viewport */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeSection === 'identity' && (
            <IdentitySection project={project} onChange={updateProject} />
          )}
          {activeSection === 'files' && (
            <FilesSection project={project} onChange={updateProject} />
          )}
          {activeSection === 'shortcuts' && (
            <ShortcutsSection project={project} onChange={updateProject} />
          )}
          {activeSection === 'registry' && (
            <RegistrySystemSection project={project} onChange={updateProject} />
          )}
          {activeSection === 'wizard' && (
            <WizardUiSection
              project={project}
              assets={assets}
              onChange={updateProject}
              onAssetsChange={updateAssets}
            />
          )}
          {activeSection === 'export' && (
            <PreviewExportSection
              project={project}
              assets={assets}
              issues={issues}
              onNavigateSection={setActiveSection}
              onNotify={showNotification}
            />
          )}

          {/* Step Footer Navigation */}
          <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIdx <= 0}
              onClick={() => {
                if (currentIdx > 0) setActiveSection(NAV_ITEMS[currentIdx - 1].id);
              }}
              className="px-4 py-2 text-xs font-medium bg-white dark:bg-[#141C2B] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              Sebelumnya
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Langkah {currentIdx + 1} dari {NAV_ITEMS.length}
            </span>

            {currentIdx < NAV_ITEMS.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveSection(NAV_ITEMS[currentIdx + 1].id)}
                className="px-4 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Lanjut: {NAV_ITEMS[currentIdx + 1].label}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickExport}
                disabled={exporting}
                className="px-4 py-2 text-xs font-medium bg-[#0067C0] hover:bg-[#0057A3] text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Unduh Bundel Siap Kompilasi
              </button>
            )}
          </footer>
        </main>
      </div>

      {/* Template Selection Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="w-full max-w-2xl bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Buat Proyek Installer dari Templat
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih konfigurasi awal sesuai jenis distribusi aplikasi Windows Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                aria-label="Tutup dialog"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROJECT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#0067C0] dark:hover:border-[#3B9EFF] bg-slate-50/50 dark:bg-[#0D131F]/60 transition-colors space-y-1.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {tpl.name}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#0067C0] dark:text-[#3B9EFF]">
                    {tpl.engineLabel}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                    {tpl.subtitle}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Wizard Simulator Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="w-full max-w-3xl bg-[#F3F5F8] dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Simulasi Langsung Windows Setup Wizard
              </h2>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                aria-label="Tutup simulasi"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <WizardSimulator project={project} assets={assets} compact />
            </div>
          </div>
        </div>
      )}

      {/* Subtle Action Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg shadow-lg"
        >
          {toast}
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
