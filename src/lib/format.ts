export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const paymentLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  voucher: "Voucher",
  vale: "Vale (Fiado)",
};

export const categoryLabels: Record<string, string> = {
  comidas: "Comidas",
  bebidas: "Bebidas",
  balas_doces: "Balas / Doces",
  picoles: "Picolés",
};
