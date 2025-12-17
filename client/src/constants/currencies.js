import {
  DollarSign,
  Euro,
  PoundSterling,
  IndianRupee,
  JapaneseYen,
  SwissFranc,
  RussianRuble,
} from "lucide-react";

import {
  FaWonSign,
  FaRubleSign,
  FaShekelSign,
  FaLiraSign,
  FaRupeeSign,
} from "react-icons/fa";

import { SiBitcoinsv } from "react-icons/si";

export const currencyIcons = {
  // Major
  USD: DollarSign,
  EUR: Euro,
  GBP: PoundSterling,
  INR: IndianRupee,
  JPY: JapaneseYen,
  CHF: SwissFranc,
  RUB: RussianRuble,

  // Dollar-based (fallback to DollarSign)
  CAD: DollarSign,
  AUD: DollarSign,
  NZD: DollarSign,
  SGD: DollarSign,
  HKD: DollarSign,
  MXN: DollarSign,
  ARS: DollarSign,
  CLP: DollarSign,
  COP: DollarSign,

  // Rupee variants
  PKR: FaRupeeSign,
  BDT: FaRupeeSign,
  LKR: FaRupeeSign,
  NPR: FaRupeeSign,

  // Won
  KRW: FaWonSign,

  // Lira
  TRY: FaLiraSign,

  // Shekel
  ILS: FaShekelSign,

  // Ruble fallback (if lucide removed)
  BYN: FaRubleSign,

  // Bitcoin (optional)
  BTC: SiBitcoinsv,
};

// Fallback for symbols that don't have specific icons
export const currencySymbols = {
  USD: "$",
  INR: "₹",
  GBP: "£",
  EUR: "€",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CNY: "¥",
  SGD: "S$",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  RUB: "₽",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RON: "lei",
  TRY: "₺",
  KRW: "₩",
  HKD: "HK$",
  NZD: "NZ$",
  BRL: "R$",
  ARS: "$",
  CLP: "$",
  COP: "$",
  ZAR: "R",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  AED: "د.إ",
  SAR: "﷼",
  ILS: "₪",
  THB: "฿",
  PHP: "₱",
  MYR: "RM",
  IDR: "Rp",
  PKR: "₨",
  BDT: "৳",
  VND: "₫",
  UAH: "₴",
  EGP: "£",
  DOP: "RD$",
  CRC: "₡",
  ISK: "kr",
  ALL: "L",
  AMD: "֏",
  AZN: "₼",
  BGN: "лв",
  AFN: "؋",
  ETB: "Br",
};
