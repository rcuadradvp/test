# project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API
    path('api/', include('api.urls')),
    
    # Frontend público
    path('', include('frontend.public.urls')),
    
    # Frontend privado
    path('', include('frontend.private.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Handlers de error personalizados
handler404 = 'frontend.public.views.handler404'
handler403 = 'frontend.public.views.handler403'