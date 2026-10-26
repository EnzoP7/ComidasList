# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Una sola persona: el dueño de la app (23 años, 189–190 cm, 82–85 kg, Uruguay). La usa sobre todo en el celular, durante el día, para cargar en el momento lo que come, el agua, los pasos y el entrenamiento, muchas veces con una sola mano. Una vez por semana cocina en cantidad (batch cooking) y arma tapers estándar que repite durante la semana.

## Product Purpose

Gestionar un plan de recomposición corporal cuyo objetivo concreto es eliminar la grasa localizada de los flancos ("flotadores") con constancia: déficit calórico controlado, proteína alta (~2 g/kg, ≈165 g/día), 10.000–12.000 pasos diarios y entrenamiento de fuerza. Éxito = registrar el día en segundos, ver si va dentro del plan y sostenerlo semana a semana.

## Positioning

No es un contador de calorías genérico: está construido alrededor del batch cooking (tapers como lotes en la heladera que se "comen" con un toque), con una base de alimentos y precios del mercado uruguayo (pesos uruguayos), y un plan calculado (Mifflin-St Jeor + nivel de déficit) orientado a un objetivo físico específico.

## Operating Context

- Registro diario: comidas (tupper, desayuno, comida libre, extras), proteína/grasas/carbos, agua, pasos, entrenamiento, peso.
- Ritual semanal: armar tapers en "Crear", guardar el lote, comprar con la lista de compra, consumir desde "Mi heladera".
- Plantillas reutilizables de tapers, desayunos y comidas.
- Seguimiento: progreso de peso (tendencia de 7 días), consistencia de proteína, agua, gastos reales por mes vs. presupuesto estimado.

## Capabilities and Constraints

- Vite + React 19 + Tailwind CSS v4; sin backend, todo en `localStorage` (con exportar/importar JSON).
- Moneda única: pesos uruguayos ($U). Idioma: español rioplatense (voseo).
- Secciones: Hoy, Crear (taper / desayuno / comida libre), Mi heladera, Agua, Alimentos, Progreso, Gastos (registro + presupuesto), Ajustes (plan y macros).
- Base de alimentos con nutrientes por gramo (kcal, proteína, grasas, carbos, fibra), estados crudo/cocido y preparaciones (huevo frito, hervido…), precios orientativos editables.
- Recharts para gráficos (carga diferida).

## Brand Commitments

- Nombre: "Recomp 2027". Mensajes motivacionales enfocados en eliminar los flancos paso a paso.
- Tono cercano y directo, en voseo uruguayo. Sin culpa ni gamificación infantil.

## Evidence on Hand

- Valores nutricionales: USDA FoodData Central y tablas latinoamericanas (redondeados).
- Precios: orientativos de supermercados, ferias y carnicerías de Montevideo (octubre 2026); no son datos oficiales.
- No hay testimonios, usuarios externos ni métricas reales que mostrar.

## Product Principles

1. Registrar el día tiene que tomar segundos, con una mano, en el celular.
2. Siempre mostrar si el día va dentro del plan (calorías, proteína, pasos) antes que cualquier otro dato.
3. El batch cooking es el centro: planificar una vez, consumir con un toque.
4. Las estimaciones se presentan como estimaciones; la tendencia importa más que el dato suelto.
5. Motivar con constancia y progreso visible, no con presión.
