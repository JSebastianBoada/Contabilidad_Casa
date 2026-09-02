import {
  Utensils,
  Coffee,
  ShoppingBag,
  Home,
  Wrench,
  Sparkles,
  Zap,
  Flame,
  Droplets,
  Wifi,
  Smartphone,
  Fuel,
  Car,
  Tv,
  UtensilsCrossed,
  Trophy,
  Gift,
  Shirt,
  HeartPulse,
  Briefcase,
  Users,
  User,
  Clock,
  Award,
  Laptop,
  PlusCircle,
  CreditCard,
  Building2,
  Wallet,
  Banknote,
  Landmark,
  Receipt,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  PieChart,
  BarChart3,
  Layers,
  Search,
  Trash2,
  Edit3,
  Plus,
  Download,
  UploadCloud,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  Percent,
  HelpCircle,
  ShieldCheck,
  Tag,
  CircleDollarSign,
  type LucideProps,
} from 'lucide-react'

export interface IconProps extends LucideProps {
  name?: string
  className?: string
  size?: number | string
}

/**
 * Componente que renderiza un icono temático según la categoría o tipo financiero
 */
export function CategoryIcon({
  category,
  size = 18,
  className,
  color,
}: {
  category: string
  size?: number | string
  className?: string
  color?: string
}) {
  const cat = (category || '').toUpperCase()

  // Comida
  if (cat.includes('DESAYUNO') || cat.includes('CAFE') || cat.includes('PANADERIA')) {
    return <Coffee size={size} className={className} color={color} />
  }
  if (cat.includes('ALMUERZO') || cat.includes('COMIDA') || cat.includes('RESTAURANTE') || cat.includes('CENA')) {
    return <Utensils size={size} className={className} color={color} />
  }
  if (cat.includes('MERCADO') || cat.includes('SUPERMERCADO') || cat.includes('COMPRA')) {
    return <ShoppingBag size={size} className={className} color={color} />
  }

  // Servicios
  if (cat.includes('ENERGIA') || cat.includes('LUZ')) {
    return <Zap size={size} className={className} color={color} />
  }
  if (cat.includes('GAS')) {
    return <Flame size={size} className={className} color={color} />
  }
  if (cat.includes('AGUA') || cat.includes('ACUEDUCTO')) {
    return <Droplets size={size} className={className} color={color} />
  }
  if (cat.includes('INTERNET') || cat.includes('WIFI') || cat.includes('TV')) {
    return <Wifi size={size} className={className} color={color} />
  }

  // Personal
  if (cat.includes('CELULAR') || cat.includes('TELEFONIA') || cat.includes('MOVIL')) {
    return <Smartphone size={size} className={className} color={color} />
  }
  if (cat.includes('GASOLINA') || cat.includes('COMBUSTIBLE') || cat.includes('TANQUEO')) {
    return <Fuel size={size} className={className} color={color} />
  }
  if (cat.includes('PARQUEADERO') || cat.includes('TRANSPORTE') || cat.includes('TAXI') || cat.includes('UBER')) {
    return <Car size={size} className={className} color={color} />
  }
  if (cat.includes('SUSCRIPCION') || cat.includes('STREAMING') || cat.includes('NETFLIX') || cat.includes('SPOTIFY')) {
    return <Tv size={size} className={className} color={color} />
  }
  if (cat.includes('PARTIDO') || cat.includes('OCIO') || cat.includes('EVENTO') || cat.includes('FUTBOL') || cat.includes('CINE')) {
    return <Trophy size={size} className={className} color={color} />
  }
  if (cat.includes('REGALO') || cat.includes('CUMPLEAÑOS')) {
    return <Gift size={size} className={className} color={color} />
  }
  if (cat.includes('ROPA') || cat.includes('CUIDADO')) {
    return <Shirt size={size} className={className} color={color} />
  }
  if (cat.includes('SALUD') || cat.includes('SEGURO') || cat.includes('FARMACIA')) {
    return <HeartPulse size={size} className={className} color={color} />
  }

  // Hogar
  if (cat.includes('ASEO') || cat.includes('LIMPIEZA')) {
    return <Sparkles size={size} className={className} color={color} />
  }
  if (cat.includes('MANTENIMIENTO') || cat.includes('REPARACION')) {
    return <Wrench size={size} className={className} color={color} />
  }
  if (cat.includes('HOGAR') || cat.includes('ARRIENDO') || cat.includes('VIVIENDA')) {
    return <Home size={size} className={className} color={color} />
  }

  // Ingresos
  if (cat.includes('NOMINA') || cat.includes('SALARIO')) {
    return <Briefcase size={size} className={className} color={color} />
  }
  if (cat.includes('HERMANO') || cat.includes('APORTE_HERMANO')) {
    return <User size={size} className={className} color={color} />
  }
  if (cat.includes('MAMA') || cat.includes('APORTE_MAMA') || cat.includes('FAMILIA')) {
    return <Users size={size} className={className} color={color} />
  }
  if (cat.includes('HORAS_EXTRAS') || cat.includes('RECARGO')) {
    return <Clock size={size} className={className} color={color} />
  }
  if (cat.includes('BONIFICACION')) {
    return <Award size={size} className={className} color={color} />
  }
  if (cat.includes('FREELANCE') || cat.includes('INDEPENDIENTE')) {
    return <Laptop size={size} className={className} color={color} />
  }

  // Cuentas y Tarjetas
  if (cat.includes('TARJETA') || cat.includes('CREDITO') || cat.includes('CUOTA')) {
    return <CreditCard size={size} className={className} color={color} />
  }
  if (cat.includes('BANCO') || cat.includes('BANCOLOMBIA')) {
    return <Landmark size={size} className={className} color={color} />
  }
  if (cat.includes('BILLETERA') || cat.includes('NEQUI') || cat.includes('DAVIPLATA')) {
    return <Wallet size={size} className={className} color={color} />
  }
  if (cat.includes('EFECTIVO')) {
    return <Banknote size={size} className={className} color={color} />
  }

  return <Tag size={size} className={className} color={color} />
}

export {
  Utensils,
  Coffee,
  ShoppingBag,
  Home,
  Wrench,
  Sparkles,
  Zap,
  Flame,
  Droplets,
  Wifi,
  Smartphone,
  Fuel,
  Car,
  Tv,
  UtensilsCrossed,
  Trophy,
  Gift,
  Shirt,
  HeartPulse,
  Briefcase,
  Users,
  User,
  Clock,
  Award,
  Laptop,
  PlusCircle,
  CreditCard,
  Building2,
  Wallet,
  Banknote,
  Landmark,
  Receipt,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  PieChart,
  BarChart3,
  Layers,
  Search,
  Trash2,
  Edit3,
  Plus,
  Download,
  UploadCloud,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  Percent,
  HelpCircle,
  ShieldCheck,
  Tag,
  CircleDollarSign,
}
