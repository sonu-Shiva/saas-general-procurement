#!/usr/bin/env python
"""
Django development server runner for Replit
"""
import os
import sys
import subprocess

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.procurement.settings')

def main():
    # Change to backend directory
    os.chdir('backend')
    
    # Run Django migrations
    print("Running Django migrations...")
    subprocess.run([sys.executable, 'manage.py', 'migrate'], check=True)
    
    # Create superuser if needed (optional)
    print("Creating superuser if needed...")
    subprocess.run([
        sys.executable, 'manage.py', 'shell', '-c',
        "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(email='admin@example.com').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin')"
    ], check=False)
    
    # Run Django development server
    print("Starting Django development server...")
    subprocess.run([
        sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
    ])

if __name__ == '__main__':
    main()