import { useState, useReducer, useRef, useEffect } from "react";
import { Leaf, ShoppingBag, ChefHat, User, Camera, CheckCircle, XCircle,
  ChevronRight, ChevronLeft, Flame, AlertCircle, RefreshCw, Sparkles,
  Clock, Heart, Trash2, BookOpen, Soup } from "lucide-react";

const T = {
  sage:"#4E7153", sageMid:"#6B9470", sageLight:"#B8D4BB", sagePale:"#EBF3EC",
  terra:"#B8603A", terraLight:"#E8A882", terraPale:"#FAF0EA",
  cream:"#FAF7F2", warmWhite:"#FFFFFF", stone:"#8A7968", stoneMid:"#BFB3A4",
  stonePale:"#F0EBE3", brown:"#4A3728", brownMid:"#7A6050", ink:"#2C2018",
  error:"#C0392B", ok:"#3A7D55",
};
const FD = `'Palatino Linotype', Georgia, serif`;
const FB = `'Trebuchet MS', 'Century Gothic', sans-serif`;

// ── LEMON SQUEEZY CONFIG ─────────────────────────────────────────────────────
const LS_PREMIUM_URL = "https://stophashimoto.lemonsqueezy.com/checkout/buy/6ba9043a-2389-49a2-b361-862b0702869f";
const LS_ALUMNAS_URL = "https://stophashimoto.lemonsqueezy.com/checkout/buy/757e5d80-a898-4648-a04a-f85b1697bcbc";
const FREE_RECIPES_LIMIT = 3; // 3 recetas de almuerzo solamente
const PREMIUM_RECIPES_PER_CAT = 2; // 2 recetas por categoría

// ── MEMBERSHIP HELPERS ────────────────────────────────────────────────────────
async function getMembership(email){
  if(!email){
    // Fallback: leer email guardado localmente
    try{const cached=localStorage.getItem("membership:status");if(cached){const p=JSON.parse(cached);if(p?.email)return getMembership(p.email);}return null;}catch{return null;}
  }
  try{
    const r=await fetch("/api/verify-membership",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
    const data=await r.json();
    const mem={type:data?.membership==="premium"?"premium":"free",email,checkedAt:Date.now()};
    localStorage.setItem("membership:status",JSON.stringify(mem));
    return mem;
  }catch{
    // Si falla la red, usar caché local
    try{const cached=localStorage.getItem("membership:status");return cached?JSON.parse(cached):null;}catch{return null;}
