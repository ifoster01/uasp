# Architecture

This document describes the internal architecture of the UASP library.

## System Overview

```mermaid
flowchart TB
    subgraph External["External"]
        User[User/Application]
        LLM[LLM Context]
        Shell[Shell/Terminal]
    end

    subgraph CLI["CLI Layer"]
        Commands[CLI Commands]
    end

    subgraph Core["Core Layer"]
        Loader[SkillLoader]
        Query[QueryEngine]
        Version[VersionCalculator]
        Validator[SchemaValidator]
    end

    subgraph Runtime["Runtime Layer"]
        SR[SkillRuntime]
        SM[StateManager]
        CE[CommandExecutor]
    end

    subgraph Convert["Conversion Layer"]
        MD2UASP[MarkdownConverter]
        UASP2MD[MarkdownGenerator]
    end

    subgraph Data["Data Layer"]
        Schema[JSON Schema]
        Models[Pydantic Models]
        Skills[Skill Files]
    end

    User --> Commands
    Commands --> SR
    SR --> Loader
    SR --> Query
    SR --> SM
    SM --> CE
    CE --> Shell

    Loader --> Validator
    Loader --> Version
    Validator --> Schema
    Loader --> Models

    Query --> LLM

    MD2UASP --> Loader
    SR --> UASP2MD

    Skills --> Loader
```

## Component Layers

### CLI Layer

The CLI layer provides the user-facing command-line interface.

```mermaid
flowchart LR
    subgraph CLI["CLI Commands"]
        validate[validate]
        query[query]
        info[info]
        hash[hash]
        convert[convert]
        paths[paths]
    end

    validate --> Core
    query --> Core
    info --> Core
    hash --> Core
    convert --> Convert
    paths --> Core
```

**Module:** `uasp.cli.main`

### Core Layer

The core layer handles skill loading, validation, and querying.

```mermaid
classDiagram
    class SkillLoader {
        +load(path) Skill
        +load_string(yaml) Skill
        +load_dict(dict) Skill
        +validate(path) list[str]
    }

    class QueryEngine {
        +query(skill, path, filters) QueryResult
        +parse_query_string(query) tuple
        +query_or_raise(skill, path) Any
        +list_paths(skill) list[str]
    }

    class SchemaValidator {
        +validate(skill_dict) ValidationResult
        +validate_or_raise(skill_dict) None
        +get_best_error(skill_dict) str
    }

    class VersionCalculator {
        +calculate_version(skill_dict) str
        +verify_version(skill_dict) tuple
        +update_version(skill_dict) dict
    }

    SkillLoader --> SchemaValidator
    SkillLoader --> VersionCalculator
```

**Modules:**
- `uasp.core.loader` - Skill loading and validation
- `uasp.core.query` - Query engine
- `uasp.core.version` - Version hash calculation
- `uasp.core.errors` - Error types

### Runtime Layer

The runtime layer manages loaded skills, state, and command execution.

```mermaid
classDiagram
    class SkillRuntime {
        -skills: dict
        -state: dict
        -cache: dict
        +load_skill(path) str
        +unload_skill(name) bool
        +query(name, path, filters) QueryResult
        +execute(name, cmd, args) ExecutionResult
        +get_manifest() dict
    }

    class StateManager {
        -entities: dict
        -valid: dict
        +create(entity, value) None
        +invalidate(entity) None
        +is_valid(entity) bool
        +check_requires(cmd) list[str]
        +apply_effects(cmd, result) None
    }

    class CommandExecutor {
        +execute(cmd, args, dry_run) ExecutionResult
        +build_command(cmd, args) str
        +validate_args(cmd, args) list[str]
    }

    SkillRuntime --> StateManager
    SkillRuntime --> CommandExecutor
    StateManager --> CommandExecutor
```

**Modules:**
- `uasp.runtime.skill_runtime` - Main runtime
- `uasp.runtime.state_manager` - State lifecycle
- `uasp.runtime.executor` - Command execution

### Data Layer

The data layer defines schemas and models.

```mermaid
classDiagram
    class Skill {
        +meta: Meta
        +triggers: Triggers
        +constraints: Constraints
        +decisions: list[Decision]
        +state: State
        +commands: dict[str, Command]
        +workflows: dict[str, Workflow]
        +reference: dict[str, ReferenceEntry]
        +templates: dict[str, Template]
        +environment: list[EnvironmentVar]
        +sources: list[Source]
    }

    class Meta {
        +name: str
        +version: str
        +type: SkillType
        +description: str
    }

    class Constraints {
        +never: list[str]
        +always: list[str]
        +prefer: list[Preference]
    }

    class State {
        +entities: list[StateEntity]
    }

    class Command {
        +syntax: str
        +args: list[Argument]
        +flags: list[Flag]
        +requires: list[str]
        +creates: list[str]
        +invalidates: list[str]
    }

    Skill --> Meta
    Skill --> Constraints
    Skill --> State
    Skill --> Command
```

