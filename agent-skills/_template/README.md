# Creating a New UASP Skill

This template helps you create a new skill in UASP format.

## Steps

1. **Create a new directory** for your skill:
   ```bash
   mkdir my-skill-name
   ```

2. **Copy the template**:
   ```bash
   cp _template/skill-name.uasp.yaml.template my-skill-name/my-skill-name.uasp.yaml
   ```

3. **Edit the skill file**:
   - Set the `meta.name` to match your directory name
   - Choose the appropriate `meta.type` (knowledge, cli, api, hybrid)
   - Fill in the sections relevant to your skill type
   - Delete sections that don't apply

4. **Validate your skill**:
   ```bash
   uasp validate my-skill-name/my-skill-name.uasp.yaml
   ```

5. **Calculate the version hash**:
   ```bash
   uasp hash my-skill-name/my-skill-name.uasp.yaml --update
   ```

6. **Create a README.md** for your skill (see other skills for examples)

7. **Submit a pull request** to add your skill to the registry

## Skill Types

| Type | Primary Sections | Use Case |
|------|------------------|----------|
| `knowledge` | constraints, decisions, sources | Best practices, guidelines |
| `cli` | commands, state, workflows | Command-line tools |
| `api` | commands, state, reference | HTTP/API integrations |
| `hybrid` | All sections | Combined knowledge + execution |

## Validation

Before submitting, ensure your skill:

- [ ] Passes `uasp validate`
- [ ] Has a unique name (check registry.json)
- [ ] Has a meaningful description (under 500 chars)
- [ ] Has relevant keywords for discovery
- [ ] Has a README.md
