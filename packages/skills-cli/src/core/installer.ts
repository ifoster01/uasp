/**
 * Skill installation management
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import type { InstalledSkill, RegistrySkill, SkillsConfig, Skill } from '../types/index.js';
import { fetchSkillFile, type GitHubSource } from './github.js';
import { validateSkill } from './validator.js';

// ============================================================================
// Directory Paths
// ============================================================================

/**
 * Get the .agent directory path (project-local, new format)
 */
export function getAgentDir(projectDir: string = process.cwd()): string {
  return path.join(projectDir, '.agent');
}

/**
 * Get the ~/.agents directory path (Claude Code global skills)
 */
export function getClaudeAgentsDir(): string {
  return path.join(os.homedir(), '.agents');
}

/**
 * Get the ~/.agents/skills directory path
 */
export function getClaudeSkillsDir(): string {
  return path.join(getClaudeAgentsDir(), 'skills');
}

/**
 * Get the ~/.claude directory path
 */
export function getClaudeDir(): string {
  return path.join(os.homedir(), '.claude');
}

/**
 * Get the ~/.claude/skills directory path (symlinks)
 */
export function getClaudeSymlinksDir(): string {
  return path.join(getClaudeDir(), 'skills');
}

/**
 * Get the ~/.agents/.skill-lock.json path
 */
export function getClaudeLockFilePath(): string {
  return path.join(getClaudeAgentsDir(), '.skill-lock.json');
}

/**
 * Get the skills directory within .agent
 */
export function getSkillsDir(projectDir: string = process.cwd()): string {
  return path.join(getAgentDir(projectDir), 'skills');
}

// ============================================================================
// Claude Code Lock File Management
// ============================================================================

interface ClaudeLockSkill {
  source: string;
  sourceType: 'github' | 'local' | 'uasp';
  sourceUrl: string;
  skillPath: string;
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
}

interface ClaudeLockFile {
  version: number;
  skills: Record<string, ClaudeLockSkill>;
}

/**
 * Load or create Claude Code lock file
 */
async function loadClaudeLockFile(): Promise<ClaudeLockFile> {
  const lockPath = getClaudeLockFilePath();

  if (await fs.pathExists(lockPath)) {
    const content = await fs.readFile(lockPath, 'utf-8');
    return JSON.parse(content) as ClaudeLockFile;
  }

  return {
    version: 3,
    skills: {},
  };
}

/**
 * Save Claude Code lock file
 */
async function saveClaudeLockFile(lockFile: ClaudeLockFile): Promise<void> {
  const lockPath = getClaudeLockFilePath();
  await fs.ensureDir(path.dirname(lockPath));
  await fs.writeFile(lockPath, JSON.stringify(lockFile, null, 2));
}

// ============================================================================
// UASP to SKILL.md Conversion
// ============================================================================

/**
 * Convert a UASP skill to Claude Code SKILL.md format
 */
