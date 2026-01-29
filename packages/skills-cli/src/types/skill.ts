/**
 * UASP Skill types
 * Mirrors the Python Pydantic models
 */

export type SkillType = 'knowledge' | 'cli' | 'api' | 'hybrid';

export interface Meta {
  name: string;
  version: string;
  type: SkillType;
  description: string;
}

export interface Triggers {
  keywords?: string[];
  intents?: string[];
  file_patterns?: string[];
}

export interface Preference {
  use: string;
  over: string;
  when?: string;
}

export interface Constraints {
  never?: string[];
  always?: string[];
  prefer?: Preference[];
}

export interface Decision {
  when: string;
  then: string;
  ref?: string;
}

export interface StateEntity {
  name: string;
  format?: string;
  created_by?: string[];
  consumed_by?: string[];
  invalidated_by?: string[];
  properties?: string[];
  persisted_by?: string[];
  restored_by?: string[];
}

export interface State {
  entities: StateEntity[];
}

export interface Argument {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  default?: unknown;
  values?: string[];
}

export interface Flag {
  name: string;
  short?: string;
  long?: string;
  type: string;
  purpose?: string;
  default?: unknown;
  env?: string;
  values?: string[];
}

export interface Command {
  syntax: string;
  description?: string;
  aliases?: string[];
  args?: Argument[];
  flags?: Flag[];
  requires?: string[];
  creates?: string[];
  invalidates?: string[];
  returns?: string;
  note?: string;
  variants?: Array<{ syntax: string; purpose: string }>;
  example?: string;
}

export interface WorkflowStep {
  cmd: string;
  note?: string;
  optional?: boolean;
}

export interface Workflow {
  description: string;
  invariants?: string[];
  steps: WorkflowStep[];
  example?: string;
}

export interface ReferenceEntry {
  syntax?: string;
  notes?: string;
  example?: string;
  [key: string]: unknown;
}

export interface Template {
  description: string;
  usage: string;
  args?: Argument[];
  path: string;
}

export interface EnvironmentVar {
  name: string;
  purpose: string;
  default?: string;
}

export interface Source {
  id: string;
  url?: string;
  path?: string;
  use_for: string;
}

export interface Skill {
  meta: Meta;
  triggers?: Triggers;
  constraints?: Constraints;
  decisions?: Decision[];
  state?: State;
  commands?: Record<string, Command>;
  global_flags?: Flag[];
  workflows?: Record<string, Workflow>;
  reference?: Record<string, ReferenceEntry>;
  templates?: Record<string, Template>;
  environment?: EnvironmentVar[];
  sources?: Source[];
}
