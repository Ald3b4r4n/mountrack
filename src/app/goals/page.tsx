"use client";
import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export default function Goals() {
  const { user } = useAuth();
  const router = useRouter();
  const [targetWeight, setTargetWeight] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadGoals() {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.targetWeight) setTargetWeight(String(data.targetWeight));
          if (data.weeklyGoal) setWeeklyGoal(String(data.weeklyGoal));
        }
      }
    }
    loadGoals();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          targetWeight: parseFloat(targetWeight),
          weeklyGoal: parseFloat(weeklyGoal),
          updatedAt: new Date(),
        },
        { merge: true },
      );
      setSaved(true);
      setTimeout(() => router.push("/"), 1200);
    } catch (error) {
      console.error("Erro ao salvar metas", error);
      alert("Falha ao salvar metas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <main
        className="container"
        style={{ maxWidth: "800px", paddingTop: "3rem", paddingBottom: "4rem" }}
      >
        <header
          style={{
            marginBottom: "2.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            className="back-link anim-enter"
            style={{ marginBottom: 0 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar ao Dashboard
          </Link>
          <Logo size="sm" />
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(300px, 1fr) 280px",
            gap: "2rem",
            alignItems: "start",
          }}
          className="goals-grid"
        >
          {/* Formulário de Metas */}
          <div
            className="glass-panel anim-enter anim-delay-1"
            style={{ padding: "2.5rem" }}
          >
            <h1
              className="glow-text"
              style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}
            >
              Metas
            </h1>
            <p className="page-subtitle" style={{ marginBottom: "2rem" }}>
              Defina os alvos que guiam sua jornada.
            </p>

            <form
              onSubmit={handleSave}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v18" />
                    <path d="M8 7l4-4 4 4" />
                    <path d="M8 17l4 4 4-4" />
                  </svg>
                  <label htmlFor="targetWeight" className="label">
                    Meta de Peso
                  </label>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    id="targetWeight"
                    step="0.1"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="80.0"
                    required
                    className="input-field"
                    style={{ paddingRight: "3.5rem" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    kg
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-secondary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  <label htmlFor="weeklyGoal" className="label">
                    Meta Semanal de Perda
                  </label>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    id="weeklyGoal"
                    step="0.1"
                    value={weeklyGoal}
                    onChange={(e) => setWeeklyGoal(e.target.value)}
                    placeholder="0.5"
                    required
                    className="input-field"
                    style={{ paddingRight: "3.5rem" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    kg
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || saved}
                className="btn-primary"
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  fontSize: "1rem",
                  width: "100%",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {saved ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    <Check size={16} />
                    Metas salvas
                  </span>
                ) : loading ? (
                  "Salvando..."
                ) : (
                  "Salvar metas"
                )}
              </button>
            </form>
          </div>

          {/* Card Informativo / Preview */}
          <aside
            className="anim-enter anim-delay-2"
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              className="glass-panel"
              style={{
                padding: "1.5rem",
                background:
                  "linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)",
                borderColor: "rgba(52, 211, 153, 0.2)",
              }}
            >
              <h3
                style={{
                  fontSize: "0.9rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--accent-primary)",
                  marginBottom: "1rem",
                }}
              >
                Resumo atual
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Meta de peso
                  </p>
                  <p
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {targetWeight || "—"}{" "}
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 400,
                        color: "var(--text-muted)",
                      }}
                    >
                      kg
                    </span>
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Meta semanal
                  </p>
                  <p
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {weeklyGoal || "—"}{" "}
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 400,
                        color: "var(--text-muted)",
                      }}
                    >
                      kg
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                &quot;Metas realistas ajudam a manter consistência e deixam sua
                evolução mais clara ao longo do tempo.&quot;
              </p>
              <div
                style={{
                  marginTop: "1rem",
                  width: "40px",
                  height: "2px",
                  background: "var(--accent-primary)",
                }}
              ></div>
            </div>
          </aside>
        </div>

        <style jsx>{`
          @media (max-width: 768px) {
            .goals-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
    </ProtectedRoute>
  );
}
