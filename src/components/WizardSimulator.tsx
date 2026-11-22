import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  FolderOpen,
  Minus,
  RotateCcw,
  Shield,
  Square,
  X,
} from 'lucide-react';
import {
  DEFAULT_APP_ICON,
  DEFAULT_SIDEBAR_IMAGE,
  formatBytes,
} from '../data/presets';
import { InstallerProject, UploadedAssets } from '../types/installer';
import {
  getExeFileName,
  getResolvedInstallDir,
  getTotalSizeBytes,
} from '../utils/scriptGenerators';

interface WizardSimulatorProps {
  project: InstallerProject;
  assets: UploadedAssets;
  compact?: boolean;
}

type WizardStep =
  | 'welcome'
  | 'license'
  | 'directory'
  | 'tasks'
  | 'ready'
  | 'installing'
  | 'finish';

export const WizardSimulator: React.FC<WizardSimulatorProps> = ({
  project,
  assets,
  compact = false,
}) => {
  const steps = useMemo<WizardStep[]>(() => {
    const seq: WizardStep[] = ['welcome'];
    if (project.showLicensePage) seq.push('license');
    if (project.allowDirChange) seq.push('directory');
    if (
      project.createDesktopShortcut ||
      project.runAtWindowsStartup ||
      project.addToSystemPath ||
      project.fileAssociations.length > 0
    ) {
      seq.push('tasks');
    }
    seq.push('ready', 'installing', 'finish');
    return seq;
  }, [
    project.showLicensePage,
    project.allowDirChange,
    project.createDesktopShortcut,
    project.runAtWindowsStartup,
    project.addToSystemPath,
    project.fileAssociations.length,
  ]);

  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [simDir, setSimDir] = useState(() => getResolvedInstallDir(project, 'display'));
  const [taskDesktop, setTaskDesktop] = useState(project.desktopShortcutDefaultChecked);
  const [taskStartup, setTaskStartup] = useState(project.runAtWindowsStartup);
  const [taskPath, setTaskPath] = useState(project.addToSystemPath);
  const [launchChecked, setLaunchChecked] = useState(project.launchAfterInstall);
  const [installProgress, setInstallProgress] = useState(0);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [sidebarFailed, setSidebarFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    setSimDir(getResolvedInstallDir(project, 'display'));
  }, [project.defaultDirPreset, project.defaultDirName, project.appName, project.architecture]);

  useEffect(() => {
    setTaskDesktop(project.desktopShortcutDefaultChecked);
    setTaskStartup(project.runAtWindowsStartup);
    setTaskPath(project.addToSystemPath);
    setLaunchChecked(project.launchAfterInstall);
  }, [
    project.desktopShortcutDefaultChecked,
    project.runAtWindowsStartup,
    project.addToSystemPath,
    project.launchAfterInstall,
  ]);

  // Keep currentStep valid if user toggles license/dir/tasks while previewing
  useEffect(() => {
    if (!steps.includes(currentStep)) {
      setCurrentStep('welcome');
    }
  }, [steps, currentStep]);

  // Animated extraction simulation
  useEffect(() => {
    if (currentStep !== 'installing') return;
    setInstallProgress(0);
    setCurrentFileIdx(0);
    const fileCount = Math.max(project.files.length, 1);

    const timer = window.setInterval(() => {
      setInstallProgress((prev) => {
        const next = Math.min(prev + 6, 100);
        const mappedIdx = Math.min(
          Math.floor((next / 100) * fileCount),
          fileCount - 1
        );
        setCurrentFileIdx(mappedIdx);
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => setCurrentStep('finish'), 280);
        }
        return next;
      });
    }, 95);

    return () => window.clearInterval(timer);
  }, [currentStep, project.files.length]);

  const stepIndex = steps.indexOf(currentStep);
  const totalBytes = getTotalSizeBytes(project);
  const sidebarSrc = assets.sidebarDataUrl || DEFAULT_SIDEBAR_IMAGE;
  const iconSrc = assets.iconDataUrl || DEFAULT_APP_ICON;

  const canGoBack =
    stepIndex > 0 && currentStep !== 'installing' && currentStep !== 'finish';
  const canGoNext =
    currentStep !== 'installing' &&
    (currentStep !== 'license' || licenseAccepted);

  const handleNext = () => {
    if (currentStep === 'finish') {
      resetSimulation();
      return;
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < steps.length) {
      setCurrentStep(steps[nextIdx]);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1]);
    }
  };

  const resetSimulation = () => {
    setCurrentStep('welcome');
    setLicenseAccepted(false);
    setInstallProgress(0);
    setCurrentFileIdx(0);
  };

  const stepLabels: Record<WizardStep, string> = {
    welcome: 'Selamat Datang',
    license: 'Lisensi',
    directory: 'Lokasi Tujuan',
    tasks: 'Tugas Tambahan',
    ready: 'Siap Memasang',
    installing: 'Memasang',
    finish: 'Selesai',
  };

  const isSidebarPage = currentStep === 'welcome' || currentStep === 'finish';
  const activeExtractingFile =
    project.files[currentFileIdx]?.sourcePath
      ? getExeFileName(project.files[currentFileIdx].sourcePath)
      : 'Menyelesaikan konfigurasi sistem...';

  return (
    <div className="flex flex-col gap-3">
      {/* Step jump bar for rapid author inspection */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-lg">
          {steps.map((step, idx) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentStep === step
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {idx + 1}. {stepLabels[step]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={resetSimulation}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Ulangi
        </button>
      </div>

      {/* Simulated Windows 11 Dialog Frame */}
      <div
        className={`w-full bg-white text-slate-900 border border-slate-300/90 dark:border-slate-700 overflow-hidden shadow-lg ${
          project.wizardStyle === 'modern' ? 'rounded-xl' : 'rounded-sm'
        }`}
      >
        {/* Windows Title Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F3F5F8] border-b border-slate-200 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-4 h-4 rounded-xs overflow-hidden bg-[#0067C0]/10 flex items-center justify-center shrink-0">
              {!iconFailed ? (
                <img
                  src={iconSrc}
                  alt="Ikon Aplikasi"
                  referrerPolicy="no-referrer"
                  onError={() => setIconFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] font-bold text-[#0067C0]">W</span>
              )}
            </div>
            <span className="text-xs font-medium text-slate-800 truncate">
              Pemasangan — {project.appName || 'Aplikasi Windows'} {project.appVersion}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 shrink-0" aria-hidden="true">
            <Minus className="w-3.5 h-3.5" />
            <Square className="w-3 h-3" />
            <X className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Main Dialog Content Body */}
        <div className={compact ? 'min-h-[340px] flex flex-col' : 'min-h-[385px] flex flex-col'}>
          {isSidebarPage ? (
            <div className="flex flex-1 min-h-[310px]">
              {/* Left Sidebar Art */}
              <div className="w-36 sm:w-44 shrink-0 relative bg-slate-900 overflow-hidden border-r border-slate-200">
                {!sidebarFailed ? (
                  <img
                    src={sidebarSrc}
                    alt="Ilustrasi sidebar wizard"
                    referrerPolicy="no-referrer"
                    onError={() => setSidebarFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col justify-end p-4"
                    style={{
                      background: `linear-gradient(155deg, ${project.accentHex || '#0067C0'} 0%, #0F172A 100%)`,
                    }}
                  >
                    <span className="text-xs font-semibold text-white/90">
                      {project.appName}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="text-[11px] font-medium text-white/80 truncate">
                    {project.publisher || 'Penerbit'}
                  </div>
                  <div className="text-xs font-semibold tabular-nums">
                    v{project.appVersion} · {project.architecture.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Right Copy Pane */}
              <div className="flex-1 p-6 flex flex-col justify-between bg-white">
                {currentStep === 'welcome' ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-900 leading-snug">
                      {project.welcomeHeadline || `Selamat Datang di Pemasangan ${project.appName}`}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {project.welcomeSubtitle ||
                        `Panduan ini akan memasang ${project.appName} versi ${project.appVersion} ke komputer Anda.`}
                    </p>
                    <div className="pt-2 space-y-1.5 text-xs text-slate-500">
                      <div>
                        Format paket:{' '}
                        <span className="font-medium text-slate-700">
                          {project.engine === 'inno'
                            ? 'Inno Setup Executable (.exe)'
                            : project.engine === 'nsis'
                              ? 'NSIS Executable (.exe)'
                              : 'Windows Installer Package (.msi)'}
                        </span>
                      </div>
                      <div>
                        Hak akses:{' '}
                        <span className="font-medium text-slate-700">
                          {project.privilegeLevel === 'admin'
                            ? 'Semua Pengguna (Administrator / UAC)'
                            : 'Pengguna Saat Ini (Tanpa UAC)'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                      <Check className="w-4 h-4" />
                      Pemasangan Berhasil Diselesaikan
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 leading-snug">
                      {project.appName} siap digunakan
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Pemasangan telah menyalin seluruh berkas ke{' '}
                      <span className="font-mono text-xs text-slate-800">{simDir}</span>.
                    </p>
                    {project.launchAfterInstall && (
                      <label className="flex items-center gap-2.5 pt-2 text-sm text-slate-800 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={launchChecked}
                          onChange={(e) => setLaunchChecked(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#0067C0]"
                        />
                        <span>Jalankan {project.appName} sekarang</span>
                      </label>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  {currentStep === 'welcome'
                    ? 'Klik Lanjut untuk meneruskan, atau Batal untuk keluar dari Pemasangan.'
                    : 'Klik Selesai untuk menutup jendela Pemasangan.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-white">
              {/* Top Header Strip for Inner Wizard Pages */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                <div className="min-w-0 pr-4">
                  <div className="text-sm font-semibold text-slate-900">
                    {currentStep === 'license' && 'Perjanjian Lisensi'}
                    {currentStep === 'directory' && 'Pilih Lokasi Tujuan'}
                    {currentStep === 'tasks' && 'Pilih Tugas Tambahan'}
                    {currentStep === 'ready' && 'Siap Memasang'}
                    {currentStep === 'installing' && 'Sedang Memasang...'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {currentStep === 'license' &&
                      'Harap baca informasi penting berikut sebelum melanjutkan.'}
                    {currentStep === 'directory' &&
                      `Di mana ${project.appName} harus dipasang?`}
                    {currentStep === 'tasks' &&
                      'Pilih pintasan dan integrasi sistem Windows yang diinginkan.'}
                    {currentStep === 'ready' &&
                      `Setup siap mulai memasang ${project.appName} ke komputer Anda.`}
                    {currentStep === 'installing' &&
                      `Harap tunggu sementara Setup memasang ${project.appName}.`}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center">
                  {!iconFailed ? (
                    <img
                      src={iconSrc}
                      alt="Ikon"
                      referrerPolicy="no-referrer"
                      onError={() => setIconFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-[#0067C0]">W</span>
                  )}
                </div>
              </div>

              {/* Inner Step Body */}
              <div className="flex-1 p-6 bg-[#FAFAFB] text-sm">
                {currentStep === 'license' && (
                  <div className="space-y-3">
                    <div className="h-40 overflow-y-auto p-3.5 bg-white border border-slate-300 rounded-md font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {project.licenseText || 'Teks lisensi belum diisi.'}
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="sim-license"
                          checked={licenseAccepted}
                          onChange={() => setLicenseAccepted(true)}
                          className="accent-[#0067C0]"
                        />
                        Saya menyetujui perjanjian lisensi ini
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="sim-license"
                          checked={!licenseAccepted}
                          onChange={() => setLicenseAccepted(false)}
                          className="accent-[#0067C0]"
                        />
                        Saya tidak menyetujui perjanjian ini
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 'directory' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Setup akan memasang {project.appName} ke folder berikut. Untuk melanjutkan, klik Lanjut. Jika Anda ingin memilih folder berbeda, ubah jalur di bawah ini.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={simDir}
                        onChange={(e) => setSimDir(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSimDir(
                            simDir.includes('D:\\')
                              ? getResolvedInstallDir(project, 'display')
                              : `D:\\Apps\\${project.defaultDirName || project.appName}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Telusuri...
                      </button>
                    </div>
                    <div className="pt-8 text-xs text-slate-600 tabular-nums">
                      Diperlukan setidaknya{' '}
                      <span className="font-semibold text-slate-900">
                        {formatBytes(Math.max(totalBytes, 1_500_000))}
                      </span>{' '}
                      ruang disk kosong ({project.files.length} item berkas).
                    </div>
                  </div>
                )}

                {currentStep === 'tasks' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">
                      Pilih tugas tambahan yang ingin dijalankan saat memasang {project.appName}:
                    </p>
                    <div className="space-y-2.5 pt-1">
                      {project.createDesktopShortcut && (
                        <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={taskDesktop}
                            onChange={(e) => setTaskDesktop(e.target.checked)}
                            className="w-4 h-4 rounded accent-[#0067C0]"
                          />
                          Buat pintasan (shortcut) di Desktop
                        </label>
                      )}
                      {project.runAtWindowsStartup && (
                        <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={taskStartup}
                            onChange={(e) => setTaskStartup(e.target.checked)}
                            className="w-4 h-4 rounded accent-[#0067C0]"
                          />
                          Jalankan {project.appName} otomatis saat Windows dimulai
                        </label>
                      )}
                      {project.addToSystemPath && (
                        <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={taskPath}
                            onChange={(e) => setTaskPath(e.target.checked)}
                            className="w-4 h-4 rounded accent-[#0067C0]"
                          />
                          Tambahkan folder pemasangan ke variabel lingkungan PATH
                        </label>
                      )}
                      {project.fileAssociations.length > 0 && (
                        <div className="pt-2 text-xs text-slate-600">
                          Asosiasi ekstensi terdaftar otomatis:{' '}
                          <span className="font-mono text-slate-800">
                            {project.fileAssociations.map((a) => a.extension).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 'ready' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">
                      Klik Pasang untuk memulai proses instalasi, atau Kembali untuk meninjau pengaturan.
                    </p>
                    <div className="p-3.5 bg-white border border-slate-200 rounded-md font-mono text-xs text-slate-700 space-y-1.5 leading-relaxed">
                      <div>Lokasi tujuan: {simDir}</div>
                      {project.createStartMenuShortcut && (
                        <div>Folder Start Menu: {project.startMenuFolder || project.appName}</div>
                      )}
                      <div>Arsitektur target: {project.architecture.toUpperCase()}</div>
                      <div>
                        Tugas aktif:{' '}
                        {[
                          taskDesktop && 'Pintasan Desktop',
                          taskStartup && 'Auto-start Windows',
                          taskPath && 'Tambah ke PATH',
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Standar'}
                      </div>
                      <div>
                        Total berkas: {project.files.length} item ({formatBytes(totalBytes)})
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'installing' && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="truncate font-mono">
                        Mengekstrak: {activeExtractingFile}
                      </span>
                      <span className="font-mono font-semibold tabular-nums shrink-0 ml-3">
                        {installProgress}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-sm overflow-hidden">
                      <div
                        className="h-full transition-all duration-100"
                        style={{
                          width: `${installProgress}%`,
                          backgroundColor: project.accentHex || '#0067C0',
                        }}
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      {installProgress < 40
                        ? 'Menyalin biner utama dan pustaka...'
                        : installProgress < 80
                          ? 'Mendaftarkan kunci registri dan pintasan...'
                          : 'Membuat uninstaller dan menyelesaikan konfigurasi...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Windows Dialog Footer Buttons */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#F3F5F8] border-t border-slate-200">
          <span className="text-[11px] text-slate-500 truncate">
            {project.engine === 'inno'
              ? 'Inno Setup 6'
              : project.engine === 'nsis'
                ? 'NSIS Modern UI'
                : 'Windows Installer MSI'}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {canGoBack && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                &lt; Kembali
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              style={{
                backgroundColor: canGoNext ? project.accentHex || '#0067C0' : undefined,
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                canGoNext
                  ? 'text-white hover:opacity-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {currentStep === 'ready' && project.privilegeLevel === 'admin' && (
                <Shield className="w-3.5 h-3.5" />
              )}
              {currentStep === 'ready'
                ? 'Pasang'
                : currentStep === 'finish'
                  ? 'Selesai'
                  : currentStep === 'installing'
                    ? 'Memasang...'
                    : 'Lanjut >'}
            </button>
            {currentStep !== 'finish' && (
              <button
                type="button"
                onClick={resetSimulation}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Batal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
