import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileCode2,
  FileJson,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import {
  InstallerProject,
  SectionId,
  UploadedAssets,
  ValidationIssue,
} from '../../types/installer';
import {
  downloadTextFile,
  evaluateProjectHealth,
  exportProjectZip,
  generateBuildPowerShell,
  generateInnoSetupScript,
  generateNsisScript,
  generateReadmeBuild,
  generateWixScript,
  runPreflightChecklist,
} from '../../utils/scriptGenerators';
import { WizardSimulator } from '../WizardSimulator';

interface PreviewExportSectionProps {
  project: InstallerProject;
  assets: UploadedAssets;
  issues: ValidationIssue[];
  onNavigateSection: (section: SectionId) => void;
  onNotify: (message: string) => void;
}

type ScriptTab = 'inno' | 'nsis' | 'wix' | 'ps1' | 'readme';
type HealthFilter = 'risks' | 'critical' | 'warning' | 'all';
type PendingAction = 'zip' | 'script' | null;

export const PreviewExportSection: React.FC<PreviewExportSectionProps> = ({
  project,
  assets,
  onNavigateSection,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ScriptTab>(project.engine);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('risks');
  const [copied, setCopied] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );

  const health = useMemo(() => evaluateProjectHealth(project), [project]);
  const preflight = useMemo(() => runPreflightChecklist(project), [project]);

  const scripts = useMemo(() => {
    return {
      inno: {
        filename: 'installer.iss',
        label: 'Inno Setup (.iss)',
        content: generateInnoSetupScript(project, assets),
      },
      nsis: {
        filename: 'installer.nsi',
        label: 'NSIS (.nsi)',
        content: generateNsisScript(project),
      },
      wix: {
        filename: 'installer.wxs',
        label: 'WiX v4 (.wxs)',
        content: generateWixScript(project),
      },
      ps1: {
        filename: 'build-installer.ps1',
        label: 'PowerShell Build',
        content: generateBuildPowerShell(project),
      },
      readme: {
        filename: 'README-BUILD.txt',
        label: 'Panduan Build',
        content: generateReadmeBuild(project),
      },
    };
  }, [project, assets]);

  const filteredChecks = useMemo(() => {
    const order = { critical: 0, warning: 1, pass: 2 } as const;
    const sorted = [...health.checks].sort(
      (a, b) => order[a.severity] - order[b.severity]
    );
    if (healthFilter === 'risks') return sorted.filter((c) => !c.passed);
    if (healthFilter === 'critical') return sorted.filter((c) => c.severity === 'critical');
    if (healthFilter === 'warning') return sorted.filter((c) => c.severity === 'warning');
    return sorted;
  }, [health.checks, healthFilter]);

  const currentScript = scripts[activeTab];
  const lineCount = currentScript.content.split('\n').length;

  const handleRerunPreflight = () => {
    setLastVerifiedAt(
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
    if (preflight.readyToBuild) {
      onNotify(
        `Pre-flight selesai: ${preflight.passedCount}/${preflight.totalCount} pemeriksaan lolos dan siap build.`
      );
    } else {
      onNotify(
        `Pre-flight mendeteksi ${preflight.failedCount} pemeriksaan gagal yang perlu diperbaiki.`
      );
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentScript.content);
      setCopied(true);
      onNotify(`Skrip ${currentScript.filename} disalin ke clipboard.`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('Gagal menyalin otomatis. Anda dapat mengunduh berkas langsung.');
    }
  };

  const executeDownloadCurrent = () => {
    downloadTextFile(currentScript.filename, currentScript.content);
    onNotify(`Mengunduh ${currentScript.filename}.`);
  };

  const handleDownloadCurrent = () => {
    if (!preflight.readyToBuild) {
      setPendingAction('script');
      return;
    }
    executeDownloadCurrent();
  };

  const handleDownloadJson = () => {
    downloadTextFile(
      `${project.outputBaseFilename || 'proyek'}.winpack.json`,
      JSON.stringify(project, null, 2),
      'application/json;charset=utf-8'
    );
    onNotify('Konfigurasi proyek .winpack.json berhasil diunduh.');
  };

  const executeExportBundle = async () => {
    setExportingZip(true);
    try {
      await exportProjectZip(project, assets);
      onNotify('Bundel siap kompilasi (.zip) berhasil dibuat dan diunduh.');
    } finally {
      setExportingZip(false);
    }
  };

  const handleExportBundle = () => {
    if (!preflight.readyToBuild) {
      setPendingAction('zip');
      return;
    }
    void executeExportBundle();
  };

  const handleProceedAnyway = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'zip') {
      void executeExportBundle();
    } else if (action === 'script') {
      executeDownloadCurrent();
    }
  };

  const failedPreflightItems = preflight.items.filter((i) => i.status === 'fail');

  const quickCliCommand =
    project.engine === 'inno'
      ? `iscc installer.iss`
      : project.engine === 'nsis'
        ? `makensis /V3 installer.nsi`
        : `wix build installer.wxs -arch ${project.architecture} -o "${project.outputDir}\\${project.outputBaseFilename}.msi"`;

  const scoreAccentClass =
    health.status === 'optimal'
      ? 'text-emerald-700 dark:text-emerald-400'
      : health.status === 'attention'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400';

  const scoreBarClass =
    health.status === 'optimal'
      ? 'bg-emerald-600 dark:bg-emerald-500'
      : health.status === 'attention'
        ? 'bg-amber-500 dark:bg-amber-400'
        : 'bg-red-600 dark:bg-red-500';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Pratinjau Wizard, Pre-flight Checklist &amp; Ekspor Skrip
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Verifikasi file utama, konfigurasi registri, dan validitas versi sebelum melakukan build atau mengunduh paket installer Windows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white dark:bg-[#141C2B] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <FileJson className="w-4 h-4" />
            Simpan .winpack.json
          </button>
          <button
            type="button"
            disabled={exportingZip}
            onClick={handleExportBundle}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#0067C0] hover:bg-[#0057A3] disabled:opacity-60 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Archive className="w-4 h-4" />
            {exportingZip ? 'Menyiapkan ZIP...' : 'Unduh Bundel Lengkap (.zip)'}
          </button>
        </div>
      </div>

      {/* Pre-flight Checklist Panel */}
      <section
        aria-label="Pre-flight Checklist"
        className="bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <ClipboardCheck
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                preflight.readyToBuild
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Pre-flight Checklist Sebelum Build &amp; Unduh
                </h2>
                <span
                  className={`text-xs font-semibold ${
                    preflight.readyToBuild
                      ? preflight.hasWarnings
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {preflight.readyToBuild
                    ? preflight.hasWarnings
                      ? 'Siap dengan Peringatan'
                      : 'Siap Build & Unduh'
                    : 'Tindakan Diperlukan'}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {preflight.passedCount} dari {preflight.totalCount} verifikasi lolos · Terakhir diperiksa {lastVerifiedAt}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRerunPreflight}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Verifikasi Ulang
          </button>
        </div>

        <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
          {preflight.items.map((item) => (
            <div
              key={item.id}
              className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {item.status === 'pass' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : item.status === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.label}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        item.status === 'pass'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : item.status === 'warning'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {item.statusText}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pl-7 sm:pl-0 shrink-0">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                  {item.detectedValue}
                </span>
                {item.status !== 'pass' && (
                  <button
                    type="button"
                    onClick={() => onNavigateSection(item.section)}
                    className="text-xs font-medium text-[#0067C0] dark:text-[#3B9EFF] hover:underline whitespace-nowrap shrink-0"
                  >
                    Perbaiki
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Project Health Score Panel */}
      <section
        aria-label="Project Health Score"
        className="bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-5 min-w-0">
            <div className="shrink-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Project Health Score
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-4xl font-bold font-mono tabular-nums ${scoreAccentClass}`}>
                  {health.score}
                </span>
                <span className="text-sm font-mono text-slate-400 tabular-nums">/100</span>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${scoreAccentClass}`}>
                {health.status === 'optimal' ? (
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                )}
                <span>{health.statusLabel}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                {health.summary}
              </p>
              <div className="w-full max-w-md h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden pt-0">
                <div
                  className={`h-full transition-all duration-300 ${scoreBarClass}`}
                  style={{ width: `${health.score}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
            <span className={health.criticalCount > 0 ? 'font-semibold text-red-700 dark:text-red-400' : ''}>
              {health.criticalCount} risiko kritis
            </span>
            <span aria-hidden="true">·</span>
            <span className={health.warningCount > 0 ? 'font-semibold text-amber-700 dark:text-amber-400' : ''}>
              {health.warningCount} peringatan
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 dark:text-emerald-400">
              {health.passedCount} lolos
            </span>
          </div>
        </div>

        {/* 4-Column Category Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
          {health.categories.map((cat) => {
            const pct = cat.max > 0 ? Math.round((cat.earned / cat.max) * 100) : 100;
            const barColor =
              pct === 100
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : pct >= 60
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-red-600 dark:bg-red-500';
            return (
              <div key={cat.id} className="p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {cat.label}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                    {cat.earned}/{cat.max}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {cat.passedCount} dari {cat.totalCount} pemeriksaan lolos
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pre-flight Warning Modal before downloading if mandatory checks fail */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="w-full max-w-lg bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <h2 className="text-sm font-semibold">
                  Pre-flight Checklist Mendeteksi Masalah
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                aria-label="Tutup peringatan"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Pemeriksaan berikut gagal dan berpotensi menyebabkan kompilasi installer di Windows error. Anda disarankan memperbaiki konfigurasi terlebih dahulu sebelum mengunduh.
              </p>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {failedPreflightItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.label}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.summary}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingAction(null);
                        onNavigateSection(item.section);
                      }}
                      className="text-xs font-medium text-[#0067C0] dark:text-[#3B9EFF] hover:underline whitespace-nowrap shrink-0"
                    >
                      Perbaiki
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleProceedAnyway}
                  className="px-3.5 py-2 text-xs font-medium bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  Tetap Unduh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstSection = failedPreflightItems[0]?.section ?? 'identity';
                    setPendingAction(null);
                    onNavigateSection(firstSection);
                  }}
                  className="px-4 py-2 text-xs font-medium bg-[#0067C0] hover:bg-[#0057A3] text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  Perbaiki Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Interactive Windows Setup Wizard Simulator */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Simulasi Interaktif Windows Setup Wizard
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Klik tombol di dalam dialog untuk menguji seluruh langkah pemasangan
          </span>
        </div>
        <WizardSimulator project={project} assets={assets} />
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Detailed Health Checks & Quick CLI + Script Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Detailed Audit Checklist */}
        <section className="lg:col-span-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Detail Audit &amp; Peringatan Risiko
            </h2>
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
              {(
                [
                  { id: 'risks', label: `Risiko (${health.criticalCount + health.warningCount})` },
                  { id: 'critical', label: `Kritis (${health.criticalCount})` },
                  { id: 'warning', label: `Peringatan (${health.warningCount})` },
                  { id: 'all', label: 'Semua' },
                ] as { id: HealthFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHealthFilter(tab.id)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    healthFilter === tab.id
                      ? 'bg-white dark:bg-[#141C2B] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200/80 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {filteredChecks.length === 0 ? (
              <div className="p-5 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Tidak ada konfigurasi berisiko pada filter ini
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Semua pemeriksaan pada kategori yang dipilih telah terpenuhi. Pilih tab &quot;Semua&quot; untuk meninjau daftar lengkap.
                  </p>
                </div>
              </div>
            ) : (
              filteredChecks.map((check) => (
                <div
                  key={check.id}
                  className="p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {check.severity === 'critical' ? (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    ) : check.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {check.title}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {check.passed ? `+${check.weight} poin` : `-${check.weight} poin`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                  {!check.passed && (
                    <button
                      type="button"
                      onClick={() => onNavigateSection(check.section)}
                      className="text-xs font-medium text-[#0067C0] dark:text-[#3B9EFF] hover:underline whitespace-nowrap shrink-0"
                    >
                      Perbaiki
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Quick Windows Terminal Build Command */}
          <div className="bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                Perintah Kompilasi Cepat (Windows)
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(quickCliCommand);
                    onNotify('Perintah kompilasi disalin.');
                  } catch {
                    onNotify('Salin perintah secara manual dari kotak kode.');
                  }
                }}
                className="text-xs font-medium text-[#0067C0] dark:text-[#3B9EFF] hover:underline whitespace-nowrap"
              >
                Salin
              </button>
            </div>
            <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
              {quickCliCommand}
            </pre>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Atau jalankan <span className="font-mono text-slate-700 dark:text-slate-300">.\build-installer.ps1</span> dari dalam arsip ZIP untuk kompilasi otomatis, pembuatan checksum SHA-256, dan code signing.
            </p>
          </div>
        </section>

        {/* Live Script Inspector */}
        <section className="lg:col-span-7 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
              {(Object.keys(scripts) as ScriptTab[]).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tabKey
                      ? 'bg-white dark:bg-[#141C2B] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {scripts[tabKey].label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#141C2B] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin' : 'Salin'}
              </button>
              <button
                type="button"
                onClick={handleDownloadCurrent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh {currentScript.filename}
              </button>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2 font-mono text-slate-200">
                <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                {currentScript.filename}
              </span>
              <span className="font-mono tabular-nums">{lineCount} baris</span>
            </div>
            <div className="max-h-[480px] overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
              <table className="w-full border-collapse">
                <tbody>
                  {currentScript.content.split('\n').map((line, i) => (
                    <tr key={i} className="hover:bg-white/[0.03]">
                      <td className="pr-4 text-right select-none text-slate-500 tabular-nums w-10 align-top">
                        {i + 1}
                      </td>
                      <td className="whitespace-pre text-slate-100">{line || ' '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
