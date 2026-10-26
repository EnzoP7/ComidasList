import { createContext, useContext } from 'react'

// Catálogo de alimentos activo (base + cambios del usuario) y sus variantes crudo/cocido
export const FoodsContext = createContext({ foods: [], variants: [] })
export const useFoods = () => useContext(FoodsContext)
