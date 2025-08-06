#!/usr/bin/env python3
"""
Run Django development server on port 8000
"""
import os
import sys
import subprocess

# Change to backend directory
os.chdir('backend')

# Run Django development server
if __name__ == "__main__":
    try:
        subprocess.run([sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'], check=True)
    except KeyboardInterrupt:
        print("\nDjango server stopped.")
    except Exception as e:
        print(f"Error running Django server: {e}")