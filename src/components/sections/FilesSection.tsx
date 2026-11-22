import React, { useRef, useState } from 'react';
import {
  FileUp,
  FolderPlus,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { formatBytes } from '../../data/presets';
import { InstallerFileItem, InstallerProject } from '../../types/installer';
import {
  getEstimatedCompressedBytes,
  getResolvedInstallDir,
  getTotalSizeBytes,
} from '../../utils/scriptGenerators';

interface FilesSectionProps {
  project: InstallerProject;
  onChange: (patch: Partial<InstallerProject>) => void;
}

export const FilesSection: React.FC<FilesSectionProps> = ({
  project,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [newSource, setNewSource] = useState('');
  const [newDestSubDir, setNewDestSubDir] = useState('');
  const [newSizeMb, setNewSizeMb] = useState('2.5');
  const [newRecursive, setNewRecursive] = useState(false);

  const totalRaw = getTotalSizeBytes(project);
  const estCompressed = getEstimatedCompressedBytes(project);

  const filteredFiles = project.files.filter(
    (f) =>
      f.sourcePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.destSubDir.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.note ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addLocalFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const hasMain = project.files.some((f) => f.isMainExe);
    const additions: InstallerFileItem[] = Array.from(fileList).map((file, idx) => {
      const isExe = file.name.toLowerCase().endsWith('.exe');
      return {
        id: `file-${Date.now()}-${idx}`,
        sourcePath: `build\\${file.name}`,
        destSubDir: '',
        isMainExe: !hasMain && isExe && idx === 0,
        isRecursive: false,
        sizeBytes: file.size || 65536,
        ignoreVersion: true,
        restartReplace: file.name.toLowerCase().endsWith('.dll'),
        note: 'Diimpor dari berkas lokal',
      };
    });
    onChange({ files: [...project.files, ...additions] });
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSource.trim();
    if (!trimmed) return;
    const sizeNum = Math.max(0, parseFloat(newSizeMb) || 0) * 1024 * 1024;
    const item: InstallerFileItem = {
      id: `file-${Date.now()}`,
      sourcePath: trimmed,
      destSubDir: newDestSubDir.trim(),
      isMainExe: project.files.length === 0 && trimmed.toLowerCase().endsWith('.exe'),
      isRecursive: newRecursive || trimmed.endsWith('*'),
      sizeBytes: Math.round(sizeNum),
      ignoreVersion: true,
      restartReplace: false,
    };
    onChange({ files: [...project.files, item] });
    setNewSource('');
    setNewDestSubDir('');
    setNewRecursive(false);
  };

  const handleAddWildcardFolder = () => {
    const item: InstallerFileItem = {
      id: `file-${Date.now()}`,
      sourcePath: 'build\\Release\\resources\\*',
      destSubDir: 'resources',
      isMainExe: false,
      isRecursive: true,
      sizeBytes: 4_194_304,
      ignoreVersion: true,
      restartReplace: false,
      note: 'Seluruh isi sub-direktori',
    };
    onChange({ files: [...project.files, item] });
  };

  const setMainExe = (id: string) => {
    onChange({
      files: project.files.map((f) => ({ ...f, isMainExe: f.id === id })),
    });
  };

  const updateFileItem = (id: string, patch: Partial<InstallerFileItem>) => {
    onChange({
      files: project.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const removeFileItem = (id: string) => {
    onChange({
      files: project.files.filter((f) => f.id !== id),
    });
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Berkas &amp; Direktori Pemasangan
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Tentukan folder tujuan default di Windows dan susun daftar biner `.exe`, `.dll`, atau folder sumber daya aplikasi.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
          <span>{project.files.length} entri</span>
          <span aria-hidden="true">·</span>
          <span>Ukuran asli {formatBytes(totalRaw)}</span>
          <span aria-hidden="true">·</span>
          <span>Estimasi paket ~{formatBytes(estCompressed)}</span>
        </div>
      </div>

      {/* Destination Directory */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Direktori Tujuan Default
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Basis Lokasi Windows
            </label>
            <select
              value={project.defaultDirPreset}
              onChange={(e) =>
                onChange({
                  defaultDirPreset: e.target.value as InstallerProject['defaultDirPreset'],
                })
              }
              className={inputClass}
            >
              <option value="autopf">Program Files (Otomatis 64/32-bit)</option>
              <option value="localappdata">LocalAppData (Per-Pengguna)</option>
              <option value="custom">Jalur Kustom Penuh</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {project.defaultDirPreset === 'custom' ? 'Jalur Lengkap' : 'Nama Folder Aplikasi'}
            </label>
            <input
              type="text"
              value={project.defaultDirName}
              onChange={(e) => onChange({ defaultDirName: e.target.value })}
              placeholder="Nusantara Studio"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div className="flex flex-col justify-end pb-2">
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={project.allowDirChange}
                onChange={(e) => onChange({ allowDirChange: e.target.checked })}
                className="w-4 h-4 rounded accent-[#0067C0]"
              />
              Izinkan pengguna mengubah folder tujuan
            </label>
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Pratinjau jalur pemasangan:{' '}
          <span className="font-mono text-slate-800 dark:text-slate-200">
            {getResolvedInstallDir(project, 'display')}
          </span>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Dropzone & Quick Add */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Daftar Berkas Paket
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddWildcardFolder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#141C2B] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Tambah Folder Wildcard
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0067C0] hover:bg-[#0057A3] text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileUp className="w-3.5 h-3.5" />
              Pilih Berkas Lokal
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                addLocalFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addLocalFiles(e.dataTransfer.files);
          }}
          className={`p-4 rounded-xl border border-dashed text-center transition-colors ${
            isDragging
              ? 'border-[#0067C0] bg-[#0067C0]/5 dark:border-[#3B9EFF] dark:bg-[#3B9EFF]/10'
              : 'border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-[#141C2B]/60'
          }`}
        >
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Seret dan lepas berkas aplikasi (`.exe`, `.dll`, `.json`, `.dat`) ke area ini untuk membaca nama serta ukuran berkas secara otomatis, atau tambahkan jalur relatif secara manual di bawah.
          </p>
        </div>

        {/* Inline Manual Entry Form */}
        <form
          onSubmit={handleManualAdd}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Jalur Sumber Relatif
            </label>
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="build\Release\Plugin.dll atau build\data\*"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Sub-folder Tujuan (opsional)
            </label>
            <input
              type="text"
              value={newDestSubDir}
              onChange={(e) => setNewDestSubDir(e.target.value)}
              placeholder="plugins"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Ukuran (MB)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={newSizeMb}
              onChange={(e) => setNewSizeMb(e.target.value)}
              className={`${inputClass} font-mono text-xs tabular-nums`}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambahkan
            </button>
          </div>
        </form>

        {/* Search filter */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jalur berkas atau sub-folder..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#0D131F] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {/* High-density Table */}
        <div className="bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {filteredFiles.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {project.files.length === 0
                  ? 'Belum ada berkas di dalam paket installer'
                  : 'Tidak ada berkas yang cocok dengan pencarian'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tambahkan minimal satu berkas `.exe` utama agar skrip installer dapat dikompilasi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                    <th className="py-2.5 px-3 w-10">Utama</th>
                    <th className="py-2.5 px-3">Jalur Sumber</th>
                    <th className="py-2.5 px-3">Sub-folder Tujuan</th>
                    <th className="py-2.5 px-3">Opsi Salin</th>
                    <th className="py-2.5 px-3 text-right">Ukuran</th>
                    <th className="py-2.5 px-3 w-12 text-right">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setMainExe(file.id)}
                          title={
                            file.isMainExe
                              ? 'Berkas eksekusi utama aktif'
                              : 'Tandai sebagai berkas eksekusi utama'
                          }
                          className={`p-1 rounded-md transition-colors ${
                            file.isMainExe
                              ? 'text-[#0067C0] dark:text-[#3B9EFF]'
                              : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                          }`}
                        >
                          <Star
                            className="w-4 h-4"
                            fill={file.isMainExe ? 'currentColor' : 'none'}
                          />
                        </button>
                      </td>
                      <td className="py-2.5 px-3 min-w-[220px]">
                        <input
                          type="text"
                          value={file.sourcePath}
                          onChange={(e) =>
                            updateFileItem(file.id, { sourcePath: e.target.value })
                          }
                          className="w-full bg-transparent font-mono text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#0D131F] px-1.5 py-1 rounded border border-transparent focus:border-slate-300 dark:focus:border-slate-700"
                        />
                      </td>
                      <td className="py-2.5 px-3 min-w-[130px]">
                        <input
                          type="text"
                          value={file.destSubDir}
                          onChange={(e) =>
                            updateFileItem(file.id, { destSubDir: e.target.value })
                          }
                          placeholder="(root {app})"
                          className="w-full bg-transparent font-mono text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0D131F] px-1.5 py-1 rounded border border-transparent focus:border-slate-300 dark:focus:border-slate-700"
                        />
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={file.isRecursive}
                              onChange={(e) =>
                                updateFileItem(file.id, { isRecursive: e.target.checked })
                              }
                              className="w-3.5 h-3.5 rounded accent-[#0067C0]"
                            />
                            Rekursif
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={file.restartReplace}
                              onChange={(e) =>
                                updateFileItem(file.id, { restartReplace: e.target.checked })
                              }
                              className="w-3.5 h-3.5 rounded accent-[#0067C0]"
                            />
                            Ganti saat reboot
                          </label>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatBytes(file.sizeBytes)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeFileItem(file.id)}
                          aria-label={`Hapus ${file.sourcePath}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
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
    </div>
  );
};
