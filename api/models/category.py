# api/models/category.py

from django.db import models
from django.utils.text import slugify
import uuid
from .company import Company
from .product import Department


class Category(models.Model):
    """Categorías dentro de departamentos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='categories')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='categories')
    
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, blank=True)
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        ordering = ['name']
        unique_together = [
            ['company', 'department', 'name'],
            ['company', 'department', 'slug']
        ]
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        indexes = [
            models.Index(fields=['company', 'department'], name='idx_cat_comp_dept'),
            models.Index(fields=['slug'], name='idx_cat_slug'),
        ]

    def save(self, *args, **kwargs):
        # Auto-generar slug si no existe
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            
            # Asegurar slug único en el departamento
            while Category.objects.filter(
                company=self.company,
                department=self.department,
                slug=slug
            ).exclude(id=self.id).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            
            self.slug = slug
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.department.name} - {self.name}"