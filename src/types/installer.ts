export type InstallerEngine = 'inno' | 'nsis' | 'wix';
export type Architecture = 'x64' | 'x86' | 'arm64';
export type PrivilegeLevel = 'admin' | 'lowest';
export type CompressionMethod = 'lzma2/ultra64' | 'lzma2' | 'zip' | 'none';
export type RegistryRoot = 'HKLM' | 'HKCU';
export type RegistryValueType = 'REG_SZ' | 'REG_DWORD' | 'REG_EXPAND_SZ';
export type WizardStyle = 'modern' | 'classic';

export type SectionId =
  | 'identity'
  | 'files'
  | 'shortcuts'
  | 'registry'
  | 'wizard'
  | 'export';

export interface InstallerFileItem {
  id: string;
  sourcePath: string;
  destSubDir: string;
  isMainExe: boolean;
  isRecursive: boolean;
  sizeBytes: number;
  ignoreVersion: boolean;
  restartReplace: boolean;
  note?: string;
}

export interface FileAssociation {
  id: string;
  extension: string;
  progId: string;
  description: string;
}

export interface RegistryEntry {
  id: string;
  root: RegistryRoot;
  subKey: string;
  valueName: string;
  valueType: RegistryValueType;
  valueData: string;
  deleteOnUninstall: boolean;
}

export interface PrerequisiteItem {
  id: string;
  key: 'dotnet8' | 'vcpp2022' | 'webview2' | 'directx';
  name: string;
  description: string;
  enabled: boolean;
  downloadUrl: string;
  silentArgs: string;
  registryCheck: string;
}

export interface UploadedAssets {
  iconDataUrl: string | null;
  iconFileName: string | null;
  sidebarDataUrl: string | null;
  sidebarFileName: string | null;
}

export interface InstallerProject {
  id: string;
  updatedAt: string;
  engine: InstallerEngine;

  // Identity
  appName: string;
  appVersion: string;
  publisher: string;
  publisherUrl: string;
  supportUrl: string;
  appId: string;
  upgradeCode: string;
  architecture: Architecture;
  outputBaseFilename: string;
  outputDir: string;
  compression: CompressionMethod;
  solidCompression: boolean;

  // Install Directory & Files
  defaultDirPreset: 'autopf' | 'localappdata' | 'custom';
  defaultDirName: string;
  allowDirChange: boolean;
  files: InstallerFileItem[];

  // Shortcuts & File Associations
  startMenuFolder: string;
  createStartMenuShortcut: boolean;
  createDesktopShortcut: boolean;
  desktopShortcutDefaultChecked: boolean;
  createUninstallShortcut: boolean;
  launchAfterInstall: boolean;
  runAtWindowsStartup: boolean;
  addToSystemPath: boolean;
  fileAssociations: FileAssociation[];

  // Registry & System
  minWindowsVersion: '10.0.17763' | '10.0.19041' | '10.0.22000' | '6.1';
  privilegeLevel: PrivilegeLevel;
  closeRunningApp: boolean;
  supportSilentInstall: boolean;
  registryEntries: RegistryEntry[];
  prerequisites: PrerequisiteItem[];

  // Code Signing
  enableCodeSigning: boolean;
  signCertPath: string;
  timestampServer: string;

  // Wizard UI & License
  wizardStyle: WizardStyle;
  languages: string[];
  showLicensePage: boolean;
  licenseText: string;
  welcomeHeadline: string;
  welcomeSubtitle: string;
  accentHex: string;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  section: SectionId;
  title: string;
  detail: string;
}

export type HealthSeverity = 'critical' | 'warning' | 'pass';

export interface HealthCheckItem {
  id: string;
  categoryId: 'identity' | 'files' | 'security' | 'ux';
  severity: HealthSeverity;
  weight: number;
  passed: boolean;
  section: SectionId;
  title: string;
  detail: string;
}

export interface HealthCategoryBreakdown {
  id: 'identity' | 'files' | 'security' | 'ux';
  label: string;
  earned: number;
  max: number;
  passedCount: number;
  totalCount: number;
}

export interface ProjectHealthReport {
  score: number;
  status: 'optimal' | 'attention' | 'risk';
  statusLabel: string;
  summary: string;
  criticalCount: number;
  warningCount: number;
  passedCount: number;
  categories: HealthCategoryBreakdown[];
  checks: HealthCheckItem[];
}

export type PreflightStatus = 'pass' | 'warning' | 'fail';

export interface PreflightCheckItem {
  id: 'main-exe' | 'registry-config' | 'app-version' | 'guid-and-dir';
  label: string;
  status: PreflightStatus;
  statusText: string;
  summary: string;
  detectedValue: string;
  section: SectionId;
}

export interface PreflightReport {
  readyToBuild: boolean;
  hasWarnings: boolean;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  totalCount: number;
  items: PreflightCheckItem[];
}


