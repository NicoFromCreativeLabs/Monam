import { Card } from "@/components/panel/Card";

export interface RecommendationView {
  product: string;
  protocol: string;
  visitDate: string;
  alreadyPurchased: boolean;
  price?: number;
}

// Rendered on /my/appointments ("Mi rutina · Mis compras") — purchases used
// to be a separate page, folded in here. Real RetailRecommendationTag rows
// (app/my/appointments/page.tsx), not a mock list — a client who hasn't had
// a facial yet correctly sees nothing here, not fabricated recommendations.
export function PostFacialRecommendations({
  recommendations,
  hasUpcoming,
}: {
  recommendations: RecommendationView[];
  hasUpcoming: boolean;
}) {
  return (
    <Card title="Recomendaciones post facial">
      <p className="mb-3 font-body text-xs text-ciruela/50">
        Productos sugeridos para continuar en casa los resultados de tus últimos faciales.
      </p>
      {recommendations.length === 0 ? (
        <p className="py-3 font-body text-sm text-ciruela/50">
          Todavía no hay recomendaciones — aparecerán aquí después de tu primer facial.
        </p>
      ) : (
      <ul className="divide-y divide-ciruela/8">
        {recommendations.map((r, i) => (
          <li key={i} className="flex items-center justify-between py-3">
            <div>
              <p className="font-body text-sm text-ciruela">{r.product}</p>
              <p className="font-body text-xs text-ciruela/50">
                Recomendado tras tu {r.protocol} · {r.visitDate}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {r.price !== undefined && (
                <span className="font-body text-sm text-ciruela">${r.price} MXN</span>
              )}
              {r.alreadyPurchased ? (
                <span className="rounded-full bg-oliva/10 px-3 py-1 font-body text-xs text-oliva">
                  Ya comprado
                </span>
              ) : (
                <button className="rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela">
                  Agregar
                </button>
              )}
              {hasUpcoming && (
                <button className="rounded-full bg-ciruela px-3 py-1.5 font-body text-xs text-hueso">
                  Apartar para mi próxima cita
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      )}
    </Card>
  );
}
