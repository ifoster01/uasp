/**
 * Registry types for UASP skill distribution
 */

export interface RegistrySkill {
  name: string;
  version: string;
  type: 'knowledge' | 'cli' | 'api' | 'hybrid';
  description: string;
  path: string;
  keywords: string[];
  author?: string;
  license?: string;
  homepage?: string;
  dependencies?: string[];
}

export interface Registry {
  $schema?: string;
  version: string;
  updated: string;
  repository: string;
  skills: RegistrySkill[];
}

export interface InstalledSkill {
  name: string;
  version: string;
  type: 'knowledge' | 'cli' | 'api' | 'hybrid';
  path: string;
  enabled: boolean;
  installedAt: string;
  source: string;
}

export interface SkillsConfig {
  $schema?: string;
  version: string;
  skills: {
    installed: InstalledSkill[];
  };
  triggers?: {
    keywords?: Record<string, string[]>;
    filePatterns?: Record<string, string[]>;
  };
}
