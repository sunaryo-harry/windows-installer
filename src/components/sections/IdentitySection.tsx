import React from 'react';
import { RefreshCw } from 'lucide-react';
import { generateGuid } from '../../data/presets';
import {
  Architecture,
  CompressionMethod,
  InstallerEngine,
  InstallerProject,
} from '../../types/installer';

interface IdentitySectionProps {
  project: InstallerProject;
  onChange: (patch: Partial<InstallerProject>) => void;
}

const ENGINE_OPTIONS: {
  id: InstallerEngine;
  title: string;
  outputExt: string;
  desc: string;
}[] = [
  {
    id: 'inno',
    title: 'Inno Setup 6',
    outputExt: '.exe',
    desc: 'Paling populer untuk aplikasi desktop Windows dengan kompresi LZMA2 solid dan wizard modern.',
  },
  {
    id: 'nsis',
    title: 'NSIS Modern UI 2',
    outputExt: '.exe',
    desc: 'Overhead sangat kecil, fleksibel untuk skrip instalasi ringan dan distribusi per-pengguna.',
  },
  {
    id: 'wix',
    title: 'WiX Toolset v4',
    outputExt: '.msi',
    desc: 'Paket Windows Installer MSI standar untuk deployment enterprise Intune, SCCM, dan GPO.',
  },
];

export const IdentitySection: React.FC<IdentitySectionProps> = ({
  project,
  onChange,
}) => {
  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#0067C0] dark:focus:border-[#3B9EFF] transition-colors';
  const labelClass =
    'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Identitas Aplikasi &amp; Engine Installer
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Tentukan metadata utama yang muncul di Programs &amp; Features Windows, format output installer, dan kompresi paket.
        </p>
      </div>

      {/* Engine Picker */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Target Engine Kompilasi
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ENGINE_OPTIONS.map((eng) => {
            const active = project.engine === eng.id;
            return (
              <button
                key={eng.id}
                type="button"
                onClick={() => onChange({ engine: eng.id })}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  active
                    ? 'bg-[#0067C0]/[0.06] dark:bg-[#3B9EFF]/10 border-[#0067C0] dark:border-[#3B9EFF]'
                    : 'bg-white dark:bg-[#141C2B] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {eng.title}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Output {eng.outputExt}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {eng.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* App Metadata Form */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Informasi Produk
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="appName" className={labelClass}>
              Nama Aplikasi
            </label>
            <input
              id="appName"
              type="text"
              value={project.appName}
              onChange={(e) => onChange({ appName: e.target.value })}
              placeholder="Contoh: Nusantara Studio"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="appVersion" className={labelClass}>
              Versi Aplikasi (SemVer / Windows Version)
            </label>
            <input
              id="appVersion"
              type="text"
              value={project.appVersion}
              onChange={(e) => onChange({ appVersion: e.target.value })}
              placeholder="1.0.0"
              className={`${inputClass} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label htmlFor="publisher" className={labelClass}>
              Nama Penerbit / Perusahaan
            </label>
            <input
              id="publisher"
              type="text"
              value={project.publisher}
              onChange={(e) => onChange({ publisher: e.target.value })}
              placeholder="Contoh: PT Teknologi Nusantara"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="publisherUrl" className={labelClass}>
              Situs Web Penerbit
            </label>
            <input
              id="publisherUrl"
              type="url"
              value={project.publisherUrl}
              onChange={(e) => onChange({ publisherUrl: e.target.value })}
              placeholder="https://perusahaan.id"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="supportUrl" className={labelClass}>
              Tautan Dukungan &amp; Pembaruan (Opsional)
            </label>
            <input
              id="supportUrl"
              type="url"
              value={project.supportUrl}
              onChange={(e) => onChange({ supportUrl: e.target.value })}
              placeholder="https://perusahaan.id/dukungan"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Identifiers & Output Settings */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Pengenal Unik Windows &amp; Konfigurasi Output
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="appId" className={labelClass}>
              AppId GUID (Identitas Pembaruan / Uninstall)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="appId"
                type="text"
                value={project.appId}
                onChange={(e) => onChange({ appId: e.target.value })}
                className={`${inputClass} font-mono text-xs`}
              />
              <button
                type="button"
                onClick={() => onChange({ appId: generateGuid() })}
                title="Buat GUID Baru"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-[#141C2B] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Buat GUID
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="upgradeCode" className={labelClass}>
              MSI UpgradeCode GUID (Khusus WiX)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="upgradeCode"
                type="text"
                value={project.upgradeCode}
                onChange={(e) => onChange({ upgradeCode: e.target.value })}
                className={`${inputClass} font-mono text-xs`}
              />
              <button
                type="button"
                onClick={() => onChange({ upgradeCode: generateGuid() })}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-[#141C2B] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Buat GUID
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="outputBaseFilename" className={labelClass}>
              Nama Berkas Installer Output
            </label>
            <div className="flex items-center">
              <input
                id="outputBaseFilename"
                type="text"
                value={project.outputBaseFilename}
                onChange={(e) => onChange({ outputBaseFilename: e.target.value })}
                className={`${inputClass} rounded-r-none font-mono text-xs`}
              />
              <span className="px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-lg text-slate-600 dark:text-slate-300">
                {project.engine === 'wix' ? '.msi' : '.exe'}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="outputDir" className={labelClass}>
              Direktori Output Relatif
            </label>
            <input
              id="outputDir"
              type="text"
              value={project.outputDir}
              onChange={(e) => onChange({ outputDir: e.target.value })}
              placeholder="dist\installer"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>

          <div>
            <label className={labelClass}>Arsitektur Target CPU</label>
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
              {(['x64', 'x86', 'arm64'] as Architecture[]).map((arch) => (
                <button
                  key={arch}
                  type="button"
                  onClick={() => onChange({ architecture: arch })}
                  className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    project.architecture === arch
                      ? 'bg-white dark:bg-[#141C2B] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {arch === 'x64' ? '64-bit (x64)' : arch === 'x86' ? '32-bit (x86)' : 'Windows ARM64'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="compression" className={labelClass}>
              Metode Kompresi Paket
            </label>
            <div className="flex items-center gap-3">
              <select
                id="compression"
                value={project.compression}
                onChange={(e) =>
                  onChange({ compression: e.target.value as CompressionMethod })
                }
                className={inputClass}
              >
                <option value="lzma2/ultra64">LZMA2 Ultra 64-bit (Ukuran terkecil)</option>
                <option value="lzma2">LZMA2 Standar (Seimbang)</option>
                <option value="zip">ZIP / Deflate (Kompilasi cepat)</option>
                <option value="none">Tanpa Kompresi (Khusus uji cepat)</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.solidCompression}
                  onChange={(e) => onChange({ solidCompression: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#0067C0]"
                />
                Solid
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
