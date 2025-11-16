# api/urls.py (Versión 3.0)

from django.urls import path
from .views import (
    CargarDatosView, 
    EntrenarModeloView,
    GetRecommendationsView, 
    SimularProyeccionView, 
    PlanDeCompraView
)

urlpatterns = [
    # POST /api/upload/
    path('upload/', CargarDatosView.as_view(), name='upload-data'),
    
    # POST /api/train/
    path('train/', EntrenarModeloView.as_view(), name='train-model'),
    
    # POST /api/simulate-projection/
    path('simulate-projection/', SimularProyeccionView.as_view(), name='simulate-projection'),
    
    # POST /api/purchase-plan/
    path('purchase-plan/', PlanDeCompraView.as_view(), name='purchase-plan'),
    path('get-recommendations/', GetRecommendationsView.as_view(), name='get-recommendations'),
]