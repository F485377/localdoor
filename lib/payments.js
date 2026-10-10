// 決済まわり。今はデモ実装で、実際の請求は発生しない。
// 本番では Stripe などに差し替える（カード番号は自前サーバーに送らず、
// Stripe Elements でトークン化 → ここで PaymentIntent を作成 / 返金する）。

export async function authorizeDeposit({ amount }) {
  return { status: 'AUTHORIZED', amount, cardBrand: 'DEMO', cardLast4: '4242' };
}

export async function refundDeposit(reservation) {
  return { status: 'REFUNDED', amount: reservation.depositAmount };
}
