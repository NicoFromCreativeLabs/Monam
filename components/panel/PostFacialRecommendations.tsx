import { Card } from "@/components/panel/Card";
import { CLIENT_APPOINTMENTS_LIST, POST_FACIAL_RECOMMENDATIONS } from "@/lib/mock-data";

// Rendered on /my/appointments ("Mi rutina · Mis compras") — purchases used
// to be a separate page, folded in here.
export function PostFacialRecommendations() {
  const hasUpcoming = CLIENT_APPOINTMENTS_LIST.upcoming.length > 0;

  return (
    <Card title="Recomendaciones post facial">
      <p className="mb-3 font-body text-xs text-ciruela/50">
        Productos sugeridos para continuar en casa los resultados de tus últimos faciales.
      </p>
      <ul className="divide-y divide-ciruela/8">
        {POST_FACIAL_RECOMMENDATIONS.map((r, i) => (
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
    </Card>
  );
}