**Modules:**
- `uasp.schema.skill.json` - JSON Schema
- `uasp.schema.validator` - Schema validation
- `uasp.models.skill` - Pydantic models

### Conversion Layer

The conversion layer handles Markdown ↔ UASP conversion.

```mermaid
flowchart LR
    subgraph Input
        MD[Markdown]
        UASP[UASP YAML]
    end

    subgraph Conversion
        MC[MarkdownConverter]
        MG[MarkdownGenerator]
    end

    subgraph LLM["LLM Provider"]
        Anthropic
        OpenAI
    end

    MD --> MC
    MC --> LLM
    LLM --> MC
    MC --> UASP

    UASP --> MG
    MG --> MD
```

**Modules:**
- `uasp.convert.md_to_uasp` - Markdown to UASP
- `uasp.convert.uasp_to_md` - UASP to Markdown
- `uasp.convert.prompts` - LLM prompts

## Data Flow

### Loading Flow

```mermaid
sequenceDiagram
    participant User
    participant Loader as SkillLoader
    participant YAML as YAML Parser
    participant Schema as SchemaValidator
    participant Version as VersionCalculator
    participant Model as Pydantic Model

    User->>Loader: load(path)
    Loader->>YAML: parse file
    YAML-->>Loader: dict
    Loader->>Schema: validate(dict)
    Schema-->>Loader: ValidationResult
    alt Invalid
        Loader-->>User: ValidationFailedError
    else Valid
        Loader->>Version: verify_version(dict)
        Version-->>Loader: (valid, stored, calculated)
        alt Mismatch
            Loader->>Loader: log warning
        end
        Loader->>Model: from_dict(dict)
        Model-->>Loader: Skill
        Loader-->>User: Skill
    end
```

### Query Flow

```mermaid
sequenceDiagram
    participant User
    participant Runtime as SkillRuntime
    participant Query as QueryEngine
    participant Cache

    User->>Runtime: query(skill, path, filters)
    Runtime->>Cache: check cache
    alt Cache Hit
        Cache-->>Runtime: cached result
    else Cache Miss
        Runtime->>Query: query(skill_dict, path, filters)
        Query->>Query: traverse path
        Query->>Query: apply filters
        Query-->>Runtime: QueryResult
        Runtime->>Cache: store result
    end
    Runtime-->>User: QueryResult
```

### Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant Runtime as SkillRuntime
    participant Executor as CommandExecutor
    participant State as StateManager
    participant Shell

    User->>Runtime: execute(skill, cmd, args)
    Runtime->>Executor: execute(cmd, args)
    Executor->>State: check_requires(cmd)
    State-->>Executor: missing requirements
    alt Missing
        Executor-->>User: InvalidStateError
    else OK
        Executor->>Executor: build_command()
        alt Dry Run
            Executor-->>User: preview
        else Execute
            Executor->>Shell: run command
            Shell-->>Executor: result
            Executor->>State: apply_effects(cmd, result)
            State-->>Executor: done
            Executor-->>User: ExecutionResult
        end
    end
```

## Error Handling

```mermaid
flowchart TD
    subgraph Errors["Error Types"]
        UASPError["UASPError (base)"]
        SkillNotFound["SkillNotFoundError"]
        PathNotFound["PathNotFoundError"]
        InvalidState["InvalidStateError"]
        ValidationFailed["ValidationFailedError"]
        CommandFailed["CommandFailedError"]
        ConversionError["ConversionError"]
    end

    UASPError --> SkillNotFound
    UASPError --> PathNotFound
    UASPError --> InvalidState
    UASPError --> ValidationFailed
    UASPError --> CommandFailed
    UASPError --> ConversionError
```

| Error | Code | When Raised |
|-------|------|-------------|
| `SkillNotFoundError` | `SKILL_NOT_FOUND` | Skill not loaded |
| `PathNotFoundError` | `PATH_NOT_FOUND` | Query path doesn't exist |
| `InvalidStateError` | `INVALID_STATE` | Required state missing |
| `ValidationFailedError` | `VALIDATION_FAILED` | Schema validation fails |
| `CommandFailedError` | `COMMAND_FAILED` | Command execution fails |
| `ConversionError` | `CONVERSION_FAILED` | Conversion fails |

## Module Structure

```
uasp/
├── __init__.py           # Package exports
├── cli/
│   └── main.py           # CLI entry point (Click)
├── convert/
│   ├── md_to_uasp.py     # Markdown → UASP
│   ├── uasp_to_md.py     # UASP → Markdown
│   └── prompts.py        # LLM prompts
├── core/
│   ├── errors.py         # Exception classes
│   ├── loader.py         # SkillLoader
│   ├── query.py          # QueryEngine
│   └── version.py        # Hash calculation
├── models/
│   └── skill.py          # Pydantic models
├── runtime/
│   ├── executor.py       # CommandExecutor
│   ├── skill_runtime.py  # SkillRuntime
│   └── state_manager.py  # StateManager
└── schema/
    ├── skill.json        # JSON Schema
    └── validator.py      # SchemaValidator
```
