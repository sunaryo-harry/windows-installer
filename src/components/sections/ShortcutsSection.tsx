import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FileAssociation, InstallerProject } from '../../types/installer';

interface ShortcutsSectionProps {
  project: InstallerProject;
  onChange: (patch: Partial<InstallerProject>) => void;
}

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = ({
  project,
  onChange,
}) => {
  const [ext, setExt] = useState('');
  const [progId, setProgId] = useState('');
  const [desc, setDesc] = useState('');

  const handleAddAssoc = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanExt = ext.trim();
    if (!cleanExt) return;
    const normalizedExt = cleanExt.startsWith('.') ? cleanExt : `.${cleanExt}`;
    const newItem: FileAssociation = {
      id: `assoc-${Date.now()}`,
      extension: normalizedExt,
      progId:
        progId.trim() ||
        `${project.appName.replace(/[^A-Za-z0-9]/g, '') || 'App'}.${normalizedExt.slice(1).toUpperCase()}File`,
      description: desc.trim() || `Dokumen ${project.appName}`,
    };
    onChange({ fileAssociations: [...project.fileAssociations, newItem] });
    setExt('');
    setProgId('');
    setDesc('');
  };

  const removeAssoc = (id: string) => {
    onChange({
      fileAssociations: project.fileAssociations.filter((a) => a.id !== id),
    });
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Pintasan, Integrasi Shell &amp; Asosiasi Berkas
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Atur pintasan Start Menu, Desktop, perilaku startup otomatis Windows, dan ekstensi berkas khusus yang dibuka oleh aplikasi Anda.
        </p>
      </div>

      {/* Shortcuts Grid */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Pintasan Windows &amp; Perilaku Pasca-Pemasangan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="space-y-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.createStartMenuShortcut}
                onChange={(e) =>
                  onChange({ createStartMenuShortcut: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Buat pintasan di Start Menu
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Menambahkan aplikasi ke daftar Start Menu Windows.
                </div>
              </div>
            </label>

            {project.createStartMenuShortcut && (
              <div className="pl-7">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nama Folder Start Menu
                </label>
                <input
                  type="text"
                  value={project.startMenuFolder}
                  onChange={(e) => onChange({ startMenuFolder: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.createDesktopShortcut}
                onChange={(e) =>
                  onChange({ createDesktopShortcut: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Tawarkan pintasan di Desktop
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan opsi pembuatan ikon Desktop pada halaman Tugas Tambahan.
                </div>
              </div>
            </label>

            {project.createDesktopShortcut && (
              <label className="flex items-center gap-2.5 pl-7 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.desktopShortcutDefaultChecked}
                  onChange={(e) =>
                    onChange({ desktopShortcutDefaultChecked: e.target.checked })
                  }
                  className="w-3.5 h-3.5 rounded accent-[#0067C0]"
                />
                Centang otomatis secara default saat wizard dibuka
              </label>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.createUninstallShortcut}
                onChange={(e) =>
                  onChange({ createUninstallShortcut: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Sertakan pintasan Uninstall di Start Menu
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Selain entri standar di Windows Settings &gt; Installed Apps.
                </div>
              </div>
            </label>
          </div>

          <div className="space-y-3.5 md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.launchAfterInstall}
                onChange={(e) => onChange({ launchAfterInstall: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Opsi jalankan aplikasi setelah selesai
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan kotak centang &quot;Jalankan aplikasi&quot; di halaman akhir wizard.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.runAtWindowsStartup}
                onChange={(e) => onChange({ runAtWindowsStartup: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Jalankan otomatis saat Windows dimulai
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Mendaftarkan aplikasi di kunci HKCU\...\CurrentVersion\Run.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.addToSystemPath}
                onChange={(e) => onChange({ addToSystemPath: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded accent-[#0067C0]"
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Tambahkan direktori aplikasi ke variabel PATH
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Memungkinkan biner CLI dipanggil langsung dari Command Prompt atau PowerShell.
                </div>
              </div>
            </label>
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* File Associations */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Asosiasi Ekstensi Berkas (File Associations)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftarkan ekstensi kustom agar klik-ganda di Windows Explorer langsung membuka berkas dengan aplikasi Anda.
          </p>
        </div>

        <form
          onSubmit={handleAddAssoc}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Ekstensi
            </label>
            <input
              type="text"
              value={ext}
              onChange={(e) => setExt(e.target.value)}
              placeholder=".nsproj"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              ProgID Windows
            </label>
            <input
              type="text"
              value={progId}
              onChange={(e) => setProgId(e.target.value)}
              placeholder="NusantaraStudio.ProjectFile"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Deskripsi Tipe Berkas
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Berkas Proyek Nusantara Studio"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </button>
          </div>
        </form>

        <div className="bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {project.fileAssociations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum ada asosiasi berkas khusus. Tambahkan ekstensi seperti <span className="font-mono">.myproj</span> jika aplikasi Anda membuka format dokumen tertentu.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                  <th className="py-2.5 px-4">Ekstensi</th>
                  <th className="py-2.5 px-4">ProgID</th>
                  <th className="py-2.5 px-4">Deskripsi Explorer</th>
                  <th className="py-2.5 px-4 text-right w-16">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs">
                {project.fileAssociations.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#0067C0] dark:text-[#3B9EFF]">
                      {item.extension}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {item.progId}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {item.description}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeAssoc(item.id)}
                        aria-label={`Hapus asosiasi ${item.extension}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
