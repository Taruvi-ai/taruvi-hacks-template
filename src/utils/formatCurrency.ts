export const formatCurrency = (valueCents: number | null | undefined) => {
  const amount = typeof valueCents === "number" ? valueCents / 100 : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};
