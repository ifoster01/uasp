"""CLI entry point for UASP."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional

import click
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table
from rich.tree import Tree

from uasp.core.errors import UASPError
from uasp.core.loader import SkillLoader
from uasp.core.query import QueryEngine
from uasp.core.version import calculate_version, update_version, verify_version
from uasp.convert.uasp_to_md import MarkdownGenerator

console = Console()
error_console = Console(stderr=True)


@click.group()
@click.version_option(package_name="uasp")
def cli():
    """UASP - Unified Agent Skills Protocol CLI."""
    pass


@cli.command()
@click.argument("file", type=click.Path(exists=True, path_type=Path))
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
@click.option("--strict", is_flag=True, help="Treat warnings as errors")
def validate(file: Path, output_json: bool, strict: bool):
    """Validate a UASP skill file.

    FILE: Path to the .uasp.yaml file to validate.
    """
    loader = SkillLoader(strict_version=strict)
    errors = loader.validate(file)

    if output_json:
        result = {
            "file": str(file),
            "valid": len(errors) == 0,
            "errors": errors,
        }
        console.print_json(json.dumps(result))
    else:
        if errors:
            error_console.print(f"[red]✗[/red] Validation failed for {file}")
            for error in errors:
                error_console.print(f"  [red]•[/red] {error}")
            sys.exit(1)
        else:
            console.print(f"[green]✓[/green] {file} is valid")


@cli.command()
@click.argument("file", type=click.Path(exists=True, path_type=Path))
@click.argument("path", required=True)
@click.option("--filter", "-f", "filters", multiple=True, help="Filter in key=value format")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def query(file: Path, path: str, filters: tuple[str, ...], output_json: bool):
    """Query a UASP skill by path.

    FILE: Path to the .uasp.yaml file.
    PATH: Dot-separated query path (e.g., commands.click, constraints.never).
    """
    try:
        loader = SkillLoader()
        skill = loader.load(file)
        skill_dict = skill.to_dict()

        # Parse filters
        filter_dict = {}
        for f in filters:
            if "=" in f:
                key, value = f.split("=", 1)
                filter_dict[key] = value

        result = QueryEngine.query(skill_dict, path, filter_dict)

        if output_json:
            console.print_json(json.dumps(result.to_dict(), default=str))
        else:
            if result.found:
                if isinstance(result.value, (dict, list)):
                    yaml_str = yaml.dump(result.value, default_flow_style=False)
                    syntax = Syntax(yaml_str, "yaml", theme="monokai")
                    console.print(Panel(syntax, title=f"[bold]{path}[/bold]"))
                else:
                    console.print(result.value)
            else:
                error_console.print(f"[yellow]Path not found:[/yellow] {path}")
                sys.exit(1)

    except UASPError as e:
        error_console.print(f"[red]Error:[/red] {e.message}")
        sys.exit(1)


@cli.command()
@click.argument("file", type=click.Path(exists=True, path_type=Path))
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def info(file: Path, output_json: bool):
    """Display information about a UASP skill.

    FILE: Path to the .uasp.yaml file.
    """
    try:
        loader = SkillLoader()
        skill = loader.load(file)

        if output_json:
            info_dict = {
                "name": skill.meta.name,
                "version": skill.meta.version,
                "type": skill.meta.type,
                "description": skill.meta.description,
                "sections": [],
            }
            skill_dict = skill.to_dict()
            for key in skill_dict:
                if key != "meta":
                    info_dict["sections"].append(key)
            console.print_json(json.dumps(info_dict))
        else:
            # Create info table
            table = Table(title=f"Skill: {skill.meta.name}", show_header=False)
            table.add_column("Property", style="bold")
            table.add_column("Value")

            table.add_row("Name", skill.meta.name)
            table.add_row("Version", skill.meta.version)
            table.add_row("Type", skill.meta.type)
            if skill.meta.description:
                table.add_row("Description", skill.meta.description)

            console.print(table)
            console.print()

            # List sections
            skill_dict = skill.to_dict()
            sections = [k for k in skill_dict.keys() if k != "meta"]
            if sections:
                console.print("[bold]Sections:[/bold]")
                for section in sections:
                    count = ""
                    value = skill_dict[section]
                    if isinstance(value, dict):
                        count = f" ({len(value)} items)"
                    elif isinstance(value, list):
                        count = f" ({len(value)} items)"
                    console.print(f"  • {section}{count}")

            # Show triggers if present
            if skill.triggers:
                console.print()
                console.print("[bold]Triggers:[/bold]")
                if skill.triggers.keywords:
                    console.print(f"  Keywords: {', '.join(skill.triggers.keywords)}")
                if skill.triggers.intents:
                    console.print(f"  Intents: {len(skill.triggers.intents)}")

    except UASPError as e:
        error_console.print(f"[red]Error:[/red] {e.message}")
        sys.exit(1)


@cli.command()
@click.argument("file", type=click.Path(exists=True, path_type=Path))
@click.option("--update", is_flag=True, help="Update the version hash in the file")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def hash(file: Path, update: bool, output_json: bool):
    """Calculate or update the version hash of a skill.

    FILE: Path to the .uasp.yaml file.
    """
    try:
        with open(file, "r") as f:
            content = f.read()
        skill_dict = yaml.safe_load(content)

        is_valid, stored, calculated = verify_version(skill_dict)

        if output_json:
            result = {
                "file": str(file),
                "stored_version": stored,
                "calculated_version": calculated,
                "valid": is_valid,
            }
            if update:
                result["updated"] = True
            console.print_json(json.dumps(result))
        else:
            if is_valid:
                console.print(f"[green]✓[/green] Version hash is valid: {calculated}")
            else:
                console.print(f"[yellow]![/yellow] Version mismatch:")
                console.print(f"  Stored:     {stored}")
                console.print(f"  Calculated: {calculated}")

        if update and not is_valid:
            updated = update_version(skill_dict)
            with open(file, "w") as f:
                yaml.dump(updated, f, default_flow_style=False, sort_keys=False)
            if not output_json:
                console.print(f"[green]✓[/green] Updated version to {calculated}")

    except Exception as e:
        error_console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)


@cli.command()
@click.argument("file", type=click.Path(exists=True, path_type=Path))
@click.option(
    "--to",
    "target_format",
    type=click.Choice(["markdown", "md", "uasp"]),
    required=True,
    help="Target format",
)
@click.option("--output", "-o", type=click.Path(path_type=Path), help="Output file")
@click.option(
    "--llm",
    type=click.Choice(["anthropic", "openai", "gemini", "openrouter"]),
    help="LLM provider (required for md->uasp, optional for uasp->md enhancement)",
)
@click.option("--api-key", help="API key for LLM provider")
@click.option("--model", help="Model to use for conversion")
def convert(
    file: Path,
    target_format: str,
    output: Optional[Path],
    llm: Optional[str],
    api_key: Optional[str],
    model: Optional[str],
):
    """Convert between UASP and Markdown formats.

    FILE: Path to the input file.
    """
    try:
        with open(file, "r") as f:
            content = f.read()

        if target_format in ("markdown", "md"):
            # UASP to Markdown
            skill_dict = yaml.safe_load(content)
            generator = MarkdownGenerator(
                llm_provider=llm,  # type: ignore
                api_key=api_key,
                model=model,
            )
            result = generator.generate(skill_dict)
            out_ext = ".md"
        else:
            # Markdown to UASP
            if not llm:
                error_console.print(
                    "[red]Error:[/red] --llm flag required for markdown to UASP conversion"
                )
                error_console.print("  Use --llm anthropic, --llm openai, --llm gemini, or --llm openrouter")
                sys.exit(1)

            from uasp.convert.md_to_uasp import MarkdownConverter

            converter = MarkdownConverter(
                llm_provider=llm,  # type: ignore
                api_key=api_key,
                model=model,
            )
            conversion_result = converter.convert(content)
            result = conversion_result.yaml_output
            out_ext = ".uasp.yaml"

            # Show warnings
            for warning in conversion_result.warnings:
                error_console.print(f"[yellow]Warning:[/yellow] {warning}")

        if output:
            with open(output, "w") as f:
                f.write(result)
            console.print(f"[green]✓[/green] Written to {output}")
        else:
            # Determine output filename
            out_path = file.with_suffix(out_ext)
            if out_path == file:
                out_path = file.with_name(file.stem + ".converted" + out_ext)
            with open(out_path, "w") as f:
                f.write(result)
            console.print(f"[green]✓[/green] Written to {out_path}")

    except UASPError as e:
        error_console.print(f"[red]Error:[/red] {e.message}")
        sys.exit(1)
    except Exception as e:
        error_console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)


@cli.command()
@click.argument("file", type=click.Path(exists=True, path_type=Path))
def paths(file: Path):
    """List all queryable paths in a skill.

    FILE: Path to the .uasp.yaml file.
    """
    try:
        loader = SkillLoader()
        skill = loader.load(file)
        skill_dict = skill.to_dict()

        all_paths = QueryEngine.list_paths(skill_dict)

        tree = Tree(f"[bold]{skill.meta.name}[/bold]")

        # Group paths by top-level section
        sections: dict[str, list[str]] = {}
        for path in all_paths:
            parts = path.split(".")
            section = parts[0]
            if section not in sections:
                sections[section] = []
            sections[section].append(path)

        for section, paths_list in sorted(sections.items()):
            branch = tree.add(f"[cyan]{section}[/cyan]")
            # Only show first few levels
            for path in paths_list[:20]:
                branch.add(path)
            if len(paths_list) > 20:
                branch.add(f"[dim]... and {len(paths_list) - 20} more[/dim]")

        console.print(tree)

    except UASPError as e:
        error_console.print(f"[red]Error:[/red] {e.message}")
        sys.exit(1)


def main():
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
