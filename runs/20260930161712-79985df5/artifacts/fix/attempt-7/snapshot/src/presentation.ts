export type ToastNode = { textContent: string };
export type SettlementNode = { hidden: boolean };

export function resetRoundPresentation(toast: ToastNode | null, settlement: SettlementNode | null): void {
  if (toast) toast.textContent = '';
  if (settlement) settlement.hidden = true;
}
