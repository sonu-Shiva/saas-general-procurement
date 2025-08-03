
# Generated manually to fix migration state
from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_alter_user_managers_remove_user_date_joined_and_more'),
    ]

    operations = [
        # This migration does nothing but marks the problematic migration as applied
        # since our database doesn't have the Django default user fields to remove
    ]
