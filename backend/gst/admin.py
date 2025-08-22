from django.contrib import admin
from .models import GSTMaster

@admin.register(GSTMaster)
class GSTMasterAdmin(admin.ModelAdmin):
    list_display = [
        'hsn_code', 'hsn_description', 'gst_rate', 'cgst_rate', 
        'sgst_rate', 'igst_rate', 'cess_rate', 'status', 
        'effective_from', 'effective_to'
    ]
    list_filter = ['status', 'gst_rate', 'effective_from', 'created_at']
    search_fields = ['hsn_code', 'hsn_description']
    ordering = ['hsn_code', '-effective_from']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('HSN Information', {
            'fields': ('hsn_code', 'hsn_description', 'uom')
        }),
        ('GST Rates', {
            'fields': ('gst_rate', 'cgst_rate', 'sgst_rate', 'igst_rate', 'cess_rate')
        }),
        ('Validity Period', {
            'fields': ('effective_from', 'effective_to', 'status')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('Audit Information', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(self.readonly_fields)
        if obj:  # Editing existing object
            readonly_fields.extend(['created_by'])
        return readonly_fields
    
    def save_model(self, request, obj, form, change):
        if not change:  # Creating new object
            obj.created_by = request.user.email
        obj.updated_by = request.user.email
        super().save_model(request, obj, form, change)