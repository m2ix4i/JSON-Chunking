"""
Command-line interface for IFC JSON Chunking system.
"""

import asyncio
from pathlib import Path
from typing import Optional

import structlog
import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

from .config import Config
from .core import ChunkingEngine
from .exceptions import IFCChunkingError
from .logging import configure_logging

app = typer.Typer(
    name="ifc-chunking",
    help="IFC JSON Chunking System - Process and chunk IFC data in JSON format"
)
console = Console()
logger = structlog.get_logger(__name__)


@app.command()
def process(
    file_path: Path = typer.Argument(..., help="Path to IFC JSON file to process"),
    output_dir: Optional[Path] = typer.Option(None, "--output", "-o", help="Output directory for chunks"),
    config_file: Optional[Path] = typer.Option(None, "--config", "-c", help="Configuration file path"),
    chunk_size: Optional[int] = typer.Option(None, "--chunk-size", help="Chunk size in MB"),
    max_workers: Optional[int] = typer.Option(None, "--workers", "-w", help="Maximum number of workers"),
    log_level: Optional[str] = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose output"),
) -> None:
    """Process an IFC JSON file and create chunks."""
    try:
        # Load configuration
        config = _load_config(config_file, output_dir, chunk_size, max_workers, log_level)
        configure_logging(config)

        if verbose:
            console.print(f"[green]Processing file:[/green] {file_path}")
            console.print(f"[green]Configuration:[/green] {config}")

        # Run async processing
        asyncio.run(_process_file_async(file_path, config, verbose))

    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")
        logger.exception("Processing failed", file_path=str(file_path))
        raise typer.Exit(1)


@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind to"),
    port: int = typer.Option(8000, "--port", "-p", help="Port to bind to"),
    config_file: Optional[Path] = typer.Option(None, "--config", "-c", help="Configuration file path"),
    log_level: Optional[str] = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
    reload: bool = typer.Option(False, "--reload", help="Enable auto-reload for development"),
) -> None:
    """Start the IFC JSON Chunking web service."""
    try:
        config = _load_config(config_file, log_level=log_level)
        configure_logging(config)

        console.print(f"[green]Starting server on[/green] http://{host}:{port}")

        # Placeholder for web service startup
        console.print("[yellow]Web service not implemented yet[/yellow]")

    except Exception as e:
        console.print(f"[red]Error starting server:[/red] {e}")
        logger.exception("Server startup failed")
        raise typer.Exit(1)


@app.command()
def validate(
    file_path: Path = typer.Argument(..., help="Path to IFC JSON file to validate"),
    config_file: Optional[Path] = typer.Option(None, "--config", "-c", help="Configuration file path"),
    log_level: Optional[str] = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """Validate an IFC JSON file structure."""
    try:
        config = _load_config(config_file, log_level=log_level)
        configure_logging(config)

        console.print(f"[green]Validating file:[/green] {file_path}")

        # Placeholder for validation logic
        console.print("[yellow]Validation not implemented yet[/yellow]")

    except Exception as e:
        console.print(f"[red]Validation error:[/red] {e}")
        logger.exception("Validation failed", file_path=str(file_path))
        raise typer.Exit(1)


@app.command()
def config_show(
    config_file: Optional[Path] = typer.Option(None, "--config", "-c", help="Configuration file path"),
) -> None:
    """Show current configuration."""
    try:
        config = _load_config(config_file)
        console.print("[green]Current Configuration:[/green]")
        console.print_json(data=config.to_dict())

    except Exception as e:
        console.print(f"[red]Configuration error:[/red] {e}")
        raise typer.Exit(1)


@app.command()
def version() -> None:
    """Show version information."""
    from . import __version__
    console.print(f"IFC JSON Chunking System v{__version__}")


async def _process_file_async(file_path: Path, config: Config, verbose: bool) -> None:
    """
    Asynchronously process a file.
    
    Args:
        file_path: Path to the file to process
        config: Configuration object
        verbose: Whether to show verbose output
    """
    engine = ChunkingEngine(config)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        disable=not verbose
    ) as progress:
        task = progress.add_task("Processing file...", total=None)

        try:
            metadata = await engine.process_file(file_path)
            progress.update(task, description="Processing complete!")

            if verbose:
                console.print("[green]Processing Results:[/green]")
                console.print_json(data=metadata)

        except IFCChunkingError as e:
            progress.update(task, description="Processing failed!")
            raise e


def _load_config(
    config_file: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    chunk_size: Optional[int] = None,
    max_workers: Optional[int] = None,
    log_level: Optional[str] = None,
) -> Config:
    """
    Load configuration from file and CLI options.
    
    Args:
        config_file: Path to configuration file
        output_dir: Output directory override
        chunk_size: Chunk size override
        max_workers: Max workers override
        log_level: Log level override
        
    Returns:
        Configuration object
    """
    # Load base configuration
    if config_file and config_file.exists():
        config = Config.from_file(config_file)
    else:
        config = Config()

    # Apply CLI overrides
    if output_dir:
        config.output_directory = output_dir
    if chunk_size:
        config.chunk_size_mb = chunk_size
    if max_workers:
        config.max_workers = max_workers
    if log_level:
        config.log_level = log_level

    return config


def main() -> None:
    """Main entry point for the CLI."""
    app()


if __name__ == "__main__":
    main()
