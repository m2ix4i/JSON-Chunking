# System Commands for macOS Darwin

## Essential Unix Commands
```bash
# File operations
ls -la                    # List files with details
find . -name "*.py"       # Find files by pattern
grep -r "pattern" .       # Search text in files
cat filename              # Display file contents
head -n 20 filename       # First 20 lines
tail -f logfile           # Follow log file

# Directory operations
cd /path/to/directory     # Change directory
pwd                       # Print working directory
mkdir -p new/nested/dir   # Create directories
rmdir empty_directory     # Remove empty directory
rm -rf directory          # Remove directory and contents

# File permissions
chmod +x script.sh        # Make executable
chmod 644 file.txt        # Set read/write permissions
chown user:group file     # Change ownership

# Process management
ps aux                    # List all processes
kill -9 PID              # Force kill process
killall process_name     # Kill by name
jobs                     # List background jobs

# Network utilities
curl -I https://url       # HTTP headers
wget https://url          # Download file
netstat -tulpn           # Network connections
lsof -i :8000            # Check port usage
```

## Git Commands
```bash
# Basic workflow
git status               # Check repository status
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git push origin branch   # Push to remote
git pull origin main     # Pull from remote

# Branch management
git branch               # List branches
git checkout -b feature  # Create and switch branch
git merge feature        # Merge branch
git branch -d feature    # Delete branch

# Repository information
git log --oneline        # Compact commit history
git diff                 # Show changes
git show HEAD            # Show last commit
```

## macOS Specific Commands
```bash
# System information
sw_vers                  # macOS version info
system_profiler SPHardwareDataType  # Hardware info
df -h                    # Disk usage
top                      # Process monitor
activity_monitor         # GUI process monitor

# Package management (if Homebrew installed)
brew install package     # Install package
brew update             # Update Homebrew
brew upgrade            # Upgrade packages
brew list               # List installed packages

# File system
open .                   # Open current directory in Finder
open filename           # Open file with default app
pbcopy < file           # Copy file to clipboard
pbpaste > file          # Paste clipboard to file
```

## Docker Commands (for Development)
```bash
# Container management
docker ps                # List running containers
docker ps -a            # List all containers
docker logs container   # View container logs
docker exec -it container /bin/bash  # Shell into container

# Image management
docker images           # List images
docker build -t name .  # Build image
docker rmi image        # Remove image
docker system prune     # Clean up unused resources

# Docker Compose
docker-compose up -d    # Start services in background
docker-compose logs -f  # Follow logs
docker-compose down     # Stop and remove containers
docker-compose exec service bash  # Execute command in service
```