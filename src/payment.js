export const isUnpaid = order => order.method === 'later' || (order.paid != null && Number(order.paid) < Number(order.total));
export const paymentLabel = order => isUnpaid(order) ? 'Belum bayar' : 'Lunas';
export const collectedTotal = order => isUnpaid(order) ? 0 : Number(order.total);
