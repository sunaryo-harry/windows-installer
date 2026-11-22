import React, { useRef } from 'react';
import { RotateCcw, Upload } from 'lucide-react';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_APP_ICON,
  DEFAULT_SIDEBAR_IMAGE,
  LICENSE_PRESETS,
} from '../../data/presets';
import {
  InstallerProject,
  UploadedAssets,
  WizardStyle,
} from '../../types/installer';

interface WizardUiSectionProps {
  project: InstallerProject;
  assets: UploadedAssets;
  onChange: (patch: Partial<InstallerProject>) => void;
  onAssetsChange: (patch: Partial<UploadedAssets>) => void;
}

const ACCENT_PRESETS = [
  { label: 'Windows Cobalt', hex: '#0067C0' },
  { label: 'Slate Charcoal', hex: '#1E293B' },
  { label: 'Forest Emerald', hex: '#15803D' },
  { label: 'Deep Indigo', hex: '#3730A3' },
  { label: 'Crimson Red', hex: '#B91C1C' },
];

export const WizardUiSection: React.FC<WizardUiSectionProps> = ({
  project,
  assets,
  onChange,
  onAssetsChange,
}) => {
  const iconInputRef = useRef<HTMLInputElement>(null);
  const sidebarInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    file: File | undefined,
    target: 'icon' | 'sidebar'
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (target === 'icon') {
        onAssetsChange({ iconDataUrl: result, iconFileName: file.name });
      } else {
        onAssetsChange({ sidebarDataUrl: result, sidebarFileName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleLanguage = (code: string) => {
    const exists = project.languages.includes(code);
    if (exists && project.languages.length === 1) return;
    onChange({
      languages: exists
        ? project.languages.filter((c) => c !== code)
        : [...project.languages, code],
    });
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Tampilan Wizard, Bahasa &amp; Perjanjian Lisensi
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Sesuaikan estetika jendela Setup Windows, teks sambutan, ikon aplikasi, banner samping, dukungan multibahasa, dan isi lisensi EULA.
        </p>
      </div>

      {/* Style & Copy */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Gaya Dialog &amp; Teks Sambutan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Gaya Jendela Wizard
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
              {(
                [
                  { id: 'modern', label: 'Modern (Windows 10/11 DPI-Aware)' },
                  { id: 'classic', label: 'Klasik (Win32 Tradisional)' },
                ] as { id: WizardStyle; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ wizardStyle: opt.id })}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    project.wizardStyle === opt.id
                      ? 'bg-white dark:bg-[#141C2B] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Warna Aksen Tombol Pratinjau
            </label>
            <div className="flex items-center gap-2 pt-1">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onChange({ accentHex: c.hex })}
                  title={c.label}
                  className={`w-7 h-7 rounded-md border transition-transform ${
                    project.accentHex === c.hex
                      ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-[#0D131F] scale-105'
                      : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Judul Halaman Selamat Datang
            </label>
            <input
              type="text"
              value={project.welcomeHeadline}
              onChange={(e) => onChange({ welcomeHeadline: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Subjudul / Pesan Pembuka
            </label>
            <textarea
              rows={2}
              value={project.welcomeSubtitle}
              onChange={(e) => onChange({ welcomeSubtitle: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Branding Assets */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Aset Grafis (Ikon &amp; Banner Wizard)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* App Icon */}
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shrink-0">
              <img
                src={assets.iconDataUrl || DEFAULT_APP_ICON}
                alt="Pratinjau ikon aplikasi"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Ikon Installer (.ico / .png)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {assets.iconFileName || 'Menggunakan ikon bawaan Days WinInstaller'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Ikon
                </button>
                {assets.iconDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      onAssetsChange({ iconDataUrl: null, iconFileName: null })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
              <input
                ref={iconInputRef}
                type="file"
                accept=".ico,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  handleImageUpload(e.target.files?.[0], 'icon');
                  e.target.value = '';
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* Sidebar Art */}
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="w-12 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shrink-0">
              <img
                src={assets.sidebarDataUrl || DEFAULT_SIDEBAR_IMAGE}
                alt="Pratinjau banner sidebar wizard"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Banner Sidebar Wizard (164×314 px)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {assets.sidebarFileName || 'Menggunakan karya grafis bawaan'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => sidebarInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Banner
                </button>
                {assets.sidebarDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      onAssetsChange({
                        sidebarDataUrl: null,
                        sidebarFileName: null,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
              <input
                ref={sidebarInputRef}
                type="file"
                accept=".bmp,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  handleImageUpload(e.target.files?.[0], 'sidebar');
                  e.target.value = '';
                }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Languages */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Bahasa Installer yang Didukung
        </h2>
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const checked = project.languages.includes(lang.code);
            return (
              <label
                key={lang.code}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? 'bg-[#0067C0]/[0.06] dark:bg-[#3B9EFF]/10 border-[#0067C0] dark:border-[#3B9EFF] text-slate-900 dark:text-slate-100'
                    : 'bg-white dark:bg-[#141C2B] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleLanguage(lang.code)}
                  className="w-3.5 h-3.5 rounded accent-[#0067C0]"
                />
                {lang.label}
              </label>
            );
          })}
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* License EULA */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={project.showLicensePage}
              onChange={(e) => onChange({ showLicensePage: e.target.checked })}
              className="w-4 h-4 rounded accent-[#0067C0]"
            />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tampilkan Halaman Perjanjian Lisensi (LICENSE.txt)
            </span>
          </label>

          {project.showLicensePage && (
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(LICENSE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ licenseText: preset.text })}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-700 rounded-md hover:border-slate-400 dark:hover:border-slate-500 transition-colors whitespace-nowrap"
                >
                  Pakai {preset.label.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {project.showLicensePage && (
          <textarea
            rows={10}
            value={project.licenseText}
            onChange={(e) => onChange({ licenseText: e.target.value })}
            placeholder="Tempelkan teks Perjanjian Lisensi Pengguna Akhir (EULA) di sini..."
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
        )}
      </section>
    </div>
  );
};
