import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MIN_WINDOWS_OPTIONS } from '../../data/presets';
import {
  InstallerProject,
  PrivilegeLevel,
  RegistryEntry,
  RegistryRoot,
  RegistryValueType,
} from '../../types/installer';

interface RegistrySystemSectionProps {
  project: InstallerProject;
  onChange: (patch: Partial<InstallerProject>) => void;
}

export const RegistrySystemSection: React.FC<RegistrySystemSectionProps> = ({
  project,
  onChange,
}) => {
  const [root, setRoot] = useState<RegistryRoot>(
    project.privilegeLevel === 'admin' ? 'HKLM' : 'HKCU'
  );
  const [subKey, setSubKey] = useState('');
  const [valueName, setValueName] = useState('');
  const [valueType, setValueType] = useState<RegistryValueType>('REG_SZ');
  const [valueData, setValueData] = useState('');

  const handleAddRegistry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subKey.trim() || !valueName.trim()) return;
    const entry: RegistryEntry = {
      id: `reg-${Date.now()}`,
      root,
      subKey: subKey.trim(),
      valueName: valueName.trim(),
      valueType,
      valueData: valueData.trim(),
      deleteOnUninstall: true,
    };
    onChange({ registryEntries: [...project.registryEntries, entry] });
    setSubKey('');
    setValueName('');
    setValueData('');
  };

  const removeRegistry = (id: string) => {
    onChange({
      registryEntries: project.registryEntries.filter((r) => r.id !== id),
    });
  };

  const togglePrereq = (id: string) => {
    onChange({
      prerequisites: project.prerequisites.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    });
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Registri Windows, Hak Akses &amp; Prasyarat Sistem
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Konfigurasikan persyaratan versi OS Windows, tingkat hak akses UAC, deteksi runtime prasyarat, kunci registri kustom, serta penandatanganan digital (Code Signing).
        </p>
      </div>

      {/* System & Privileges */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Hak Akses &amp; Kompatibilitas Sistem
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Tingkat Hak Akses (UAC / Privileges)
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
              {(
                [
                  { id: 'admin', label: 'Administrator (Semua Pengguna)' },
                  { id: 'lowest', label: 'Per-Pengguna (Tanpa UAC)' },
                ] as { id: PrivilegeLevel; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ privilegeLevel: opt.id })}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    project.privilegeLevel === opt.id
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
            <label
              htmlFor="minWinVer"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Versi Windows Minimum
            </label>
            <select
              id="minWinVer"
              value={project.minWindowsVersion}
              onChange={(e) =>
                onChange({
                  minWindowsVersion: e.target.value as InstallerProject['minWindowsVersion'],
                })
              }
              className={inputClass}
            >
              {MIN_WINDOWS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={project.closeRunningApp}
              onChange={(e) => onChange({ closeRunningApp: e.target.checked })}
              className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Tutup aplikasi otomatis saat pembaruan
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Menggunakan Windows Restart Manager agar tidak gagal menimpa biner yang sedang aktif.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={project.supportSilentInstall}
              onChange={(e) => onChange({ supportSilentInstall: e.target.checked })}
              className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Dokumentasikan parameter Silent Install
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Menyertakan perintah instalasi tanpa antarmuka (`/VERYSILENT`, `/S`, atau `msiexec /qn`) untuk tim IT.
              </div>
            </div>
          </label>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Runtime Prerequisites */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Deteksi Prasyarat Runtime Windows
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pemeriksaan kunci registri otomatis saat installer dibuka. Jika belum terpasang, pengguna diarahkan ke tautan resmi Microsoft.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {project.prerequisites.map((prereq) => (
            <label
              key={prereq.id}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                prereq.enabled
                  ? 'bg-[#0067C0]/[0.05] dark:bg-[#3B9EFF]/10 border-[#0067C0]/60 dark:border-[#3B9EFF]/60'
                  : 'bg-white dark:bg-[#141C2B] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={prereq.enabled}
                onChange={() => togglePrereq(prereq.id)}
                className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {prereq.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {prereq.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Registry Editor */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Kunci Registri Kustom (Windows Registry)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gunakan <span className="font-mono">{'{app}'}</span> sebagai variabel lokasi pemasangan. Entri akan dikonversi otomatis untuk Inno Setup, NSIS, dan WiX.
          </p>
        </div>

        <form
          onSubmit={handleAddRegistry}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Hive
            </label>
            <select
              value={root}
              onChange={(e) => setRoot(e.target.value as RegistryRoot)}
              className={`${inputClass} font-mono text-xs`}
            >
              <option value="HKLM">HKLM</option>
              <option value="HKCU">HKCU</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Subkey
            </label>
            <input
              type="text"
              value={subKey}
              onChange={(e) => setSubKey(e.target.value)}
              placeholder="Software\Perusahaan\App"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Nama Nilai
            </label>
            <input
              type="text"
              value={valueName}
              onChange={(e) => setValueName(e.target.value)}
              placeholder="InstallPath"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Tipe
            </label>
            <select
              value={valueType}
              onChange={(e) => setValueType(e.target.value as RegistryValueType)}
              className={`${inputClass} font-mono text-xs`}
            >
              <option value="REG_SZ">REG_SZ</option>
              <option value="REG_DWORD">REG_DWORD</option>
              <option value="REG_EXPAND_SZ">REG_EXPAND_SZ</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Data
            </label>
            <input
              type="text"
              value={valueData}
              onChange={(e) => setValueData(e.target.value)}
              placeholder="{app}"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div className="md:col-span-1">
            <button
              type="submit"
              aria-label="Tambah entri registri"
              className="w-full inline-flex items-center justify-center p-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {project.registryEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum ada kunci registri kustom. Tambahkan entri jika aplikasi membaca konfigurasi awal dari Windows Registry.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                    <th className="py-2.5 px-3">Hive</th>
                    <th className="py-2.5 px-3">Subkey</th>
                    <th className="py-2.5 px-3">Nama</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3 text-right">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs font-mono">
                  {project.registryEntries.map((reg) => (
                    <tr key={reg.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {reg.root}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {reg.subKey}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                        {reg.valueName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {reg.valueType}
                      </td>
                      <td className="py-2.5 px-3 text-[#0067C0] dark:text-[#3B9EFF]">
                        {reg.valueData}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeRegistry(reg.id)}
                          aria-label={`Hapus kunci ${reg.valueName}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Code Signing */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Penandatanganan Digital (Authenticode Code Signing)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Mengurangi peringatan Windows SmartScreen dengan menandatangani berkas `.exe` / `.msi` menggunakan `signtool.exe`.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              checked={project.enableCodeSigning}
              onChange={(e) => onChange({ enableCodeSigning: e.target.checked })}
              className="w-4 h-4 rounded accent-[#0067C0]"
            />
            Aktifkan di skrip build
          </label>
        </div>

        {project.enableCodeSigning && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Jalur Sertifikat (.pfx)
              </label>
              <input
                type="text"
                value={project.signCertPath}
                onChange={(e) => onChange({ signCertPath: e.target.value })}
                placeholder="certs\codesign.pfx"
                className={`${inputClass} font-mono text-xs`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Server Timestamp RFC 3161
              </label>
              <input
                type="url"
                value={project.timestampServer}
                onChange={(e) => onChange({ timestampServer: e.target.value })}
                placeholder="http://timestamp.digicert.com"
                className={`${inputClass} font-mono text-xs`}
              />
            </div>
            <p className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
              Catatan keamanan: Kata sandi sertifikat tidak disimpan di skrip. Atur variabel lingkungan{' '}
              <span className="font-mono text-slate-800 dark:text-slate-200">$env:CERT_PASSWORD</span> saat menjalankan{' '}
              <span className="font-mono text-slate-800 dark:text-slate-200">build-installer.ps1</span> di Windows.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