export function convertToSkillMd(skill: Skill, registrySkill: RegistrySkill): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`name: ${skill.meta.name}`);
  lines.push(`description: ${skill.meta.description || registrySkill.description}`);

  // Add allowed-tools for CLI skills
  if (skill.meta.type === 'cli' && skill.commands) {
    lines.push(`allowed-tools: Bash(${skill.meta.name}:*)`);
  }

  lines.push('metadata:');
  lines.push(`  version: "${skill.meta.version}"`);
  lines.push(`  type: ${skill.meta.type}`);
  lines.push(`  format: uasp`);
  lines.push('---');
  lines.push('');

  // Title
  const title = skill.meta.name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(skill.meta.description || registrySkill.description);
  lines.push('');

  // Triggers/Keywords
  if (skill.triggers) {
    if (skill.triggers.keywords?.length) {
      lines.push('## Keywords');
      lines.push('');
      lines.push(skill.triggers.keywords.join(', '));
      lines.push('');
    }
    if (skill.triggers.intents?.length) {
      lines.push('## Intents');
      lines.push('');
      skill.triggers.intents.forEach((intent) => lines.push(`- ${intent}`));
      lines.push('');
    }
  }

  // Constraints
  if (skill.constraints) {
    lines.push('## Constraints');
    lines.push('');

    if (skill.constraints.never?.length) {
      lines.push('### Never');
      lines.push('');
      skill.constraints.never.forEach((c) => lines.push(`- ${c}`));
      lines.push('');
    }

    if (skill.constraints.always?.length) {
      lines.push('### Always');
      lines.push('');
      skill.constraints.always.forEach((c) => lines.push(`- ${c}`));
      lines.push('');
    }

    if (skill.constraints.prefer?.length) {
      lines.push('### Preferences');
      lines.push('');
      skill.constraints.prefer.forEach((p) => {
        const when = p.when ? ` when ${p.when}` : '';
        lines.push(`- Prefer **${p.use}** over ${p.over}${when}`);
      });
      lines.push('');
    }
  }

  // Decisions
  if (skill.decisions?.length) {
    lines.push('## Decisions');
    lines.push('');
    skill.decisions.forEach((d) => {
      lines.push(`- **When** ${d.when}: ${d.then}`);
    });
    lines.push('');
  }

  // Commands (for CLI skills)
  if (skill.commands && Object.keys(skill.commands).length > 0) {
    lines.push('## Commands');
    lines.push('');

    for (const [cmdName, cmd] of Object.entries(skill.commands)) {
      lines.push(`### ${cmdName}`);
      lines.push('');
      lines.push('```');
      lines.push(cmd.syntax);
      lines.push('```');
      lines.push('');

      if (cmd.description) {
        lines.push(cmd.description);
        lines.push('');
      }

      if (cmd.args?.length) {
        lines.push('**Arguments:**');
        cmd.args.forEach((arg) => {
          const req = arg.required ? ' (required)' : '';
          const desc = arg.description ? ` - ${arg.description}` : '';
          lines.push(`- \`${arg.name}\`: ${arg.type}${req}${desc}`);
        });
        lines.push('');
      }

      if (cmd.flags?.length) {
        lines.push('**Flags:**');
        cmd.flags.forEach((flag) => {
          const short = flag.short ? `${flag.short}, ` : '';
          lines.push(`- \`${short}${flag.name}\`: ${flag.purpose || flag.type}`);
        });
        lines.push('');
      }

      if (cmd.note) {
        lines.push(`> ${cmd.note}`);
        lines.push('');
      }
    }
  }

  // Workflows
  if (skill.workflows && Object.keys(skill.workflows).length > 0) {
    lines.push('## Workflows');
    lines.push('');

    for (const [wfName, wf] of Object.entries(skill.workflows)) {
      lines.push(`### ${wfName}`);
      lines.push('');
      lines.push(wf.description);
      lines.push('');

      if (wf.steps?.length) {
        lines.push('**Steps:**');
        wf.steps.forEach((step, i) => {
          const note = step.note ? ` - ${step.note}` : '';
          lines.push(`${i + 1}. \`${step.cmd}\`${note}`);
        });
        lines.push('');
      }
    }
  }

  // Sources
  if (skill.sources?.length) {
    lines.push('## References');
    lines.push('');
    skill.sources.forEach((src) => {
      if (src.url) {
        lines.push(`- [${src.id}](${src.url}) - ${src.use_for}`);
      } else if (src.path) {
        lines.push(`- ${src.id}: ${src.path} - ${src.use_for}`);
      }
    });
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Converted from UASP format (${skill.meta.type} skill)*`);

  return lines.join('\n');
}

/**
 * Get the settings.json path
 */
export function getSettingsPath(projectDir: string = process.cwd()): string {
  return path.join(getAgentDir(projectDir), 'settings.json');
}

/**
 * Load or create settings.json
 */
export async function loadSettings(projectDir: string = process.cwd()): Promise<SkillsConfig> {
  const settingsPath = getSettingsPath(projectDir);

  if (await fs.pathExists(settingsPath)) {
    const content = await fs.readFile(settingsPath, 'utf-8');
    return JSON.parse(content) as SkillsConfig;
  }

  // Return default config
  return {
    version: '1.0.0',
    skills: {
      installed: [],
    },
    triggers: {
      keywords: {},
      filePatterns: {},
    },
  };
}

/**
 * Save settings.json
 */
export async function saveSettings(
  config: SkillsConfig,
  projectDir: string = process.cwd()
): Promise<void> {
  const settingsPath = getSettingsPath(projectDir);
  await fs.ensureDir(path.dirname(settingsPath));
  await fs.writeFile(settingsPath, JSON.stringify(config, null, 2));
}

/**
 * Initialize .agent directory structure
 */
export async function initAgentDir(projectDir: string = process.cwd()): Promise<void> {
  const agentDir = getAgentDir(projectDir);
  const skillsDir = getSkillsDir(projectDir);

  await fs.ensureDir(agentDir);
  await fs.ensureDir(skillsDir);

  // Create settings.json if it doesn't exist
  const settingsPath = getSettingsPath(projectDir);
  if (!(await fs.pathExists(settingsPath))) {
    await saveSettings(
      {
        version: '1.0.0',
        skills: { installed: [] },
        triggers: { keywords: {}, filePatterns: {} },
      },
      projectDir
    );
  }
}

// ============================================================================
// Claude Code Installation
// ============================================================================

/**
 * Install a skill to Claude Code directories (~/.agents/skills/)
 */
async function installToClaudeCode(
  skillName: string,
  skillMdContent: string,
  source: GitHubSource,
  registrySkill: RegistrySkill
): Promise<void> {
  // Ensure directories exist
  const skillDir = path.join(getClaudeSkillsDir(), skillName);
  await fs.ensureDir(skillDir);
  await fs.ensureDir(getClaudeSymlinksDir());

  // Write SKILL.md
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  await fs.writeFile(skillMdPath, skillMdContent);

  // Create symlink in ~/.claude/skills/
  const symlinkPath = path.join(getClaudeSymlinksDir(), skillName);
  try {
    // Remove existing symlink if present
    if (await fs.pathExists(symlinkPath)) {
      await fs.remove(symlinkPath);
    }
    await fs.symlink(skillDir, symlinkPath);
  } catch {
    // Symlink creation might fail on some systems, continue anyway
  }

  // Update lock file
  const lockFile = await loadClaudeLockFile();

  const sourceUrl = source.isLocal
    ? `file://${source.localPath}`
    : `https://github.com/${source.owner}/${source.repo}.git`;

  lockFile.skills[skillName] = {
    source: source.isLocal ? 'local' : `${source.owner}/${source.repo}`,
    sourceType: source.isLocal ? 'local' : 'uasp',
    sourceUrl,
    skillPath: `skills/${skillName}/SKILL.md`,
    skillFolderHash: registrySkill.version,
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveClaudeLockFile(lockFile);
}

/**
 * Remove a skill from Claude Code directories
 */
async function removeFromClaudeCode(skillName: string): Promise<void> {
  // Remove skill directory
  const skillDir = path.join(getClaudeSkillsDir(), skillName);
  if (await fs.pathExists(skillDir)) {
    await fs.remove(skillDir);
  }

  // Remove symlink
  const symlinkPath = path.join(getClaudeSymlinksDir(), skillName);
  if (await fs.pathExists(symlinkPath)) {
    await fs.remove(symlinkPath);
  }

  // Update lock file
  const lockFile = await loadClaudeLockFile();
  delete lockFile.skills[skillName];
  await saveClaudeLockFile(lockFile);
}

// ============================================================================
// Install/Remove Functions
// ============================================================================

export interface InstallResult {
  success: boolean;
  skill?: InstalledSkill;
  error?: string;
  claudeCodeInstalled?: boolean;
}

export interface InstallOptions {
  projectDir?: string;
  claudeCode?: boolean; // Install to Claude Code directories (default: true)
}

/**
 * Install a skill from a GitHub registry
 *
 * Installs to:
 * 1. .agent/skills/ (project-local, UASP format)
 * 2. ~/.agents/skills/ (Claude Code compatible, SKILL.md format) - if claudeCode option is true
 */
export async function installSkill(
  source: GitHubSource,
  registrySkill: RegistrySkill,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const { projectDir = process.cwd(), claudeCode = true } = options;

  try {
    // Fetch the skill file
    const content = await fetchSkillFile(source, registrySkill.path);

    // Parse and validate
    const skillData = yaml.parse(content) as Skill;
    const validation = validateSkill(skillData);

    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // ========================================
    // 1. Install to .agent/skills/ (UASP format)
    // ========================================
    await initAgentDir(projectDir);

    // Create skill directory
    const skillDir = path.join(getSkillsDir(projectDir), registrySkill.name);
    await fs.ensureDir(skillDir);

    // Write skill file
    const skillFileName = `${registrySkill.name}.uasp.yaml`;
    const skillPath = path.join(skillDir, skillFileName);
    await fs.writeFile(skillPath, content);

    // Update settings.json
    const settings = await loadSettings(projectDir);

    // Remove existing entry if present
    settings.skills.installed = settings.skills.installed.filter(
      (s) => s.name !== registrySkill.name
    );

    // Add new entry
    const installedSkill: InstalledSkill = {
      name: registrySkill.name,
      version: registrySkill.version,
      type: registrySkill.type,
      path: `.agent/skills/${registrySkill.name}/${skillFileName}`,
      enabled: true,
      installedAt: new Date().toISOString(),
      source: `${source.owner}/${source.repo}/${source.path}`,
    };

    settings.skills.installed.push(installedSkill);

    // Update keyword triggers
    if (!settings.triggers) {
      settings.triggers = { keywords: {}, filePatterns: {} };
    }
    if (!settings.triggers.keywords) {
      settings.triggers.keywords = {};
    }

    for (const keyword of registrySkill.keywords) {
      if (!settings.triggers.keywords[keyword]) {
        settings.triggers.keywords[keyword] = [];
      }
      if (!settings.triggers.keywords[keyword].includes(registrySkill.name)) {
        settings.triggers.keywords[keyword].push(registrySkill.name);
      }
    }

    await saveSettings(settings, projectDir);

    // ========================================
    // 2. Install to Claude Code (SKILL.md format)
    // ========================================
    let claudeCodeInstalled = false;

    if (claudeCode) {
      try {
        // Convert to SKILL.md format
        const skillMdContent = convertToSkillMd(skillData, registrySkill);

        // Install to Claude Code directories
        await installToClaudeCode(registrySkill.name, skillMdContent, source, registrySkill);
        claudeCodeInstalled = true;
      } catch (error) {
        // Claude Code installation is optional, don't fail the whole install
        console.warn(`Warning: Could not install to Claude Code: ${(error as Error).message}`);
      }
    }

    return {
      success: true,
      skill: installedSkill,
      claudeCodeInstalled,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface RemoveOptions {
  projectDir?: string;
  claudeCode?: boolean; // Also remove from Claude Code directories (default: true)
}

/**
 * Remove an installed skill
 *
 * Removes from:
 * 1. .agent/skills/ (project-local)
 * 2. ~/.agents/skills/ (Claude Code) - if claudeCode option is true
 */
export async function removeSkill(
  skillName: string,
  options: RemoveOptions = {}
): Promise<boolean> {
  const { projectDir = process.cwd(), claudeCode = true } = options;

  const settings = await loadSettings(projectDir);

  // Find the skill
  const skillIndex = settings.skills.installed.findIndex((s) => s.name === skillName);
  if (skillIndex === -1) {
    return false;
  }

  // Remove from settings
  settings.skills.installed.splice(skillIndex, 1);

  // Remove from keyword triggers
  if (settings.triggers?.keywords) {
    for (const keyword of Object.keys(settings.triggers.keywords)) {
      settings.triggers.keywords[keyword] = settings.triggers.keywords[keyword].filter(
        (s) => s !== skillName
      );
      // Clean up empty arrays
      if (settings.triggers.keywords[keyword].length === 0) {
        delete settings.triggers.keywords[keyword];
      }
    }
  }

  await saveSettings(settings, projectDir);

  // Remove skill directory from .agent/skills/
  const skillDir = path.join(getSkillsDir(projectDir), skillName);
  if (await fs.pathExists(skillDir)) {
    await fs.remove(skillDir);
  }

  // Remove from Claude Code directories
  if (claudeCode) {
    try {
      await removeFromClaudeCode(skillName);
    } catch {
      // Claude Code removal is optional
    }
  }

  return true;
}

/**
 * List installed skills
 */
export async function listInstalledSkills(
  projectDir: string = process.cwd()
): Promise<InstalledSkill[]> {
  const settings = await loadSettings(projectDir);
  return settings.skills.installed;
}
