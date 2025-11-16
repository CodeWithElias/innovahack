from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import pandas as pd
import joblib
from sklearn.linear_model import LinearRegression
import os

# --- Nombres de nuestros archivos temporales ---
CSV_FILE_PATH = 'datos_cargados.csv'
MODEL_FILE_PATH = 'modelo_demanda.pkl'
FEATURES_FILE_PATH = 'features.pkl'

# --- VISTA 1: Cargar el CSV ---
class CargarDatosView(APIView):
    """
    Recibe el archivo 'datos_para_entrenar.csv' y lo guarda.
    """
    def post(self, request, *args, **kwargs):
        archivo_csv = request.data.get('file')
        if not archivo_csv:
            return Response({"error": "No se subió ningún archivo"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Borramos el modelo antiguo si existe, para forzar un re-entrenamiento
            if os.path.exists(MODEL_FILE_PATH):
                os.remove(MODEL_FILE_PATH)
            if os.path.exists(FEATURES_FILE_PATH):
                os.remove(FEATURES_FILE_PATH)
                
            with open(CSV_FILE_PATH, 'wb+') as destination:
                for chunk in archivo_csv.chunks():
                    destination.write(chunk)
            
            return Response({"status": f"Archivo guardado como '{CSV_FILE_PATH}'. Listo para entrenar."}, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response({"error": f"Error guardando el archivo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- VISTA 2: Entrenar el Modelo de IA ---
class EntrenarModeloView(APIView):
    """
    Lee el CSV 'largo', entrena el modelo de IA con estacionalidad,
    y lo guarda como 'modelo_demanda.pkl'.
    """
    def post(self, request, *args, **kwargs):
        if not os.path.exists(CSV_FILE_PATH):
            return Response({"error": "No hay datos para entrenar. Sube tu archivo 'datos_para_entrenar.csv' primero."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # --- 1. Carga el CSV (¡LA LÍNEA CORREGIDA!) ---
            # Forzamos a Pandas a usar el separador ';' y la codificación 'latin1'
            df = pd.read_csv(CSV_FILE_PATH, sep=';', encoding='latin1')
            print("Columnas del CSV cargado:", df)
            
        except Exception as e:
            return Response({"error": f"Error al leer el CSV. Revisa el archivo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # --- 2. INGENIERÍA DE FEATURES (La IA) ---
            
            # Convertimos 'FECHA' a un objeto de fecha
            # (Ya no necesitamos renombrar, el CSV se lee bien)
            df['FECHA'] = pd.to_datetime(df['FECHA'], errors='coerce')

            # ¡Creamos la variable de ESTACIONALIDAD! (Mes 1 al 12)
            df['MES'] = df['FECHA'].dt.month
            
            # Convertimos 'PRODUCTO' a números (One-Hot Encoding)
            df = pd.get_dummies(df, columns=['PRODUCTO'], drop_first=True)
            
            # --- FIN DE INGENIERÍA DE FEATURES ---

            # 3. Definimos las columnas que usará el modelo
            columnas_producto = [col for col in df.columns if col.startswith('PRODUCTO_')]
            
            features = [
                'PRECIO_DE_VENTA',
                'LEAD_TIME_DIAS',
                'CANT_MIN_COMPRAS', # <--- ¡CORREGIDO CON 'S'!
                'SENSIBILIDAD_PRECIO',
                'FERIA',
                'CLIMA',  
                'MES'
            ] + columnas_producto 
            
            target = 'CANTIDAD'

            # 4. Preparamos datos para Scikit-learn
            df = df.dropna(subset=features + [target]) # Borra filas vacías
            X = df[features] 
            y = df[target]   
            
            if X.empty or y.empty:
                return Response({"error": "No hay datos válidos para entrenar después de procesar."}, status=status.HTTP_400_BAD_REQUEST)

            # 5. Crear y entrenar el modelo
            modelo = LinearRegression()
            modelo.fit(X, y)

            # 6. Guardar el modelo entrenado Y la lista de features
            joblib.dump(modelo, MODEL_FILE_PATH)
            joblib.dump(X.columns.tolist(), FEATURES_FILE_PATH) # Guardamos los nombres de las columnas

            return Response({"status": f"¡ÉXITO! Modelo de IA entrenado y guardado."}, status=status.HTTP_200_OK)
        
        except KeyError as e:
             return Response({"error": f"Error de Columna. Revisa que tu CSV tenga exactamente este nombre: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Error durante el entrenamiento: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- VISTA 3: Simular Proyección (VERSIÓN "INTELIGENTE" Y CORREGIDA) ---
class SimularProyeccionView(APIView):
    
    # --- Función interna para cargar y buscar datos ---
    def get_static_data(self, product_sku):
        """
        Esta función abre el CSV, busca el producto y devuelve sus datos estáticos.
        """
        try:
            # 1. Carga la "base de datos" (nuestro CSV)
            #    ¡USANDO EL SEPARADOR CORRECTO!
            df_data = pd.read_csv(CSV_FILE_PATH, sep=';', encoding='latin1')
            
            # Renombra la columna de producto si es 'producto' o 'Producto'
            if 'PRODUCTO' not in df_data.columns and 'producto' in df_data.columns:
                df_data.rename(columns={'producto': 'PRODUCTO'}, inplace=True)
            elif 'PRODUCTO' not in df_data.columns and 'Producto' in df_data.columns:
                df_data.rename(columns={'Producto': 'PRODUCTO'}, inplace=True)

            # Limpia los espacios en blanco
            df_data['PRODUCTO'] = df_data['PRODUCTO'].astype(str).str.strip()
            product_sku_clean = str(product_sku).strip()
            
            # Busca el producto
            product_data_series = df_data[df_data['PRODUCTO'] == product_sku_clean]

            if product_data_series.empty:
                print(f"Error: No se encontró '{product_sku_clean}' en el CSV.")
                print(f"Productos en CSV: {df_data['PRODUCTO'].unique()[:5]}")
                return None
            else:
                product_data = product_data_series.iloc[0]

            # Devuelve los datos estáticos
            return {
                "PRECIO_DE_VENTA": product_data['PRECIO_DE_VENTA'],
                "PRECIO_DE_COMPRA": product_data['PRECIO_DE_COMPRA'],
                "LEAD_TIME_DIAS": product_data['LEAD_TIME_DIAS'],
                "CANT_MIN_COMPRAS": product_data['CANT_MIN_COMPRAS'],
                "SENSIBILIDAD_PRECIO": product_data['SENSIBILIDAD_PRECIO']
            }
        except Exception as e:
            print(f"Error en get_static_data: {e}")
            return None

    # (El resto de la vista 'post' es exactamente igual que antes)
    def post(self, request, *args, **kwargs):
        if not os.path.exists(MODEL_FILE_PATH) or not os.path.exists(FEATURES_FILE_PATH):
             return Response({"error": "El modelo no ha sido entrenado."}, status=status.HTTP_400_BAD_REQUEST)
        
        modelo = joblib.load(MODEL_FILE_PATH)
        features_list = joblib.load(FEATURES_FILE_PATH)
        
        # 1. RECIBIMOS EL JSON SIMPLE DE REACT
        escenario_data = request.data 
        if not isinstance(escenario_data, list):
             return Response({"error": "El input debe ser una lista (array) de meses."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            perfiles_completos = []
            
            # 2. CONSTRUIMOS EL PERFIL COMPLETO
            for mes_info in escenario_data:
                product_sku = mes_info.get('PRODUCTO')
                if not product_sku:
                    return Response({"error": "Falta 'PRODUCTO' en uno de los objetos del JSON."}, status=status.HTTP_400_BAD_REQUEST)

                static_data = self.get_static_data(product_sku)
                if static_data is None:
                    return Response({"error": f"Producto no encontrado en el CSV: '{product_sku}'. Revisa la consola de Django."}, status=status.HTTP_400_BAD_REQUEST)
                
                # Combinamos los datos estáticos (del CSV) con los del escenario (de React)
                perfil_completo = {**static_data, **mes_info}
                perfiles_completos.append(perfil_completo)

            # 3. PREPARAMOS LOS DATOS PARA LA IA
            df_simulacion = pd.DataFrame(perfiles_completos)
            df_simulacion = pd.get_dummies(df_simulacion, columns=['PRODUCTO'])
            
            df_final_sim = pd.DataFrame(columns=features_list)
            df_final_sim = pd.concat([df_final_sim, df_simulacion], sort=False)
            df_final_sim = df_final_sim[features_list].fillna(0) 

            # 4. PREDICCIÓN BASE DE LA IA
            proyeccion_cantidad_ia = modelo.predict(df_final_sim)

            resultados = []
            for i, prediccion_base_ia in enumerate(proyeccion_cantidad_ia):
                
                cantidad_ia_base = int(prediccion_base_ia)
                if cantidad_ia_base < 0: cantidad_ia_base = 0 
                
                mes_info = escenario_data[i] # El JSON simple de React
                perfil = perfiles_completos[i] # El perfil completo (con datos del CSV)
                
                # --- 5. LÓGICA DE NEGOCIO ---
                sensibilidad = float(perfil.get('SENSIBILIDAD_PRECIO', 0))
                cambio_precio_pct = float(mes_info.get('CAMBIO_PRECIO_PCT', 0)) 
                crecimiento_org_pct = float(mes_info.get('CRECIMIENTO_ORGANICO', 0))

                impacto_precio_pct = (cambio_precio_pct / 100) * sensibilidad
                cantidad_con_precio = cantidad_ia_base * (1 + impacto_precio_pct)
                cantidad_final = cantidad_con_precio * (1 + (crecimiento_org_pct / 100))
                cantidad_final_redondeada = round(cantidad_final, 0)
                # --- FIN ---
                
                # 6. Devolvemos el resultado
                precio_base_csv = float(perfil.get('PRECIO_DE_VENTA'))
                precio_final_simulado = precio_base_csv * (1 + (cambio_precio_pct / 100))
                precio_c = float(perfil.get('PRECIO_DE_COMPRA'))
                
                ingresos = cantidad_final_redondeada * precio_final_simulado
                costos = cantidad_final_redondeada * precio_c
                margen = ingresos - costos
                
                # Añadimos los dos valores para comparar
                mes_info['CANTIDAD_PROYECTADA_IA_BASE'] = round(cantidad_ia_base, 0)
                mes_info['CANTIDAD_PROYECTADA_FINAL'] = cantidad_final_redondeada
                mes_info['INGRESOS_PROYECTADOS'] = round(ingresos, 2)
                mes_info['MARGEN_PROYECTADO'] = round(margen, 2)
                
                # Devolvemos los datos estáticos para el plan de compra
                mes_info['LEAD_TIME_DIAS'] = int(perfil.get('LEAD_TIME_DIAS'))
                mes_info['CANT_MIN_COMPRAS'] = int(perfil.get('CANT_MIN_COMPRAS'))
                
                mes_info['PRECIO_DE_COMPRA'] = float(perfil.get('PRECIO_DE_COMPRA'))
                
                resultados.append(mes_info)

            return Response(resultados, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": f"Error durante la simulación: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- VISTA 4: Plan de Compra (CON RECOMENDACIONES) ---
class PlanDeCompraView(APIView):
    """
    Recibe la proyección de ventas aprobada Y la situación de combustible,
    y calcula el plan de compras CON RECOMENDACIONES.
    """
    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            proyeccion = data.get('proyeccion_ventas', []) 
            stock_actual = float(data.get('stock_actual', 0))
            situacion_combustible = int(data.get('situacion_combustible', 1)) 

            plan_compra = []
            stock_mes = stock_actual

            for mes_data in proyeccion:
                demanda = mes_data.get('CANTIDAD_PROYECTADA_FINAL', 0)
                lead_time_base = int(mes_data.get('LEAD_TIME_DIAS', 60))
                moq = float(mes_data.get('CANT_MIN_COMPRAS', 100))
                
                # Leemos el precio de compra (del Paso 1)
                precio_compra = float(mes_data.get('PRECIO_DE_COMPRA', 0))
                
                # Lógica de Lead Time
                if situacion_combustible == 2: 
                    lead_time_final = lead_time_base + 15 
                else: 
                    lead_time_final = lead_time_base
                
                # Lógica de Compra
                stock_inicial = stock_mes
                compra_requerida = 0
                if stock_inicial < demanda:
                    compra_requerida = demanda - stock_inicial
                    if compra_requerida < moq:
                        compra_requerida = moq
                    elif compra_requerida % moq != 0:
                        compra_requerida = (compra_requerida // moq + 1) * moq
                
                stock_final = stock_inicial + compra_requerida - demanda
                
                # --- ¡NUEVA LÓGICA DE RECOMENDACIÓN! ---
                recomendacion = "OK"
                costo_compra = compra_requerida * precio_compra
                
                # Calculamos el stock de seguridad (ej: 20% de la demanda)
                stock_seguridad = demanda * 0.2 
                
                if stock_final < 0:
                    recomendacion = f"¡ALERTA! Quiebre de stock. Faltan {abs(stock_final):.0f} uds. Aumentar compra."
                elif stock_final < stock_seguridad:
                    recomendacion = f"ADVERTENCIA: Stock final bajo ({stock_final:.0f} uds). Riesgo de quiebre."
                elif compra_requerida > 0:
                    recomendacion = f"OK. Pedido requerido. Costo: ${costo_compra:,.0f}"
                else:
                    recomendacion = "OK. Stock suficiente."
                # --- FIN DE LA LÓGICA ---

                plan_compra.append({
                    "MES": mes_data.get('MES', 'N/A'),
                    "PRODUCTO": mes_data.get('PRODUCTO', 'N/A'),
                    "DEMANDA_PROYECTADA": demanda,
                    "STOCK_INICIAL": round(stock_inicial, 2),
                    "COMPRA_REQUERIDA": round(compra_requerida, 2),
                    "STOCK_FINAL": round(stock_final, 2),
                    "AVISO": f"Pedir {lead_time_final} días antes",
                    "RECOMENDACION": recomendacion # <-- ¡EL NUEVO CAMPO!
                })
                
                stock_mes = stock_final

            return Response(plan_compra, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": f"Error generando plan de compra: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


# --- VISTA 5: GetRecommendationsView (Versión "Inteligente") ---
class GetRecommendationsView(APIView):
    """
    Recibe los 3 escenarios ya calculados, los compara
    CONTRA EL CONSERVADOR, y devuelve una recomendación
    específica y accionable.
    """
    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            escenario_peor = data.get('peor', [])
            escenario_conservador = data.get('conservador', [])
            escenario_mejor = data.get('mejor', [])

            # --- 1. Calculamos los Totales de cada escenario ---
            
            # (Sumamos el margen y la cantidad de todos los meses)
            margen_peor = sum(mes.get('MARGEN_PROYECTADO', 0) for mes in escenario_peor)
            margen_conservador = sum(mes.get('MARGEN_PROYECTADO', 0) for mes in escenario_conservador)
            margen_mejor = sum(mes.get('MARGEN_PROYECTADO', 0) for mes in escenario_mejor)
            
            # --- 2. Lógica de Recomendación Comparativa ---
            
            recomendaciones = {}

            # a) Recomendación para "Conservador" (es la base)
            recomendaciones['conservador'] = f"LÍNEA BASE: Genera un margen de ${margen_conservador:,.0f}. Úsalo como punto de comparación."

            # b) Recomendación para "Mejor"
            diff_mejor = margen_mejor - margen_conservador
            if diff_mejor > 0:
                recomendaciones['mejor'] = f"RECOMENDADO: Genera ${diff_mejor:,.0f} más de margen que la línea base. Estrategia agresiva (ferias, descuentos)."
            else:
                recomendaciones['mejor'] = f"NO RECOMENDADO: Genera ${abs(diff_mejor):,.0f} menos de margen que la línea base."

            # c) Recomendación para "Peor"
            diff_peor = margen_peor - margen_conservador
            if diff_peor < 0:
                recomendaciones['peor'] = f"ADVERTENCIA: Genera ${abs(diff_peor):,.0f} menos de margen que la línea base. Escenario de riesgo."
            else:
                recomendaciones['peor'] = f"EQUIVOCADO: Este escenario 'peor' es más rentable (${diff_peor:,.0f} más) que el conservador. Revisa las variables."

            # 3. Devolvemos el JSON con las recomendaciones
            return Response(recomendaciones, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Error generando recomendaciones: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)